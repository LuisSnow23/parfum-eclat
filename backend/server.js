const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY =
  process.env.JWT_SECRET ||
  'tu_secreto_super_seguro_cambia_esto_en_produccion';

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// ============================================================
// CONEXION A SUPABASE
// ============================================================
const supabaseUrl = 'https://rvnxajnpcszyzxlxamml.supabase.co';
const supabaseKey =
  process.env.SUPABASE_KEY ||
  'sb_publishable_iXc0eIJjHPRxS1IRhTOg-Q_nwgpzEMr';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('Conectado a Supabase');

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================
function envioUnitario(p) {
  const envio = Number(p.costo_envio) || 0;
  const n = Math.max(
    Number(p.piezas_envio) || Number(p.piezas_compradas) || 1,
    1
  );
  return envio / n;
}

function costoUnitario(p) {
  return (Number(p.precio_proveedor) || 0) + envioUnitario(p);
}

function gananciaUnitaria(p) {
  return (Number(p.precio_publico) || 0) - costoUnitario(p);
}

// ============================================================
// OBTENER IP DEL CLIENTE
// ============================================================
function obtenerIP(req) {
  // Render pone la IP real en este header
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // Puede venir "IP1, IP2, IP3" — la primera es la del cliente
    return forwarded.split(',')[0].trim();
  }
  return (
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    'desconocida'
  );
}

// ============================================================
// OBTENER UBICACION POR IP (ciudad, región, país)
// ============================================================
async function obtenerUbicacionIP(ip) {
  try {
    // No consultar si es IP local
    if (
      !ip ||
      ip === 'desconocida' ||
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.')
    ) {
      return 'Local';
    }

    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();

    if (data.error) return 'Desconocida';

    const partes = [
      data.city,
      data.region,
      data.country_name,
    ].filter(Boolean);

    return partes.join(', ') || 'Desconocida';
  } catch (err) {
    return 'Desconocida';
  }
}

// ============================================================
// GUARDAR LOG DE ACTIVIDAD (con IP, user-agent y ubicación)
// ============================================================
async function guardarLog(
  req,
  accion,
  tabla,
  registro_id,
  datos_antes,
  datos_despues,
  notas = ''
) {
  try {
    const usuario = req?.user?.username || 'admin';
    const ip = obtenerIP(req);
    const userAgent = req?.headers['user-agent'] || '';
    const ubicacion = await obtenerUbicacionIP(ip);

    await supabase.from('logs').insert({
      usuario,
      accion,
      tabla,
      registro_id: registro_id || null,
      datos_antes: datos_antes || null,
      datos_despues: datos_despues || null,
      notas,
      ip,
      user_agent: userAgent,
      ubicacion,
    });

    console.log(`✅ Log: ${accion} ${tabla} [${ip} - ${ubicacion}]`);
  } catch (err) {
    console.error('❌ Error guardando log:', err);
  }
}

// ============================================================
// LOGIN
// ============================================================
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  const { data: user, error } = await supabase
    .from('usuarios')
    .select('id, username, password_hash')
    .eq('username', username)
    .single();

  if (error || !user) {
    return res.status(401).json({
      error: 'Usuario o contrasena incorrectos',
    });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({
      error: 'Usuario o contrasena incorrectos',
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
    },
    SECRET_KEY,
    {
      expiresIn: '7d',
    }
  );

  await guardarLog(
    { ...req, user: { username: username, id: user.id } }, 
    'LOGIN',
    'auth',
    user.id,
    null,
    { username: user.username },
    `Inicio de sesión: ${username}`
  );

  res.json({
    token,
    username: user.username,
  });
});

// ============================================================
// AUTENTICACION
// ============================================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }

    req.user = user;
    next();
  });
}

app.use('/api', authenticateToken);

// ============================================================
// RESUMEN (DASHBOARD)
// ============================================================
app.get('/api/resumen', async (req, res) => {
  try {
    const { data: perfumes } = await supabase
      .from('perfumes')
      .select('*');

    const { data: ventas } = await supabase
      .from('ventas')
      .select('*');

    const { data: abonos } = await supabase
      .from('abonos')
      .select('*');

    const { data: fondoMovimientos } = await supabase
      .from('fondo_movimientos')
      .select('*');

    const P = perfumes || [];
    const V = ventas || [];

    const vendidasPorPerfume = {};

    V.forEach(v => {
      if (v.perfume_id) {
        vendidasPorPerfume[v.perfume_id] =
          (vendidasPorPerfume[v.perfume_id] || 0) +
          (Number(v.cantidad) || 0);
      }
    });

    const abonosPorVenta = {};

    (abonos || []).forEach(a => {
      if (a.venta_id) {
        abonosPorVenta[a.venta_id] =
          (abonosPorVenta[a.venta_id] || 0) +
          Number(a.monto);
      }
    });

    let totalCobradoVentas = 0;

    V.forEach(v => {
      const abonadoInicial = Number(v.abonado) || 0;
      const abonosExtra = abonosPorVenta[v.id] || 0;
      totalCobradoVentas += abonadoInicial + abonosExtra;
    });

    const totalRetiradoFondo = (fondoMovimientos || [])
      .filter(m => m.tipo === 'retiro')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const totalIngresadoFondo = (fondoMovimientos || [])
      .filter(m => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const dinero_en_caja = Math.max(
      totalCobradoVentas + totalIngresadoFondo - totalRetiradoFondo,
      0
    );

    let por_cobrar = 0;
    let capital_en_inventario = 0;
    let capital_invertido = 0;
    let stock = 0;
    let valor_stock_publico = 0;

    P.forEach(p => {
      const cu = costoUnitario(p);
      const compradas = Number(p.piezas_compradas) || 0;
      const vendidas = vendidasPorPerfume[p.id] || 0;
      const stk = Math.max(compradas - vendidas, 0);

      stock += stk;
      capital_en_inventario += cu * stk;
      capital_invertido += cu * compradas;
      valor_stock_publico +=
        (Number(p.precio_publico) || 0) * stk;
    });

    V.forEach(v => {
      const total = Number(v.total_venta) || 0;
      const abonadoInicial = Number(v.abonado) || 0;
      const abonosExtra = abonosPorVenta[v.id] || 0;
      const abonadoTotal = abonadoInicial + abonosExtra;
      por_cobrar += Math.max(total - abonadoTotal, 0);
    });

    let costo_de_lo_vendido = 0;

    P.forEach(p => {
      const cu = costoUnitario(p);
      const vendidas = vendidasPorPerfume[p.id] || 0;
      costo_de_lo_vendido += cu * vendidas;
    });

    const ganancia_realizada =
      totalCobradoVentas - costo_de_lo_vendido;

    const total_a_cobrar = dinero_en_caja + por_cobrar;
    const valor_potencial_total =
      total_a_cobrar + valor_stock_publico;

    res.json({
      dinero_en_caja,
      por_cobrar,
      total_a_cobrar,
      ganancia_realizada,
      capital_en_inventario,
      capital_invertido,
      stock,
      valor_stock_publico,
      valor_potencial_total,
    });
  } catch (error) {
    console.error('Error en /api/resumen:', error);
    res.status(500).json({ error: error.message });
  }
});
// ============================================================
// CLIENTES (agrupados)
// ============================================================
app.get('/api/clientes', async (req, res) => {
  try {
    const { data: ventas } = await supabase
      .from('ventas')
      .select('*, perfumes(nombre), abonos(*)');

    const { data: abonos } = await supabase
      .from('abonos')
      .select('*');

    const V = ventas || [];
    const A = abonos || [];

    // Agrupar abonos por venta
    const abonosPorVenta = {};
    A.forEach(a => {
      if (a.venta_id) {
        abonosPorVenta[a.venta_id] = (abonosPorVenta[a.venta_id] || 0) + Number(a.monto);
      }
    });

    // Agrupar por cliente
    const clientes = {};

    V.forEach(v => {
      const nombre = (v.cliente || 'Sin nombre').trim();
      if (!nombre) return;

      if (!clientes[nombre]) {
        clientes[nombre] = {
          nombre,
          total_perfumes: 0,
          total_ventas: 0,
          total_acordado: 0,
          total_cobrado: 0,
          total_por_cobrar: 0,
          primera_compra: v.fecha,
          ultima_compra: v.fecha,
          ventas: [],
          perfumes: []
        };
      }

      const c = clientes[nombre];
      const cantidad = Number(v.cantidad) || 0;
      const total = Number(v.total_venta) || 0;
      const abonadoInicial = Number(v.abonado) || 0;
      const abonosExtra = abonosPorVenta[v.id] || 0;
      const abonado = abonadoInicial + abonosExtra;
      const resto = Math.max(total - abonado, 0);

      c.total_perfumes += cantidad;
      c.total_ventas += 1;
      c.total_acordado += total;
      c.total_cobrado += abonado;
      c.total_por_cobrar += resto;

      if (v.fecha < c.primera_compra) c.primera_compra = v.fecha;
      if (v.fecha > c.ultima_compra) c.ultima_compra = v.fecha;

      c.ventas.push({
        id: v.id,
        fecha: v.fecha,
        perfume: v.perfumes?.nombre || '-',
        cantidad,
        total,
        abonado,
        resto,
        liquidado: resto <= 0.009,
        tipo_pago: v.tipo_pago
      });

      c.perfumes.push(v.perfumes?.nombre || '-');
    });

    // Convertir a array y ordenar por total de perfumes
    const lista = Object.values(clientes).sort(
      (a, b) => b.total_perfumes - a.total_perfumes
    );

    res.json(lista);
  } catch (error) {
    console.error('Error en /api/clientes:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PERFUMES
// ============================================================
app.get('/api/perfumes', async (req, res) => {
  const { data, error } = await supabase
    .from('perfumes')
    .select('*')
    .order('creado_en', { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const { data: ventas } = await supabase
    .from('ventas')
    .select('*');

  const vendPor = {};
  const cobPor = {};
  const pcPor = {};

  (ventas || []).forEach(v => {
    if (!v.perfume_id) return;

    const pid = v.perfume_id;
    const cantidad = Number(v.cantidad) || 0;
    const abonado = Number(v.abonado) || 0;
    const total = Number(v.total_venta) || 0;

    vendPor[pid] = (vendPor[pid] || 0) + cantidad;
    cobPor[pid] = (cobPor[pid] || 0) + abonado;
    pcPor[pid] = (pcPor[pid] || 0) + Math.max(total - abonado, 0);
  });

  const resultado = data.map(p => ({
    ...p,
    vendidos: vendPor[p.id] || 0,
    stock: Math.max(
      (Number(p.piezas_compradas) || 0) - (vendPor[p.id] || 0),
      0
    ),
    envio_unitario: envioUnitario(p),
    costo_unitario: costoUnitario(p),
    ganancia_unitaria: gananciaUnitaria(p),
    cobrado: cobPor[p.id] || 0,
    por_cobrar: pcPor[p.id] || 0,
  }));

  res.json(resultado);
});

app.post('/api/perfumes', async (req, res) => {
  const {
    nombre,
    proveedor,
    precio_proveedor,
    precio_publico,
    piezas_compradas,
    costo_envio,
    piezas_envio,
    notas,
  } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'Nombre requerido' });
  }

  const { data, error } = await supabase
    .from('perfumes')
    .insert({
      nombre,
      proveedor,
      precio_proveedor: Number(precio_proveedor) || 0,
      precio_publico: Number(precio_publico) || 0,
      piezas_compradas: Number(piezas_compradas) || 1,
      costo_envio: Number(costo_envio) || 0,
      piezas_envio: Number(piezas_envio) || 1,
      notas,
    })
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'CREAR',
    'perfumes',
    data[0].id,
    null,
    {
      nombre,
      proveedor,
      precio_proveedor,
      precio_publico,
      piezas_compradas,
      costo_envio,
      piezas_envio,
      notas,
    },
    `Perfume creado: ${nombre}`
  );

  res.json({ id: data[0].id });
});

app.put('/api/perfumes/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    proveedor,
    precio_proveedor,
    precio_publico,
    piezas_compradas,
    costo_envio,
    piezas_envio,
    notas,
  } = req.body;

  const { data: antes } = await supabase
    .from('perfumes')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('perfumes')
    .update({
      nombre,
      proveedor,
      precio_proveedor: Number(precio_proveedor) || 0,
      precio_publico: Number(precio_publico) || 0,
      piezas_compradas: Number(piezas_compradas) || 1,
      costo_envio: Number(costo_envio) || 0,
      piezas_envio: Number(piezas_envio) || 1,
      notas,
    })
    .eq('id', id)
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'EDITAR',
    'perfumes',
    Number(id),
    antes,
    data[0],
    `Perfume editado: ${nombre}`
  );

  res.json({ id: data[0].id });
});

app.delete('/api/perfumes/:id', async (req, res) => {
  const { id } = req.params;

  const { data: antes } = await supabase
    .from('perfumes')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('perfumes')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'ELIMINAR',
    'perfumes',
    Number(id),
    antes,
    null,
    `Perfume eliminado: ${antes?.nombre || id}`
  );

  res.json({ ok: true });
});

// ============================================================
// VENTAS
// ============================================================
app.get('/api/ventas', async (req, res) => {
  const { data, error } = await supabase
    .from('ventas')
    .select('*, perfumes(nombre, proveedor), abonos(*)')
    .order('fecha', { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const resultado = (data || []).map(v => {
    const total = Number(v.total_venta) || 0;
    const abonoInicial = Number(v.abonado) || 0;
    const abonosExtra = (v.abonos || []).reduce(
      (s, a) => s + (Number(a.monto) || 0),
      0
    );
    const abonadoTotal = abonoInicial + abonosExtra;
    const resto = Math.max(total - abonadoTotal, 0);
    const pct_pagado =
      total > 0
        ? Math.round((abonadoTotal / total) * 100)
        : 0;
    const liquidado = resto <= 0 && total > 0;

    return {
      ...v,
      abonos: v.abonos || [],
      abonado_inicial: abonoInicial,
      abonado: abonadoTotal,
      perfume_nombre: v.perfumes?.nombre || '-',
      resto,
      liquidado,
      pct_pagado,
    };
  });

  res.json(resultado);
});

app.post('/api/ventas', async (req, res) => {
  const {
    perfume_id,
    cliente,
    cantidad,
    precio_unitario,
    total_venta,
    tipo_pago,
    abonado,
    fecha,
    notas,
  } = req.body;

  if (!perfume_id || !fecha) {
    return res.status(400).json({
      error: 'Perfume y fecha requeridos',
    });
  }

  const { data, error } = await supabase
    .from('ventas')
    .insert({
      perfume_id,
      cliente,
      cantidad: Number(cantidad) || 1,
      precio_unitario: Number(precio_unitario) || 0,
      total_venta: Number(total_venta) || 0,
      tipo_pago,
      abonado: Number(abonado) || 0,
      fecha,
      notas,
    })
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'CREAR',
    'ventas',
    data[0].id,
    null,
    {
      perfume_id,
      cliente,
      cantidad,
      total_venta,
      tipo_pago,
      abonado,
      fecha,
      notas,
    },
    `Venta creada: ${cliente || 'sin cliente'} - $${total_venta}`
  );

  res.json({ id: data[0].id });
});

app.put('/api/ventas/:id', async (req, res) => {
  const { id } = req.params;
  const {
    perfume_id,
    cliente,
    cantidad,
    precio_unitario,
    total_venta,
    tipo_pago,
    abonado,
    fecha,
    notas,
  } = req.body;

  const { data: antes } = await supabase
    .from('ventas')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('ventas')
    .update({
      perfume_id,
      cliente,
      cantidad: Number(cantidad) || 1,
      precio_unitario: Number(precio_unitario) || 0,
      total_venta: Number(total_venta) || 0,
      tipo_pago,
      abonado: Number(abonado) || 0,
      fecha,
      notas,
    })
    .eq('id', id)
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'EDITAR',
    'ventas',
    Number(id),
    antes,
    data[0],
    `Venta editada: ${cliente || 'sin cliente'}`
  );

  res.json({ id: data[0].id });
});

app.delete('/api/ventas/:id', async (req, res) => {
  const { id } = req.params;

  const { data: antes } = await supabase
    .from('ventas')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('ventas')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'ELIMINAR',
    'ventas',
    Number(id),
    antes,
    null,
    `Venta eliminada: ${antes?.cliente || 'sin cliente'} - $${antes?.total_venta || 0}`
  );

  res.json({ ok: true });
});

// ============================================================
// ABONOS
// ============================================================
app.post('/api/ventas/:id/abonos', async (req, res) => {
  const venta_id = Number(req.params.id);
  const { monto, fecha, notas } = req.body;

  if (!monto || Number(monto) <= 0) {
    return res.status(400).json({ error: 'Monto invalido' });
  }

  if (!fecha) {
    return res.status(400).json({ error: 'Fecha requerida' });
  }

  const { data, error } = await supabase
    .from('abonos')
    .insert({
      venta_id,
      monto: Number(monto),
      fecha,
      notas,
    })
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'CREAR',
    'abonos',
    data[0].id,
    null,
    { venta_id, monto, fecha, notas },
    `Abono registrado: $${monto} (venta #${venta_id})`
  );

  res.json({ id: data[0].id });
});

app.put('/api/abonos/:id', async (req, res) => {
  const { id } = req.params;
  const { monto, fecha, notas } = req.body;

  if (!monto || Number(monto) <= 0) {
    return res.status(400).json({ error: 'Monto invalido' });
  }

  if (!fecha) {
    return res.status(400).json({ error: 'Fecha requerida' });
  }

  const { data: antes } = await supabase
    .from('abonos')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('abonos')
    .update({
      monto: Number(monto),
      fecha,
      notas,
    })
    .eq('id', id)
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'EDITAR',
    'abonos',
    Number(id),
    antes,
    data[0],
    `Abono editado: $${antes?.monto || 0} → $${monto}`
  );

  res.json({ id: data[0].id });
});

app.delete('/api/abonos/:id', async (req, res) => {
  const { id } = req.params;

  const { data: antes } = await supabase
    .from('abonos')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('abonos')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'ELIMINAR',
    'abonos',
    Number(id),
    antes,
    null,
    `Abono eliminado: $${antes?.monto || 0} (venta #${antes?.venta_id || '?'})`
  );

  res.json({ ok: true });
});

// ============================================================
// FONDO DE SOCIOS
// ============================================================
app.get('/api/fondo/movimientos', async (req, res) => {
  const { data, error } = await supabase
    .from('fondo_movimientos')
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

app.post('/api/fondo/movimientos', async (req, res) => {
  const { concepto, monto, tipo, fecha, notas } = req.body;

  if (!concepto || !monto || !fecha) {
    return res.status(400).json({
      error: 'Concepto, monto y fecha son obligatorios',
    });
  }

  if (tipo === 'retiro') {
    const { data: ventas } = await supabase
      .from('ventas')
      .select('*');

    const { data: abonos } = await supabase
      .from('abonos')
      .select('*');

    const { data: fondoMovs } = await supabase
      .from('fondo_movimientos')
      .select('*');

    const abonosPorVenta = {};

    (abonos || []).forEach(a => {
      if (a.venta_id) {
        abonosPorVenta[a.venta_id] =
          (abonosPorVenta[a.venta_id] || 0) + Number(a.monto);
      }
    });

    let totalCobrado = 0;

    (ventas || []).forEach(v => {
      const abonadoInicial = Number(v.abonado) || 0;
      const abonosExtra = abonosPorVenta[v.id] || 0;
      totalCobrado += abonadoInicial + abonosExtra;
    });

    const totalRetirado = (fondoMovs || [])
      .filter(m => m.tipo === 'retiro')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const totalIngresado = (fondoMovs || [])
      .filter(m => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const disponible =
      totalCobrado + totalIngresado - totalRetirado;

    if (Number(monto) > disponible) {
      return res.status(400).json({
        error: `No hay suficiente dinero en caja. Disponible: $${disponible.toFixed(2)}`,
      });
    }
  }

  const { data, error } = await supabase
    .from('fondo_movimientos')
    .insert({
      concepto,
      monto: Number(monto),
      tipo,
      fecha,
      notas,
    })
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'CREAR',
    'fondo_movimientos',
    data[0].id,
    null,
    { concepto, monto, tipo, fecha, notas },
    `${tipo === 'retiro' ? 'Retiro' : 'Ingreso'} de fondo: $${monto} - ${concepto}`
  );

  res.json({ id: data[0].id });
});

app.put('/api/fondo/movimientos/:id', async (req, res) => {
  const { id } = req.params;
  const { concepto, monto, tipo, fecha, notas } = req.body;

  if (!concepto || !monto || !fecha) {
    return res.status(400).json({
      error: 'Concepto, monto y fecha son obligatorios',
    });
  }

  const { data: original } = await supabase
    .from('fondo_movimientos')
    .select('*')
    .eq('id', id)
    .single();

  if (
    original &&
    original.tipo === 'retiro' &&
    tipo === 'retiro'
  ) {
    const { data: ventas } = await supabase
      .from('ventas')
      .select('*');

    const { data: abonos } = await supabase
      .from('abonos')
      .select('*');

    const { data: fondoMovs } = await supabase
      .from('fondo_movimientos')
      .select('*');

    const abonosPorVenta = {};

    (abonos || []).forEach(a => {
      if (a.venta_id) {
        abonosPorVenta[a.venta_id] =
          (abonosPorVenta[a.venta_id] || 0) + Number(a.monto);
      }
    });

    let totalCobrado = 0;

    (ventas || []).forEach(v => {
      const abonadoInicial = Number(v.abonado) || 0;
      const abonosExtra = abonosPorVenta[v.id] || 0;
      totalCobrado += abonadoInicial + abonosExtra;
    });

    const totalRetirado = (fondoMovs || [])
      .filter(m => m.tipo === 'retiro' && m.id !== parseInt(id))
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const totalIngresado = (fondoMovs || [])
      .filter(m => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const disponible =
      totalCobrado + totalIngresado - totalRetirado;

    if (Number(monto) > disponible) {
      return res.status(400).json({
        error: `No hay suficiente dinero en caja. Disponible: $${disponible.toFixed(2)}`,
      });
    }
  }

  const { data, error } = await supabase
    .from('fondo_movimientos')
    .update({
      concepto,
      monto: Number(monto),
      tipo,
      fecha,
      notas,
    })
    .eq('id', id)
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'EDITAR',
    'fondo_movimientos',
    Number(id),
    original,
    data[0],
    `Movimiento de fondo editado: ${concepto}`
  );

  res.json({ id: data[0].id });
});

app.delete('/api/fondo/movimientos/:id', async (req, res) => {
  const { id } = req.params;

  const { data: antes } = await supabase
    .from('fondo_movimientos')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('fondo_movimientos')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'ELIMINAR',
    'fondo_movimientos',
    Number(id),
    antes,
    null,
    `Movimiento de fondo eliminado: ${antes?.concepto || id} - $${antes?.monto || 0}`
  );

  res.json({ ok: true });
});

// ============================================================
// AHORRO CONFIG
// ============================================================
app.get('/api/ahorro/config', async (req, res) => {
  const { data, error } = await supabase
    .from('ahorro_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'No configurado' });
  }

  res.json(data);
});

app.post('/api/ahorro/config', async (req, res) => {
  const { meta, descripcion } = req.body;

  if (!meta) {
    return res.status(400).json({ error: 'Meta requerida' });
  }

  const { data: antes } = await supabase
    .from('ahorro_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('ahorro_config')
    .upsert({
      id: 1,
      meta: Number(meta),
      descripcion,
    })
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'EDITAR',
    'ahorro_config',
    1,
    antes,
    { meta, descripcion },
    `Configuración de ahorro actualizada: meta $${meta}`
  );

  res.json({ ok: true });
});

// ============================================================
// AHORRO MOVIMIENTOS
// ============================================================
app.get('/api/ahorro/movimientos', async (req, res) => {
  const { data, error } = await supabase
    .from('ahorro_movimientos')
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

app.post('/api/ahorro/movimientos', async (req, res) => {
  const { tipo, monto, descripcion, fecha } = req.body;

  if (!tipo || !monto || !fecha) {
    return res.status(400).json({
      error: 'Tipo, monto y fecha requeridos',
    });
  }

  const { data, error } = await supabase
    .from('ahorro_movimientos')
    .insert({
      tipo,
      monto: Number(monto),
      descripcion,
      fecha,
    })
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'CREAR',
    'ahorro_movimientos',
    data[0].id,
    null,
    { tipo, monto, descripcion, fecha },
    `Movimiento de ahorro: ${tipo} $${monto}`
  );

  res.json({ id: data[0].id });
});

app.put('/api/ahorro/movimientos/:id', async (req, res) => {
  const { id } = req.params;
  const { tipo, monto, descripcion, fecha } = req.body;

  if (!tipo || !monto || !fecha) {
    return res.status(400).json({
      error: 'Tipo, monto y fecha requeridos',
    });
  }

  const { data: antes } = await supabase
    .from('ahorro_movimientos')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('ahorro_movimientos')
    .update({
      tipo,
      monto: Number(monto),
      descripcion,
      fecha,
    })
    .eq('id', id)
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'EDITAR',
    'ahorro_movimientos',
    Number(id),
    antes,
    data[0],
    `Movimiento de ahorro editado`
  );

  res.json({ id: data[0].id });
});

app.delete('/api/ahorro/movimientos/:id', async (req, res) => {
  const { id } = req.params;

  const { data: antes } = await supabase
    .from('ahorro_movimientos')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('ahorro_movimientos')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await guardarLog(
    req,
    'ELIMINAR',
    'ahorro_movimientos',
    Number(id),
    antes,
    null,
    `Movimiento de ahorro eliminado`
  );

  res.json({ ok: true });
});

// ============================================================
// LOGS (GET) — consultar historial de actividad
// ============================================================
app.get('/api/logs', async (req, res) => {
  const { tabla, accion, limite, desde } = req.query;

  let query = supabase
    .from('logs')
    .select('*')
    .order('creado_en', { ascending: false })
    .limit(Number(limite) || 200);

  if (tabla) query = query.eq('tabla', tabla);
  if (accion) query = query.eq('accion', accion);
  if (desde) query = query.gte('creado_en', desde);

  const { data, error } = await query;

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// ============================================================
// SERVIDOR FRONTEND
// ============================================================
const distPath = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(distPath)) {
  console.log('Sirviendo frontend desde:', distPath);

  app.use(express.static(distPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log('Frontend no encontrado, solo API disponible');
}

// ============================================================
// ARRANQUE DEL SERVIDOR
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('Servidor corriendo en puerto ' + PORT);
  console.log(
    'Modo: ' + (process.env.NODE_ENV || 'development')
  );
  console.log('Conectado a Supabase: ' + supabaseUrl);
});
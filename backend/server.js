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
const SECRET_KEY = process.env.JWT_SECRET || 'tu_secreto_super_seguro_cambia_esto_en_produccion';

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ============================================================
// CONEXION A SUPABASE
// ============================================================
const supabaseUrl = 'https://rvnxajnpcszyzxlxamml.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_iXc0eIJjHPRxS1IRhTOg-Q_nwgpzEMr';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
console.log('Conectado a Supabase');

// ============================================================
// CREAR/ACTUALIZAR ADMIN AL INICIAR
// ============================================================
async function crearAdminSupabase() {
  const defaultPass = 'Chichicuilote1*';
  const hash = bcrypt.hashSync(defaultPass, 10);
  console.log('Verificando usuario admin...');

  const { data: existing } = await supabase
    .from('usuarios').select('id').eq('username', 'admin').maybeSingle();

  if (existing) {
    await supabase.from('usuarios').update({ password_hash: hash }).eq('username', 'admin');
    console.log('Admin actualizado.');
    return;
  }

  const { error } = await supabase
    .from('usuarios').insert({ username: 'admin', password_hash: hash });

  if (error) {
    console.log('Error creando admin:', error.message);
  } else {
    console.log('Admin creado. Contrasena:', defaultPass);
  }
}
crearAdminSupabase();

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================
function envioUnitario(p) {
  const envio = Number(p.costo_envio) || 0;
  const n = Math.max(Number(p.piezas_envio) || Number(p.piezas_compradas) || 1, 1);
  return envio / n;
}
function costoUnitario(p) {
  return (Number(p.precio_proveedor) || 0) + envioUnitario(p);
}
function gananciaUnitaria(p) {
  return (Number(p.precio_publico) || 0) - costoUnitario(p);
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
    return res.status(401).json({ error: 'Usuario o contrasena incorrectos' });
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Usuario o contrasena incorrectos' });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username },
    SECRET_KEY,
    { expiresIn: '7d' }
  );
  res.json({ token, username: user.username });
});

// ============================================================
// AUTENTICACION
// ============================================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
app.use('/api', authenticateToken);

// ============================================================
// RESUMEN (DASHBOARD) - CORREGIDO
// ============================================================
app.get('/api/resumen', async (req, res) => {
  try {
    const { data: perfumes } = await supabase.from('perfumes').select('*');
    const { data: ventas } = await supabase.from('ventas').select('*');

    const P = perfumes || [];
    const V = ventas || [];

    // Ventas por perfume
    const vendidasPorPerfume = {};
    V.forEach(v => {
      if (v.perfume_id) {
        vendidasPorPerfume[v.perfume_id] =
          (vendidasPorPerfume[v.perfume_id] || 0) + (Number(v.cantidad) || 0);
      }
    });

    let total_cobrado = 0;
    let por_cobrar = 0;
    let capital_en_inventario = 0;
    let capital_invertido = 0;
    let stock = 0;
    let valor_stock_publico = 0;
    let costo_de_lo_vendido = 0;

    // Calcular capital, stock y costo de lo vendido
    P.forEach(p => {
      const cu = costoUnitario(p);
      const compradas = Number(p.piezas_compradas) || 0;
      const vendidas = vendidasPorPerfume[p.id] || 0;
      const stk = Math.max(compradas - vendidas, 0);

      stock += stk;
      capital_en_inventario += cu * stk;
      capital_invertido += cu * compradas;
      valor_stock_publico += (Number(p.precio_publico) || 0) * stk;
      
      // Costo de lo que ya se vendió
      costo_de_lo_vendido += cu * vendidas;
    });

    // Calcular cobrado y por cobrar
    V.forEach(v => {
      const total = Number(v.total_venta) || 0;
      const abonado = Number(v.abonado) || 0;
      
      total_cobrado += abonado;
      por_cobrar += Math.max(total - abonado, 0);
    });

    // Calcular dinero en caja y ganancia realizada
    const dinero_en_caja = Math.max(0, total_cobrado - costo_de_lo_vendido);
    const ganancia_realizada = total_cobrado - costo_de_lo_vendido;

    res.json({
      dinero_en_caja,
      total_cobrado,
      costo_de_lo_vendido,
      por_cobrar,
      ganancia_realizada,
      capital_en_inventario,
      capital_invertido,
      stock,
      valor_stock_publico
    });
  } catch (error) {
    console.error('Error en /api/resumen:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PERFUMES (GET, POST, PUT, DELETE)
// ============================================================
app.get('/api/perfumes', async (req, res) => {
  const { data, error } = await supabase
    .from('perfumes').select('*').order('creado_en', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });

  const { data: ventas } = await supabase.from('ventas').select('*');
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
    stock: Math.max((Number(p.piezas_compradas) || 0) - (vendPor[p.id] || 0), 0),
    envio_unitario: envioUnitario(p),
    costo_unitario: costoUnitario(p),
    ganancia_unitaria: gananciaUnitaria(p),
    cobrado: cobPor[p.id] || 0,
    por_cobrar: pcPor[p.id] || 0
  }));
  res.json(resultado);
});

app.post('/api/perfumes', async (req, res) => {
  const {
    nombre, proveedor, precio_proveedor, precio_publico,
    piezas_compradas, costo_envio, piezas_envio, notas
  } = req.body;

  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

  const { data, error } = await supabase.from('perfumes').insert({
    nombre, proveedor,
    precio_proveedor: Number(precio_proveedor) || 0,
    precio_publico: Number(precio_publico) || 0,
    piezas_compradas: Number(piezas_compradas) || 1,
    costo_envio: Number(costo_envio) || 0,
    piezas_envio: Number(piezas_envio) || 1,
    notas
  }).select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data[0].id });
});

app.put('/api/perfumes/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nombre, proveedor, precio_proveedor, precio_publico,
    piezas_compradas, costo_envio, piezas_envio, notas
  } = req.body;

  const { data, error } = await supabase.from('perfumes').update({
    nombre, proveedor,
    precio_proveedor: Number(precio_proveedor) || 0,
    precio_publico: Number(precio_publico) || 0,
    piezas_compradas: Number(piezas_compradas) || 1,
    costo_envio: Number(costo_envio) || 0,
    piezas_envio: Number(piezas_envio) || 1,
    notas
  }).eq('id', id).select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data[0].id });
});

app.delete('/api/perfumes/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('perfumes').delete().eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// ============================================================
// VENTAS (GET, POST, PUT, DELETE)
// ============================================================
app.get('/api/ventas', async (req, res) => {
  const { data, error } = await supabase
    .from('ventas')
    .select('*, perfumes(nombre, proveedor), abonos(*)')
    .order('fecha', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });

  const resultado = (data || []).map(v => {
    const total = Number(v.total_venta) || 0;

    const abonadoExtra = (v.abonos || []).reduce(
      (s, a) => s + (Number(a.monto) || 0), 0
    );
    const abonado = (Number(v.abonado) || 0) + abonadoExtra;

    const resto = Math.max(total - abonado, 0);
    const pct_pagado = total > 0 ? Math.round((abonado / total) * 100) : 0;
    const liquidado = resto <= 0 && total > 0;

    return {
      ...v,
      abonos: v.abonos || [],
      abonado,
      perfume_nombre: v.perfumes?.nombre || '-',
      resto,
      liquidado,
      pct_pagado
    };
  });

  res.json(resultado);
});

app.post('/api/ventas', async (req, res) => {
  const {
    perfume_id, cliente, cantidad, precio_unitario,
    total_venta, tipo_pago, abonado, fecha, notas
  } = req.body;

  if (!perfume_id || !fecha) {
    return res.status(400).json({ error: 'Perfume y fecha requeridos' });
  }

  const { data, error } = await supabase.from('ventas').insert({
    perfume_id,
    cliente,
    cantidad: Number(cantidad) || 1,
    precio_unitario: Number(precio_unitario) || 0,
    total_venta: Number(total_venta) || 0,
    tipo_pago,
    abonado: Number(abonado) || 0,
    fecha,
    notas
  }).select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data[0].id });
});

app.put('/api/ventas/:id', async (req, res) => {
  const { id } = req.params;
  const {
    perfume_id, cliente, cantidad, precio_unitario,
    total_venta, tipo_pago, abonado, fecha, notas
  } = req.body;

  const { data, error } = await supabase.from('ventas').update({
    perfume_id,
    cliente,
    cantidad: Number(cantidad) || 1,
    precio_unitario: Number(precio_unitario) || 0,
    total_venta: Number(total_venta) || 0,
    tipo_pago,
    abonado: Number(abonado) || 0,
    fecha,
    notas
  }).eq('id', id).select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data[0].id });
});

app.delete('/api/ventas/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('ventas').delete().eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// ============================================================
// ABONOS (POST, PUT, DELETE)
// ============================================================
app.post('/api/ventas/:id/abonos', async (req, res) => {
  const venta_id = Number(req.params.id);
  const { monto, fecha, notas } = req.body;

  if (!monto || Number(monto) <= 0) {
    return res.status(400).json({ error: 'Monto invalido' });
  }
  if (!fecha) return res.status(400).json({ error: 'Fecha requerida' });

  const { data, error } = await supabase.from('abonos').insert({
    venta_id,
    monto: Number(monto),
    fecha,
    notas
  }).select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data[0].id });
});

app.put('/api/abonos/:id', async (req, res) => {
  const { id } = req.params;
  const { monto, fecha, notas } = req.body;

  if (!monto || Number(monto) <= 0) {
    return res.status(400).json({ error: 'Monto invalido' });
  }
  if (!fecha) return res.status(400).json({ error: 'Fecha requerida' });

  const { data, error } = await supabase.from('abonos').update({
    monto: Number(monto),
    fecha,
    notas
  }).eq('id', id).select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data[0].id });
});

app.delete('/api/abonos/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('abonos').delete().eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// ============================================================
// FONDO DE SOCIOS (GET, POST, PUT, DELETE)
// ============================================================
app.get('/api/fondo/movimientos', async (req, res) => {
  const { data, error } = await supabase
    .from('fondo_movimientos').select('*').order('fecha', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.post('/api/fondo/movimientos', async (req, res) => {
  const { concepto, monto, tipo, fecha, notas } = req.body;
  if (!concepto || !monto || !fecha) {
    return res.status(400).json({ error: 'Concepto, monto y fecha son obligatorios' });
  }
  const { data, error } = await supabase.from('fondo_movimientos').insert({
    concepto,
    monto: Number(monto),
    tipo,
    fecha,
    notas
  }).select();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data[0].id });
});

app.put('/api/fondo/movimientos/:id', async (req, res) => {
  const { id } = req.params;
  const { concepto, monto, tipo, fecha, notas } = req.body;
  if (!concepto || !monto || !fecha) {
    return res.status(400).json({ error: 'Concepto, monto y fecha son obligatorios' });
  }
  const { data, error } = await supabase.from('fondo_movimientos').update({
    concepto,
    monto: Number(monto),
    tipo,
    fecha,
    notas
  }).eq('id', id).select();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data[0].id });
});

app.delete('/api/fondo/movimientos/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('fondo_movimientos').delete().eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// ============================================================
// AHORRO CONFIG (GET, POST/UPSERT)
// ============================================================
app.get('/api/ahorro/config', async (req, res) => {
  const { data, error } = await supabase
    .from('ahorro_config').select('*').eq('id', 1).maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'No configurado' });
  res.json(data);
});

app.post('/api/ahorro/config', async (req, res) => {
  const { meta, descripcion } = req.body;
  if (!meta) return res.status(400).json({ error: 'Meta requerida' });

  const { data, error } = await supabase.from('ahorro_config').upsert({
    id: 1,
    meta: Number(meta),
    descripcion
  }).select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// ============================================================
// AHORRO MOVIMIENTOS (GET, POST, PUT, DELETE)
// ============================================================
app.get('/api/ahorro/movimientos', async (req, res) => {
  const { data, error } = await supabase
    .from('ahorro_movimientos').select('*').order('fecha', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.post('/api/ahorro/movimientos', async (req, res) => {
  const { tipo, monto, descripcion, fecha } = req.body;
  if (!tipo || !monto || !fecha) {
    return res.status(400).json({ error: 'Tipo, monto y fecha requeridos' });
  }
  const { data, error } = await supabase.from('ahorro_movimientos').insert({
    tipo,
    monto: Number(monto),
    descripcion,
    fecha
  }).select();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data[0].id });
});

app.put('/api/ahorro/movimientos/:id', async (req, res) => {
  const { id } = req.params;
  const { tipo, monto, descripcion, fecha } = req.body;
  if (!tipo || !monto || !fecha) {
    return res.status(400).json({ error: 'Tipo, monto y fecha requeridos' });
  }
  const { data, error } = await supabase.from('ahorro_movimientos').update({
    tipo,
    monto: Number(monto),
    descripcion,
    fecha
  }).eq('id', id).select();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data[0].id });
});

app.delete('/api/ahorro/movimientos/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('ahorro_movimientos').delete().eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// ============================================================
// SERVIDOR FRONTEND
// ============================================================
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  console.log('Sirviendo frontend desde:', distPath);
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
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
  console.log('Modo: ' + (process.env.NODE_ENV || 'development'));
  console.log('Conectado a Supabase: ' + supabaseUrl);
});
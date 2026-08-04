const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const isProduction = process.env.NODE_ENV === 'production';
const dbPath = isProduction 
  ? '/tmp/parfum_eclat.db' 
  : path.join(__dirname, 'parfum_eclat.db');

if (isProduction) {
  const originalDb = path.join(__dirname, 'parfum_eclat.db');
  if (fs.existsSync(originalDb)) {
    try {
      fs.copyFileSync(originalDb, dbPath);
      console.log('Base de datos copiada a /tmp');
    } catch (err) {
      console.warn('No se pudo copiar DB:', err.message);
    }
  }
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS perfumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    proveedor TEXT DEFAULT '',
    precio_proveedor REAL NOT NULL DEFAULT 0,
    precio_publico REAL NOT NULL DEFAULT 0,
    piezas_compradas INTEGER NOT NULL DEFAULT 1,
    costo_envio REAL NOT NULL DEFAULT 0,
    piezas_envio INTEGER NOT NULL DEFAULT 1,
    notas TEXT DEFAULT '',
    creado_en TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    perfume_id INTEGER NOT NULL,
    cliente TEXT DEFAULT '',
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario REAL NOT NULL DEFAULT 0,
    total_venta REAL NOT NULL DEFAULT 0,
    tipo_pago TEXT NOT NULL DEFAULT 'contado' CHECK(tipo_pago IN ('contado','abonos')),
    abonado REAL NOT NULL DEFAULT 0,
    fecha TEXT NOT NULL,
    notas TEXT DEFAULT '',
    creado_en TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (perfume_id) REFERENCES perfumes(id)
  );

  CREATE TABLE IF NOT EXISTS abonos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    monto REAL NOT NULL,
    fecha TEXT NOT NULL,
    notas TEXT DEFAULT '',
    creado_en TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (venta_id) REFERENCES ventas(id)
  );

  CREATE TABLE IF NOT EXISTS ahorro_config (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    meta REAL NOT NULL DEFAULT 0,
    descripcion TEXT DEFAULT '',
    actualizado TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS ahorro_movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK(tipo IN ('deposito','retiro')),
    monto REAL NOT NULL,
    descripcion TEXT DEFAULT '',
    fecha TEXT NOT NULL,
    creado_en TEXT DEFAULT (datetime('now','localtime'))
  );
`);

function hasColumn(table, col) {
  try {
    return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col);
  } catch {
    return false;
  }
}

try {
  if (!hasColumn('perfumes', 'piezas_envio')) {
    db.exec(`ALTER TABLE perfumes ADD COLUMN piezas_envio INTEGER NOT NULL DEFAULT 1`);
    db.exec(`UPDATE perfumes SET piezas_envio = CASE WHEN piezas_compradas > 0 THEN piezas_compradas ELSE 1 END`);
  }
  if (!hasColumn('perfumes', 'creado_en')) {
    db.exec(`ALTER TABLE perfumes ADD COLUMN creado_en TEXT DEFAULT (datetime('now','localtime'))`);
  }
  if (hasColumn('perfumes', 'precio_mayoreo') && hasColumn('perfumes', 'precio_proveedor')) {
    db.exec(`UPDATE perfumes SET precio_proveedor = COALESCE(NULLIF(precio_proveedor, 0), precio_mayoreo, 0)`);
  }
} catch (e) {
  console.warn('Migracion:', e.message);
}

function envioUnitario(p) {
  const envio = Number(p.costo_envio) || 0;
  const n = Math.max(Number(p.piezas_envio) || Number(p.piezas_compradas) || 1, 1);
  return envio / n;
}

function costoUnitario(p) {
  return (Number(p.precio_proveedor) || 0) + envioUnitario(p);
}

function enrichVenta(v) {
  const total = Number(v.total_venta) || 0;
  const abonado = Number(v.abonado) || 0;
  const resto = Math.max(0, +(total - abonado).toFixed(2));
  return {
    ...v,
    resto,
    liquidado: resto <= 0.009,
    pct_pagado: total > 0 ? Math.min(100, Math.round((abonado / total) * 100)) : 0,
  };
}

function enrichPerfume(p) {
  const vendidos = db.prepare(
    'SELECT COALESCE(SUM(cantidad),0) as c FROM ventas WHERE perfume_id = ?'
  ).get(p.id).c;

  const cobrado = db.prepare(
    'SELECT COALESCE(SUM(abonado),0) as t FROM ventas WHERE perfume_id = ?'
  ).get(p.id).t;

  const totalVendido = db.prepare(
    'SELECT COALESCE(SUM(total_venta),0) as t FROM ventas WHERE perfume_id = ?'
  ).get(p.id).t;

  const porCobrar = db.prepare(
    'SELECT COALESCE(SUM(total_venta - abonado),0) as t FROM ventas WHERE perfume_id = ? AND abonado < total_venta'
  ).get(p.id).t;

  const cu = costoUnitario(p);
  const eu = envioUnitario(p);
  const piezas = Number(p.piezas_compradas) || 0;
  const stock = piezas - vendidos;
  const gananciaUnit = (Number(p.precio_publico) || 0) - cu;

  return {
    ...p,
    envio_unitario: eu,
    costo_unitario: cu,
    ganancia_unitaria: gananciaUnit,
    vendidos,
    stock,
    cobrado,
    total_vendido_acordado: totalVendido,
    por_cobrar: Math.max(0, porCobrar),
    valor_stock_costo: cu * Math.max(0, stock),
    valor_stock_publico: (Number(p.precio_publico) || 0) * Math.max(0, stock),
    capital_invertido: cu * piezas,
    ganancia_realizada: cobrado - cu * vendidos,
  };
}

function resumenGlobal() {
  const perfumes = db.prepare('SELECT * FROM perfumes').all().map(enrichPerfume);
  const ventas = db.prepare('SELECT * FROM ventas').all().map(enrichVenta);

  const capitalInvertido = perfumes.reduce((s, p) => s + p.capital_invertido, 0);
  const valorStockCosto = perfumes.reduce((s, p) => s + p.valor_stock_costo, 0);
  const valorStockPublico = perfumes.reduce((s, p) => s + p.valor_stock_publico, 0);
  const totalCobrado = ventas.reduce((s, v) => s + (Number(v.abonado) || 0), 0);
  const porCobrar = ventas.reduce((s, v) => s + (Number(v.resto) || 0), 0);
  const totalAcordado = ventas.reduce((s, v) => s + (Number(v.total_venta) || 0), 0);
  const piezasCompradas = perfumes.reduce((s, p) => s + (Number(p.piezas_compradas) || 0), 0);
  const piezasVendidas = perfumes.reduce((s, p) => s + p.vendidos, 0);
  const stock = piezasCompradas - piezasVendidas;

  let costoVendido = 0;
  for (const p of perfumes) costoVendido += p.costo_unitario * p.vendidos;

  const gananciaRealizada = totalCobrado - costoVendido;
  const dineroEnCaja = totalCobrado;
  const capitalEnInventario = valorStockCosto;

  return {
    num_perfumes: perfumes.length,
    piezas_compradas: piezasCompradas,
    piezas_vendidas: piezasVendidas,
    stock,
    capital_invertido: capitalInvertido,
    capital_en_inventario: capitalEnInventario,
    valor_stock_publico: valorStockPublico,
    total_acordado: totalAcordado,
    total_cobrado: totalCobrado,
    por_cobrar: porCobrar,
    costo_vendido: costoVendido,
    ganancia_realizada: gananciaRealizada,
    dinero_en_caja: dineroEnCaja,
    potencial_total: totalCobrado + porCobrar + valorStockPublico - capitalEnInventario,
  };
}

app.get('/api/resumen', (req, res) => {
  res.json(resumenGlobal());
});

app.get('/api/perfumes', (req, res) => {
  const order = hasColumn('perfumes', 'creado_en')
    ? 'ORDER BY creado_en DESC, id DESC'
    : 'ORDER BY id DESC';
  const rows = db.prepare(`SELECT * FROM perfumes ${order}`).all();
  res.json(rows.map(enrichPerfume));
});

app.post('/api/perfumes', (req, res) => {
  try {
    const {
      nombre, proveedor, precio_proveedor, precio_publico,
      piezas_compradas, costo_envio, piezas_envio, notas,
    } = req.body;

    if (!nombre) return res.status(400).json({ error: 'Nombre del perfume requerido' });

    const piezas = Math.max(parseInt(piezas_compradas, 10) || 1, 1);
    const pEnvio = Math.max(parseInt(piezas_envio, 10) || piezas, 1);
    const envio = Math.max(Number(costo_envio) || 0, 0);

    const r = db.prepare(`
      INSERT INTO perfumes
        (nombre, proveedor, precio_proveedor, precio_publico, piezas_compradas, costo_envio, piezas_envio, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nombre,
      proveedor || '',
      Number(precio_proveedor) || 0,
      Number(precio_publico) || 0,
      piezas,
      envio,
      pEnvio,
      notas || ''
    );
    res.json({ id: r.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/perfumes/:id', (req, res) => {
  try {
    const {
      nombre, proveedor, precio_proveedor, precio_publico,
      piezas_compradas, costo_envio, piezas_envio, notas,
    } = req.body;
    const piezas = Math.max(parseInt(piezas_compradas, 10) || 1, 1);
    const pEnvio = Math.max(parseInt(piezas_envio, 10) || piezas, 1);

    db.prepare(`
      UPDATE perfumes SET
        nombre=?, proveedor=?, precio_proveedor=?, precio_publico=?,
        piezas_compradas=?, costo_envio=?, piezas_envio=?, notas=?
      WHERE id=?
    `).run(
      nombre,
      proveedor || '',
      Number(precio_proveedor) || 0,
      Number(precio_publico) || 0,
      piezas,
      Math.max(Number(costo_envio) || 0, 0),
      pEnvio,
      notas || '',
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/perfumes/:id', (req, res) => {
  try {
    const id = req.params.id;
    db.transaction(() => {
      const ventas = db.prepare('SELECT id FROM ventas WHERE perfume_id = ?').all(id);
      for (const v of ventas) {
        db.prepare('DELETE FROM abonos WHERE venta_id = ?').run(v.id);
      }
      db.prepare('DELETE FROM ventas WHERE perfume_id = ?').run(id);
      db.prepare('DELETE FROM perfumes WHERE id = ?').run(id);
    })();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/ventas', (req, res) => {
  const rows = db.prepare(`
    SELECT v.*, p.nombre as perfume_nombre, p.proveedor
    FROM ventas v
    JOIN perfumes p ON p.id = v.perfume_id
    ORDER BY v.fecha DESC, v.id DESC
  `).all().map(v => {
    const enr = enrichVenta(v);
    const abonos = db.prepare(
      'SELECT * FROM abonos WHERE venta_id = ? ORDER BY fecha DESC, id DESC'
    ).all(v.id);
    return { ...enr, abonos };
  });
  res.json(rows);
});

app.post('/api/ventas', (req, res) => {
  try {
    const {
      perfume_id, cliente, cantidad, precio_unitario,
      total_venta, tipo_pago, abonado, fecha, notas,
    } = req.body;

    if (!perfume_id || !fecha) {
      return res.status(400).json({ error: 'Perfume y fecha son requeridos' });
    }

    const perfume = db.prepare('SELECT * FROM perfumes WHERE id = ?').get(perfume_id);
    if (!perfume) return res.status(404).json({ error: 'Perfume no encontrado' });

    const qty = Math.max(parseInt(cantidad, 10) || 1, 1);
    const vendidos = db.prepare(
      'SELECT COALESCE(SUM(cantidad),0) as c FROM ventas WHERE perfume_id = ?'
    ).get(perfume_id).c;
    const stock = (Number(perfume.piezas_compradas) || 0) - vendidos;
    if (qty > stock) {
      return res.status(400).json({ error: `Stock insuficiente. Disponible: ${stock}` });
    }

    const unit = Number(precio_unitario) || Number(perfume.precio_publico) || 0;
    const total = Number(total_venta) || unit * qty;
    const tipo = tipo_pago === 'abonos' ? 'abonos' : 'contado';
    let abon = Number(abonado);
    if (Number.isNaN(abon) || abonado === undefined || abonado === null || abonado === '') {
      abon = tipo === 'contado' ? total : 0;
    }
    abon = Math.min(Math.max(0, abon), total);

    const id = db.transaction(() => {
      const r = db.prepare(`
        INSERT INTO ventas
          (perfume_id, cliente, cantidad, precio_unitario, total_venta, tipo_pago, abonado, fecha, notas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(perfume_id, cliente || '', qty, unit, total, tipo, abon, fecha, notas || '');

      if (abon > 0) {
        db.prepare(`
          INSERT INTO abonos (venta_id, monto, fecha, notas) VALUES (?, ?, ?, ?)
        `).run(r.lastInsertRowid, abon, fecha, tipo === 'contado' ? 'Pago completo' : 'Abono inicial');
      }
      return r.lastInsertRowid;
    })();

    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/ventas/:id', (req, res) => {
  try {
    const v = db.prepare('SELECT * FROM ventas WHERE id = ?').get(req.params.id);
    if (!v) return res.status(404).json({ error: 'Venta no encontrada' });

    const { cliente, cantidad, precio_unitario, total_venta, tipo_pago, fecha, notas } = req.body;
    const qty = Math.max(parseInt(cantidad ?? v.cantidad, 10) || 1, 1);
    const unit = Number(precio_unitario ?? v.precio_unitario) || 0;
    const total = Number(total_venta) || unit * qty;
    const tipo = tipo_pago === 'abonos' ? 'abonos' : (tipo_pago === 'contado' ? 'contado' : v.tipo_pago);
    const abonado = Math.min(Number(v.abonado) || 0, total);

    db.prepare(`
      UPDATE ventas SET cliente=?, cantidad=?, precio_unitario=?, total_venta=?, tipo_pago=?, abonado=?, fecha=?, notas=?
      WHERE id=?
    `).run(
      cliente ?? v.cliente,
      qty,
      unit,
      total,
      tipo,
      abonado,
      fecha || v.fecha,
      notas ?? v.notas,
      req.params.id
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/ventas/:id', (req, res) => {
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM abonos WHERE venta_id = ?').run(req.params.id);
      db.prepare('DELETE FROM ventas WHERE id = ?').run(req.params.id);
    })();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/ventas/:id/abonos', (req, res) => {
  try {
    const venta = db.prepare('SELECT * FROM ventas WHERE id = ?').get(req.params.id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

    const { monto, fecha, notas } = req.body;
    const m = Number(monto);
    if (!m || m <= 0) return res.status(400).json({ error: 'Monto invalido' });
    if (!fecha) return res.status(400).json({ error: 'Fecha requerida' });

    const resto = (Number(venta.total_venta) || 0) - (Number(venta.abonado) || 0);
    if (m > resto + 0.01) {
      return res.status(400).json({ error: `No puede superar el resto ($${resto.toFixed(2)})` });
    }

    const id = db.transaction(() => {
      const r = db.prepare(
        'INSERT INTO abonos (venta_id, monto, fecha, notas) VALUES (?, ?, ?, ?)'
      ).run(venta.id, m, fecha, notas || '');
      db.prepare('UPDATE ventas SET abonado = abonado + ? WHERE id = ?').run(m, venta.id);
      return r.lastInsertRowid;
    })();

    const updated = enrichVenta(db.prepare('SELECT * FROM ventas WHERE id = ?').get(venta.id));
    res.json({ id, venta: updated });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/abonos/:id', (req, res) => {
  try {
    const abono = db.prepare('SELECT * FROM abonos WHERE id = ?').get(req.params.id);
    if (!abono) return res.status(404).json({ error: 'Abono no encontrado' });
    db.transaction(() => {
      db.prepare('DELETE FROM abonos WHERE id = ?').run(abono.id);
      db.prepare('UPDATE ventas SET abonado = MAX(0, abonado - ?) WHERE id = ?').run(abono.monto, abono.venta_id);
    })();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/ahorro/config', (req, res) => {
  const row = db.prepare('SELECT * FROM ahorro_config WHERE id = 1').get();
  if (!row) return res.status(404).json({ error: 'No configurado' });
  res.json(row);
});

app.post('/api/ahorro/config', (req, res) => {
  const { meta, descripcion } = req.body;
  db.prepare(`
    INSERT INTO ahorro_config (id, meta, descripcion) VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET meta=excluded.meta, descripcion=excluded.descripcion,
      actualizado=datetime('now','localtime')
  `).run(meta, descripcion || '');
  res.json({ ok: true });
});

app.get('/api/ahorro/movimientos', (req, res) => {
  res.json(db.prepare('SELECT * FROM ahorro_movimientos ORDER BY fecha DESC, creado_en DESC').all());
});

app.post('/api/ahorro/movimientos', (req, res) => {
  const { tipo, monto, descripcion, fecha } = req.body;
  const r = db.prepare(
    'INSERT INTO ahorro_movimientos (tipo, monto, descripcion, fecha) VALUES (?, ?, ?, ?)'
  ).run(tipo, monto, descripcion || '', fecha);
  res.json({ id: r.lastInsertRowid });
});

app.delete('/api/ahorro/movimientos/:id', (req, res) => {
  db.prepare('DELETE FROM ahorro_movimientos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Base de datos: ${dbPath}`);
});
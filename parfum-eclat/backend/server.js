const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const multer = require('multer');
//const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// DB setup
const db = new Database(path.join(__dirname, 'parfum_eclat.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS inversiones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    fecha TEXT NOT NULL,
    inversion_total REAL NOT NULL DEFAULT 6000,
    aporte_yo REAL NOT NULL DEFAULT 3000,
    aporte_socio REAL NOT NULL DEFAULT 3000,
    meta_ganancia REAL NOT NULL DEFAULT 0,
    notas TEXT,
    creado_en TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS perfumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inversion_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    precio_mayoreo REAL NOT NULL,
    costo_envio REAL NOT NULL DEFAULT 0,
    precio_publico REAL NOT NULL,
    piezas_compradas INTEGER NOT NULL DEFAULT 1,
    piezas_vendidas INTEGER NOT NULL DEFAULT 0,
    notas TEXT,
    FOREIGN KEY (inversion_id) REFERENCES inversiones(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    perfume_id INTEGER NOT NULL,
    inversion_id INTEGER NOT NULL,
    cliente TEXT,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_venta REAL NOT NULL,
    fecha TEXT NOT NULL,
    pagado INTEGER NOT NULL DEFAULT 1,
    notas TEXT,
    creado_en TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (perfume_id) REFERENCES perfumes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pendientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK(tipo IN ('cobrar','pagar')),
    descripcion TEXT NOT NULL,
    monto REAL NOT NULL,
    persona TEXT,
    inversion_id INTEGER,
    resuelto INTEGER NOT NULL DEFAULT 0,
    fecha TEXT NOT NULL,
    FOREIGN KEY (inversion_id) REFERENCES inversiones(id)
  );
`);

const upload = multer({ dest: 'uploads/' });

// ── INVERSIONES ──────────────────────────────────────────────────────────────

app.get('/api/inversiones', (req, res) => {
  const inversiones = db.prepare(`
    SELECT i.*,
      COALESCE(SUM(p.precio_mayoreo + p.costo_envio) * p.piezas_compradas, 0) as costo_total,
      COUNT(DISTINCT p.id) as num_perfumes
    FROM inversiones i
    LEFT JOIN perfumes p ON p.inversion_id = i.id
    GROUP BY i.id
    ORDER BY i.creado_en DESC
  `).all();

  const result = inversiones.map(inv => {
    const ventas = db.prepare(`
      SELECT COALESCE(SUM(v.precio_venta * v.cantidad), 0) as total_vendido,
             COALESCE(SUM(v.cantidad), 0) as piezas_vendidas
      FROM ventas v WHERE v.inversion_id = ?
    `).get(inv.id);

    const costoInv = db.prepare(`
      SELECT COALESCE(SUM((p.precio_mayoreo + p.costo_envio) * p.piezas_compradas), 0) as total
      FROM perfumes p WHERE p.inversion_id = ?
    `).get(inv.id);

    return {
      ...inv,
      total_vendido: ventas.total_vendido,
      piezas_vendidas_total: ventas.piezas_vendidas,
      costo_inventario: costoInv.total,
      ganancia_neta: ventas.total_vendido - costoInv.total
    };
  });

  res.json(result);
});

app.get('/api/inversiones/:id', (req, res) => {
  const inv = db.prepare('SELECT * FROM inversiones WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'No encontrada' });

  const perfumes = db.prepare(`
    SELECT p.*,
      COALESCE((SELECT SUM(v.cantidad) FROM ventas v WHERE v.perfume_id = p.id), 0) as vendidos,
      COALESCE((SELECT SUM(v.precio_venta * v.cantidad) FROM ventas v WHERE v.perfume_id = p.id), 0) as ingresos
    FROM perfumes p WHERE p.inversion_id = ?
  `).all(inv.id);

  const ventas = db.prepare('SELECT * FROM ventas WHERE inversion_id = ? ORDER BY fecha DESC').all(inv.id);
  const pendientes = db.prepare('SELECT * FROM pendientes WHERE inversion_id = ? ORDER BY fecha DESC').all(inv.id);

  res.json({ ...inv, perfumes, ventas, pendientes });
});

app.post('/api/inversiones', (req, res) => {
  const { nombre, fecha, inversion_total, aporte_yo, aporte_socio, meta_ganancia, notas } = req.body;
  const stmt = db.prepare(`
    INSERT INTO inversiones (nombre, fecha, inversion_total, aporte_yo, aporte_socio, meta_ganancia, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(nombre, fecha, inversion_total || 6000, aporte_yo || 3000, aporte_socio || 3000, meta_ganancia || 0, notas || '');
  res.json({ id: result.lastInsertRowid, ...req.body });
});

app.put('/api/inversiones/:id', (req, res) => {
  const { nombre, fecha, inversion_total, aporte_yo, aporte_socio, meta_ganancia, notas } = req.body;
  db.prepare(`
    UPDATE inversiones SET nombre=?, fecha=?, inversion_total=?, aporte_yo=?, aporte_socio=?, meta_ganancia=?, notas=?
    WHERE id=?
  `).run(nombre, fecha, inversion_total, aporte_yo, aporte_socio, meta_ganancia, notas, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/inversiones/:id', (req, res) => {
  db.prepare('DELETE FROM inversiones WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── PERFUMES ─────────────────────────────────────────────────────────────────

app.post('/api/perfumes', (req, res) => {
  const { inversion_id, nombre, precio_mayoreo, costo_envio, precio_publico, piezas_compradas, notas } = req.body;
  const result = db.prepare(`
    INSERT INTO perfumes (inversion_id, nombre, precio_mayoreo, costo_envio, precio_publico, piezas_compradas, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(inversion_id, nombre, precio_mayoreo, costo_envio || 0, precio_publico, piezas_compradas || 1, notas || '');
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/perfumes/:id', (req, res) => {
  const { nombre, precio_mayoreo, costo_envio, precio_publico, piezas_compradas, notas } = req.body;
  db.prepare(`
    UPDATE perfumes SET nombre=?, precio_mayoreo=?, costo_envio=?, precio_publico=?, piezas_compradas=?, notas=?
    WHERE id=?
  `).run(nombre, precio_mayoreo, costo_envio || 0, precio_publico, piezas_compradas, notas || '', req.params.id);
  res.json({ ok: true });
});

app.delete('/api/perfumes/:id', (req, res) => {
  db.prepare('DELETE FROM perfumes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── VENTAS ────────────────────────────────────────────────────────────────────

app.post('/api/ventas', (req, res) => {
  const { perfume_id, inversion_id, cliente, cantidad, precio_venta, fecha, pagado, notas } = req.body;
  const result = db.prepare(`
    INSERT INTO ventas (perfume_id, inversion_id, cliente, cantidad, precio_venta, fecha, pagado, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(perfume_id, inversion_id, cliente || '', cantidad || 1, precio_venta, fecha, pagado !== false ? 1 : 0, notas || '');
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/ventas/:id', (req, res) => {
  db.prepare('DELETE FROM ventas WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── PENDIENTES ────────────────────────────────────────────────────────────────

app.get('/api/pendientes', (req, res) => {
  const rows = db.prepare('SELECT * FROM pendientes WHERE resuelto = 0 ORDER BY fecha DESC').all();
  res.json(rows);
});

app.post('/api/pendientes', (req, res) => {
  const { tipo, descripcion, monto, persona, inversion_id, fecha } = req.body;
  const result = db.prepare(`
    INSERT INTO pendientes (tipo, descripcion, monto, persona, inversion_id, fecha)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tipo, descripcion, monto, persona || '', inversion_id || null, fecha);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/pendientes/:id/resolver', (req, res) => {
  db.prepare('UPDATE pendientes SET resuelto = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.delete('/api/pendientes/:id', (req, res) => {
  db.prepare('DELETE FROM pendientes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

app.get('/api/dashboard', (req, res) => {
  const totalInversiones = db.prepare('SELECT COUNT(*) as c FROM inversiones').get().c;
  const totalVendido = db.prepare('SELECT COALESCE(SUM(precio_venta * cantidad), 0) as t FROM ventas').get().t;
  const totalCosto = db.prepare('SELECT COALESCE(SUM((precio_mayoreo + costo_envio) * piezas_compradas), 0) as t FROM perfumes').get().t;
  const pendientesCobrar = db.prepare("SELECT COALESCE(SUM(monto), 0) as t FROM pendientes WHERE tipo='cobrar' AND resuelto=0").get().t;
  const pendientesPagar = db.prepare("SELECT COALESCE(SUM(monto), 0) as t FROM pendientes WHERE tipo='pagar' AND resuelto=0").get().t;
  const ultimasVentas = db.prepare(`
    SELECT v.*, p.nombre as perfume_nombre, i.nombre as inversion_nombre
    FROM ventas v
    JOIN perfumes p ON v.perfume_id = p.id
    JOIN inversiones i ON v.inversion_id = i.id
    ORDER BY v.creado_en DESC LIMIT 5
  `).all();

  res.json({
    totalInversiones,
    totalVendido,
    totalCosto,
    gananciaTotal: totalVendido - totalCosto,
    pendientesCobrar,
    pendientesPagar,
    ultimasVentas
  });
});

// ── IMPORT EXCEL ──────────────────────────────────────────────────────────────

app.post('/api/importar', (req, res) => {
  return res.status(501).json({
    ok: false,
    error: 'Importación de Excel deshabilitada temporalmente'
  });
});
// ── AHORRO ────────────────────────────────────────────────────────────────────

db.exec(`
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

app.get('/api/ahorro/config', (req, res) => {
  const row = db.prepare('SELECT * FROM ahorro_config WHERE id = 1').get();
  if (!row) return res.status(404).json({ error: 'No configurado' });
  res.json(row);
});

app.post('/api/ahorro/config', (req, res) => {
  const { meta, descripcion } = req.body;
  db.prepare(`
    INSERT INTO ahorro_config (id, meta, descripcion) VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET meta=excluded.meta, descripcion=excluded.descripcion, actualizado=datetime('now','localtime')
  `).run(meta, descripcion || '');
  res.json({ ok: true });
});

app.get('/api/ahorro/movimientos', (req, res) => {
  const rows = db.prepare('SELECT * FROM ahorro_movimientos ORDER BY fecha DESC, creado_en DESC').all();
  res.json(rows);
});

app.post('/api/ahorro/movimientos', (req, res) => {
  const { tipo, monto, descripcion, fecha } = req.body;
  const result = db.prepare(`
    INSERT INTO ahorro_movimientos (tipo, monto, descripcion, fecha) VALUES (?, ?, ?, ?)
  `).run(tipo, monto, descripcion || '', fecha);
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/ahorro/movimientos/:id', (req, res) => {
  db.prepare('DELETE FROM ahorro_movimientos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`✅ Parfum Eclat API corriendo en puerto ${PORT}`);
});
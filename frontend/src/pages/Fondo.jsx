import { useState, useEffect } from 'react';
import { Plus, X, Trash2, Wallet, Pencil } from 'lucide-react';
import { api, fmt, fmtDate } from '../api';

const hoy = new Date().toISOString().split('T')[0];

const emptyMovimiento = {
  concepto: '',
  monto: '',
  tipo: 'retiro',
  fecha: hoy,
  notas: '',
};

export default function Fondo() {
  const [movimientos, setMovimientos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyMovimiento);
  const [error, setError] = useState('');

  const load = async () => {
    const data = await api.get('/fondo/movimientos');
    setMovimientos(data);
  };

  useEffect(() => { load(); }, []);

  const sf = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const totalRetirado = movimientos
    .filter(m => m.tipo === 'retiro')
    .reduce((sum, m) => sum + (Number(m.monto) || 0), 0);
  const totalIngresado = movimientos
    .filter(m => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + (Number(m.monto) || 0), 0);
  const saldoActual = totalIngresado - totalRetirado;

  const openNew = () => {
    setError('');
    setEditId(null);
    setForm({ ...emptyMovimiento, fecha: hoy });
    setShowModal(true);
  };

  const openEdit = (m) => {
    setError('');
    setEditId(m.id);
    setForm({
      concepto: m.concepto || '',
      monto: m.monto ?? '',
      tipo: m.tipo || 'retiro',
      fecha: m.fecha || hoy,
      notas: m.notas || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.concepto || !form.monto || !form.fecha) {
      setError('Concepto, monto y fecha son obligatorios');
      return;
    }
    const res = editId
      ? await api.put(`/fondo/movimientos/${editId}`, form)
      : await api.post('/fondo/movimientos', form);
    if (res.error) { setError(res.error); return; }
    await load();
    setShowModal(false);
    setEditId(null);
    setForm(emptyMovimiento);
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminar este movimiento del fondo?')) return;
    await api.delete(`/fondo/movimientos/${id}`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="ornament">* * *</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            Fondo <span>de Socios</span>
          </h1>
          <div className="label" style={{ marginTop: 6 }}>Control de retiros e ingresos entre socios</div>
        </div>
        <button className="btn btn-gold" onClick={openNew}>
          <Plus size={14} /> Registrar Movimiento
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}>
        <div className="stat-card">
          <div className="label">Saldo Actual del Fondo</div>
          <div className="stat-value" style={{ color: saldoActual >= 0 ? '#4a8c6a' : '#c45c5c' }}>
            {fmt(saldoActual)}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Total Retirado (Pellizcos)</div>
          <div className="stat-value" style={{ color: '#c45c5c' }}>{fmt(totalRetirado)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Ingresado (Devuelto)</div>
          <div className="stat-value" style={{ color: '#4a8c6a' }}>{fmt(totalIngresado)}</div>
        </div>
      </div>

      <div className="card">
        <div className="flex-between" style={{ marginBottom: 14 }}>
          <span className="section-title">Historial del Fondo</span>
        </div>
        {movimientos.length === 0 ? (
          <div className="empty-state">
            <Wallet size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <p>No hay movimientos registrados en el fondo.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map(m => (
                  <tr key={m.id}>
                    <td>{fmtDate(m.fecha)}</td>
                    <td style={{ color: 'var(--cream)', fontWeight: 500 }}>{m.concepto}</td>
                    <td>
                      <span className={`badge ${m.tipo === 'ingreso' ? 'badge-green' : 'badge-red'}`}>
                        {m.tipo === 'ingreso' ? 'Ingreso' : 'Retiro'}
                      </span>
                    </td>
                    <td className={m.tipo === 'ingreso' ? 'td-green' : 'td-red'}>
                      {m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.monto)}
                    </td>
                    <td className="td-muted">{m.notas || '-'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn-icon" title="Editar" onClick={() => openEdit(m)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn-icon" title="Eliminar" onClick={() => handleDelete(m.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {editId ? 'Editar Movimiento del Fondo' : 'Registrar Movimiento del Fondo'}
              </div>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
              <div className="form-group">
                <label className="form-label">Concepto *</label>
                <input
                  className="form-input"
                  value={form.concepto}
                  onChange={e => sf('concepto', e.target.value)}
                  placeholder="Ej: Prestamo para viaje, Fondas para perfumes..."
                  autoFocus
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <select className="form-input" value={form.tipo} onChange={e => sf('tipo', e.target.value)}>
                    <option value="retiro">Retiro (Sacamos dinero)</option>
                    <option value="ingreso">Ingreso (Devolvimos dinero)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Monto ($) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.monto}
                    onChange={e => sf('monto', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input type="date" className="form-input" value={form.fecha} onChange={e => sf('fecha', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Notas (opcional)</label>
                <input
                  className="form-input"
                  value={form.notas}
                  onChange={e => sf('notas', e.target.value)}
                  placeholder="Detalles adicionales..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-gold" onClick={handleSubmit}>
                {editId ? 'Guardar cambios' : 'Guardar Movimiento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
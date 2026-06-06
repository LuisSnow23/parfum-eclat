import { useState, useEffect } from 'react'
import { Plus, X, CheckCircle, Trash2 } from 'lucide-react'
import { api, fmt, fmtDate } from '../api'

const hoy = new Date().toISOString().split('T')[0]

const emptyForm = { tipo: 'cobrar', descripcion: '', monto: '', persona: '', fecha: hoy }

export default function Pendientes() {
  const [pendientes, setPendientes] = useState([])
  const [inversiones, setInversiones] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [filtro, setFiltro] = useState('todos') // todos | cobrar | pagar

  const load = () => {
    api.get('/pendientes').then(setPendientes)
    api.get('/inversiones').then(setInversiones)
  }
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.descripcion || !form.monto) return
    await api.post('/pendientes', form)
    await load()
    setShowModal(false)
    setForm(emptyForm)
  }

  const resolver = async (id) => {
    await api.put(`/pendientes/${id}/resolver`)
    load()
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este pendiente?')) return
    await api.delete(`/pendientes/${id}`)
    load()
  }

  const filtrados = pendientes.filter(p => filtro === 'todos' ? true : p.tipo === filtro)
  const totalCobrar = pendientes.filter(p => p.tipo === 'cobrar').reduce((s, p) => s + p.monto, 0)
  const totalPagar = pendientes.filter(p => p.tipo === 'pagar').reduce((s, p) => s + p.monto, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="ornament">✦ ✦ ✦</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            <span>Pendientes</span>
          </h1>
          <div className="label" style={{ marginTop: 6 }}>Cobros y pagos pendientes</div>
        </div>
        <button className="btn btn-gold" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Nuevo Pendiente
        </button>
      </div>

      {/* Resumen */}
      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 28 }}>
        <div className="stat-card">
          <div className="label">Por Cobrar</div>
          <div className="stat-value gold">{fmt(totalCobrar)}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--cream-dim)', marginTop: 4 }}>
            {pendientes.filter(p => p.tipo === 'cobrar').length} pendientes
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Por Pagar</div>
          <div className="stat-value red">{fmt(totalPagar)}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--cream-dim)', marginTop: 4 }}>
            {pendientes.filter(p => p.tipo === 'pagar').length} pendientes
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Balance Neto</div>
          <div className={`stat-value ${totalCobrar - totalPagar >= 0 ? 'green' : 'red'}`}>
            {fmt(totalCobrar - totalPagar)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--cream-dim)', marginTop: 4 }}>
            {totalCobrar - totalPagar >= 0 ? 'A tu favor' : 'En contra'}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2" style={{ marginBottom: 20 }}>
        {['todos', 'cobrar', 'pagar'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filtro === f ? 'btn-gold' : 'btn-outline'}`}
            onClick={() => setFiltro(f)}
          >
            {f === 'todos' ? 'Todos' : f === 'cobrar' ? 'Por cobrar' : 'Por pagar'}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>✨</div>
            <div className="section-title">Sin pendientes</div>
            <p>{filtro === 'todos' ? 'No hay cobros ni pagos pendientes.' : `No hay pendientes de tipo "${filtro}".`}</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtrados.map(p => (
            <div key={p.id} className="card" style={{ padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div className="flex gap-2" style={{ alignItems: 'center', marginBottom: 5 }}>
                  <span className={`badge ${p.tipo === 'cobrar' ? 'badge-gold' : 'badge-red'}`}>
                    {p.tipo === 'cobrar' ? '↓ Por cobrar' : '↑ Por pagar'}
                  </span>
                  <span style={{ fontSize: '0.88rem', color: 'var(--white)' }}>{p.descripcion}</span>
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--cream-dim)' }}>
                  {p.persona && <span>{p.persona} · </span>}
                  {fmtDate(p.fecha)}
                </div>
              </div>
              <div className="flex gap-3" style={{ alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: p.tipo === 'cobrar' ? 'var(--gold)' : '#d4706e' }}>
                  {fmt(p.monto)}
                </span>
                <button className="btn btn-outline btn-sm" onClick={() => resolver(p.id)} title="Marcar como resuelto">
                  <CheckCircle size={13} /> Resolver
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => eliminar(p.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Nuevo Pendiente</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                  <option value="cobrar">Por cobrar (te deben a ti)</option>
                  <option value="pagar">Por pagar (tú debes)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input className="form-input" placeholder="Ej: Decant de Chanel a María" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Monto ($)</label>
                  <input type="number" className="form-input" value={form.monto} onChange={e => set('monto', parseFloat(e.target.value) || '')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Persona</label>
                  <input className="form-input" placeholder="Nombre" value={form.persona} onChange={e => set('persona', e.target.value)} />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Inversión relacionada (opcional)</label>
                  <select className="form-input" value={form.inversion_id || ''} onChange={e => set('inversion_id', e.target.value || null)}>
                    <option value="">Sin inversión</option>
                    {inversiones.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input type="date" className="form-input" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-gold" onClick={submit}>Guardar Pendiente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
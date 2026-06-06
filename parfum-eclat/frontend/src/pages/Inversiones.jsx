import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, Trash2, X } from 'lucide-react'
import { api, fmt, fmtDate } from '../api'

const hoy = new Date().toISOString().split('T')[0]

const emptyForm = {
  nombre: '',
  fecha: hoy,
  inversion_total: 6000,
  aporte_yo: 3000,
  aporte_socio: 3000,
  meta_ganancia: 0,
  notas: ''
}

export default function Inversiones() {
  const [inversiones, setInversiones] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const load = () => api.get('/inversiones').then(setInversiones)
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleTotalChange = (val) => {
    const t = parseFloat(val) || 0
    set('inversion_total', t)
    set('aporte_yo', t / 2)
    set('aporte_socio', t / 2)
  }

  const submit = async () => {
    if (!form.nombre || !form.fecha) return
    setLoading(true)
    await api.post('/inversiones', form)
    await load()
    setShowModal(false)
    setForm(emptyForm)
    setLoading(false)
  }

  const eliminar = async (e, id) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta inversión y todos sus datos?')) return
    await api.delete(`/inversiones/${id}`)
    load()
  }

  const pct = (inv) => {
    if (!inv.costo_inventario || inv.costo_inventario === 0) return 0
    return Math.min(100, Math.round((inv.total_vendido / (inv.costo_inventario + inv.meta_ganancia || inv.costo_inventario)) * 100))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="ornament">✦ ✦ ✦</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>Mis <span>Inversiones</span></h1>
          <div className="label" style={{ marginTop: 6 }}>Registra y da seguimiento a cada inversión</div>
        </div>
        <button className="btn btn-gold" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Nueva Inversión
        </button>
      </div>
 
      {inversiones.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>💰 </div>
            <div className="section-title">Sin inversiones registradas</div>
            <p>Crea tu primera inversión para comenzar a registrar perfumes y ventas.</p>
            <button className="btn btn-gold" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
              <Plus size={14} /> Crear primera inversión
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {inversiones.map(inv => {
            const ganancia = inv.total_vendido - inv.costo_inventario
            const progreso = pct(inv)
            return (
              <div
                key={inv.id}
                className="card"
                style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
                onClick={() => navigate(`/inversiones/${inv.id}`)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-dim)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--noir-border)'}
              >
                <div className="flex-between">
                  <div>
                    <div style={{ fontSize: '1rem', color: 'var(--white)', fontWeight: 400 }}>{inv.nombre}</div>
                    <div className="label" style={{ marginTop: 4 }}>{fmtDate(inv.fecha)} · {inv.num_perfumes} perfume{inv.num_perfumes !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--cream-dim)' }}>Ganancia</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: ganancia >= 0 ? '#6dbd9a' : '#d4706e' }}>
                        {fmt(ganancia)}
                      </div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={(e) => eliminar(e, inv.id)}>
                      <Trash2 size={13} />
                    </button>
                    <ChevronRight size={16} color="var(--cream-dim)" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 16 }}>
                  <MiniStat label="Inversión total" value={fmt(inv.inversion_total)} />
                  <MiniStat label="Tu aporte" value={fmt(inv.aporte_yo)} />
                  <MiniStat label="Aporte socio" value={fmt(inv.aporte_socio)} />
                  <MiniStat label="Vendido" value={fmt(inv.total_vendido)} color="var(--gold)" />
                </div>

                {inv.meta_ganancia > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div className="flex-between" style={{ marginBottom: 4 }}>
                      <span className="label">Progreso hacia meta de reinversión</span>
                      <span className="label">{progreso}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progreso}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Nueva Inversión</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre de la inversión</label>
                <input className="form-input" placeholder="Ej: Inversión Junio 2025" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input type="date" className="form-input" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Inversión total ($)</label>
                  <input type="number" className="form-input" value={form.inversion_total} onChange={e => handleTotalChange(e.target.value)} />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Tu aporte ($)</label>
                  <input type="number" className="form-input" value={form.aporte_yo} onChange={e => set('aporte_yo', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Aporte del socio ($)</label>
                  <input type="number" className="form-input" value={form.aporte_socio} onChange={e => set('aporte_socio', parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Meta de ganancia para reinvertir ($)</label>
                <input type="number" className="form-input" placeholder="Ej: 2000" value={form.meta_ganancia} onChange={e => set('meta_ganancia', parseFloat(e.target.value) || 0)} />
                <div style={{ fontSize: '0.72rem', color: 'var(--cream-dim)', marginTop: 5 }}>
                  Cuánto quieres ganar antes de volver a invertir (además de recuperar la inversión)
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-input" placeholder="Observaciones, pedidos pendientes, etc." value={form.notas} onChange={e => set('notas', e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-gold" onClick={submit} disabled={loading}>
                {loading ? 'Guardando...' : 'Crear Inversión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div style={{ fontSize: '0.95rem', color: color || 'var(--cream)', marginTop: 3, fontFamily: 'var(--font-display)' }}>{value}</div>
    </div>
  )
}
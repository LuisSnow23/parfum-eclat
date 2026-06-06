import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, Trash2, ShoppingCart, Package } from 'lucide-react'
import { api, fmt, fmtDate } from '../api'

const hoy = new Date().toISOString().split('T')[0]

export default function InversionDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [inv, setInv] = useState(null)
  const [modal, setModal] = useState(null) // 'perfume' | 'venta' | 'pendiente'
  const [selectedPerfume, setSelectedPerfume] = useState(null)

  // Forms
  const [perfumeForm, setPerfumeForm] = useState({ nombre: '', precio_mayoreo: '', costo_envio: 51, precio_publico: '', piezas_compradas: 1, notas: '' })
  const [ventaForm, setVentaForm] = useState({ perfume_id: '', cliente: '', cantidad: 1, precio_venta: '', fecha: hoy, pagado: true, notas: '' })
  const [pendienteForm, setPendienteForm] = useState({ tipo: 'cobrar', descripcion: '', monto: '', persona: '', fecha: hoy })

  const load = () => api.get(`/inversiones/${id}`).then(setInv)
  useEffect(() => { load() }, [id])

  const sp = (k, v) => setPerfumeForm(f => ({ ...f, [k]: v }))
  const sv = (k, v) => setVentaForm(f => ({ ...f, [k]: v }))
  const spd = (k, v) => setPendienteForm(f => ({ ...f, [k]: v }))

  // Auto-fill precio_publico from mayoreo
  const handleMayoreoChange = (val) => {
    sp('precio_mayoreo', val)
    const n = parseFloat(val) || 0
    if (n > 0) sp('precio_publico', Math.round(n * 1.4))
  }

  // Auto-fill precio_venta when perfume selected
  const handlePerfumeSelect = (pid) => {
    sv('perfume_id', pid)
    const p = inv.perfumes.find(x => x.id === parseInt(pid))
    if (p) sv('precio_venta', p.precio_publico)
  }

  const submitPerfume = async () => {
    if (!perfumeForm.nombre || !perfumeForm.precio_mayoreo) return
    await api.post('/perfumes', { ...perfumeForm, inversion_id: parseInt(id) })
    await load()
    setModal(null)
    setPerfumeForm({ nombre: '', precio_mayoreo: '', costo_envio: 51, precio_publico: '', piezas_compradas: 1, notas: '' })
  }

  const submitVenta = async () => {
    if (!ventaForm.perfume_id || !ventaForm.precio_venta) return
    await api.post('/ventas', { ...ventaForm, inversion_id: parseInt(id) })
    await load()
    setModal(null)
    setVentaForm({ perfume_id: '', cliente: '', cantidad: 1, precio_venta: '', fecha: hoy, pagado: true, notas: '' })
  }

  const submitPendiente = async () => {
    if (!pendienteForm.descripcion || !pendienteForm.monto) return
    await api.post('/pendientes', { ...pendienteForm, inversion_id: parseInt(id) })
    await load()
    setModal(null)
    setPendienteForm({ tipo: 'cobrar', descripcion: '', monto: '', persona: '', fecha: hoy })
  }

  const delPerfume = async (pid) => {
    if (!confirm('¿Eliminar perfume y todas sus ventas?')) return
    await api.delete(`/perfumes/${pid}`)
    load()
  }

  const delVenta = async (vid) => {
    if (!confirm('¿Eliminar esta venta?')) return
    await api.delete(`/ventas/${vid}`)
    load()
  }

  const resolverPendiente = async (pid) => {
    await api.put(`/pendientes/${pid}/resolver`)
    load()
  }

  if (!inv) return <div style={{ color: 'var(--cream-dim)', padding: 40 }}>Cargando...</div>

  const costoTotal = inv.perfumes.reduce((s, p) => s + (p.precio_mayoreo + p.costo_envio) * p.piezas_compradas, 0)
  const ingresos = inv.ventas.reduce((s, v) => s + v.precio_venta * v.cantidad, 0)
  const ganancia = ingresos - costoTotal
  const metaTotal = costoTotal + (inv.meta_ganancia || 0)
  const progreso = metaTotal > 0 ? Math.min(100, Math.round((ingresos / metaTotal) * 100)) : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 10, paddingLeft: 0 }} onClick={() => navigate('/inversiones')}>
            <ArrowLeft size={14} /> Volver
          </button>
          <h1 className="page-title">{inv.nombre}</h1>
          <div className="label" style={{ marginTop: 6 }}>{fmtDate(inv.fecha)}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={() => setModal('pendiente')}><Plus size={13} /> Pendiente</button>
          <button className="btn btn-outline" onClick={() => setModal('venta')}><ShoppingCart size={13} /> Registrar Venta</button>
          <button className="btn btn-gold" onClick={() => setModal('perfume')}><Package size={13} /> Agregar Perfume</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <Stat label="Inversión" value={fmt(inv.inversion_total)} />
        <Stat label="Costo inventario" value={fmt(costoTotal)} />
        <Stat label="Ingresos" value={fmt(ingresos)} cls="gold" />
        <Stat label="Ganancia neta" value={fmt(ganancia)} cls={ganancia >= 0 ? 'green' : 'red'} />
        <Stat label="Meta reinversión" value={fmt(inv.meta_ganancia)} />
      </div>

      {inv.meta_ganancia > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="flex-between mb-1">
            <span className="label">Progreso hacia meta de reinversión</span>
            <span className="label">{progreso}% — Falta {fmt(Math.max(0, metaTotal - ingresos))}</span>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div className="progress-fill" style={{ width: `${progreso}%` }} />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--cream-dim)', marginTop: 8 }}>
            Meta: recuperar {fmt(costoTotal)} de costo + {fmt(inv.meta_ganancia)} de ganancia = {fmt(metaTotal)}
          </div>
        </div>
      )}

      {/* Perfumes */}
      <div style={{ marginBottom: 32 }}>
        <div className="flex-between mb-2" style={{ marginBottom: 14 }}>
          <span className="section-title">Perfumes</span>
          <button className="btn btn-outline btn-sm" onClick={() => setModal('perfume')}><Plus size={12} /> Agregar</button>
        </div>
        {inv.perfumes.length === 0 ? (
          <div className="card"><div className="empty-state"><p>Agrega perfumes a esta inversión</p></div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Perfume</th>
                  <th>Costo mayoreo</th>
                  <th>Envío</th>
                  <th>Precio público</th>
                  <th>Piezas</th>
                  <th>Vendidas</th>
                  <th>Margen</th>
                  <th>Ingresos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inv.perfumes.map(p => {
                  const costoUnit = p.precio_mayoreo + p.costo_envio
                  const margen = p.precio_publico > 0 ? Math.round(((p.precio_publico - costoUnit) / p.precio_publico) * 100) : 0
                  const stock = p.piezas_compradas - p.vendidos
                  return (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--white)', fontWeight: 400 }}>{p.nombre}</td>
                      <td className="td-muted">{fmt(p.precio_mayoreo)}</td>
                      <td className="td-muted">{fmt(p.costo_envio)}</td>
                      <td className="td-gold">{fmt(p.precio_publico)}</td>
                      <td className="td-muted">{p.piezas_compradas}</td>
                      <td>
                        <span className={p.vendidos > 0 ? 'badge badge-green' : 'badge badge-rose'}>
                          {p.vendidos}/{p.piezas_compradas}
                        </span>
                      </td>
                      <td className={margen > 30 ? 'td-green' : 'td-muted'}>{margen}%</td>
                      <td className="td-gold">{fmt(p.ingresos)}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => delPerfume(p.id)}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ventas */}
      <div style={{ marginBottom: 32 }}>
        <div className="flex-between" style={{ marginBottom: 14 }}>
          <span className="section-title">Ventas Registradas</span>
          <button className="btn btn-outline btn-sm" onClick={() => setModal('venta')}><Plus size={12} /> Registrar</button>
        </div>
        {inv.ventas.length === 0 ? (
          <div className="card"><div className="empty-state"><p>Sin ventas registradas en esta inversión</p></div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Perfume</th>
                  <th>Cliente</th>
                  <th>Cant.</th>
                  <th>Precio</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inv.ventas.map(v => {
                  const perfume = inv.perfumes.find(p => p.id === v.perfume_id)
                  return (
                    <tr key={v.id}>
                      <td className="td-muted">{fmtDate(v.fecha)}</td>
                      <td style={{ color: 'var(--white)' }}>{perfume?.nombre || '—'}</td>
                      <td className="td-muted">{v.cliente || '—'}</td>
                      <td className="td-muted">{v.cantidad}</td>
                      <td className="td-muted">{fmt(v.precio_venta)}</td>
                      <td className="td-gold">{fmt(v.precio_venta * v.cantidad)}</td>
                      <td>
                        <span className={v.pagado ? 'badge badge-green' : 'badge badge-red'}>
                          {v.pagado ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => delVenta(v.id)}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pendientes */}
      {inv.pendientes?.length > 0 && (
        <div>
          <div className="section-title" style={{ marginBottom: 14 }}>Pendientes de esta Inversión</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inv.pendientes.filter(p => !p.resuelto).map(p => (
              <div key={p.id} className="card" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className={`badge ${p.tipo === 'cobrar' ? 'badge-gold' : 'badge-red'}`} style={{ marginRight: 10 }}>
                    {p.tipo === 'cobrar' ? 'Por cobrar' : 'Por pagar'}
                  </span>
                  <span style={{ fontSize: '0.88rem' }}>{p.descripcion}</span>
                  {p.persona && <span className="td-muted" style={{ fontSize: '0.78rem', marginLeft: 8 }}>— {p.persona}</span>}
                </div>
                <div className="flex gap-3" style={{ alignItems: 'center' }}>
                  <span className="td-gold" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>{fmt(p.monto)}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => resolverPendiente(p.id)}>✓ Resolver</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL PERFUME ── */}
      {modal === 'perfume' && (
        <Modal title="Agregar Perfume" onClose={() => setModal(null)} onSubmit={submitPerfume} submitLabel="Agregar Perfume">
          <div className="form-group">
            <label className="form-label">Nombre del perfume</label>
            <input className="form-input" placeholder="Ej: Vulcan Feu, Odyssey..." value={perfumeForm.nombre} onChange={e => sp('nombre', e.target.value)} />
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Precio mayoreo ($)</label>
              <input type="number" className="form-input" value={perfumeForm.precio_mayoreo} onChange={e => handleMayoreoChange(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Costo de envío ($)</label>
              <input type="number" className="form-input" value={perfumeForm.costo_envio} onChange={e => sp('costo_envio', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Precio al público ($)</label>
              <input type="number" className="form-input" value={perfumeForm.precio_publico} onChange={e => sp('precio_publico', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Piezas compradas</label>
            <input type="number" className="form-input" min={1} value={perfumeForm.piezas_compradas} onChange={e => sp('piezas_compradas', parseInt(e.target.value) || 1)} />
          </div>
          {perfumeForm.precio_mayoreo && perfumeForm.precio_publico && (
            <div className="alert alert-info">
              Costo unitario: {fmt(parseFloat(perfumeForm.precio_mayoreo) + parseFloat(perfumeForm.costo_envio))} ·
              Margen: {Math.round(((perfumeForm.precio_publico - (parseFloat(perfumeForm.precio_mayoreo) + parseFloat(perfumeForm.costo_envio))) / perfumeForm.precio_publico) * 100)}% ·
              Ganancia x pieza: {fmt(perfumeForm.precio_publico - parseFloat(perfumeForm.precio_mayoreo) - parseFloat(perfumeForm.costo_envio))}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-input" value={perfumeForm.notas} onChange={e => sp('notas', e.target.value)} />
          </div>
        </Modal>
      )}

      {/* ── MODAL VENTA ── */}
      {modal === 'venta' && (
        <Modal title="Registrar Venta" onClose={() => setModal(null)} onSubmit={submitVenta} submitLabel="Registrar Venta">
          <div className="form-group">
            <label className="form-label">Perfume</label>
            <select className="form-input" value={ventaForm.perfume_id} onChange={e => handlePerfumeSelect(e.target.value)}>
              <option value="">Selecciona perfume...</option>
              {inv.perfumes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} — {fmt(p.precio_publico)}</option>
              ))}
            </select>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Cliente</label>
              <input className="form-input" placeholder="Nombre del cliente" value={ventaForm.cliente} onChange={e => sv('cliente', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input type="date" className="form-input" value={ventaForm.fecha} onChange={e => sv('fecha', e.target.value)} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Cantidad</label>
              <input type="number" className="form-input" min={1} value={ventaForm.cantidad} onChange={e => sv('cantidad', parseInt(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Precio de venta ($)</label>
              <input type="number" className="form-input" value={ventaForm.precio_venta} onChange={e => sv('precio_venta', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Estado de pago</label>
            <select className="form-input" value={ventaForm.pagado ? '1' : '0'} onChange={e => sv('pagado', e.target.value === '1')}>
              <option value="1">Pagado</option>
              <option value="0">Pendiente de pago</option>
            </select>
          </div>
          {ventaForm.precio_venta && ventaForm.perfume_id && (
            <div className="alert alert-info">
              Total: {fmt(ventaForm.precio_venta * ventaForm.cantidad)}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-input" value={ventaForm.notas} onChange={e => sv('notas', e.target.value)} />
          </div>
        </Modal>
      )}

      {/* ── MODAL PENDIENTE ── */}
      {modal === 'pendiente' && (
        <Modal title="Agregar Pendiente" onClose={() => setModal(null)} onSubmit={submitPendiente} submitLabel="Guardar Pendiente">
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-input" value={pendienteForm.tipo} onChange={e => spd('tipo', e.target.value)}>
              <option value="cobrar">Por cobrar (te deben)</option>
              <option value="pagar">Por pagar (debes)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input className="form-input" placeholder="Ej: Decant vendido a cliente X" value={pendienteForm.descripcion} onChange={e => spd('descripcion', e.target.value)} />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Monto ($)</label>
              <input type="number" className="form-input" value={pendienteForm.monto} onChange={e => spd('monto', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Persona</label>
              <input className="form-input" placeholder="Nombre" value={pendienteForm.persona} onChange={e => spd('persona', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input type="date" className="form-input" value={pendienteForm.fecha} onChange={e => spd('fecha', e.target.value)} />
          </div>
        </Modal>
      )}
    </div>
  )
}

function Stat({ label, value, cls = '' }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className={`stat-value ${cls}`} style={{ fontSize: '1.4rem' }}>{value}</div>
    </div>
  )
}

function Modal({ title, onClose, onSubmit, submitLabel, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={onSubmit}>{submitLabel}</button>
        </div>
      </div>
    </div>
  )
}
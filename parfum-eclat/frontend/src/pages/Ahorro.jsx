import { useState, useEffect } from 'react'
import { Plus, X, Trash2, PiggyBank, Target, TrendingUp, Calendar } from 'lucide-react'
import { api, fmt, fmtDate } from '../api'

const hoy = new Date().toISOString().split('T')[0]

function diasHastaDict() {
  const ahora = new Date()
  const dic = new Date(ahora.getFullYear(), 11, 31) // 31 dic
  const diff = dic - ahora
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function semanasHastaDict() {
  return Math.ceil(diasHastaDict() / 7)
}

export default function Ahorro() {
  const [config, setConfig] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [showConfig, setShowConfig] = useState(false)
  const [showMovimiento, setShowMovimiento] = useState(false)
  const [configForm, setConfigForm] = useState({ meta: '', descripcion: '' })
  const [movForm, setMovForm] = useState({ tipo: 'deposito', monto: '', descripcion: '', fecha: hoy })

  const load = async () => {
    try {
      const c = await api.get('/ahorro/config')
      setConfig(c)
      setConfigForm({ meta: c.meta || '', descripcion: c.descripcion || '' })
    } catch {
      setConfig(null)
    }
    try {
      const m = await api.get('/ahorro/movimientos')
      setMovimientos(m)
    } catch {
      setMovimientos([])
    }
  }

  useEffect(() => { load() }, [])

  const sc = (k, v) => setConfigForm(f => ({ ...f, [k]: v }))
  const sm = (k, v) => setMovForm(f => ({ ...f, [k]: v }))

  const guardarConfig = async () => {
    if (!configForm.meta) return
    await api.post('/ahorro/config', configForm)
    await load()
    setShowConfig(false)
  }

  const agregarMovimiento = async () => {
    if (!movForm.monto) return
    await api.post('/ahorro/movimientos', movForm)
    await load()
    setShowMovimiento(false)
    setMovForm({ tipo: 'deposito', monto: '', descripcion: '', fecha: hoy })
  }

  const eliminarMov = async (id) => {
    if (!confirm('¿Eliminar este movimiento?')) return
    await api.delete(`/ahorro/movimientos/${id}`)
    load()
  }

  const totalAhorrado = movimientos
    .filter(m => m.tipo === 'deposito')
    .reduce((s, m) => s + m.monto, 0)
  const totalRetirado = movimientos
    .filter(m => m.tipo === 'retiro')
    .reduce((s, m) => s + m.monto, 0)
  const saldo = totalAhorrado - totalRetirado
  const meta = config?.meta || 0
  const progreso = meta > 0 ? Math.min(100, Math.round((saldo / meta) * 100)) : 0
  const falta = Math.max(0, meta - saldo)
  const dias = diasHastaDict()
  const semanas = semanasHastaDict()
  const porSemana = semanas > 0 ? Math.ceil(falta / semanas) : 0
  const porDia = dias > 0 ? Math.ceil(falta / dias) : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="ornament">✦ ✦ ✦</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            Ahorro <span>Diciembre</span>
          </h1>
          <div className="label" style={{ marginTop: 6 }}>Seguimiento de tu meta de ahorro · {dias} días restantes</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={() => setShowConfig(true)}>
            <Target size={13} /> {config ? 'Editar Meta' : 'Establecer Meta'}
          </button>
          <button className="btn btn-gold" onClick={() => setShowMovimiento(true)}>
            <Plus size={14} /> Registrar Movimiento
          </button>
        </div>
      </div>

      {!config ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: '2.5rem', marginBottom: 14 }}>🐷</div>
            <div className="section-title">Establece tu meta de ahorro</div>
            <p>Define cuánto quieres ahorrar antes de que termine el año.</p>
            <button className="btn btn-gold" style={{ marginTop: 16 }} onClick={() => setShowConfig(true)}>
              <Target size={14} /> Establecer Meta
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Tarjeta principal de progreso */}
          <div className="card card-gold" style={{ marginBottom: 24, padding: '28px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div className="label">Meta de ahorro</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.6rem', fontWeight: 300, color: 'var(--gold)', lineHeight: 1.1, marginTop: 4 }}>
                  {fmt(meta)}
                </div>
                {config.descripcion && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--cream-dim)', marginTop: 6, fontStyle: 'italic' }}>
                    "{config.descripcion}"
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="label">Saldo actual</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 300, color: '#6dbd9a', lineHeight: 1.1, marginTop: 4 }}>
                  {fmt(saldo)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', marginTop: 4 }}>{progreso}% completado</div>
              </div>
            </div>

            <div className="progress-bar" style={{ height: 8, marginBottom: 16 }}>
              <div className="progress-fill" style={{ width: `${progreso}%` }} />
            </div>

            {falta > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <MiniInfo icon={<Calendar size={13} />} label="Días restantes" value={`${dias} días`} />
                <MiniInfo icon={<TrendingUp size={13} />} label="Ahorra por semana" value={fmt(porSemana)} highlight />
                <MiniInfo icon={<PiggyBank size={13} />} label="Falta para la meta" value={fmt(falta)} />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <span className="badge badge-green" style={{ fontSize: '0.85rem', padding: '6px 18px' }}>
                  🎉 ¡Meta alcanzada!
                </span>
              </div>
            )}
          </div>

          {/* Stats pequeñas */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}>
            <div className="stat-card">
              <div className="label">Total depositado</div>
              <div className="stat-value green">{fmt(totalAhorrado)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total retirado</div>
              <div className="stat-value red">{fmt(totalRetirado)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Ahorro por día (para meta)</div>
              <div className="stat-value gold">{fmt(porDia)}</div>
            </div>
          </div>

          {/* Movimientos */}
          <div>
            <div className="flex-between" style={{ marginBottom: 14 }}>
              <span className="section-title">Movimientos</span>
              <button className="btn btn-outline btn-sm" onClick={() => setShowMovimiento(true)}>
                <Plus size={12} /> Agregar
              </button>
            </div>

            {movimientos.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <p>Sin movimientos. ¡Empieza a registrar tus ahorros!</p>
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Descripción</th>
                      <th>Monto</th>
                      <th>Saldo acumulado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m, i) => {
                      // Calcular saldo acumulado hasta este movimiento (de más antiguo a más nuevo)
                      const ordenados = [...movimientos].reverse()
                      const idx = ordenados.findIndex(x => x.id === m.id)
                      const saldoAcum = ordenados.slice(0, idx + 1).reduce((s, x) => s + (x.tipo === 'deposito' ? x.monto : -x.monto), 0)
                      return (
                        <tr key={m.id}>
                          <td className="td-muted">{fmtDate(m.fecha)}</td>
                          <td>
                            <span className={`badge ${m.tipo === 'deposito' ? 'badge-green' : 'badge-red'}`}>
                              {m.tipo === 'deposito' ? '↓ Depósito' : '↑ Retiro'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--cream)' }}>{m.descripcion || '—'}</td>
                          <td className={m.tipo === 'deposito' ? 'td-green' : 'td-red'}>
                            {m.tipo === 'deposito' ? '+' : '-'}{fmt(m.monto)}
                          </td>
                          <td className="td-gold">{fmt(saldoAcum)}</td>
                          <td>
                            <button className="btn btn-danger btn-sm" onClick={() => eliminarMov(m.id)}>
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal config */}
      {showConfig && (
        <div className="modal-overlay" onClick={() => setShowConfig(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Meta de Ahorro</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowConfig(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">¿Cuánto quieres ahorrar antes del 31 de diciembre? ($)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Ej: 10000"
                  value={configForm.meta}
                  onChange={e => sc('meta', parseFloat(e.target.value) || '')}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">¿Para qué es este ahorro? (opcional)</label>
                <input
                  className="form-input"
                  placeholder="Ej: Reinversión de perfumes, viaje, etc."
                  value={configForm.descripcion}
                  onChange={e => sc('descripcion', e.target.value)}
                />
              </div>
              {configForm.meta > 0 && (
                <div className="alert alert-info">
                  Para lograrlo necesitas ahorrar aprox. <strong>{fmt(Math.ceil(configForm.meta / semanasHastaDict()))}/semana</strong> o <strong>{fmt(Math.ceil(configForm.meta / diasHastaDict()))}/día</strong> los próximos {dias} días.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowConfig(false)}>Cancelar</button>
              <button className="btn btn-gold" onClick={guardarConfig}>Guardar Meta</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal movimiento */}
      {showMovimiento && (
        <div className="modal-overlay" onClick={() => setShowMovimiento(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Registrar Movimiento</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowMovimiento(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={movForm.tipo} onChange={e => sm('tipo', e.target.value)}>
                  <option value="deposito">Depósito (ahorré este dinero)</option>
                  <option value="retiro">Retiro (saqué este dinero)</option>
                </select>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Monto ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={movForm.monto}
                    onChange={e => sm('monto', parseFloat(e.target.value) || '')}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input type="date" className="form-input" value={movForm.fecha} onChange={e => sm('fecha', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Descripción (opcional)</label>
                <input
                  className="form-input"
                  placeholder="Ej: Ganancias de ventas de la semana"
                  value={movForm.descripcion}
                  onChange={e => sm('descripcion', e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowMovimiento(false)}>Cancelar</button>
              <button className="btn btn-gold" onClick={agregarMovimiento}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniInfo({ icon, label, value, highlight }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 4, padding: '12px 16px' }}>
      <div className="flex gap-2" style={{ color: 'var(--cream-dim)', alignItems: 'center', marginBottom: 5 }}>
        {icon}
        <span className="label">{label}</span>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: highlight ? '1.4rem' : '1.1rem',
        color: highlight ? 'var(--gold)' : 'var(--cream)',
        fontWeight: 300
      }}>
        {value}
      </div>
    </div>
  )
}
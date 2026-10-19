import { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  X,
  Trash2,
  PiggyBank,
  Target,
  TrendingUp,
  Calendar,
  Pencil,
} from 'lucide-react'
import { api, fmt, fmtDate } from '../api'

const hoy = new Date().toISOString().split('T')[0]

function diasHastaDict() {
  const ahora = new Date()
  const dic = new Date(ahora.getFullYear(), 11, 31)
  const diff = dic - ahora
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function semanasHastaDict() {
  return Math.ceil(diasHastaDict() / 7)
}

const emptyMov = {
  tipo: 'deposito',
  monto: '',
  descripcion: '',
  fecha: hoy,
}

export default function Ahorro() {
  const [config, setConfig] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [showConfig, setShowConfig] = useState(false)
  const [showMovimiento, setShowMovimiento] = useState(false)
  const [configForm, setConfigForm] = useState({ meta: '', descripcion: '' })
  const [movForm, setMovForm] = useState(emptyMov)
  const [editMovId, setEditMovId] = useState(null)

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

  useEffect(() => {
    load()
  }, [])

  const sc = (k, v) => setConfigForm(f => ({ ...f, [k]: v }))
  const sm = (k, v) => setMovForm(f => ({ ...f, [k]: v }))

  const guardarConfig = async () => {
    if (!configForm.meta) return
    await api.post('/ahorro/config', configForm)
    await load()
    setShowConfig(false)
  }

  const cerrarMovModal = () => {
    setShowMovimiento(false)
    setEditMovId(null)
    setMovForm(emptyMov)
  }

  const openEditMovimiento = m => {
    setEditMovId(m.id)
    setMovForm({
      tipo: m.tipo || 'deposito',
      monto: m.monto ?? '',
      descripcion: m.descripcion || '',
      fecha: m.fecha || hoy,
    })
    setShowMovimiento(true)
  }

  const openNuevoMovimiento = () => {
    setEditMovId(null)
    setMovForm(emptyMov)
    setShowMovimiento(true)
  }

  const guardarMovimiento = async () => {
    if (!movForm.monto) return
    if (editMovId) {
      await api.put(`/ahorro/movimientos/${editMovId}`, movForm)
    } else {
      await api.post('/ahorro/movimientos', movForm)
    }
    await load()
    cerrarMovModal()
  }

  const eliminarMov = async id => {
    if (!confirm('¿Eliminar este movimiento?')) return
    await api.delete(`/ahorro/movimientos/${id}`)
    load()
  }

  // ── Cálculos derivados ──
  const { totalAhorrado, totalRetirado, saldo, saldoPorId } = useMemo(() => {
    const ta = movimientos
      .filter(m => m.tipo === 'deposito')
      .reduce((s, m) => s + Number(m.monto), 0)
    const tr = movimientos
      .filter(m => m.tipo === 'retiro')
      .reduce((s, m) => s + Number(m.monto), 0)

    // Saldo acumulado por id (calculado una sola vez, O(n))
    const map = {}
    let acc = 0
    movimientos.forEach(m => {
      acc += m.tipo === 'deposito' ? Number(m.monto) : -Number(m.monto)
      map[m.id] = acc
    })

    return { totalAhorrado: ta, totalRetirado: tr, saldo: ta - tr, saldoPorId: map }
  }, [movimientos])

  const meta = Number(config?.meta) || 0
  const progreso = meta > 0 ? Math.min(100, Math.round((saldo / meta) * 100)) : 0
  const falta = Math.max(0, meta - saldo)
  const dias = diasHastaDict()
  const semanas = semanasHastaDict()
  const porSemana = semanas > 0 ? Math.ceil(falta / semanas) : 0
  const porDia = dias > 0 ? Math.ceil(falta / dias) : 0

  return (
    <div>
      {/* ───────── HEADER ───────── */}
      <div className="page-header">
        <div>
          <div className="ornament">* * *</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            Ahorro <span>Diciembre</span>
          </h1>
          <div className="label" style={{ marginTop: 6 }}>
            Seguimiento de tu meta de ahorro · {dias} días restantes
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-outline" onClick={() => setShowConfig(true)}>
            <Target size={13} /> {config ? 'Editar Meta' : 'Establecer Meta'}
          </button>
          <button className="btn btn-gold" onClick={openNuevoMovimiento}>
            <Plus size={14} /> Registrar Movimiento
          </button>
        </div>
      </div>

      {!config ? (
        <div className="card">
          <div className="empty-state">
            <PiggyBank size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
            <div className="section-title">Establece tu meta de ahorro</div>
            <p>Define cuánto quieres ahorrar antes de que termine el año.</p>
            <button className="btn btn-gold" style={{ marginTop: 16 }} onClick={() => setShowConfig(true)}>
              <Target size={14} /> Establecer Meta
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ───────── CARD META ───────── */}
          <div className="card card-gold" style={{ marginBottom: 24, padding: '24px 28px' }}>
            <div className="meta-header">
              <div>
                <div className="label">Meta de ahorro</div>
                <div className="meta-value gold">{fmt(meta)}</div>
                {config.descripcion && (
                  <div className="meta-desc">"{config.descripcion}"</div>
                )}
              </div>

              <div className="meta-right">
                <div className="label">Saldo actual</div>
                <div className="meta-value green">{fmt(saldo)}</div>
                <div className="meta-pct">{progreso}% completado</div>
              </div>
            </div>

            <div className="progress-bar" style={{ height: 8, marginBottom: 16 }}>
              <div className="progress-fill" style={{ width: `${progreso}%` }} />
            </div>

            {falta > 0 ? (
              <div className="mini-grid">
                <MiniInfo icon={<Calendar size={13} />} label="Días restantes" value={`${dias} días`} />
                <MiniInfo icon={<TrendingUp size={13} />} label="Ahorra por semana" value={fmt(porSemana)} highlight />
                <MiniInfo icon={<PiggyBank size={13} />} label="Falta para la meta" value={fmt(falta)} />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <span className="badge badge-green" style={{ fontSize: '0.85rem', padding: '6px 18px' }}>
                  ¡Meta alcanzada!
                </span>
              </div>
            )}
          </div>

          {/* ───────── KPIs ───────── */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="label">Total depositado</div>
              <div className="stat-value" style={{ color: '#6dbf8c' }}>{fmt(totalAhorrado)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total retirado</div>
              <div className="stat-value" style={{ color: '#e07a7a' }}>{fmt(totalRetirado)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Ahorro por día (para meta)</div>
              <div className="stat-value" style={{ color: '#c9a84c' }}>{fmt(porDia)}</div>
            </div>
          </div>

          {/* ───────── MOVIMIENTOS ───────── */}
          <div className="card">
            <div className="section-title-row">
              <span className="section-title">Movimientos</span>
              <button className="btn btn-outline btn-sm" onClick={openNuevoMovimiento}>
                <Plus size={12} /> Agregar
              </button>
            </div>

            {movimientos.length === 0 ? (
              <div className="empty-state">
                <p>Sin movimientos. ¡Empieza a registrar tus ahorros!</p>
              </div>
            ) : (
              <div className="table-wrap table-stack-wrap">
                <table className="data-table stack-table">
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
                    {movimientos.map(m => (
                      <tr key={m.id}>
                        <td data-label="Fecha">{fmtDate(m.fecha)}</td>

                        <td data-label="Tipo">
                          <span className={`badge ${m.tipo === 'deposito' ? 'badge-green' : 'badge-red'}`}>
                            {m.tipo === 'deposito' ? 'Depósito' : 'Retiro'}
                          </span>
                        </td>

                        <td className="cell-title" data-label="Descripción">
                          {m.descripcion || '—'}
                        </td>

                        <td className={m.tipo === 'deposito' ? 'td-green' : 'td-red'} data-label="Monto">
                          {m.tipo === 'deposito' ? '+' : '−'}{fmt(m.monto)}
                        </td>

                        <td className="td-gold" data-label="Saldo acumulado">
                          {fmt(saldoPorId[m.id] || 0)}
                        </td>

                        <td className="cell-actions">
                          <button className="btn-icon" title="Editar" onClick={() => openEditMovimiento(m)}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn-icon" title="Eliminar" onClick={() => eliminarMov(m.id)}>
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
        </>
      )}

      {/* ───────── MODAL CONFIG ───────── */}
      {showConfig && (
        <div className="modal-overlay" onClick={() => setShowConfig(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Meta de Ahorro</div>
              <button className="btn-icon" onClick={() => setShowConfig(false)} aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">¿Cuánto quieres ahorrar antes del 31 de diciembre? ($)</label>
                <input
                  type="number"
                  inputMode="decimal"
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
                  Para lograrlo necesitas ahorrar aprox.{' '}
                  <strong>{fmt(Math.ceil(configForm.meta / semanasHastaDict()))}/semana</strong> o{' '}
                  <strong>{fmt(Math.ceil(configForm.meta / diasHastaDict()))}/día</strong> en los
                  próximos {dias} días.
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

      {/* ───────── MODAL MOVIMIENTO (nuevo + editar unificado) ───────── */}
      {showMovimiento && (
        <div className="modal-overlay" onClick={cerrarMovModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {editMovId ? 'Editar Movimiento' : 'Registrar Movimiento'}
              </div>
              <button className="btn-icon" onClick={cerrarMovModal} aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select
                  className="form-input"
                  value={movForm.tipo}
                  onChange={e => sm('tipo', e.target.value)}
                >
                  <option value="deposito">Depósito (ahorré este dinero)</option>
                  <option value="retiro">Retiro (saqué este dinero)</option>
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Monto ($)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="form-input"
                    placeholder="0"
                    value={movForm.monto}
                    onChange={e => sm('monto', parseFloat(e.target.value) || '')}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input
                    type="date"
                    className="form-input"
                    value={movForm.fecha}
                    onChange={e => sm('fecha', e.target.value)}
                  />
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
              <button className="btn btn-outline" onClick={cerrarMovModal}>Cancelar</button>
              <button className="btn btn-gold" onClick={guardarMovimiento}>
                {editMovId ? 'Guardar cambios' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniInfo({ icon, label, value, highlight }) {
  return (
    <div className="mini-card">
      <div className="mini-card-head">
        {icon}
        <span className="label">{label}</span>
      </div>
      <div className={`mini-card-value ${highlight ? 'gold' : ''}`}>
        {value}
      </div>
    </div>
  )
}
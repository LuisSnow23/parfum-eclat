import { useState, useEffect } from 'react'
import { Plus, X, Trash2, ShoppingCart, Package, CreditCard, Pencil, Edit3 } from 'lucide-react'
import { api, fmt, fmtDate } from '../api'

const hoy = new Date().toISOString().split('T')[0]

const emptyPerfume = {
  nombre: '',
  proveedor: '',
  precio_proveedor: '',
  precio_publico: '',
  piezas_compradas: 1,
  costo_envio: 0,
  piezas_envio: 1,
  notas: '',
}

const emptyVenta = {
  perfume_id: '',
  cliente: '',
  cantidad: 1,
  precio_unitario: '',
  tipo_pago: 'contado',
  abonado: '',
  fecha: hoy,
  notas: '',
}

export default function Perfumes() {
  const [resumen, setResumen] = useState(null)
  const [perfumes, setPerfumes] = useState([])
  const [ventas, setVentas] = useState([])
  const [modal, setModal] = useState(null)
  const [editId, setEditId] = useState(null)
  const [ventaAbono, setVentaAbono] = useState(null)
  const [error, setError] = useState('')
  const [perfumeForm, setPerfumeForm] = useState(emptyPerfume)
  const [ventaForm, setVentaForm] = useState(emptyVenta)
  const [abonoForm, setAbonoForm] = useState({ monto: '', fecha: hoy, notas: '' })
  
  // Estado para editar el saldo manualmente
  const [editSaldo, setEditSaldo] = useState(false)
  const [saldoManual, setSaldoManual] = useState('')
  const [saldoGuardado, setSaldoGuardado] = useState(null)

  const load = async () => {
    const [r, p, v] = await Promise.all([
      api.get('/resumen'),
      api.get('/perfumes'),
      api.get('/ventas'),
    ])
    setResumen(r)
    setPerfumes(p)
    setVentas(v)
    
    // Si hay un saldo guardado en localStorage, usarlo
    const saldoLocal = localStorage.getItem('dinero_en_caja_manual')
    if (saldoLocal !== null) {
      setSaldoGuardado(parseFloat(saldoLocal))
    } else {
      // Si no hay saldo guardado, usar el del resumen
      setSaldoGuardado(r.dinero_en_caja)
    }
  }

  useEffect(() => { load() }, [])

  const sp = (k, v) => setPerfumeForm(f => ({ ...f, [k]: v }))
  const sv = (k, v) => setVentaForm(f => ({ ...f, [k]: v }))

  const setPiezas = (val) => {
    const n = parseInt(val, 10) || 1
    setPerfumeForm(f => ({
      ...f,
      piezas_compradas: n,
      piezas_envio: f.piezas_envio === f.piezas_compradas || !f.piezas_envio ? n : f.piezas_envio,
    }))
  }

  const envioU = () => {
    const env = parseFloat(perfumeForm.costo_envio) || 0
    const n = Math.max(parseInt(perfumeForm.piezas_envio, 10) || 1, 1)
    return env / n
  }

  const costoU = () => (parseFloat(perfumeForm.precio_proveedor) || 0) + envioU()
  const gananciaU = () => (parseFloat(perfumeForm.precio_publico) || 0) - costoU()
  const totalVenta = () => (parseFloat(ventaForm.precio_unitario) || 0) * (parseInt(ventaForm.cantidad, 10) || 1)

  // Guardar saldo editado manualmente
  const guardarSaldoManual = () => {
    const nuevoSaldo = parseFloat(saldoManual)
    if (isNaN(nuevoSaldo) || nuevoSaldo < 0) {
      setError('Saldo inválido')
      return
    }
    localStorage.setItem('dinero_en_caja_manual', String(nuevoSaldo))
    setSaldoGuardado(nuevoSaldo)
    setEditSaldo(false)
    setError('')
    
    // Actualizar el resumen localmente
    setResumen(r => ({ ...r, dinero_en_caja: nuevoSaldo }))
  }

  const openEditPerfume = (p) => {
    setError('')
    setEditId(p.id)
    setPerfumeForm({
      nombre: p.nombre || '',
      proveedor: p.proveedor || '',
      precio_proveedor: p.precio_proveedor ?? '',
      precio_publico: p.precio_publico ?? '',
      piezas_compradas: p.piezas_compradas ?? 1,
      costo_envio: p.costo_envio ?? 0,
      piezas_envio: p.piezas_envio ?? p.piezas_compradas ?? 1,
      notas: p.notas || '',
    })
    setModal('perfume')
  }

  const submitPerfume = async () => {
    setError('')
    if (!perfumeForm.nombre) { setError('Nombre obligatorio'); return }
    if (perfumeForm.precio_proveedor === '') { setError('Costo de proveedor obligatorio'); return }
    const res = editId
      ? await api.put(`/perfumes/${editId}`, perfumeForm)
      : await api.post('/perfumes', perfumeForm)
    if (res.error) { setError(res.error); return }
    
    // Después de agregar un perfume, RESTAR del saldo manual
    const precioProv = parseFloat(perfumeForm.precio_proveedor) || 0
    const piezas = parseInt(perfumeForm.piezas_compradas) || 1
    const envio = parseFloat(perfumeForm.costo_envio) || 0
    const gasto = (precioProv * piezas) + envio
    
    const saldoActual = saldoGuardado || resumen.dinero_en_caja || 0
    const nuevoSaldo = Math.max(0, saldoActual - gasto)
    localStorage.setItem('dinero_en_caja_manual', String(nuevoSaldo))
    setSaldoGuardado(nuevoSaldo)
    
    await load()
    setModal(null)
    setEditId(null)
    setPerfumeForm(emptyPerfume)
  }

  const openEditVenta = (v) => {
    setError('')
    setEditId(v.id)
    setVentaForm({
      perfume_id: String(v.perfume_id),
      cliente: v.cliente || '',
      cantidad: v.cantidad || 1,
      precio_unitario: v.precio_unitario ?? '',
      tipo_pago: v.tipo_pago || 'contado',
      abonado: v.abonado ?? '',
      fecha: v.fecha || hoy,
      notas: v.notas || '',
    })
    setModal('venta')
  }

  const submitVenta = async () => {
    setError('')
    if (!ventaForm.perfume_id || !ventaForm.precio_unitario) {
      setError('Selecciona perfume y precio de venta')
      return
    }
    const total = totalVenta()
    if (editId) {
      const res = await api.put(`/ventas/${editId}`, {
        ...ventaForm,
        total_venta: total,
      })
      if (res.error) { setError(res.error); return }
    } else {
      const res = await api.post('/ventas', {
        ...ventaForm,
        total_venta: total,
        abonado: ventaForm.tipo_pago === 'contado'
          ? total
          : (ventaForm.abonado === '' ? 0 : Number(ventaForm.abonado)),
      })
      if (res.error) { setError(res.error); return }
    }
    await load()
    setModal(null)
    setEditId(null)
    setVentaForm({ ...emptyVenta, fecha: hoy })
  }

  const openAbono = (v) => {
    setVentaAbono(v)
    setAbonoForm({ monto: '', fecha: hoy, notas: '' })
    setError('')
    setModal('abono')
  }

  const submitAbono = async () => {
    setError('')
    if (!abonoForm.monto || Number(abonoForm.monto) <= 0) {
      setError('Monto inválido')
      return
    }
    const res = await api.post(`/ventas/${ventaAbono.id}/abonos`, abonoForm)
    if (res.error) { setError(res.error); return }
    await load()
    setModal(null)
    setVentaAbono(null)
  }

  const eliminar = async (tipo, id) => {
    if (!confirm('¿Eliminar? Esta acción no se puede deshacer.')) return
    const res = await api.delete(`/${tipo}/${id}`)
    if (res.error) alert(res.error)
    load()
  }

  if (!resumen) {
    return <div className="flex-center" style={{ height: 280, color: 'var(--cream-dim)' }}>Cargando...</div>
  }

  const totalPorCobrarGlobal = ventas.reduce((acc, venta) => acc + (venta.resto || 0), 0)
  
  // Mostrar el saldo guardado o el del resumen
  const dineroMostrado = saldoGuardado !== null ? saldoGuardado : resumen.dinero_en_caja

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="ornament">✦ ✦ ✦</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>Mis <span>Perfumes</span></h1>
          <div className="label" style={{ marginTop: 6 }}>Control estricto de costos, ventas y dinero</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-outline"
            disabled={!perfumes.some(p => p.stock > 0)}
            onClick={() => { setError(''); setEditId(null); setVentaForm({ ...emptyVenta, fecha: hoy }); setModal('venta') }}
          >
            <ShoppingCart size={14} /> Vender
          </button>
          <button
            className="btn btn-gold"
            onClick={() => { setError(''); setEditId(null); setPerfumeForm(emptyPerfume); setModal('perfume') }}
          >
            <Plus size={14} /> Registrar perfume
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {/* Tarjeta de Dinero en caja con botón de edición */}
        <div className="stat-card" style={{ position: 'relative' }}>
          <div className="label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Dinero en caja (cobrado)
            <button 
              className="btn-icon" 
              onClick={() => {
                setEditSaldo(true)
                setSaldoManual(String(dineroMostrado))
              }}
              title="Editar saldo manualmente"
            >
              <Edit3 size={14} />
            </button>
          </div>
          {editSaldo ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <input
                type="number"
                className="form-input"
                value={saldoManual}
                onChange={e => setSaldoManual(e.target.value)}
                style={{ width: 120, padding: '4px 8px', fontSize: '1rem' }}
                autoFocus
              />
              <button className="btn btn-gold" onClick={guardarSaldoManual} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                Guardar
              </button>
              <button className="btn btn-outline" onClick={() => setEditSaldo(false)} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                Cancelar
              </button>
            </div>
          ) : (
            <div className="stat-value" style={{ color: '#4a8c6a', fontSize: '1.15rem' }}>{fmt(dineroMostrado)}</div>
          )}
          {saldoGuardado !== null && !editSaldo && (
            <div style={{ fontSize: '0.6rem', color: 'var(--cream-dim)', marginTop: 2 }}>
              * Saldo manual
            </div>
          )}
        </div>
        
        <Kpi label="Por cobrar (de ventas)" value={fmt(totalPorCobrarGlobal)} color="#c9a84c" />
        <Kpi label="Capital en inventario" value={fmt(resumen.capital_en_inventario)} />
        <Kpi label="Capital total invertido" value={fmt(resumen.capital_invertido)} />
        <Kpi label="Stock (piezas)" value={`${resumen.stock}`} />
        <Kpi label="Valor stock a público" value={fmt(resumen.valor_stock_publico)} color="#c9a84c" />
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '14px 18px', fontSize: '0.8rem', color: 'var(--cream-dim)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--gold)' }}>Cómo leer los números:</strong>{' '}
        <em>Dinero en caja</em> = lo que ya te pagaron los clientes, <strong>puedes editarlo manualmente</strong> si gastas dinero en nuevos perfumes.<br/>
        <em>Por cobrar</em> = Suma de los saldos restantes de TODAS las ventas.<br/>
        <em>Capital en inventario</em> = lo que te costó lo que aún no vendes.
      </div>

      {error && !modal && (
        <div className="card" style={{ borderColor: '#c45c5c', color: '#c45c5c', marginBottom: 16, padding: '12px 16px' }}>{error}</div>
      )}

      {/* INVENTARIO */}
      <div className="card">
        <div className="section-title mb-4">Inventario</div>
        {perfumes.length === 0 ? (
          <div className="empty-state">
            <Package size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <p>Sin perfumes. Registra el primero.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Perfume</th>
                  <th>Proveedor</th>
                  <th>Costo prov.</th>
                  <th>Envío/u</th>
                  <th>Costo/u</th>
                  <th>P. público</th>
                  <th>Ganancia/u</th>
                  <th>Cant.</th>
                  <th>Vend.</th>
                  <th>Stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {perfumes.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--cream)', fontWeight: 500 }}>{p.nombre}</td>
                    <td>{p.proveedor || '—'}</td>
                    <td>{fmt(p.precio_proveedor)}</td>
                    <td>
                      {fmt(p.envio_unitario)}
                      <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--cream-dim)' }}>
                        (lote {fmt(p.costo_envio)} / {p.piezas_envio})
                      </span>
                    </td>
                    <td>{fmt(p.costo_unitario)}</td>
                    <td className="td-gold">{fmt(p.precio_publico)}</td>
                    <td className={p.ganancia_unitaria >= 0 ? 'td-green' : 'td-red'}>{fmt(p.ganancia_unitaria)}</td>
                    <td>{p.piezas_compradas}</td>
                    <td>{p.vendidos}</td>
                    <td>{p.stock}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn-icon" title="Editar" onClick={() => openEditPerfume(p)}><Pencil size={14} /></button>
                      <button className="btn-icon" title="Eliminar" onClick={() => eliminar('perfumes', p.id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VENTAS */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="section-title mb-4">Ventas</div>
        {ventas.length === 0 ? (
          <div className="empty-state"><p>Sin ventas</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Perfume</th>
                  <th>Cant.</th>
                  <th>Total</th>
                  <th>Pago</th>
                  <th>Abonado</th>
                  <th>Resta</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ventas.map(v => (
                  <tr key={v.id}>
                    <td>{fmtDate(v.fecha)}</td>
                    <td style={{ color: 'var(--cream)' }}>{v.cliente || '—'}</td>
                    <td>{v.perfume_nombre}</td>
                    <td>{v.cantidad}</td>
                    <td>{fmt(v.total_venta)}</td>
                    <td>{v.tipo_pago === 'abonos' ? 'A plazos' : '1 pago'}</td>
                    <td className="td-green">{fmt(v.abonado)}</td>
                    <td className="td-gold">{fmt(v.resto)}</td>
                    <td>
                      <span className={`badge ${v.liquidado ? 'badge-green' : 'badge-gold'}`}>
                        {v.liquidado ? 'Liquidado' : `${v.pct_pagado}%`}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn-icon" title="Editar" onClick={() => openEditVenta(v)}><Pencil size={14} /></button>
                      {!v.liquidado && (
                        <button className="btn-icon" title="Abono" onClick={() => openAbono(v)}>
                          <CreditCard size={14} />
                        </button>
                      )}
                      <button className="btn-icon" title="Eliminar" onClick={() => eliminar('ventas', v.id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HISTORIAL ABONOS */}
      {ventas.some(v => v.abonos?.length > 0) && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="section-title mb-4">Historial de abonos</div>
          {ventas.filter(v => v.abonos?.length).map(v => (
            <div key={v.id} style={{ marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--noir-border)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--cream)', marginBottom: 6 }}>
                {v.cliente || 'Cliente'} — {v.perfume_nombre} ({fmt(v.total_venta)})
              </div>
              <table className="data-table">
                <thead>
                  <tr><th>Fecha</th><th>Monto</th><th>Notas</th><th></th></tr>
                </thead>
                <tbody>
                  {v.abonos.map(a => (
                    <tr key={a.id}>
                      <td>{fmtDate(a.fecha)}</td>
                      <td className="td-green">{fmt(a.monto)}</td>
                      <td>{a.notas || '—'}</td>
                      <td>
                        <button className="btn-icon" onClick={() => eliminar('abonos', a.id)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* MODALES */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="section-title">
                {modal === 'perfume' && (editId ? 'Editar perfume' : 'Registrar perfume')}
                {modal === 'venta' && (editId ? 'Editar venta' : 'Registrar venta')}
                {modal === 'abono' && 'Registrar abono'}
              </span>
              <button className="btn-icon" onClick={() => { setModal(null); setEditId(null) }}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {error && <div style={{ color: '#c45c5c', fontSize: '0.8rem', marginBottom: 12 }}>{error}</div>}

              {modal === 'perfume' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Nombre del perfume *</label>
                    <input className="form-input" value={perfumeForm.nombre} onChange={e => sp('nombre', e.target.value)} placeholder="Ej: Dior Sauvage" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Proveedor</label>
                    <input className="form-input" value={perfumeForm.proveedor} onChange={e => sp('proveedor', e.target.value)} placeholder="Nombre del proveedor" />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Costo de proveedor ($) *</label>
                      <input type="number" className="form-input" value={perfumeForm.precio_proveedor} onChange={e => sp('precio_proveedor', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Precio venta al público ($)</label>
                      <input type="number" className="form-input" value={perfumeForm.precio_publico} onChange={e => sp('precio_publico', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Piezas compradas</label>
                    <input type="number" min={1} className="form-input" value={perfumeForm.piezas_compradas} onChange={e => setPiezas(e.target.value)} />
                  </div>

                  <div style={{ border: '1px solid var(--noir-border)', borderRadius: 6, padding: 14, marginBottom: 14 }}>
                    <div className="label" style={{ marginBottom: 10 }}>ENVÍO DEL LOTE (opcional)</div>
                    <div className="form-grid-2">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">¿Cuánto costó el envío? ($)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={perfumeForm.costo_envio}
                          onChange={e => sp('costo_envio', e.target.value)}
                          placeholder="0 si no hubo envío"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">¿Entre cuántas piezas se reparte?</label>
                        <input
                          type="number"
                          min={1}
                          className="form-input"
                          value={perfumeForm.piezas_envio}
                          onChange={e => sp('piezas_envio', e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', marginTop: 10 }}>
                      Ej: compraste 4 perfumes y el envío fue $240 → pon envío 240 y reparte en 4 → {fmt(240 / 4)}/pieza.
                      Si no cobraron envío, deja en 0.
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--cream-dim)', marginBottom: 12, lineHeight: 1.7 }}>
                    Envío por pieza: <strong style={{ color: 'var(--cream)' }}>{fmt(envioU())}</strong><br />
                    Costo unitario real: <strong style={{ color: 'var(--cream)' }}>{fmt(costoU())}</strong><br />
                    Ganancia unitaria: <strong style={{ color: gananciaU() >= 0 ? '#4a8c6a' : '#c45c5c' }}>{fmt(gananciaU())}</strong>
                    {' · '}Si vendes todo:{' '}
                    <strong style={{ color: 'var(--gold)' }}>
                      {fmt(gananciaU() * (parseInt(perfumeForm.piezas_compradas, 10) || 0))}
                    </strong>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notas</label>
                    <textarea className="form-input" value={perfumeForm.notas} onChange={e => sp('notas', e.target.value)} />
                  </div>
                </>
              )}

              {modal === 'venta' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Perfume *</label>
                    <select className="form-input" value={ventaForm.perfume_id} onChange={e => {
                      const id = e.target.value
                      sv('perfume_id', id)
                      const p = perfumes.find(x => x.id === parseInt(id, 10))
                      if (p) sv('precio_unitario', p.precio_publico)
                    }}>
                      <option value="">Seleccionar...</option>
                      {perfumes.filter(p => p.stock > 0).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} · stock {p.stock} · público {fmt(p.precio_publico)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cliente</label>
                    <input className="form-input" value={ventaForm.cliente} onChange={e => sv('cliente', e.target.value)} placeholder="¿A quién se lo vendimos?" />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Cantidad</label>
                      <input type="number" min={1} className="form-input" value={ventaForm.cantidad} onChange={e => sv('cantidad', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Precio unitario venta ($)</label>
                      <input type="number" className="form-input" value={ventaForm.precio_unitario} onChange={e => sv('precio_unitario', e.target.value)} />
                    </div>
                  </div>
                  <div style={{ color: 'var(--gold)', marginBottom: 12 }}>Total: <strong>{fmt(totalVenta())}</strong></div>

                  <div className="form-group">
                    <label className="form-label">Forma de pago</label>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                        <input type="radio" checked={ventaForm.tipo_pago === 'contado'} onChange={() => sv('tipo_pago', 'contado')} />
                        Un solo pago
                      </label>
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                        <input type="radio" checked={ventaForm.tipo_pago === 'abonos'} onChange={() => sv('tipo_pago', 'abonos')} />
                        Varios pagos / abonos
                      </label>
                    </div>
                  </div>

                  {ventaForm.tipo_pago === 'abonos' && (
                    <div className="form-group">
                      <label className="form-label">Abono inicial ($)</label>
                      <input type="number" className="form-input" value={ventaForm.abonado} onChange={e => sv('abonado', e.target.value)} placeholder="0 si no deja nada hoy" />
                      <div style={{ fontSize: '0.72rem', color: 'var(--cream-dim)', marginTop: 4 }}>
                        Resta: {fmt(Math.max(0, totalVenta() - (Number(ventaForm.abonado) || 0)))}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Fecha</label>
                    <input type="date" className="form-input" value={ventaForm.fecha} onChange={e => sv('fecha', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notas</label>
                    <textarea className="form-input" value={ventaForm.notas} onChange={e => sv('notas', e.target.value)} />
                  </div>
                </>
              )}

              {modal === 'abono' && ventaAbono && (
                <>
                  <div style={{ fontSize: '0.85rem', color: 'var(--cream-dim)', marginBottom: 14, lineHeight: 1.6 }}>
                    Cliente: <strong style={{ color: 'var(--cream)' }}>{ventaAbono.cliente || '—'}</strong><br />
                    Total {fmt(ventaAbono.total_venta)} · Abonado {fmt(ventaAbono.abonado)} ·{' '}
                    <span style={{ color: 'var(--gold)' }}>Resta {fmt(ventaAbono.resto)}</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monto del abono ($)</label>
                    <input type="number" className="form-input" value={abonoForm.monto} onChange={e => setAbonoForm(f => ({ ...f, monto: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha</label>
                    <input type="date" className="form-input" value={abonoForm.fecha} onChange={e => setAbonoForm(f => ({ ...f, fecha: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notas</label>
                    <input className="form-input" value={abonoForm.notas} onChange={e => setAbonoForm(f => ({ ...f, notas: e.target.value }))} />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setModal(null); setEditId(null) }}>Cancelar</button>
              <button className="btn btn-gold" onClick={() => {
                if (modal === 'perfume') submitPerfume()
                if (modal === 'venta') submitVenta()
                if (modal === 'abono') submitAbono()
              }}>{editId ? 'Guardar cambios' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, color }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="stat-value" style={{ color: color || 'var(--cream)', fontSize: '1.15rem' }}>{value}</div>
    </div>
  )
}
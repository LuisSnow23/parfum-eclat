import { useState, useEffect } from 'react'
import {
  Plus,
  X,
  Trash2,
  ShoppingCart,
  Package,
  CreditCard,
  Pencil,
  Clock,
  Archive,
  Filter,
  PackageX
} from 'lucide-react'
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

const emptyFiltroVentas = {
  cliente: '',
  perfume: '',
  estado: 'todos',
  fechaInicio: '',
  fechaFin: '',
}

const emptyFiltroAbonos = {
  cliente: '',
  perfume: '',
  fechaInicio: '',
  fechaFin: '',
}

const PERFUMES_POR_PAGINA = 10

const pasaFiltro = (v, f) => {
  if (f.cliente && !v.cliente?.toLowerCase().includes(f.cliente.toLowerCase())) return false
  if (f.perfume && !v.perfume_nombre?.toLowerCase().includes(f.perfume.toLowerCase())) return false
  if (f.fechaInicio && v.fecha < f.fechaInicio) return false
  if (f.fechaFin && v.fecha > f.fechaFin) return false
  return true
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
  const [editAbonoId, setEditAbonoId] = useState(null)
  const [paginaPerfumes, setPaginaPerfumes] = useState(1)
  const [historialFiltro, setHistorialFiltro] = useState(emptyFiltroVentas)
  const [histAbonosFiltro, setHistAbonosFiltro] = useState(emptyFiltroAbonos)
  const [showFiltrosVentas, setShowFiltrosVentas] = useState(false)
  const [showFiltrosAbonos, setShowFiltrosAbonos] = useState(false)

  const load = async () => {
    const [r, p, v] = await Promise.all([
      api.get('/resumen'),
      api.get('/perfumes'),
      api.get('/ventas'),
    ])
    setResumen(r)
    setPerfumes(p)
    setVentas(v)
  }

  useEffect(() => {
    load()
  }, [])

  const sp = (k, v) => setPerfumeForm(f => ({ ...f, [k]: v }))
  const sv = (k, v) => setVentaForm(f => ({ ...f, [k]: v }))

  const setPiezas = val => {
    const n = parseInt(val, 10) || 1
    setPerfumeForm(f => ({
      ...f,
      piezas_compradas: n,
      piezas_envio:
        f.piezas_envio === f.piezas_compradas || !f.piezas_envio ? n : f.piezas_envio,
    }))
  }

  const envioU = () => {
    const env = parseFloat(perfumeForm.costo_envio) || 0
    const n = Math.max(parseInt(perfumeForm.piezas_envio, 10) || 1, 1)
    return env / n
  }

  const costoU = () => (parseFloat(perfumeForm.precio_proveedor) || 0) + envioU()

  const gananciaU = () => (parseFloat(perfumeForm.precio_publico) || 0) - costoU()

  const totalVenta = () =>
    (parseFloat(ventaForm.precio_unitario) || 0) * (parseInt(ventaForm.cantidad, 10) || 1)

  const cerrarModal = () => {
    setModal(null)
    setEditId(null)
    setEditAbonoId(null)
  }

  const openEditPerfume = p => {
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
    if (!perfumeForm.nombre) return setError('Nombre obligatorio')
    if (perfumeForm.precio_proveedor === '') return setError('Costo de proveedor obligatorio')

    const res = editId
      ? await api.put(`/perfumes/${editId}`, perfumeForm)
      : await api.post('/perfumes', perfumeForm)

    if (res.error) return setError(res.error)

    await load()
    setModal(null)
    setEditId(null)
    setPerfumeForm(emptyPerfume)
  }

  const openEditVenta = v => {
    setError('')
    setEditId(v.id)
    setVentaForm({
      perfume_id: String(v.perfume_id),
      cliente: v.cliente || '',
      cantidad: v.cantidad || 1,
      precio_unitario: v.precio_unitario ?? '',
      tipo_pago: v.tipo_pago || 'contado',
      abonado: v.abonado_inicial ?? '',
      fecha: v.fecha || hoy,
      notas: v.notas || '',
    })
    setModal('venta')
  }

  const submitVenta = async () => {
    setError('')
    if (!ventaForm.perfume_id || !ventaForm.precio_unitario)
      return setError('Selecciona perfume y precio de venta')

    const total = totalVenta()

    if (editId) {
      const res = await api.put(`/ventas/${editId}`, { ...ventaForm, total_venta: total })
      if (res.error) return setError(res.error)
    } else {
      const res = await api.post('/ventas', {
        ...ventaForm,
        total_venta: total,
        abonado:
          ventaForm.tipo_pago === 'contado'
            ? total
            : ventaForm.abonado === ''
              ? 0
              : Number(ventaForm.abonado),
      })
      if (res.error) return setError(res.error)
    }

    await load()
    setModal(null)
    setEditId(null)
    setVentaForm({ ...emptyVenta, fecha: hoy })
  }

  const openAbono = v => {
    setVentaAbono(v)
    setEditAbonoId(null)
    setAbonoForm({ monto: '', fecha: hoy, notas: '' })
    setError('')
    setModal('abono')
  }

  const openEditAbono = (abono, venta) => {
    setVentaAbono(venta)
    setEditAbonoId(abono.id)
    setAbonoForm({ monto: abono.monto, fecha: abono.fecha || hoy, notas: abono.notas || '' })
    setError('')
    setModal('abono')
  }

  const submitAbono = async () => {
    setError('')
    if (!abonoForm.monto || Number(abonoForm.monto) <= 0) return setError('Monto inválido')

    const res = editAbonoId
      ? await api.put(`/abonos/${editAbonoId}`, abonoForm)
      : await api.post(`/ventas/${ventaAbono.id}/abonos`, abonoForm)

    if (res.error) return setError(res.error)

    await load()
    setModal(null)
    setVentaAbono(null)
    setEditAbonoId(null)
  }

  const eliminar = async (tipo, id) => {
    if (!confirm('¿Eliminar? Esta acción no se puede deshacer.')) return
    const res = await api.delete(`/${tipo}/${id}`)
    if (res.error) alert(res.error)
    load()
  }

  const ventasPendientes = ventas.filter(v => !v.liquidado)
  const ventasLiquidadas = ventas.filter(v => v.liquidado)
  const ventasFiltradas = ventasLiquidadas.filter(v => pasaFiltro(v, historialFiltro))

  const ventasPendientesConAbonos = ventas
    .filter(v => !v.liquidado && v.abonos?.length > 0)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  const ventasLiquidadasConAbonos = ventasLiquidadas
    .filter(v => v.abonos?.length > 0)
    .filter(v => pasaFiltro(v, histAbonosFiltro))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  if (!resumen) {
    return (
      <div className="flex-center" style={{ height: 280, color: 'var(--cream-dim)' }}>
        Cargando...
      </div>
    )
  }

  const totalPorCobrarGlobal = ventasPendientes.reduce((acc, v) => acc + (v.resto || 0), 0)

  // ── FILTRADO Y PAGINACIÓN (SOLO EN STOCK) ──
  const perfumesEnStock = perfumes.filter(p => p.stock > 0)
  const perfumesAgotados = perfumes.filter(p => p.stock <= 0)

  const totalPaginasPerfumes = Math.max(1, Math.ceil(perfumesEnStock.length / PERFUMES_POR_PAGINA))
  const paginaPerfumesActual = Math.min(paginaPerfumes, totalPaginasPerfumes)
  const inicioPerfumes = (paginaPerfumesActual - 1) * PERFUMES_POR_PAGINA
  const perfumesPaginados = perfumesEnStock.slice(inicioPerfumes, inicioPerfumes + PERFUMES_POR_PAGINA)

  const totalAbonosHistoricos = ventasLiquidadasConAbonos.reduce(
    (s, v) => s + v.abonos.reduce((s2, a) => s2 + Number(a.monto), 0),
    0
  )

  const esHistorial = modal === 'historial' || modal === 'historialAbonos' || modal === 'agotados'

  return (
    <div className="perfumes-page">
      {/* ───────── HEADER ───────── */}
      <div className="page-header">
        <div>
          <div className="ornament">✦ ✦ ✦</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            Mis <span>Perfumes</span>
          </h1>
          <div className="label" style={{ marginTop: 6 }}>
            Control estricto de costos, ventas y dinero
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-outline"
            disabled={!perfumes.some(p => p.stock > 0)}
            onClick={() => {
              setError('')
              setEditId(null)
              setVentaForm({ ...emptyVenta, fecha: hoy })
              setModal('venta')
            }}
          >
            <ShoppingCart size={14} /> Vender
          </button>

          <button
            className="btn btn-outline"
            onClick={() => {
              setError('')
              setHistorialFiltro(emptyFiltroVentas)
              setShowFiltrosVentas(false)
              setModal('historial')
            }}
            style={{ borderColor: 'var(--gold)' }}
          >
            <Clock size={14} /> Historial de ventas
          </button>

          <button
            className="btn btn-gold"
            onClick={() => {
              setError('')
              setEditId(null)
              setPerfumeForm(emptyPerfume)
              setModal('perfume')
            }}
          >
            <Plus size={14} /> Registrar perfume
          </button>
        </div>
      </div>

      {/* ───────── KPIs ───────── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Dinero en caja (cobrado)</div>
          <div className="stat-value" style={{ color: '#4a8c6a', fontSize: '1.15rem' }}>
            {fmt(resumen.dinero_en_caja)}
          </div>
          <div style={{ fontSize: '0.55rem', color: 'var(--cream-dim)', marginTop: 2 }}>
            Cobrado de ventas - Retirado del fondo
          </div>
        </div>

        <Kpi label="Por cobrar (de ventas)" value={fmt(totalPorCobrarGlobal)} color="#c9a84c" />
        <Kpi label="Capital en inventario" value={fmt(resumen.capital_en_inventario)} />
        <Kpi label="Capital total invertido" value={fmt(resumen.capital_invertido)} />
        <Kpi label="Stock (piezas)" value={`${resumen.stock}`} />
        <Kpi label="Valor stock a público" value={fmt(resumen.valor_stock_publico)} color="#c9a84c" />
        <Kpi label="Valor potencial total" value={fmt(resumen.valor_potencial_total)} color="#f0c040" />
      </div>

      {/* ───────── AYUDA COLAPSABLE ───────── */}
      <details className="card info-card" style={{ marginBottom: 16 }}>
        <summary>
          <span style={{ color: 'var(--gold)', fontWeight: 600 }}>ℹ️ Cómo leer los números</span>
        </summary>
        <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--cream-dim)', lineHeight: 1.6 }}>
          <em>Dinero en caja</em> = lo que te han pagado los clientes <strong>menos</strong> lo que
          has retirado del fondo de socios.
          <br />
          Si necesitas gastar en nuevos perfumes, registra un{' '}
          <strong>retiro en el Fondo de Socios</strong> y se reflejará automáticamente.
          <br />
          <em>Por cobrar</em> = Suma de los saldos restantes de TODAS las ventas pendientes.
          <br />
          <em>Capital en inventario</em> = lo que te costó lo que aún no vendes.
        </div>
      </details>

      {error && !modal && (
        <div
          className="card"
          style={{ borderColor: '#c45c5c', color: '#c45c5c', marginBottom: 16, padding: '12px 16px' }}
        >
          {error}
        </div>
      )}

      {/* ───────── INVENTARIO (SOLO EN STOCK) ───────── */}
      <div className="card">
        <div className="section-title-row">
          <span className="section-title">Inventario en Stock</span>
          
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setModal('agotados')}
            style={{ borderColor: 'var(--gold)' }}
          >
            <PackageX size={14} /> Ver agotados ({perfumesAgotados.length})
          </button>
        </div>

        {perfumesEnStock.length === 0 ? (
          <div className="empty-state">
            <Package size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <p>No hay perfumes con stock disponible. Revisa los agotados.</p>
          </div>
        ) : (
          <div className="table-wrap table-stack-wrap">
            <table className="data-table stack-table">
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
                {perfumesPaginados.map(p => (
                  <tr key={p.id}>
                    <td className="cell-title" data-label="Perfume">
                      {p.nombre}
                    </td>
                    <td data-label="Proveedor">{p.proveedor || '—'}</td>
                    <td data-label="Costo prov.">{fmt(p.precio_proveedor)}</td>
                    <td data-label="Envío/u">
                      {fmt(p.envio_unitario)}
                      <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--cream-dim)' }}>
                        (lote {fmt(p.costo_envio)} / {p.piezas_envio})
                      </span>
                    </td>
                    <td data-label="Costo/u">{fmt(p.costo_unitario)}</td>
                    <td className="td-gold" data-label="P. público">{fmt(p.precio_publico)}</td>
                    <td
                      className={p.ganancia_unitaria >= 0 ? 'td-green' : 'td-red'}
                      data-label="Ganancia/u"
                    >
                      {fmt(p.ganancia_unitaria)}
                    </td>
                    <td data-label="Cant.">{p.piezas_compradas}</td>
                    <td data-label="Vendidos">{p.vendidos}</td>
                    <td data-label="Stock">{p.stock}</td>
                    <td className="cell-actions">
                      <button className="btn-icon" title="Editar" onClick={() => openEditPerfume(p)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn-icon" title="Eliminar" onClick={() => eliminar('perfumes', p.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {perfumesEnStock.length > PERFUMES_POR_PAGINA && (
              <div className="pager">
                <button
                  className="btn btn-outline"
                  disabled={paginaPerfumesActual === 1}
                  onClick={() => setPaginaPerfumes(pg => Math.max(1, pg - 1))}
                >
                  Anterior
                </button>
                <span style={{ fontSize: '0.78rem', color: 'var(--cream-dim)' }}>
                  Página {paginaPerfumesActual} de {totalPaginasPerfumes}
                </span>
                <button
                  className="btn btn-outline"
                  disabled={paginaPerfumesActual === totalPaginasPerfumes}
                  onClick={() => setPaginaPerfumes(pg => Math.min(totalPaginasPerfumes, pg + 1))}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ───────── VENTAS PENDIENTES ───────── */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="section-title mb-4">Ventas pendientes ({ventasPendientes.length})</div>

        {ventasPendientes.length === 0 ? (
          <div className="empty-state">
            <p>No hay ventas pendientes. Todas están liquidadas.</p>
          </div>
        ) : (
          <div className="table-wrap table-stack-wrap">
            <table className="data-table stack-table">
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
                  <th>Notas</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ventasPendientes.map(v => (
                  <tr key={v.id}>
                    <td data-label="Fecha">{fmtDate(v.fecha)}</td>
                    <td className="cell-title" data-label="Cliente">
                      <span>{v.cliente || '—'}</span>
                    </td>
                    <td className="cell-full" data-label="Perfume">{v.perfume_nombre}</td>
                    <td data-label="Cant.">{v.cantidad}</td>
                    <td data-label="Total">{fmt(v.total_venta)}</td>
                    <td data-label="Pago">{v.tipo_pago === 'abonos' ? 'A plazos' : '1 pago'}</td>
                    <td className="td-green" data-label="Abonado">{fmt(v.abonado)}</td>
                    <td className="td-gold" data-label="Resta">{fmt(v.resto)}</td>
                    <td className="cell-notas" data-label="Notas">{v.notas || '—'}</td>
                    <td className="cell-estado" data-label="Estado">
                      <span className="badge badge-gold">{v.pct_pagado}%</span>
                    </td>
                    <td className="cell-actions">
                      <button className="btn-icon" title="Editar venta" onClick={() => openEditVenta(v)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn-icon" title="Agregar abono" onClick={() => openAbono(v)}>
                        <CreditCard size={14} />
                      </button>
                      <button className="btn-icon" title="Eliminar venta" onClick={() => eliminar('ventas', v.id)}>
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

      {/* ───────── HISTORIAL DE ABONOS ACTIVOS ───────── */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="section-title-row">
          <span className="section-title">Historial de abonos (activos)</span>
          <button
            className="btn btn-outline btn-sm"
            disabled={ventasPendientesConAbonos.length === 0 && ventasLiquidadasConAbonos.length === 0}
            onClick={() => {
              setHistAbonosFiltro(emptyFiltroAbonos)
              setShowFiltrosAbonos(false)
              setModal('historialAbonos')
            }}
            style={{ borderColor: 'var(--gold)' }}
          >
            <Archive size={14} /> Ver histórico completo
          </button>
        </div>

        {ventasPendientesConAbonos.length === 0 ? (
          <div className="empty-state">
            <p>Sin abonos activos registrados.</p>
          </div>
        ) : (
          ventasPendientesConAbonos.map(v => (
            <div key={v.id} className="abono-group">
              <div className="abono-group-title">
                {v.cliente || 'Cliente'} — {v.perfume_nombre} ({fmt(v.total_venta)})
              </div>

              <div className="table-wrap table-stack-wrap">
                <table className="data-table stack-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Monto</th>
                      <th>Notas</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.abonos.map(a => (
                      <tr key={a.id}>
                        <td data-label="Fecha">{fmtDate(a.fecha)}</td>
                        <td className="td-green" data-label="Monto">{fmt(a.monto)}</td>
                        <td className="cell-notas" data-label="Notas">{a.notas || '—'}</td>
                        <td className="cell-actions">
                          <button className="btn-icon" title="Editar abono" onClick={() => openEditAbono(a, v)}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn-icon" title="Eliminar abono" onClick={() => eliminar('abonos', a.id)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ───────── MODALES ───────── */}
      {modal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: esHistorial ? 800 : 520 }}
          >
            <div className="modal-header">
              <span className="section-title">
                {modal === 'perfume' && (editId ? 'Editar perfume' : 'Registrar perfume')}
                {modal === 'venta' && (editId ? 'Editar venta' : 'Registrar venta')}
                {modal === 'abono' && (editAbonoId ? 'Editar abono' : 'Registrar abono')}
                {modal === 'historial' && 'Historial de ventas liquidadas'}
                {modal === 'historialAbonos' && 'Histórico de abonos finalizados'}
                {modal === 'agotados' && 'Historial de Perfumes Agotados'}
              </span>
              <button className="btn-icon" onClick={cerrarModal} aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {error && (
                <div style={{ color: '#c45c5c', fontSize: '0.8rem', marginBottom: 12 }}>{error}</div>
              )}

              {/* ── Historial de Perfumes Agotados ── */}
              {modal === 'agotados' && (
                <>
                  <div className="table-wrap table-stack-wrap" style={{ maxHeight: 450, overflowY: 'auto' }}>
                    <table className="data-table stack-table">
                      <thead>
                        <tr>
                          <th>Perfume</th>
                          <th>Proveedor</th>
                          <th>Costo Prov.</th>
                          <th>P. Público</th>
                          <th>Cant. Total</th>
                          <th>Vendidos</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {perfumesAgotados.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="cell-full" style={{ textAlign: 'center', color: 'var(--cream-dim)' }}>
                              No hay perfumes agotados todavía.
                            </td>
                          </tr>
                        ) : (
                          perfumesAgotados.map(p => (
                            <tr key={p.id}>
                              <td className="cell-title" data-label="Perfume">{p.nombre}</td>
                              <td data-label="Proveedor">{p.proveedor || '—'}</td>
                              <td data-label="Costo Prov.">{fmt(p.precio_proveedor)}</td>
                              <td className="td-gold" data-label="P. Público">{fmt(p.precio_publico)}</td>
                              <td data-label="Cant. Total">{p.piezas_compradas}</td>
                              <td className="td-green" data-label="Vendidos">{p.vendidos}</td>
                              <td className="cell-actions">
                                <button className="btn-icon" title="Editar" onClick={() => openEditPerfume(p)}>
                                  <Pencil size={14} />
                                </button>
                                <button className="btn-icon" title="Eliminar" onClick={() => eliminar('perfumes', p.id)}>
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="totals-row" style={{ marginTop: 16 }}>
                    <div>Perfumes agotados: <strong style={{ color: 'var(--cream)' }}>{perfumesAgotados.length}</strong></div>
                  </div>
                </>
              )}

              {/* ── Historial de ventas liquidadas ── */}
              {modal === 'historial' && (
                <>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowFiltrosVentas(s => !s)}
                    style={{ marginBottom: 12 }}
                  >
                    <Filter size={14} /> {showFiltrosVentas ? 'Ocultar filtros' : 'Mostrar filtros'}
                  </button>

                  {showFiltrosVentas && (
                    <div className="filter-grid">
                      <input
                        className="form-input"
                        placeholder="Buscar cliente..."
                        value={historialFiltro.cliente}
                        onChange={e =>
                          setHistorialFiltro(f => ({ ...f, cliente: e.target.value }))
                        }
                      />
                      <input
                        className="form-input"
                        placeholder="Buscar perfume..."
                        value={historialFiltro.perfume}
                        onChange={e =>
                          setHistorialFiltro(f => ({ ...f, perfume: e.target.value }))
                        }
                      />
                    </div>
                  )}

                  <div className="table-wrap table-stack-wrap" style={{ maxHeight: 400, overflowY: 'auto' }}>
                    <table className="data-table stack-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Cliente</th>
                          <th>Perfume</th>
                          <th>Total</th>
                          <th>Abonado</th>
                          <th>Resta</th>
                          <th>Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventasFiltradas.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="cell-full" style={{ textAlign: 'center', color: 'var(--cream-dim)' }}>
                              No hay ventas liquidadas
                            </td>
                          </tr>
                        ) : (
                          ventasFiltradas.map(v => (
                            <tr key={v.id}>
                              <td data-label="Fecha">{fmtDate(v.fecha)}</td>
                              <td className="cell-title" data-label="Cliente">{v.cliente || '—'}</td>
                              <td className="cell-full" data-label="Perfume">{v.perfume_nombre}</td>
                              <td data-label="Total">{fmt(v.total_venta)}</td>
                              <td className="td-green" data-label="Abonado">{fmt(v.abonado)}</td>
                              <td className="td-gold" data-label="Resta">{fmt(v.resto)}</td>
                              <td className="cell-notas" data-label="Notas">{v.notas || '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="totals-row">
                    <div>
                      Total ventas:{' '}
                      <strong style={{ color: 'var(--cream)' }}>
                        {fmt(ventasFiltradas.reduce((s, v) => s + Number(v.total_venta || 0), 0))}
                      </strong>
                    </div>
                    <div>
                      Total cobrado:{' '}
                      <strong style={{ color: '#4a8c6a' }}>
                        {fmt(ventasFiltradas.reduce((s, v) => s + Number(v.abonado || 0), 0))}
                      </strong>
                    </div>
                  </div>
                </>
              )}

              {/* ── Histórico de abonos finalizados ── */}
              {modal === 'historialAbonos' && (
                <>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowFiltrosAbonos(s => !s)}
                    style={{ marginBottom: 12 }}
                  >
                    <Filter size={14} /> {showFiltrosAbonos ? 'Ocultar filtros' : 'Mostrar filtros'}
                  </button>

                  {showFiltrosAbonos && (
                    <div className="filter-grid">
                      <input
                        className="form-input"
                        placeholder="Buscar cliente..."
                        value={histAbonosFiltro.cliente}
                        onChange={e =>
                          setHistAbonosFiltro(f => ({ ...f, cliente: e.target.value }))
                        }
                      />
                      <input
                        className="form-input"
                        placeholder="Buscar perfume..."
                        value={histAbonosFiltro.perfume}
                        onChange={e =>
                          setHistAbonosFiltro(f => ({ ...f, perfume: e.target.value }))
                        }
                      />
                    </div>
                  )}

                  <div style={{ maxHeight: 450, overflowY: 'auto' }}>
                    {ventasLiquidadasConAbonos.length === 0 ? (
                      <div className="empty-state">
                        <p>No hay abonos de ventas liquidadas</p>
                      </div>
                    ) : (
                      ventasLiquidadasConAbonos.map(v => (
                        <div key={v.id} className="abono-group">
                          <div className="abono-group-title" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                            <span>
                              {v.cliente || 'Cliente'} — {v.perfume_nombre} ({fmt(v.total_venta)})
                            </span>
                            <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                              Liquidado
                            </span>
                          </div>

                          <div className="table-wrap table-stack-wrap">
                            <table className="data-table stack-table">
                              <thead>
                                <tr>
                                  <th>Fecha</th>
                                  <th>Monto</th>
                                  <th>Notas</th>
                                </tr>
                              </thead>
                              <tbody>
                                {v.abonos.map(a => (
                                  <tr key={a.id}>
                                    <td data-label="Fecha">{fmtDate(a.fecha)}</td>
                                    <td className="td-green" data-label="Monto">{fmt(a.monto)}</td>
                                    <td className="cell-notas" data-label="Notas">{a.notas || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="totals-row">
                    <div>
                      Ventas liquidadas:{' '}
                      <strong style={{ color: 'var(--cream)' }}>{ventasLiquidadasConAbonos.length}</strong>
                    </div>
                    <div>
                      Total abonos históricos:{' '}
                      <strong style={{ color: '#4a8c6a' }}>{fmt(totalAbonosHistoricos)}</strong>
                    </div>
                  </div>
                </>
              )}

              {/* ── Formulario de perfume ── */}
              {modal === 'perfume' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Nombre del perfume *</label>
                    <input
                      className="form-input"
                      value={perfumeForm.nombre}
                      onChange={e => sp('nombre', e.target.value)}
                      placeholder="Ej: Dior Sauvage"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Proveedor</label>
                    <input
                      className="form-input"
                      value={perfumeForm.proveedor}
                      onChange={e => sp('proveedor', e.target.value)}
                      placeholder="Nombre del proveedor"
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Costo de proveedor ($) *</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="form-input"
                        value={perfumeForm.precio_proveedor}
                        onChange={e => sp('precio_proveedor', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Precio venta al público ($)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="form-input"
                        value={perfumeForm.precio_publico}
                        onChange={e => sp('precio_publico', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Piezas compradas</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      className="form-input"
                      value={perfumeForm.piezas_compradas}
                      onChange={e => setPiezas(e.target.value)}
                    />
                  </div>

                  <div className="envio-box">
                    <div className="label" style={{ marginBottom: 10 }}>ENVÍO DEL LOTE (opcional)</div>
                    <div className="form-grid-2">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">¿Cuánto costó el envío? ($)</label>
                        <input
                          type="number"
                          inputMode="decimal"
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
                          inputMode="numeric"
                          min={1}
                          className="form-input"
                          value={perfumeForm.piezas_envio}
                          onChange={e => sp('piezas_envio', e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', marginTop: 10 }}>
                      Ej: compraste 4 perfumes y el envío fue $240 → pon envío 240 y reparte en 4 →{' '}
                      {fmt(240 / 4)}/pieza. Si no cobraron envío, deja en 0.
                    </div>
                  </div>

                  <div className="calc-box">
                    <div className="calc-chip">
                      <span>Envío por pieza</span>
                      <strong style={{ color: 'var(--cream)' }}>{fmt(envioU())}</strong>
                    </div>
                    <div className="calc-chip">
                      <span>Costo unitario real</span>
                      <strong style={{ color: 'var(--cream)' }}>{fmt(costoU())}</strong>
                    </div>
                    <div className="calc-chip">
                      <span>Ganancia unitaria</span>
                      <strong style={{ color: gananciaU() >= 0 ? '#4a8c6a' : '#c45c5c' }}>
                        {fmt(gananciaU())}
                      </strong>
                    </div>
                    <div className="calc-chip">
                      <span>Si vendes todo</span>
                      <strong style={{ color: 'var(--gold)' }}>
                        {fmt(gananciaU() * (parseInt(perfumeForm.piezas_compradas, 10) || 0))}
                      </strong>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notas</label>
                    <textarea
                      className="form-input"
                      value={perfumeForm.notas}
                      onChange={e => sp('notas', e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* ── Formulario de venta ── */}
              {modal === 'venta' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Perfume *</label>
                    <select
                      className="form-input"
                      value={ventaForm.perfume_id}
                      onChange={e => {
                        const id = e.target.value
                        sv('perfume_id', id)
                        const p = perfumes.find(x => x.id === parseInt(id, 10))
                        if (p) sv('precio_unitario', p.precio_publico)
                      }}
                    >
                      <option value="">Seleccionar...</option>
                      {perfumes
                        .filter(p => p.stock > 0)
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} · stock {p.stock} · público {fmt(p.precio_publico)}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cliente</label>
                    <input
                      className="form-input"
                      value={ventaForm.cliente}
                      onChange={e => sv('cliente', e.target.value)}
                      placeholder="¿A quién se lo vendimos?"
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Cantidad</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        className="form-input"
                        value={ventaForm.cantidad}
                        onChange={e => sv('cantidad', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Precio unitario venta ($)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="form-input"
                        value={ventaForm.precio_unitario}
                        onChange={e => sv('precio_unitario', e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ color: 'var(--gold)', marginBottom: 12 }}>
                    Total: <strong>{fmt(totalVenta())}</strong>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Forma de pago</label>
                    <div className="pay-options">
                      <label className="pay-option">
                        <input
                          type="radio"
                          checked={ventaForm.tipo_pago === 'contado'}
                          onChange={() => sv('tipo_pago', 'contado')}
                        />
                        Un solo pago
                      </label>
                      <label className="pay-option">
                        <input
                          type="radio"
                          checked={ventaForm.tipo_pago === 'abonos'}
                          onChange={() => sv('tipo_pago', 'abonos')}
                        />
                        Varios pagos / abonos
                      </label>
                    </div>
                  </div>

                  {ventaForm.tipo_pago === 'abonos' && (
                    <div className="form-group">
                      <label className="form-label">Abono inicial ($)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="form-input"
                        value={ventaForm.abonado}
                        onChange={e => sv('abonado', e.target.value)}
                        placeholder="0 si no deja nada hoy"
                      />
                      <div style={{ fontSize: '0.72rem', color: 'var(--cream-dim)', marginTop: 4 }}>
                        Abono inicial: {fmt(Number(ventaForm.abonado) || 0)}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Fecha</label>
                    <input
                      type="date"
                      className="form-input"
                      value={ventaForm.fecha}
                      onChange={e => sv('fecha', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notas</label>
                    <textarea
                      className="form-input"
                      value={ventaForm.notas}
                      onChange={e => sv('notas', e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* ── Formulario de abono ── */}
              {modal === 'abono' && ventaAbono && (
                <>
                  <div className="calc-box" style={{ marginBottom: 16 }}>
                    <div className="calc-chip" style={{ gridColumn: '1 / -1' }}>
                      <span>Cliente</span>
                      <strong style={{ color: 'var(--cream)' }}>{ventaAbono.cliente || '—'}</strong>
                    </div>
                    <div className="calc-chip">
                      <span>Total</span>
                      <strong style={{ color: 'var(--cream)' }}>{fmt(ventaAbono.total_venta)}</strong>
                    </div>
                    <div className="calc-chip">
                      <span>Abonado</span>
                      <strong style={{ color: '#4a8c6a' }}>{fmt(ventaAbono.abonado)}</strong>
                    </div>
                    <div className="calc-chip">
                      <span>Resta</span>
                      <strong style={{ color: 'var(--gold)' }}>{fmt(ventaAbono.resto)}</strong>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Monto del abono ($)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      className="form-input"
                      value={abonoForm.monto}
                      onChange={e => setAbonoForm(f => ({ ...f, monto: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fecha</label>
                    <input
                      type="date"
                      className="form-input"
                      value={abonoForm.fecha}
                      onChange={e => setAbonoForm(f => ({ ...f, fecha: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notas</label>
                    <input
                      className="form-input"
                      value={abonoForm.notas}
                      onChange={e => setAbonoForm(f => ({ ...f, notas: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={cerrarModal}>
                {esHistorial ? 'Cerrar' : 'Cancelar'}
              </button>
              {!esHistorial && (
                <button
                  className="btn btn-gold"
                  onClick={() => {
                    if (modal === 'perfume') submitPerfume()
                    if (modal === 'venta') submitVenta()
                    if (modal === 'abono') submitAbono()
                  }}
                >
                  {editId || editAbonoId ? 'Guardar cambios' : 'Guardar'}
                </button>
              )}
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
      <div className="stat-value" style={{ color: color || 'var(--cream)', fontSize: '1.15rem' }}>
        {value}
      </div>
    </div>
  )
}
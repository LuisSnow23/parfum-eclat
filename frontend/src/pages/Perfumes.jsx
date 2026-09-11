import { useState, useEffect } from 'react'
import { Plus, X, Trash2, ShoppingCart, Package, CreditCard, Pencil, Clock, Shield } from 'lucide-react'
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
  const [abonoForm, setAbonoForm] = useState({
    monto: '',
    fecha: hoy,
    notas: '',
  })
  const [editAbonoId, setEditAbonoId] = useState(null)

  // Estados para Batch Code (verificador independiente)
  const [batchCodeInput, setBatchCodeInput] = useState('')
  const [batchCodeMarca, setBatchCodeMarca] = useState('')
  const [batchCodeResult, setBatchCodeResult] = useState(null)
  const [batchCodeLoading, setBatchCodeLoading] = useState(false)

  // Paginación del inventario
  const PERFUMES_POR_PAGINA = 10
  const [paginaPerfumes, setPaginaPerfumes] = useState(1)

  // Filtros para el historial
  const [historialFiltro, setHistorialFiltro] = useState({
    cliente: '',
    perfume: '',
    estado: 'todos',
    fechaInicio: '',
    fechaFin: ''
  })

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

  const sp = (k, v) =>
    setPerfumeForm(f => ({
      ...f,
      [k]: v,
    }))

  const sv = (k, v) =>
    setVentaForm(f => ({
      ...f,
      [k]: v,
    }))

  const setPiezas = (val) => {
    const n = parseInt(val, 10) || 1

    setPerfumeForm(f => ({
      ...f,
      piezas_compradas: n,
      piezas_envio:
        f.piezas_envio === f.piezas_compradas || !f.piezas_envio
          ? n
          : f.piezas_envio,
    }))
  }

  const envioU = () => {
    const env = parseFloat(perfumeForm.costo_envio) || 0
    const n = Math.max(
      parseInt(perfumeForm.piezas_envio, 10) || 1,
      1
    )

    return env / n
  }

  const costoU = () =>
    (parseFloat(perfumeForm.precio_proveedor) || 0) + envioU()

  const gananciaU = () =>
    (parseFloat(perfumeForm.precio_publico) || 0) - costoU()

  const totalVenta = () =>
    (parseFloat(ventaForm.precio_unitario) || 0) *
    (parseInt(ventaForm.cantidad, 10) || 1)

  // ============================================================
  // VERIFICAR BATCH CODE (INDEPENDIENTE)
  // ============================================================
  const verificarBatchCode = async () => {
    if (!batchCodeInput.trim()) {
      setBatchCodeResult({ error: 'Escribe un código para verificar' })
      return
    }

    if (!batchCodeMarca.trim()) {
      setBatchCodeResult({ error: 'Escribe la marca del perfume' })
      return
    }

    setBatchCodeLoading(true)
    setBatchCodeResult(null)

    try {
      const res = await api.post('/verificar-batch', {
        marca: batchCodeMarca.trim(),
        codigo: batchCodeInput.trim()
      })

      if (res.error) {
        setBatchCodeResult({ error: res.error })
        return
      }

      setBatchCodeResult(res)
    } catch (err) {
      setBatchCodeResult({ error: 'Error al verificar: ' + err.message })
    } finally {
      setBatchCodeLoading(false)
    }
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
      piezas_envio:
        p.piezas_envio ??
        p.piezas_compradas ??
        1,
      notas: p.notas || '',
    })

    setModal('perfume')
  }

  const submitPerfume = async () => {
    setError('')

    if (!perfumeForm.nombre) {
      setError('Nombre obligatorio')
      return
    }

    if (perfumeForm.precio_proveedor === '') {
      setError('Costo de proveedor obligatorio')
      return
    }

    const res = editId
      ? await api.put(`/perfumes/${editId}`, perfumeForm)
      : await api.post('/perfumes', perfumeForm)

    if (res.error) {
      setError(res.error)
      return
    }

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

      if (res.error) {
        setError(res.error)
        return
      }
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

      if (res.error) {
        setError(res.error)
        return
      }
    }

    await load()
    setModal(null)
    setEditId(null)
    setVentaForm({
      ...emptyVenta,
      fecha: hoy,
    })
  }

  const openAbono = (v) => {
    setVentaAbono(v)
    setEditAbonoId(null)
    setAbonoForm({
      monto: '',
      fecha: hoy,
      notas: '',
    })

    setError('')
    setModal('abono')
  }

  const openEditAbono = (abono, venta) => {
    setVentaAbono(venta)
    setEditAbonoId(abono.id)
    setAbonoForm({
      monto: abono.monto,
      fecha: abono.fecha || hoy,
      notas: abono.notas || '',
    })

    setError('')
    setModal('abono')
  }

  const submitAbono = async () => {
    setError('')

    if (!abonoForm.monto || Number(abonoForm.monto) <= 0) {
      setError('Monto inválido')
      return
    }

    let res
    if (editAbonoId) {
      res = await api.put(`/abonos/${editAbonoId}`, abonoForm)
    } else {
      res = await api.post(`/ventas/${ventaAbono.id}/abonos`, abonoForm)
    }

    if (res.error) {
      setError(res.error)
      return
    }

    await load()
    setModal(null)
    setVentaAbono(null)
    setEditAbonoId(null)
  }

  const eliminar = async (tipo, id) => {
    if (!confirm('¿Eliminar? Esta acción no se puede deshacer.')) {
      return
    }

    const res = await api.delete(`/${tipo}/${id}`)

    if (res.error) {
      alert(res.error)
    }

    load()
  }

  const ventasPendientes = ventas.filter(v => !v.liquidado)
  const ventasLiquidadas = ventas.filter(v => v.liquidado)

  const ventasFiltradas = ventasLiquidadas.filter(v => {
    if (historialFiltro.cliente && !v.cliente?.toLowerCase().includes(historialFiltro.cliente.toLowerCase())) {
      return false
    }
    if (historialFiltro.perfume && !v.perfume_nombre?.toLowerCase().includes(historialFiltro.perfume.toLowerCase())) {
      return false
    }
    if (historialFiltro.fechaInicio && v.fecha < historialFiltro.fechaInicio) return false
    if (historialFiltro.fechaFin && v.fecha > historialFiltro.fechaFin) return false
    return true
  })

  if (!resumen) {
    return (
      <div
        className="flex-center"
        style={{
          height: 280,
          color: 'var(--cream-dim)',
        }}
      >
        Cargando...
      </div>
    )
  }

  const totalPorCobrarGlobal = ventasPendientes.reduce(
    (acc, venta) => acc + (venta.resto || 0),
    0
  )

  const totalPaginasPerfumes = Math.max(
    1,
    Math.ceil(perfumes.length / PERFUMES_POR_PAGINA)
  )

  const paginaPerfumesActual = Math.min(
    paginaPerfumes,
    totalPaginasPerfumes
  )

  const inicioPerfumes =
    (paginaPerfumesActual - 1) * PERFUMES_POR_PAGINA

  const perfumesPaginados = perfumes.slice(
    inicioPerfumes,
    inicioPerfumes + PERFUMES_POR_PAGINA
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="ornament">✦ ✦ ✦</div>

          <h1
            className="page-title"
            style={{ marginTop: 8 }}
          >
            Mis <span>Perfumes</span>
          </h1>

          <div
            className="label"
            style={{ marginTop: 6 }}
          >
            Control estricto de costos, ventas y dinero
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
          }}
        >
          <button
            className="btn btn-outline"
            disabled={!perfumes.some(p => p.stock > 0)}
            onClick={() => {
              setError('')
              setEditId(null)

              setVentaForm({
                ...emptyVenta,
                fecha: hoy,
              })

              setModal('venta')
            }}
          >
            <ShoppingCart size={14} />
            Vender
          </button>

          <button
            className="btn btn-outline"
            onClick={() => {
              setError('')
              setBatchCodeInput('')
              setBatchCodeMarca('')
              setBatchCodeResult(null)
              setModal('batch')
            }}
            style={{ borderColor: 'var(--gold)' }}
          >
            <Shield size={14} />
            Verificar Batch Code
          </button>

          <button
            className="btn btn-outline"
            onClick={() => {
              setError('')
              setHistorialFiltro({ cliente: '', perfume: '', estado: 'todos', fechaInicio: '', fechaFin: '' })
              setModal('historial')
            }}
            style={{ borderColor: 'var(--gold)' }}
          >
            <Clock size={14} />
            Historial de ventas
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
            <Plus size={14} />
            Registrar perfume
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">
            Dinero en caja (cobrado)
          </div>

          <div
            className="stat-value"
            style={{
              color: '#4a8c6a',
              fontSize: '1.15rem',
            }}
          >
            {fmt(resumen.dinero_en_caja)}
          </div>

          <div
            style={{
              fontSize: '0.55rem',
              color: 'var(--cream-dim)',
              marginTop: 2,
            }}
          >
            Cobrado de ventas - Retirado del fondo
          </div>
        </div>

        <Kpi
          label="Por cobrar (de ventas)"
          value={fmt(totalPorCobrarGlobal)}
          color="#c9a84c"
        />

        <Kpi
          label="Capital en inventario"
          value={fmt(resumen.capital_en_inventario)}
        />

        <Kpi
          label="Capital total invertido"
          value={fmt(resumen.capital_invertido)}
        />

        <Kpi
          label="Stock (piezas)"
          value={`${resumen.stock}`}
        />

        <Kpi
          label="Valor stock a público"
          value={fmt(resumen.valor_stock_publico)}
          color="#c9a84c"
        />

        <Kpi
          label="Valor potencial total"
          value={fmt(resumen.valor_potencial_total)}
          color="#f0c040"
        />
      </div>

      <div
        className="card"
        style={{
          marginBottom: 16,
          padding: '14px 18px',
          fontSize: '0.8rem',
          color: 'var(--cream-dim)',
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: 'var(--gold)' }}>
          Cómo leer los números:
        </strong>{' '}

        <em>Dinero en caja</em> = lo que te han pagado los
        clientes <strong>menos</strong> lo que has retirado del
        fondo de socios.
        <br />

        Si necesitas gastar en nuevos perfumes, registra un{' '}
        <strong>retiro en el Fondo de Socios</strong> y se
        reflejará automáticamente.
        <br />

        <em>Por cobrar</em> = Suma de los saldos restantes de
        TODAS las ventas pendientes.
        <br />

        <em>Capital en inventario</em> = lo que te costó lo que
        aún no vendes.
      </div>

      {error && !modal && (
        <div
          className="card"
          style={{
            borderColor: '#c45c5c',
            color: '#c45c5c',
            marginBottom: 16,
            padding: '12px 16px',
          }}
        >
          {error}
        </div>
      )}

      {/* INVENTARIO */}
      <div className="card">
        <div className="section-title mb-4">
          Inventario
        </div>

        {perfumes.length === 0 ? (
          <div className="empty-state">
            <Package
              size={28}
              style={{
                opacity: 0.4,
                marginBottom: 8,
              }}
            />

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
                {perfumesPaginados.map(p => (
                  <tr key={p.id}>
                    <td
                      style={{
                        color: 'var(--cream)',
                        fontWeight: 500,
                      }}
                    >
                      {p.nombre}
                    </td>

                    <td>
                      {p.proveedor || '—'}
                    </td>

                    <td>
                      {fmt(p.precio_proveedor)}
                    </td>

                    <td>
                      {fmt(p.envio_unitario)}

                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.65rem',
                          color: 'var(--cream-dim)',
                        }}
                      >
                        (lote {fmt(p.costo_envio)} / {p.piezas_envio})
                      </span>
                    </td>

                    <td>
                      {fmt(p.costo_unitario)}
                    </td>

                    <td className="td-gold">
                      {fmt(p.precio_publico)}
                    </td>

                    <td
                      className={
                        p.ganancia_unitaria >= 0
                          ? 'td-green'
                          : 'td-red'
                      }
                    >
                      {fmt(p.ganancia_unitaria)}
                    </td>

                    <td>
                      {p.piezas_compradas}
                    </td>

                    <td>
                      {p.vendidos}
                    </td>

                    <td>
                      {p.stock}
                    </td>

                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn-icon"
                        title="Editar"
                        onClick={() => openEditPerfume(p)}
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        className="btn-icon"
                        title="Eliminar"
                        onClick={() =>
                          eliminar('perfumes', p.id)
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {perfumes.length > PERFUMES_POR_PAGINA && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <button
                  className="btn btn-outline"
                  disabled={paginaPerfumesActual === 1}
                  onClick={() =>
                    setPaginaPerfumes(pagina =>
                      Math.max(1, pagina - 1)
                    )
                  }
                >
                  Anterior
                </button>

                <span
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--cream-dim)',
                  }}
                >
                  Página {paginaPerfumesActual} de {totalPaginasPerfumes}
                </span>

                <button
                  className="btn btn-outline"
                  disabled={paginaPerfumesActual === totalPaginasPerfumes}
                  onClick={() =>
                    setPaginaPerfumes(pagina =>
                      Math.min(totalPaginasPerfumes, pagina + 1)
                    )
                  }
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* VENTAS PENDIENTES */}
      <div
        className="card"
        style={{ marginTop: 20 }}
      >
        <div className="section-title mb-4">
          Ventas pendientes ({ventasPendientes.length})
        </div>

        {ventasPendientes.length === 0 ? (
          <div className="empty-state">
            <p>No hay ventas pendientes. Todas están liquidadas.</p>
          </div>
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
                  <th>Notas</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {ventasPendientes.map(v => (
                  <tr key={v.id}>
                    <td>
                      {fmtDate(v.fecha)}
                    </td>

                    <td
                      style={{
                        color: 'var(--cream)',
                      }}
                    >
                      {v.cliente || '—'}
                    </td>

                    <td>
                      {v.perfume_nombre}
                    </td>

                    <td>
                      {v.cantidad}
                    </td>

                    <td>
                      {fmt(v.total_venta)}
                    </td>

                    <td>
                      {v.tipo_pago === 'abonos'
                        ? 'A plazos'
                        : '1 pago'}
                    </td>

                    <td className="td-green">
                      {fmt(v.abonado)}
                    </td>

                    <td className="td-gold">
                      {fmt(v.resto)}
                    </td>

                    <td>
                      {v.notas || '—'}
                    </td>

                    <td>
                      <span className="badge badge-gold">
                        {v.pct_pagado}%
                      </span>
                    </td>

                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn-icon"
                        title="Editar venta"
                        onClick={() =>
                          openEditVenta(v)
                        }
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        className="btn-icon"
                        title="Agregar abono"
                        onClick={() =>
                          openAbono(v)
                        }
                      >
                        <CreditCard size={14} />
                      </button>

                      <button
                        className="btn-icon"
                        title="Eliminar venta"
                        onClick={() =>
                          eliminar('ventas', v.id)
                        }
                      >
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

      {/* HISTORIAL ABONOS */}
      {ventas.some(v => v.abonos?.length > 0) && (
        <div
          className="card"
          style={{ marginTop: 20 }}
        >
          <div className="section-title mb-4">
            Historial de abonos
          </div>

          {ventas
            .filter(v => v.abonos?.length)
            .map(v => (
              <div
                key={v.id}
                style={{
                  marginBottom: 14,
                  paddingBottom: 10,
                  borderBottom:
                    '1px solid var(--noir-border)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--cream)',
                    marginBottom: 6,
                  }}
                >
                  {v.cliente || 'Cliente'} —{' '}
                  {v.perfume_nombre} (
                  {fmt(v.total_venta)})
                </div>

                <table className="data-table">
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
                        <td>
                          {fmtDate(a.fecha)}
                        </td>

                        <td className="td-green">
                          {fmt(a.monto)}
                        </td>

                        <td>
                          {a.notas || '—'}
                        </td>

                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            className="btn-icon"
                            title="Editar abono"
                            onClick={() =>
                              openEditAbono(a, v)
                            }
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn-icon"
                            title="Eliminar abono"
                            onClick={() =>
                              eliminar(
                                'abonos',
                                a.id
                              )
                            }
                          >
                            <Trash2 size={14} />
                          </button>
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
        <div
          className="modal-overlay"
          onClick={() => setModal(null)}
        >
          <div
            className="modal"
            onClick={e =>
              e.stopPropagation()
            }
            style={{
              maxWidth: modal === 'historial' ? 800 : 520,
            }}
          >
            <div className="modal-header">
              <span className="section-title">
                {modal === 'perfume' &&
                  (editId
                    ? 'Editar perfume'
                    : 'Registrar perfume')}

                {modal === 'venta' &&
                  (editId
                    ? 'Editar venta'
                    : 'Registrar venta')}

                {modal === 'abono' &&
                  (editAbonoId
                    ? 'Editar abono'
                    : 'Registrar abono')}

                {modal === 'historial' && 'Historial de ventas liquidadas'}

                {modal === 'batch' && 'Verificar Batch Code'}
              </span>

              <button
                className="btn-icon"
                onClick={() => {
                  setModal(null)
                  setEditId(null)
                  setEditAbonoId(null)
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {error && (
                <div
                  style={{
                    color: '#c45c5c',
                    fontSize: '0.8rem',
                    marginBottom: 12,
                  }}
                >
                  {error}
                </div>
              )}

              {modal === 'batch' && (
                <>
                  <div className="form-group">
                    <label className="form-label">
                      Marca del perfume *
                    </label>
                    <input
                      className="form-input"
                      value={batchCodeMarca}
                      onChange={e => setBatchCodeMarca(e.target.value)}
                      placeholder="Ej: Dior, Versace, YSL, Tom Ford..."
                      autoFocus
                    />
                    <div style={{ fontSize: '0.7rem', color: 'var(--cream-dim)', marginTop: 4 }}>
                      Tenemos reglas especiales para Dior, Coty, L'Oréal y Estée Lauder.
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Código de lote (Batch Code) *
                    </label>
                    <input
                      className="form-input"
                      value={batchCodeInput}
                      onChange={e => setBatchCodeInput(e.target.value)}
                      placeholder="Ej: 4X01, 0124, S123..."
                    />
                    <div style={{ fontSize: '0.7rem', color: 'var(--cream-dim)', marginTop: 4 }}>
                      Busca el código en el fondo del frasco o en la caja. Debe coincidir en ambos.
                    </div>
                  </div>

                  <button
                    className="btn btn-gold"
                    onClick={verificarBatchCode}
                    disabled={batchCodeLoading}
                    style={{ width: '100%', marginBottom: 16 }}
                  >
                    {batchCodeLoading ? 'Verificando...' : 'Verificar código'}
                  </button>

                  {batchCodeResult && (
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 6,
                        background: batchCodeResult.error || batchCodeResult.valido === false
                          ? 'rgba(196, 92, 92, 0.1)'
                          : batchCodeResult.valido === true
                            ? 'rgba(74, 140, 106, 0.1)'
                            : 'rgba(201, 168, 76, 0.1)',
                        border: `1px solid ${
                          batchCodeResult.error || batchCodeResult.valido === false
                            ? '#c45c5c'
                            : batchCodeResult.valido === true
                              ? '#4a8c6a'
                              : '#c9a84c'
                        }`,
                        fontSize: '0.85rem',
                        lineHeight: 1.6
                      }}
                    >
                      {batchCodeResult.error && (
                        <div style={{ color: '#c45c5c' }}>
                          <strong>❌ {batchCodeResult.error}</strong>
                        </div>
                      )}

                      {batchCodeResult.valido === true && (
                        <div style={{ color: '#4a8c6a' }}>
                          <strong>{batchCodeResult.mensaje}</strong>
                          <div style={{ marginTop: 8 }}>
                            <div><strong>Marca:</strong> {batchCodeResult.marca}</div>
                            <div><strong>Grupo:</strong> {batchCodeResult.grupo}</div>
                            <div><strong>Código:</strong> {batchCodeResult.codigo}</div>
                            <div><strong>Fecha estimada:</strong> {batchCodeResult.fecha_estimada}</div>
                          </div>
                        </div>
                      )}

                      {batchCodeResult.valido === false && (
                        <div style={{ color: '#c45c5c' }}>
                          <strong>❌ {batchCodeResult.mensaje}</strong>
                          <div style={{ marginTop: 8 }}>
                            <div><strong>Marca:</strong> {batchCodeResult.marca}</div>
                            {batchCodeResult.grupo && <div><strong>Grupo:</strong> {batchCodeResult.grupo}</div>}
                            <div><strong>Código:</strong> {batchCodeResult.codigo}</div>
                          </div>
                        </div>
                      )}

                      {batchCodeResult.reconocido === false && (
                        <div style={{ color: '#c9a84c' }}>
                          <strong>⚠️ {batchCodeResult.mensaje}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {modal === 'historial' && (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <input
                      className="form-input"
                      placeholder="Buscar cliente..."
                      value={historialFiltro.cliente}
                      onChange={e =>
                        setHistorialFiltro(f => ({
                          ...f,
                          cliente: e.target.value,
                        }))
                      }
                    />
                    <input
                      className="form-input"
                      placeholder="Buscar perfume..."
                      value={historialFiltro.perfume}
                      onChange={e =>
                        setHistorialFiltro(f => ({
                          ...f,
                          perfume: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div
                    className="table-wrap"
                    style={{ maxHeight: 400, overflowY: 'auto' }}
                  >
                    <table className="data-table">
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
                            <td
                              colSpan={7}
                              style={{
                                textAlign: 'center',
                                color: 'var(--cream-dim)',
                              }}
                            >
                              No hay ventas liquidadas
                            </td>
                          </tr>
                        ) : (
                          ventasFiltradas.map(v => (
                            <tr key={v.id}>
                              <td>{fmtDate(v.fecha)}</td>
                              <td
                                style={{
                                  color: 'var(--cream)',
                                }}
                              >
                                {v.cliente || '—'}
                              </td>
                              <td>{v.perfume_nombre}</td>
                              <td>{fmt(v.total_venta)}</td>
                              <td className="td-green">
                                {fmt(v.abonado)}
                              </td>
                              <td className="td-gold">
                                {fmt(v.resto)}
                              </td>
                              <td>
                                {v.notas || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      display: 'flex',
                      gap: 20,
                      justifyContent: 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--cream-dim)',
                      }}
                    >
                      Total ventas:{' '}
                      <strong style={{ color: 'var(--cream)' }}>
                        {fmt(
                          ventasFiltradas.reduce(
                            (s, v) => s + v.total_venta,
                            0
                          )
                        )}
                      </strong>
                    </div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--cream-dim)',
                      }}
                    >
                      Total cobrado:{' '}
                      <strong style={{ color: '#4a8c6a' }}>
                        {fmt(
                          ventasFiltradas.reduce(
                            (s, v) => s + v.abonado,
                            0
                          )
                        )}
                      </strong>
                    </div>
                  </div>
                </>
              )}

              {modal === 'perfume' && (
                <>
                  <div className="form-group">
                    <label className="form-label">
                      Nombre del perfume *
                    </label>

                    <input
                      className="form-input"
                      value={perfumeForm.nombre}
                      onChange={e =>
                        sp(
                          'nombre',
                          e.target.value
                        )
                      }
                      placeholder="Ej: Dior Sauvage"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Proveedor
                    </label>

                    <input
                      className="form-input"
                      value={
                        perfumeForm.proveedor
                      }
                      onChange={e =>
                        sp(
                          'proveedor',
                          e.target.value
                        )
                      }
                      placeholder="Nombre del proveedor"
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Costo de proveedor ($) *
                      </label>

                      <input
                        type="number"
                        className="form-input"
                        value={
                          perfumeForm.precio_proveedor
                        }
                        onChange={e =>
                          sp(
                            'precio_proveedor',
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Precio venta al público ($)
                      </label>

                      <input
                        type="number"
                        className="form-input"
                        value={
                          perfumeForm.precio_publico
                        }
                        onChange={e =>
                          sp(
                            'precio_publico',
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Piezas compradas
                    </label>

                    <input
                      type="number"
                      min={1}
                      className="form-input"
                      value={
                        perfumeForm.piezas_compradas
                      }
                      onChange={e =>
                        setPiezas(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div
                    style={{
                      border:
                        '1px solid var(--noir-border)',
                      borderRadius: 6,
                      padding: 14,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      className="label"
                      style={{
                        marginBottom: 10,
                      }}
                    >
                      ENVÍO DEL LOTE (opcional)
                    </div>

                    <div className="form-grid-2">
                      <div
                        className="form-group"
                        style={{
                          marginBottom: 0,
                        }}
                      >
                        <label className="form-label">
                          ¿Cuánto costó el envío?
                          ($)
                        </label>

                        <input
                          type="number"
                          className="form-input"
                          value={
                            perfumeForm.costo_envio
                          }
                          onChange={e =>
                            sp(
                              'costo_envio',
                              e.target.value
                            )
                          }
                          placeholder="0 si no hubo envío"
                        />
                      </div>

                      <div
                        className="form-group"
                        style={{
                          marginBottom: 0,
                        }}
                      >
                        <label className="form-label">
                          ¿Entre cuántas piezas se
                          reparte?
                        </label>

                        <input
                          type="number"
                          min={1}
                          className="form-input"
                          value={
                            perfumeForm.piezas_envio
                          }
                          onChange={e =>
                            sp(
                              'piezas_envio',
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '0.75rem',
                        color:
                          'var(--cream-dim)',
                        marginTop: 10,
                      }}
                    >
                      Ej: compraste 4 perfumes y
                      el envío fue $240 → pon
                      envío 240 y reparte en 4 →{' '}
                      {fmt(240 / 4)}/pieza. Si no
                      cobraron envío, deja en 0.
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: '0.82rem',
                      color:
                        'var(--cream-dim)',
                      marginBottom: 12,
                      lineHeight: 1.7,
                    }}
                  >
                    Envío por pieza:{' '}
                    <strong
                      style={{
                        color:
                          'var(--cream)',
                      }}
                    >
                      {fmt(envioU())}
                    </strong>
                    <br />

                    Costo unitario real:{' '}
                    <strong
                      style={{
                        color:
                          'var(--cream)',
                      }}
                    >
                      {fmt(costoU())}
                    </strong>
                    <br />

                    Ganancia unitaria:{' '}
                    <strong
                      style={{
                        color:
                          gananciaU() >= 0
                            ? '#4a8c6a'
                            : '#c45c5c',
                      }}
                    >
                      {fmt(gananciaU())}
                    </strong>

                    {' · '}Si vendes todo:{' '}

                    <strong
                      style={{
                        color:
                          'var(--gold)',
                      }}
                    >
                      {fmt(
                        gananciaU() *
                          (parseInt(
                            perfumeForm.piezas_compradas,
                            10
                          ) || 0)
                      )}
                    </strong>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Notas
                    </label>

                    <textarea
                      className="form-input"
                      value={
                        perfumeForm.notas
                      }
                      onChange={e =>
                        sp(
                          'notas',
                          e.target.value
                        )
                      }
                    />
                  </div>
                </>
              )}

              {modal === 'venta' && (
                <>
                  <div className="form-group">
                    <label className="form-label">
                      Perfume *
                    </label>

                    <select
                      className="form-input"
                      value={
                        ventaForm.perfume_id
                      }
                      onChange={e => {
                        const id =
                          e.target.value

                        sv(
                          'perfume_id',
                          id
                        )

                        const p =
                          perfumes.find(
                            x =>
                              x.id ===
                              parseInt(
                                id,
                                10
                              )
                          )

                        if (p) {
                          sv(
                            'precio_unitario',
                            p.precio_publico
                          )
                        }
                      }}
                    >
                      <option value="">
                        Seleccionar...
                      </option>

                      {perfumes
                        .filter(
                          p =>
                            p.stock > 0
                        )
                        .map(p => (
                          <option
                            key={p.id}
                            value={p.id}
                          >
                            {p.nombre} · stock{' '}
                            {p.stock} · público{' '}
                            {fmt(
                              p.precio_publico
                            )}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Cliente
                    </label>

                    <input
                      className="form-input"
                      value={
                        ventaForm.cliente
                      }
                      onChange={e =>
                        sv(
                          'cliente',
                          e.target.value
                        )
                      }
                      placeholder="¿A quién se lo vendimos?"
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        Cantidad
                      </label>

                      <input
                        type="number"
                        min={1}
                        className="form-input"
                        value={
                          ventaForm.cantidad
                        }
                        onChange={e =>
                          sv(
                            'cantidad',
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Precio unitario venta ($)
                      </label>

                      <input
                        type="number"
                        className="form-input"
                        value={
                          ventaForm.precio_unitario
                        }
                        onChange={e =>
                          sv(
                            'precio_unitario',
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      color:
                        'var(--gold)',
                      marginBottom: 12,
                    }}
                  >
                    Total:{' '}
                    <strong>
                      {fmt(
                        totalVenta()
                      )}
                    </strong>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Forma de pago
                    </label>

                    <div
                      style={{
                        display: 'flex',
                        gap: 16,
                      }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          gap: 6,
                          alignItems:
                            'center',
                          cursor:
                            'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          checked={
                            ventaForm.tipo_pago ===
                            'contado'
                          }
                          onChange={() =>
                            sv(
                              'tipo_pago',
                              'contado'
                            )
                          }
                        />

                        Un solo pago
                      </label>

                      <label
                        style={{
                          display: 'flex',
                          gap: 6,
                          alignItems:
                            'center',
                          cursor:
                            'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          checked={
                            ventaForm.tipo_pago ===
                            'abonos'
                          }
                          onChange={() =>
                            sv(
                              'tipo_pago',
                              'abonos'
                            )
                          }
                        />

                        Varios pagos / abonos
                      </label>
                    </div>
                  </div>

                  {ventaForm.tipo_pago ===
                    'abonos' && (
                    <div className="form-group">
                      <label className="form-label">
                        Abono inicial ($)
                      </label>

                      <input
                        type="number"
                        className="form-input"
                        value={
                          ventaForm.abonado
                        }
                        onChange={e =>
                          sv(
                            'abonado',
                            e.target.value
                          )
                        }
                        placeholder="0 si no deja nada hoy"
                      />

                      <div
                        style={{
                          fontSize:
                            '0.72rem',
                          color:
                            'var(--cream-dim)',
                          marginTop: 4,
                        }}
                      >
                        Resta:{' '}
                        {fmt(
                          Math.max(
                            0,
                            totalVenta() -
                              (Number(
                                ventaForm.abonado
                              ) || 0)
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">
                      Fecha
                    </label>

                    <input
                      type="date"
                      className="form-input"
                      value={
                        ventaForm.fecha
                      }
                      onChange={e =>
                        sv(
                          'fecha',
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Notas
                    </label>

                    <textarea
                      className="form-input"
                      value={
                        ventaForm.notas
                      }
                      onChange={e =>
                        sv(
                          'notas',
                          e.target.value
                        )
                      }
                    />
                  </div>
                </>
              )}

              {modal === 'abono' &&
                ventaAbono && (
                  <>
                    <div
                      style={{
                        fontSize:
                          '0.85rem',
                        color:
                          'var(--cream-dim)',
                        marginBottom: 14,
                        lineHeight: 1.6,
                      }}
                    >
                      Cliente:{' '}
                      <strong
                        style={{
                          color:
                            'var(--cream)',
                        }}
                      >
                        {ventaAbono.cliente ||
                          '—'}
                      </strong>
                      <br />

                      Total{' '}
                      {fmt(
                        ventaAbono.total_venta
                      )}{' '}
                      · Abonado{' '}
                      {fmt(
                        ventaAbono.abonado
                      )}{' '}
                      ·{' '}

                      <span
                        style={{
                          color:
                            'var(--gold)',
                        }}
                      >
                        Resta{' '}
                        {fmt(
                          ventaAbono.resto
                        )}
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Monto del abono ($)
                      </label>

                      <input
                        type="number"
                        className="form-input"
                        value={
                          abonoForm.monto
                        }
                        onChange={e =>
                          setAbonoForm(
                            f => ({
                              ...f,
                              monto:
                                e.target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Fecha
                      </label>

                      <input
                        type="date"
                        className="form-input"
                        value={
                          abonoForm.fecha
                        }
                        onChange={e =>
                          setAbonoForm(
                            f => ({
                              ...f,
                              fecha:
                                e.target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Notas
                      </label>

                      <input
                        className="form-input"
                        value={
                          abonoForm.notas
                        }
                        onChange={e =>
                          setAbonoForm(
                            f => ({
                              ...f,
                              notas:
                                e.target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>
                  </>
                )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setModal(null)
                  setEditId(null)
                  setEditAbonoId(null)
                }}
              >
                Cerrar
              </button>

              {(modal === 'perfume' || modal === 'venta' || modal === 'abono') && (
                <button
                  className="btn btn-gold"
                  onClick={() => {
                    if (modal === 'perfume') {
                      submitPerfume()
                    }

                    if (modal === 'venta') {
                      submitVenta()
                    }

                    if (modal === 'abono') {
                      submitAbono()
                    }
                  }}
                >
                  {editId || editAbonoId
                    ? 'Guardar cambios'
                    : 'Guardar'}
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
      <div className="label">
        {label}
      </div>

      <div
        className="stat-value"
        style={{
          color:
            color ||
            'var(--cream)',
          fontSize: '1.15rem',
        }}
      >
        {value}
      </div>
    </div>
  )
}
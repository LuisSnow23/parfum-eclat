import { useState, useEffect } from 'react'
import {
  Users,
  Search,
  MessageCircle,
  Trophy,
  Gift,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react'
import { api, fmt, fmtDate } from '../api'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos') // todos | deudores | cinco | top
  const [expandido, setExpandido] = useState(null)
  const [cargando, setCargando] = useState(true)

  const load = async () => {
    setCargando(true)
    const data = await api.get('/clientes')
    setClientes(data)
    setCargando(false)
  }

  useEffect(() => {
    load()
  }, [])

  // Filtrar
  const clientesFiltrados = clientes.filter(c => {
    // Búsqueda
    if (busqueda && !c.nombre.toLowerCase().includes(busqueda.toLowerCase())) {
      return false
    }

    // Filtros
    if (filtro === 'deudores' && c.total_por_cobrar <= 0) return false
    if (filtro === 'cinco' && c.total_perfumes < 5) return false
    if (filtro === 'top' && c.total_perfumes < 3) return false

    return true
  })

  // Estadísticas generales
  const totalClientes = clientes.length
  const clientesConDeuda = clientes.filter(c => c.total_por_cobrar > 0).length
  const clientesCinco = clientes.filter(c => c.total_perfumes >= 5).length
  const totalPorCobrar = clientes.reduce((s, c) => s + c.total_por_cobrar, 0)

  // Generar mensaje de WhatsApp
  const generarMensajeWhatsApp = (cliente) => {
        const ventaConDeuda = cliente.ventas
            .filter(v => !v.liquidado)
            .sort((a, b) => b.resto - a.resto)[0]

        if (!ventaConDeuda) {
            return `Hola ${cliente.nombre}! \u{1F44B}`
        }

        const mensaje = `Hola ${cliente.nombre}! \u{1F44B}

        Te recuerdo que tienes un saldo pendiente:

        \u{1F9F4} Perfume: ${ventaConDeuda.perfume}
        \u{1F4B0} Total: $${ventaConDeuda.total}
        \u2705 Abonado: $${ventaConDeuda.abonado}
        \u23F3 Resta: $${ventaConDeuda.resto}

        ¿Cuándo podrías abonar? ¡Gracias! \u{1F64C}`

        return mensaje
        }
  const abrirWhatsApp = (cliente) => {
    const mensaje = generarMensajeWhatsApp(cliente)
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  if (cargando) {
    return (
      <div className="flex-center" style={{ height: 280, color: 'var(--cream-dim)' }}>
        Cargando clientes...
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="ornament">✦ ✦ ✦</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            Mis <span>Clientes</span>
          </h1>
          <div className="label" style={{ marginTop: 6 }}>
            Historial de compras y recordatorios
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">👥 Total clientes</div>
          <div className="stat-value" style={{ color: 'var(--cream)', fontSize: '1.5rem' }}>
            {totalClientes}
          </div>
        </div>

        <div className="stat-card">
          <div className="label">💰 Por cobrar total</div>
          <div className="stat-value" style={{ color: '#c9a84c', fontSize: '1.5rem' }}>
            {fmt(totalPorCobrar)}
          </div>
        </div>

        <div className="stat-card">
          <div className="label">⚠️ Clientes con deuda</div>
          <div className="stat-value" style={{ color: '#e07a7a', fontSize: '1.5rem' }}>
            {clientesConDeuda}
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #c9a84c' }}>
          <div className="label">🏆 Club de los 5</div>
          <div className="stat-value" style={{ color: '#c9a84c', fontSize: '1.5rem' }}>
            {clientesCinco}
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--cream-dim)', marginTop: 2 }}>
            Clientes con 5+ perfumes
          </div>
        </div>
      </div>

      {/* Card informativo */}
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
        <strong style={{ color: 'var(--gold)' }}>🎁 Dinámica de diciembre:</strong>{' '}
        Los clientes con 5 o más perfumes comprados son elegibles para el obsequio.
        Filtra por <strong>"Club de los 5"</strong> para verlos todos.
      </div>

      {/* Filtros */}
      <div
        className="card"
        style={{
          marginBottom: 20,
          padding: 16,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--cream-dim)',
              }}
            />
            <input
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Buscar cliente..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className={filtro === 'todos' ? 'btn btn-gold btn-sm' : 'btn btn-outline btn-sm'}
              onClick={() => setFiltro('todos')}
            >
              Todos
            </button>

            <button
              className={filtro === 'deudores' ? 'btn btn-gold btn-sm' : 'btn btn-outline btn-sm'}
              onClick={() => setFiltro('deudores')}
            >
              Con deuda
            </button>

            <button
              className={filtro === 'cinco' ? 'btn btn-gold btn-sm' : 'btn btn-outline btn-sm'}
              onClick={() => setFiltro('cinco')}
              style={{
                borderColor: filtro === 'cinco' ? undefined : '#c9a84c',
                color: filtro === 'cinco' ? undefined : '#c9a84c',
              }}
            >
              <Trophy size={12} /> Club de los 5
            </button>
          </div>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="card">
        <div className="section-title mb-4">
          Clientes ({clientesFiltrados.length})
        </div>

        {clientesFiltrados.length === 0 ? (
          <div className="empty-state">
            <Users size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <p>No hay clientes con ese filtro</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clientesFiltrados.map(cliente => {
              const esCinco = cliente.total_perfumes >= 5
              const abierto = expandido === cliente.nombre

              return (
                <div
                  key={cliente.nombre}
                  style={{
                    background: 'var(--black-soft)',
                    border: `1px solid ${esCinco ? 'rgba(201, 168, 76, 0.3)' : 'var(--black-border)'}`,
                    borderRadius: 6,
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Cabecera del cliente */}
                  <div
                    onClick={() => setExpandido(abierto ? null : cliente.nombre)}
                    style={{
                      padding: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <strong style={{ color: 'var(--cream)', fontSize: '0.95rem' }}>
                          {cliente.nombre}
                        </strong>

                        {esCinco && (
                          <span
                            className="badge badge-gold"
                            style={{
                              fontSize: '0.6rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Trophy size={10} /> Club de los 5
                          </span>
                        )}

                        {cliente.total_por_cobrar > 0 && (
                          <span className="badge badge-red" style={{ fontSize: '0.6rem' }}>
                            Debe {fmt(cliente.total_por_cobrar)}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: 16,
                          fontSize: '0.75rem',
                          color: 'var(--cream-dim)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>
                          🧴 <strong style={{ color: 'var(--gold)' }}>{cliente.total_perfumes}</strong> perfumes
                        </span>
                        <span>
                          📦 <strong style={{ color: 'var(--cream)' }}>{cliente.total_ventas}</strong> compras
                        </span>
                        <span>
                          💰 Cobrado: <strong style={{ color: '#4a8c6a' }}>{fmt(cliente.total_cobrado)}</strong>
                        </span>
                        <span>
                          📅 Última: {fmtDate(cliente.ultima_compra)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {cliente.total_por_cobrar > 0 && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            abrirWhatsApp(cliente)
                          }}
                          title="Enviar recordatorio por WhatsApp"
                          style={{
                            borderColor: '#25D366',
                            color: '#25D366',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <MessageCircle size={12} />
                          Recordar
                        </button>
                      )}

                      {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Detalle expandido */}
                  {abierto && (
                    <div
                      style={{
                        padding: '0 14px 14px',
                        borderTop: '1px solid var(--black-border)',
                      }}
                    >
                      <div className="label" style={{ marginTop: 12, marginBottom: 8 }}>
                        Historial de compras
                      </div>

                      <div className="table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Perfume</th>
                              <th>Cant.</th>
                              <th>Total</th>
                              <th>Abonado</th>
                              <th>Resta</th>
                              <th>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cliente.ventas.map((v, i) => (
                              <tr key={i}>
                                <td>{fmtDate(v.fecha)}</td>
                                <td style={{ color: 'var(--cream)' }}>{v.perfume}</td>
                                <td>{v.cantidad}</td>
                                <td>{fmt(v.total)}</td>
                                <td className="td-green">{fmt(v.abonado)}</td>
                                <td className="td-gold">{fmt(v.resto)}</td>
                                <td>
                                  <span
                                    className={`badge ${v.liquidado ? 'badge-green' : 'badge-gold'}`}
                                    style={{ fontSize: '0.65rem' }}
                                  >
                                    {v.liquidado ? 'Liquidado' : 'Pendiente'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
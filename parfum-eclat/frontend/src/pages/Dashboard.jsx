import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, ShoppingBag, DollarSign, Clock, AlertCircle } from 'lucide-react'
import { api, fmt, fmtDate } from '../api'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="card" style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
        <div style={{ color: 'var(--gold)', marginBottom: 4 }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: 'var(--cream-dim)' }}>
            {p.name}: <span style={{ color: 'var(--cream)' }}>{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [inversiones, setInversiones] = useState([])

  useEffect(() => {
    api.get('/dashboard').then(setData)
    api.get('/inversiones').then(setInversiones)
  }, [])

  if (!data) return (
    <div className="flex-center" style={{ height: 300, color: 'var(--cream-dim)', fontSize: '0.85rem' }}>
      Cargando...
    </div>
  )

  const chartData = inversiones.slice(0, 6).reverse().map(i => ({
    nombre: i.nombre.length > 12 ? i.nombre.slice(0, 12) + '…' : i.nombre,
    Ingresos: i.total_vendido,
    Costo: i.costo_inventario
  }))

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="ornament">✦ ✦ ✦</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            Panel <span>Principal</span>
          </h1>
          <div className="label" style={{ marginTop: 6 }}>Resumen general de tu negocio</div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={<ShoppingBag size={16} />} label="Inversiones" value={data.totalInversiones} suffix="" />
        <StatCard icon={<DollarSign size={16} />} label="Total Vendido" value={fmt(data.totalVendido)} cls="green" />
        <StatCard icon={<TrendingUp size={16} />} label="Ganancia Neta" value={fmt(data.gananciaTotal)} cls={data.gananciaTotal >= 0 ? 'green' : 'red'} />
        <StatCard icon={<Clock size={16} />} label="Por Cobrar" value={fmt(data.pendientesCobrar)} cls="gold" />
        <StatCard icon={<AlertCircle size={16} />} label="Por Pagar" value={fmt(data.pendientesPagar)} cls="red" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 8 }}>
        <div className="card">
          <div className="flex-between mb-4">
            <span className="section-title">Inversiones — Ingresos vs Costo</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4}>
                <XAxis dataKey="nombre" tick={{ fill: '#b8b0a0', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#b8b0a0', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Ingresos" fill="#4a8c6a" radius={[2,2,0,0]} />
                <Bar dataKey="Costo" fill="#3a3a55" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <p>Registra tu primera inversión para ver la gráfica</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title mb-4">Últimas Ventas</div>
          {data.ultimasVentas?.length > 0 ? (
            <div>
              {data.ultimasVentas.map(v => (
                <div key={v.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--noir-border)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--cream)' }}>{v.perfume_nombre}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--cream-dim)', marginTop: 2 }}>
                      {v.cliente || 'Sin cliente'} · {fmtDate(v.fecha)}
                    </div>
                  </div>
                  <div className="td-gold">{fmt(v.precio_venta * v.cantidad)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><p>Sin ventas registradas aún</p></div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, cls = '', suffix }) {
  return (
    <div className="stat-card">
      <div className="flex gap-2" style={{ color: 'var(--cream-dim)', alignItems: 'center' }}>
        {icon}
        <span className="label">{label}</span>
      </div>
      <div className={`stat-value ${cls}`}>{value}{suffix}</div>
    </div>
  )
}
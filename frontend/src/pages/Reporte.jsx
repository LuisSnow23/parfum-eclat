import { useState, useEffect } from 'react'
import {
  TrendingUp,
  DollarSign,
  Package,
  Wallet,
  Users,
  Trophy,
  AlertCircle,
  CheckCircle,
  BarChart3,
} from 'lucide-react'
import { api, fmt } from '../api'

export default function Reporte() {
  const [reporte, setReporte] = useState(null)
  const [cargando, setCargando] = useState(true)

  const load = async () => {
    setCargando(true)
    const data = await api.get('/reporte')
    setReporte(data)
    setCargando(false)
  }

  useEffect(() => {
    load()
  }, [])

  if (cargando || !reporte) {
    return (
      <div
        className="flex-center"
        style={{ height: 280, color: 'var(--cream-dim)' }}
      >
        Cargando reporte...
      </div>
    )
  }

  const r = reporte
  const gano = r.utilidad_total > 0
  const colorGanancia = gano ? '#4a8c6a' : '#c45c5c'

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="ornament">✦ ✦ ✦</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            Reporte <span>Ejecutivo</span>
          </h1>
          <div className="label" style={{ marginTop: 6 }}>
            Resumen del negocio para socios
          </div>
        </div>
      </div>

      {/* ---- BANNER: ¿Vamos ganando? ---- */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          padding: 24,
          borderLeft: `4px solid ${colorGanancia}`,
          background: gano
            ? 'rgba(74, 140, 106, 0.05)'
            : 'rgba(196, 92, 92, 0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {gano ? (
            <CheckCircle size={48} style={{ color: colorGanancia }} />
          ) : (
            <AlertCircle size={48} style={{ color: colorGanancia }} />
          )}

          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{
                fontSize: '0.7rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--cream-dim)',
                marginBottom: 4,
              }}
            >
              {gano ? '✅ ¡VAMOS GANANDO!' : '⚠️ AÚN NO GANAMOS'}
            </div>

            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.5rem',
                color: colorGanancia,
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              {fmt(r.utilidad_total)}
            </div>

            <div
              style={{
                fontSize: '0.85rem',
                color: 'var(--cream-dim)',
              }}
            >
              Es la ganancia que tendríamos si cerráramos HOY
              (cobrando todo y vendiendo el stock a precio público).
              <br />
              <strong style={{ color: 'var(--cream)' }}>
                Invertimos {fmt(r.inversion_inicial)} entre los 2.
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ---- LO QUE INVERTIMOS ---- */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title mb-4">
          💰 Lo que hemos invertido
        </div>

        <div className="stats-grid" style={{ margin: 0 }}>
          <Kpi
            label="Inversión inicial"
            value={fmt(r.inversion_inicial)}
            hint="$3,000 de cada socio"
          />
          <Kpi
            label="Capital total invertido"
            value={fmt(r.capital_invertido)}
            hint="Todas las compras acumuladas"
          />
          <Kpi
            label="Capital en inventario"
            value={fmt(r.capital_en_inventario)}
            hint="Lo que aún no vendemos (a costo)"
            color="#c9a84c"
          />
          <Kpi
            label="Valor stock a público"
            value={fmt(r.valor_stock_publico)}
            hint="Si vendemos TODO al precio público"
            color="#c9a84c"
          />
        </div>
      </div>

      {/* ---- LO QUE HEMOS VENDIDO ---- */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title mb-4">
          📈 Lo que hemos vendido
        </div>

        <div className="stats-grid" style={{ margin: 0 }}>
          <Kpi
            label="Total vendido"
            value={fmt(r.total_vendido)}
            hint="A precio público (acordado con clientes)"
          />
          <Kpi
            label="Ya cobrado"
            value={fmt(r.total_cobrado)}
            hint="Dinero que ya entró"
            color="#4a8c6a"
          />
          <Kpi
            label="Por cobrar"
            value={fmt(r.por_cobrar)}
            hint="Lo que aún nos deben"
            color="#c9a84c"
          />
          <Kpi
            label="Costo de lo vendido"
            value={fmt(r.costo_de_lo_vendido)}
            hint="Lo que nos costó lo vendido"
          />
        </div>
      </div>

      {/* ---- DÓNDE ESTÁ EL DINERO ---- */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title mb-4">
          💵 ¿Dónde está el dinero?
        </div>

        <div className="stats-grid" style={{ margin: 0 }}>
          <Kpi
            label="Dinero en caja"
            value={fmt(r.dinero_en_caja)}
            hint="Lo que hay disponible hoy"
            color="#4a8c6a"
          />
          <Kpi
            label="Por cobrar"
            value={fmt(r.por_cobrar)}
            hint="Clientes que nos deben"
            color="#c9a84c"
          />
          <Kpi
            label="Stock a costo"
            value={fmt(r.capital_en_inventario)}
            hint="En perfumes sin vender"
          />
          <Kpi
            label="Stock a público"
            value={fmt(r.valor_stock_publico)}
            hint="Si se vende todo al público"
            color="#c9a84c"
          />
        </div>
      </div>

      {/* ---- SI CERRAMOS HOY ---- */}
      <div
        className="card"
        style={{
          marginBottom: 20,
          borderLeft: '4px solid #c9a84c',
        }}
      >
        <div className="section-title mb-4">
          🎯 Si cerráramos el negocio HOY
        </div>

        <div
          style={{
            fontSize: '0.85rem',
            color: 'var(--cream-dim)',
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          Dos escenarios posibles. El primero es el más realista.
        </div>

        <div className="stats-grid" style={{ margin: 0 }}>
          <Kpi
            label="Si vendemos TODO al público"
            value={fmt(r.escenario_cierre.total_a_publico)}
            hint="Cobramos todo + vendemos stock al público"
            color="#4a8c6a"
          />
          <Kpi
            label="Si vendemos el stock a costo"
            value={fmt(r.escenario_cierre.total_a_costo)}
            hint="Cobramos todo + vendemos stock al costo"
          />
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: 'var(--black-soft)',
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span style={{ color: 'var(--cream-dim)', fontSize: '0.85rem' }}>
              Total a cobrar + vender al público:
            </span>
            <strong style={{ color: 'var(--cream)' }}>
              {fmt(r.escenario_cierre.total_a_publico)}
            </strong>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span style={{ color: 'var(--cream-dim)', fontSize: '0.85rem' }}>
              − Inversión inicial:
            </span>
            <strong style={{ color: 'var(--cream)' }}>
              − {fmt(r.inversion_inicial)}
            </strong>
          </div>

          <div
            style={{
              borderTop: '1px solid var(--black-border)',
              paddingTop: 12,
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span
              style={{
                color: 'var(--cream)',
                fontWeight: 500,
                fontSize: '0.95rem',
              }}
            >
              = GANANCIA TOTAL
            </span>
            <strong
              style={{
                color: colorGanancia,
                fontSize: '1.3rem',
                fontFamily: 'var(--font-display)',
              }}
            >
              {fmt(r.utilidad_total)}
            </strong>
          </div>
        </div>
      </div>

      {/* ---- REPARTO ENTRE SOCIOS ---- */}
      <div
        className="card"
        style={{
          marginBottom: 20,
          borderLeft: '4px solid #8b5cf6',
        }}
      >
        <div className="section-title mb-4">
          👥 Reparto entre socios
        </div>

        <div
          style={{
            fontSize: '0.85rem',
            color: 'var(--cream-dim)',
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          Como cada uno puso <strong style={{ color: 'var(--cream)' }}>$3,000</strong>,
          es <strong style={{ color: 'var(--cream)' }}>50% / 50%</strong>.
        </div>

        <div className="stats-grid" style={{ margin: 0 }}>
          <Kpi
            label="Ganancia por socio"
            value={fmt(r.ganancia_por_socio)}
            hint="Si cierran hoy al público"
            color="#8b5cf6"
          />
          <Kpi
            label="Total por socio (inv + ganancia)"
            value={fmt(3000 + r.ganancia_por_socio)}
            hint="Inversión + su parte de ganancia"
            color="#8b5cf6"
          />
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: 'rgba(139, 92, 246, 0.05)',
            borderRadius: 6,
            border: '1px solid rgba(139, 92, 246, 0.2)',
            fontSize: '0.85rem',
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: '#8b5cf6' }}>
            Cada uno se llevaría: {fmt(3000 + r.ganancia_por_socio)}
          </strong>
          <br />
          <span style={{ color: 'var(--cream-dim)', fontSize: '0.8rem' }}>
            (Eso incluye los $3,000 que puso + su ganancia del{' '}
            {((r.ganancia_por_socio / 3000) * 100).toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* ---- RESUMEN RÁPIDO ---- */}
      <div
        className="card"
        style={{
          background:
            'linear-gradient(135deg, rgba(201,168,76,0.05), rgba(74,140,106,0.05))',
        }}
      >
        <div className="section-title mb-4">
          📊 Resumen final
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            fontSize: '0.9rem',
          }}
        >
          <Fila
            label="Cada uno invirtió"
            value={fmt(3000)}
            color="var(--cream-dim)"
          />
          <Fila
            label="Total invertido entre los 2"
            value={fmt(r.inversion_inicial)}
            color="var(--cream)"
          />
          <Fila
            label="Hemos vendido (a precio público)"
            value={fmt(r.total_vendido)}
            color="var(--cream)"
          />
          <Fila
            label="Ya cobrado"
            value={fmt(r.total_cobrado)}
            color="#4a8c6a"
          />
          <Fila
            label="Nos deben"
            value={fmt(r.por_cobrar)}
            color="#c9a84c"
          />
          <Fila
            label="Dinero en caja hoy"
            value={fmt(r.dinero_en_caja)}
            color="#4a8c6a"
          />
          <Fila
            label="Stock por vender (a público)"
            value={fmt(r.valor_stock_publico)}
            color="#c9a84c"
          />
          <Fila
            label="Ganancia realizada (cobrada)"
            value={fmt(r.ganancia_realizada)}
            color="#4a8c6a"
          />

          <div
            style={{
              borderTop: '1px solid var(--black-border)',
              marginTop: 8,
              paddingTop: 12,
            }}
          >
            <Fila
              label="SI CERRAMOS HOY (al público)"
              value={fmt(r.escenario_cierre.total_a_publico)}
              color="var(--gold)"
              bold
            />
            <Fila
              label="− Lo que invertimos"
              value={`− ${fmt(r.inversion_inicial)}`}
              color="var(--cream-dim)"
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 10,
                borderTop: '1px dashed var(--black-border)',
                marginTop: 8,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.2rem',
                  color: 'var(--cream)',
                }}
              >
                GANANCIA TOTAL
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.8rem',
                  color: colorGanancia,
                }}
              >
                {fmt(r.utilidad_total)}
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: 'rgba(74, 140, 106, 0.1)',
              borderRadius: 6,
              textAlign: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: '1.3rem',
              color: '#4a8c6a',
            }}
          >
            {fmt(r.ganancia_por_socio)} para cada uno
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, hint, color }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div
        className="stat-value"
        style={{
          color: color || 'var(--cream)',
          fontSize: '1.25rem',
        }}
      >
        {value}
      </div>
      {hint && (
        <div
          style={{
            fontSize: '0.6rem',
            color: 'var(--cream-dim)',
            marginTop: 4,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}

function Fila({ label, value, color, bold }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        fontWeight: bold ? 600 : 400,
      }}
    >
      <span style={{ color: color || 'var(--cream-dim)' }}>{label}</span>
      <strong style={{ color: color || 'var(--cream)' }}>{value}</strong>
    </div>
  )
}
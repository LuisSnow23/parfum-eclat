import { useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react'
import { fmt } from '../api'

export default function Importar() {
  const [archivo, setArchivo] = useState(null)
  const [estado, setEstado] = useState(null) // null | 'loading' | 'success' | 'error'
  const [resultado, setResultado] = useState(null)
  const [drag, setDrag] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setEstado('error')
      setResultado({ error: 'Solo se aceptan archivos .xlsx o .xls' })
      return
    }
    setArchivo(file)
    setEstado(null)
    setResultado(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    handleFile(e.dataTransfer.files[0])
  }

  const importar = async () => {
    if (!archivo) return
    setEstado('loading')
    const formData = new FormData()
    formData.append('archivo', archivo)
    try {
      const res = await fetch('/api/importar', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.ok) {
        setEstado('success')
        setResultado(data)
      } else {
        setEstado('error')
        setResultado(data)
      }
    } catch (err) {
      setEstado('error')
      setResultado({ error: 'Error de conexión con el servidor' })
    }
  }

  const reset = () => {
    setArchivo(null)
    setEstado(null)
    setResultado(null)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="ornament">✦ ✦ ✦</div>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            Importar <span>Excel</span>
          </h1>
          <div className="label" style={{ marginTop: 6 }}>Carga tu archivo existente al sistema</div>
        </div>
      </div>

      <div style={{ maxWidth: 600 }}>

        {/* Zona de drop */}
        <div
          className="card"
          style={{
            borderStyle: 'dashed',
            borderColor: drag ? 'var(--gold)' : archivo ? 'var(--gold-dim)' : 'var(--noir-border)',
            background: drag ? 'rgba(201,168,76,0.04)' : 'var(--noir-card)',
            textAlign: 'center',
            padding: '48px 32px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />

          {archivo ? (
            <div>
              <FileSpreadsheet size={40} color="var(--gold)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '0.95rem', color: 'var(--white)', marginBottom: 4 }}>{archivo.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--cream-dim)' }}>
                {(archivo.size / 1024).toFixed(1)} KB · Listo para importar
              </div>
            </div>
          ) : (
            <div>
              <Upload size={36} color="var(--cream-dim)" style={{ margin: '0 auto 14px' }} />
              <div style={{ fontSize: '0.95rem', color: 'var(--cream)', marginBottom: 6 }}>
                Arrastra tu archivo aquí
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--cream-dim)' }}>
                o haz clic para seleccionarlo · .xlsx / .xls
              </div>
            </div>
          )}
        </div>

        {/* Acciones */}
        {archivo && estado !== 'success' && (
          <div className="flex gap-3" style={{ marginTop: 16 }}>
            <button className="btn btn-gold" onClick={importar} disabled={estado === 'loading'} style={{ flex: 1 }}>
              {estado === 'loading' ? (
                <span>Importando...</span>
              ) : (
                <><Upload size={14} /> Importar Archivo</>
              )}
            </button>
            <button className="btn btn-outline" onClick={reset}>
              <X size={14} /> Cancelar
            </button>
          </div>
        )}

        {/* Resultado */}
        {estado === 'success' && resultado && (
          <div style={{ marginTop: 20 }}>
            <div className="alert alert-success" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>¡Importación exitosa!</div>
                <div style={{ fontSize: '0.82rem', lineHeight: 1.8 }}>
                  Se creó una nueva inversión con los datos del archivo.<br />
                  Perfumes importados: <strong>{resultado.perfumes_importados}</strong><br />
                  Pendientes importados: <strong>{resultado.pendientes_importados}</strong>
                </div>
              </div>
            </div>
            <div className="flex gap-3" style={{ marginTop: 14 }}>
              <a href={`/inversiones/${resultado.inversion_id}`} className="btn btn-gold">
                Ver Inversión Importada
              </a>
              <button className="btn btn-outline" onClick={reset}>
                Importar otro archivo
              </button>
            </div>
          </div>
        )}

        {estado === 'error' && resultado && (
          <div className="alert alert-error" style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Error al importar</div>
              <div style={{ fontSize: '0.82rem' }}>{resultado.error}</div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="card" style={{ marginTop: 28, padding: '20px 24px' }}>
          <div className="section-title" style={{ fontSize: '0.95rem', marginBottom: 14 }}>¿Qué se importa?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['📦', 'Perfumes', 'Nombres, precios de mayoreo, costos de envío y precios al público'],
              ['💰', 'Pendientes', 'Cobros y pagos pendientes detectados en el archivo'],
              ['📋', 'Inversión', 'Se crea automáticamente una inversión con los datos del Excel'],
            ].map(([icon, title, desc]) => (
              <div key={title} className="flex gap-3" style={{ alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--cream)', fontWeight: 400 }}>{title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <hr className="divider" />
          <div style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--gold)' }}>Tip:</strong> Después de importar, revisa la inversión creada y ajusta
            manualmente los datos que no se hayan leído correctamente. Puedes editar perfumes y agregar ventas desde el detalle de la inversión.
          </div>
        </div>

      </div>
    </div>
  )
}
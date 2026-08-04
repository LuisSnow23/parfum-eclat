import { useState } from 'react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesion');
      }

      localStorage.setItem('token', data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--black)', color: 'var(--white-soft)'
    }}>
      <div className="login-box" style={{
        background: 'var(--black-card)', padding: '48px', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--black-border)', width: '100%', maxWidth: '400px'
      }}>
        <div className="brand" style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div className="brand-name" style={{ fontSize: '1.8rem' }}>
            PARFUM<br /><span style={{ fontWeight: 500 }}>ECLAT</span>
          </div>
          <div className="brand-line" style={{ margin: '12px auto' }}></div>
          <div className="brand-sub">ACCESO SEGURO</div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error" style={{ marginBottom: '20px', color: '#c45c5c', fontSize: '0.8rem' }}>{error}</div>}
          
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Contrasena</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-gold w-full" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? 'Entrando...' : 'Iniciar Sesion'}
          </button>
        </form>
        
        {/* <div style={{ marginTop: '20px', fontSize: '0.75rem', color: 'var(--gray-dim)', textAlign: 'center' }}>
          Usuario por defecto: <strong>admin</strong> · Contrasena: <strong>admin123</strong>
        </div> */}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Package, PiggyBank, Wallet } from 'lucide-react';
import Perfumes from './pages/Perfumes';
import Ahorro from './pages/Ahorro';
import Login from './Login';
import Fondo from './pages/Fondo';
import logo from './assets/logo-pe.jpeg';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-container">
          <img src={logo} alt="Parfum Eclat" className="logo-image" />
          <div className="logo-glow"></div>
        </div>
        <div className="brand">
          <div className="brand-name">
            PARFUM<br /><span>ECLAT</span>
          </div>
          <div className="brand-line"></div>
          <div className="brand-sub">CONTROL ESTRICTO</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">MENU</div>
        <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Package size={16} />
          <span>Perfumes</span>
        </NavLink>
        <NavLink to="/ahorro" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <PiggyBank size={16} />
          <span>Ahorro</span>
        </NavLink>
        <NavLink to="/fondo" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Wallet size={16} />
          <span>Fondo(pellizcos o prestamos)</span>
        </NavLink>

        <div className="nav-item" style={{ cursor: 'pointer', marginTop: 'auto' }} onClick={() => {
          localStorage.removeItem('token');
          window.location.reload();
        }}>
          <span style={{ color: 'var(--gray-dim)' }}>Cerrar Sesion</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="footer-text">PARFUM ECLAT by Luis Montelongo</div>
        <div className="footer-year">© 2026</div>
      </div>
    </aside>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  if (!token) {
    return <Login onLogin={(newToken) => {
      setToken(newToken);
      localStorage.setItem('token', newToken);
    }} />;
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Perfumes />} />
            <Route path="/ahorro" element={<Ahorro />} />
            <Route path="/fondo" element={<Fondo />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
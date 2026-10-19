import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { Package, PiggyBank, Wallet, Users, BarChart3, Menu, X, LogOut } from 'lucide-react';
import Perfumes from './pages/Perfumes';
import Ahorro from './pages/Ahorro';
import Login from './Login';
import Fondo from './pages/Fondo';
import Clientes from './pages/Clientes';
import Reporte from './pages/Reporte';
import logo from './assets/logo-pe.jpeg';

function Sidebar({ open, onClose }) {
  const navClass = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`;

  const logout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <>
      <div
        className={`sidebar-overlay${open ? ' show' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        id="app-sidebar"
        className={`sidebar${open ? ' open' : ''}`}
        aria-label="Menú principal"
      >
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>

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

          <NavLink to="/" end className={navClass} onClick={onClose}>
            <Package size={16} />
            <span>Perfumes</span>
          </NavLink>

          <NavLink to="/ahorro" className={navClass} onClick={onClose}>
            <PiggyBank size={16} />
            <span>Ahorro</span>
          </NavLink>

          <NavLink to="/fondo" className={navClass} onClick={onClose}>
            <Wallet size={16} />
            <span>Fondo (pellizcos o préstamos)</span>
          </NavLink>

          <NavLink to="/clientes" className={navClass} onClick={onClose}>
            <Users size={16} />
            <span>Clientes</span>
          </NavLink>

          <NavLink to="/reporte" className={navClass} onClick={onClose}>
            <BarChart3 size={16} />
            <span>Reporte</span>
          </NavLink>

          <div
            className="nav-item nav-logout"
            role="button"
            tabIndex={0}
            onClick={logout}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') logout();
            }}
          >
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="footer-text">PARFUM ECLAT by Luis Montelongo</div>
          <div className="footer-year">© 2026</div>
        </div>
      </aside>
    </>
  );
}

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Cierra el menú al cambiar de ruta
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Cierra con la tecla Esc
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = e => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Bloquea el scroll del fondo mientras el menú está abierto
  useEffect(() => {
    document.body.classList.toggle('no-scroll', menuOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [menuOpen]);

  // Si la pantalla crece a escritorio, cierra el menú
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)');
    const onChange = e => {
      if (e.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="app-layout">
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="mobile-brand">
          PARFUM <span>ECLAT</span>
        </div>
      </header>

      <Sidebar open={menuOpen} onClose={closeMenu} />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Perfumes />} />
          <Route path="/ahorro" element={<Ahorro />} />
          <Route path="/fondo" element={<Fondo />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/reporte" element={<Reporte />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  if (!token) {
    return (
      <Login
        onLogin={newToken => {
          setToken(newToken);
          localStorage.setItem('token', newToken);
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
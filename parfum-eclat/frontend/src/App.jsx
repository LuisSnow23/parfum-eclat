import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  TrendingUp,
  AlertCircle,
  Upload,
  PiggyBank
} from 'lucide-react'

import Dashboard from './pages/Dashboard'
import Inversiones from './pages/Inversiones'
import InversionDetalle from './pages/InversionDetalle'
import Pendientes from './pages/Pendientes'
import Importar from './pages/Importar'
import Ahorro from './pages/Ahorro'

import logo from './assets/logo-pe.jpeg'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-container">
          <img
            src={logo}
            alt="Parfum Éclat"
            className="logo-image"
          />
          <div className="logo-glow"></div>
        </div>
        
        <div className="brand">
          <div className="brand-name">
            PARFUM<br />
            <span>ÉCLAT</span>
          </div>
          <div className="brand-line"></div>
          <div className="brand-sub">
            SISTEMA DE INVERSIÓN
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">GENERAL</div>

        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </NavLink>

        <div className="nav-section-label">NEGOCIO</div>

        <NavLink
          to="/inversiones"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <TrendingUp size={16} />
          <span>Inversiones</span>
        </NavLink>

        <NavLink
          to="/pendientes"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <AlertCircle size={16} />
          <span>Pendientes</span>
        </NavLink>

        <NavLink
          to="/ahorro"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <PiggyBank size={16} />
          <span>Ahorro Diciembre</span>
        </NavLink>

        <div className="nav-section-label">HERRAMIENTAS</div>

        <NavLink
          to="/importar"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Upload size={16} />
          <span>Importar Excel</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="footer-text">PARFUM ÉCLAT</div>
        <div className="footer-year">© 2025</div>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inversiones" element={<Inversiones />} />
            <Route path="/inversiones/:id" element={<InversionDetalle />} />
            <Route path="/pendientes" element={<Pendientes />} />
            <Route path="/ahorro" element={<Ahorro />} />
            <Route path="/importar" element={<Importar />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
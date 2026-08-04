import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Package, PiggyBank } from 'lucide-react'
import Perfumes from './pages/Perfumes'
import Ahorro from './pages/Ahorro'
import logo from './assets/logo-pe.jpeg'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-container">
          <img src={logo} alt="Parfum Éclat" className="logo-image" />
          <div className="logo-glow"></div>
        </div>
        <div className="brand">
          <div className="brand-name">
            PARFUM<br /><span>ÉCLAT</span>
          </div>
          <div className="brand-line"></div>
          <div className="brand-sub">CONTROL ESTRICTO</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">MENÚ</div>
        <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Package size={16} />
          <span>Perfumes</span>
        </NavLink>
        <NavLink to="/ahorro" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <PiggyBank size={16} />
          <span>Ahorro</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="footer-text">PARFUM ÉCLAT by Luis Montelongo</div>
        <div className="footer-year">© 2026</div>
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
            <Route path="/" element={<Perfumes />} />
            <Route path="/ahorro" element={<Ahorro />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

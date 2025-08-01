import React from 'react';
import { BiBuilding, BiFile, BiCog, BiTime } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

function Sidebar({ active, onNavigate }) {
  const navigate = useNavigate();
  const handleNav = (section, path) => {
    onNavigate(section);
    navigate(path);
  };
  return (
    <aside className="sidebar d-flex flex-column align-items-center py-4 px-2" style={{ background: '#fff', minHeight: '100vh', width: 80, borderRight: '1px solid #e9ecef' }}>
      <div className="sidebar-logo mb-4 text-center w-100">
        <span className="fw-bold" style={{ color: 'var(--color-principal)', fontSize: 28, letterSpacing: 1 }}>CC</span>
      </div>
      <nav className="flex-grow-1 w-100">
        <ul className="nav flex-column w-100 align-items-center">
          <li className="nav-item w-100 mb-2">
            <button className={`nav-link w-100 d-flex flex-column align-items-center ${active === 'companias' ? 'active' : ''}`} style={{ color: active === 'companias' ? 'var(--color-principal)' : '#adb5bd', background: 'none', border: 'none', fontWeight: 500, fontSize: 22, padding: '12px 0', borderRadius: 8 }} onClick={() => handleNav('companias', '/companias')} title="Compañías">
              <BiBuilding size={28} />
              <span style={{ fontSize: 12, marginTop: 2 }}>Compañías</span>
            </button>
          </li>
          <li className="nav-item w-100 mb-2">
            <button className={`nav-link w-100 d-flex flex-column align-items-center ${active === 'expedientes' ? 'active' : ''}`} style={{ color: active === 'expedientes' ? 'var(--color-principal)' : '#adb5bd', background: 'none', border: 'none', fontWeight: 500, fontSize: 22, padding: '12px 0', borderRadius: 8 }} onClick={() => handleNav('expedientes', '/expedientes')} title="Expedientes">
              <BiFile size={28} />
              <span style={{ fontSize: 12, marginTop: 2 }}>Expedientes</span>
            </button>
          </li>
          <li className="nav-item w-100 mb-2">
            <button className={`nav-link w-100 d-flex flex-column align-items-center ${active === 'configuraciones' ? 'active' : ''}`} style={{ color: active === 'configuraciones' ? 'var(--color-principal)' : '#adb5bd', background: 'none', border: 'none', fontWeight: 500, fontSize: 22, padding: '12px 0', borderRadius: 8 }} onClick={() => handleNav('configuraciones', '/configuraciones')} title="Configuraciones">
              <BiCog size={28} />
              <span style={{ fontSize: 12, marginTop: 2 }}>Config</span>
            </button>
          </li>
          <li className="nav-item w-100 mb-2">
            <button className={`nav-link w-100 d-flex flex-column align-items-center ${active === 'tareas' ? 'active' : ''}`} style={{ color: active === 'tareas' ? 'var(--color-principal)' : '#adb5bd', background: 'none', border: 'none', fontWeight: 500, fontSize: 22, padding: '12px 0', borderRadius: 8 }} onClick={() => handleNav('tareas', '/tareas')} title="Tareas Programadas">
              <BiTime size={28} />
              <span style={{ fontSize: 12, marginTop: 2 }}>Tareas</span>
            </button>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/pipelines">
              <i className="bi bi-diagram-3"></i> Pipelines
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar; 
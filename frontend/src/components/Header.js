import React from 'react';

function Header({ title, onLogout }) {
  return (
    <header className="header d-flex align-items-center justify-content-between px-4 py-3 shadow-sm" style={{ background: '#fff', borderBottom: '1px solid #e9ecef', minHeight: 64, position: 'sticky', top: 0, zIndex: 10 }}>
      <h4 className="mb-0 fw-bold" style={{ color: 'var(--color-texto)', letterSpacing: 1 }}>{title}</h4>
      <button className="btn" style={{ background: 'var(--color-principal)', color: '#fff', border: 'none', borderRadius: '2rem', fontWeight: 500, padding: '8px 24px' }} onClick={onLogout}>
        Cerrar sesión
      </button>
    </header>
  );
}

export default Header; 
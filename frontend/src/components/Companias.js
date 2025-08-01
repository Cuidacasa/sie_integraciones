import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

function Companias() {
  const [companias, setCompanias] = useState([]);
  const [form, setForm] = useState({ nombre: '', api_url: '', api_token: '', username: '', password: '' });
  const [mensaje, setMensaje] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const token = localStorage.getItem('token');

  const fetchCompanias = async () => {
    try {
      console.log('Iniciando fetch de compañías...');
      console.log('Token:', token ? 'Presente' : 'Ausente');
      
      if (!token) {
        console.error('No hay token disponible');
        setMensaje('No hay token de autenticación');
        setCompanias([]);
        return;
      }
      
      const res = await fetch(`${API_BASE_URL}/api/companias`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Status de respuesta:', res.status);
      
      if (res.status === 401) {
        console.error('Token inválido o expirado');
        setMensaje('Sesión expirada. Por favor, inicia sesión nuevamente.');
        setCompanias([]);
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Datos recibidos:', data);
      console.log('Tipo de datos:', typeof data);
      console.log('Es array?', Array.isArray(data));
      
      // Protección para asegurar que companias sea siempre un array
      if (Array.isArray(data)) {
        console.log('Estableciendo compañías como array:', data);
        setCompanias(data);
      } else if (data && Array.isArray(data.companias)) {
        console.log('Estableciendo compañías desde propiedad:', data.companias);
        setCompanias(data.companias);
      } else {
        console.error('Respuesta inesperada del backend:', data);
        setCompanias([]);
      }
    } catch (err) {
      console.error('Error al cargar compañías:', err);
      setMensaje('Error al cargar compañías');
      setCompanias([]);
    }
  };

  useEffect(() => {
    fetchCompanias();
    // eslint-disable-next-line
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setMensaje('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/companias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setForm({ nombre: '', api_url: '', api_token: '', username: '', password: '' });
        setShowModal(false);
        fetchCompanias();
        setMensaje('Compañía agregada correctamente');
      } else {
        const data = await res.json();
        setMensaje(data.message || 'Error al agregar compañía');
      }
    } catch (err) {
      setMensaje('Error de conexión');
    }
  };

  // Filtro y paginación con protección adicional
  const filtered = Array.isArray(companias) ? companias.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase())) : [];
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold" style={{ color: 'var(--color-texto)' }}>Listado de Compañías</h4>        
      </div>
      
      <div className="card shadow-sm border-0" style={{ padding: 20 }}>
        <div className="card-body p-0">
          <div className="row mb-3">
            <div className="col-md-4">
              <input type="text" className="form-control" placeholder="Buscar compañía..." value={search} onChange={e => setSearch(e.target.value)} style={{ color: '#6c757d', borderColor: '#e5e8eb', borderRadius: '0.25rem' }} />
            </div>
            <div className="col-md-4">
            </div>
            <div className="col-md-4">
              <button className="btn" style={{ background: 'var(--color-principal)', color: '#fff', borderRadius: '0.25rem', fontWeight: 500, float: 'right' }} onClick={() => setShowModal(true)}>
                + Agregar Compañía
              </button>
            </div>
          </div>
          <table className="table hyper-table align-middle mb-0" style={{ minWidth: 900 }}>
            <thead style={{ background: '#f4f6f8', borderBottom: '2px solid #e9ecef' }}>
              <tr>
                <th style={{ color: 'var(--color-texto)', width: 60, fontWeight: 700, fontSize: 15 }}>#</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Nombre</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>API URL</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>API Token</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Username</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Password</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted">No hay compañías</td></tr>
              ) : (
                paginated.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f0f1f3' }}>
                    <td style={{ color: 'var(--color-texto)', fontWeight: 500 }}>{(currentPage - 1) * pageSize + i + 1}</td>
                    <td style={{ color: 'var(--color-texto)' }}>{c.nombre}</td>
                    <td style={{ color: 'var(--color-texto)' }}>{c.api_url}</td>
                    <td style={{ color: 'var(--color-texto)' }}>{c.api_token}</td>
                    <td style={{ color: 'var(--color-texto)' }}>{c.username}</td>
                    <td style={{ color: 'var(--color-texto)' }}>{c.password}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Paginación */}
      {totalPages > 1 && (
        <nav className="mt-3">
          <ul className="pagination justify-content-end">
            {Array.from({ length: totalPages }, (_, idx) => (
              <li key={idx} className={`page-item${currentPage === idx + 1 ? ' active' : ''}`}>
                <button className="page-link" style={{ color: 'var(--color-principal)', border: 'none', background: 'none' }} onClick={() => setCurrentPage(idx + 1)}>{idx + 1}</button>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {/* Modal para agregar compañía */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.2)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Agregar Compañía</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleAdd}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input type="text" className="form-control" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required autoFocus />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">API URL</label>
                    <input type="text" className="form-control" value={form.api_url} onChange={e => setForm({ ...form, api_url: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">API Token</label>
                    <input type="text" className="form-control" value={form.api_token} onChange={e => setForm({ ...form, api_token: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Username</label>
                    <input type="text" className="form-control" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input type="password" className="form-control" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn" style={{ background: 'var(--color-principal)', color: '#fff', borderRadius: '2rem', fontWeight: 500 }}>Agregar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Mensaje de éxito/error */}
      {mensaje && (
        <div className="alert alert-info position-fixed bottom-0 end-0 m-4" style={{ zIndex: 9999, minWidth: 250 }}>
          {mensaje}
          <button type="button" className="btn-close float-end" style={{ fontSize: 12 }} onClick={() => setMensaje('')}></button>
        </div>
      )}
    </div>
  );
}

export default Companias; 
import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

function TareasProgramadas() {
  const [tareas, setTareas] = useState([]);
  const [companias, setCompanias] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTarea, setEditingTarea] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    compania_id: '',
    intervalo_minutos: 60
  });
  const [ejecutando, setEjecutando] = useState({});
  const token = localStorage.getItem('token');

  const fetchTareas = async () => {
    try {
      console.log('Iniciando fetchTareas...');
      const res = await fetch(`${API_BASE_URL}/api/tareas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Response data:', data);
      console.log('Data type:', typeof data);
      console.log('Is array:', Array.isArray(data));
      
      // Validar que data sea un array
      if (Array.isArray(data)) {
        setTareas(data);
        console.log('Tareas cargadas:', data.length);
      } else {
        console.error('La respuesta no es un array:', data);
        setTareas([]);
        setMensaje('Error: La respuesta del servidor no es válida');
      }
    } catch (err) {
      console.error('Error al cargar tareas:', err);
      setTareas([]);
      setMensaje('Error al cargar tareas programadas');
    }
  };

  const fetchCompanias = async () => {
    try {
      console.log('Iniciando fetchCompanias...');
      const res = await fetch(`${API_BASE_URL}/api/tareas/companias/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Companias response status:', res.status);
      console.log('Companias response ok:', res.ok);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Companias error response:', errorText);
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Companias response data:', data);
      console.log('Companias data type:', typeof data);
      console.log('Companias is array:', Array.isArray(data));
      
      // Validar que data sea un array
      if (Array.isArray(data)) {
        setCompanias(data);
        console.log('Compañías cargadas:', data.length);
      } else {
        console.error('La respuesta de compañías no es un array:', data);
        setCompanias([]);
        setMensaje('Error: La respuesta de compañías no es válida');
      }
    } catch (err) {
      console.error('Error al cargar compañías:', err);
      setCompanias([]);
      setMensaje('Error al cargar compañías');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');

    try {
      const url = editingTarea 
        ? `${API_BASE_URL}/api/tareas/${editingTarea.id}`
        : `${API_BASE_URL}/api/tareas`;
      
      const method = editingTarea ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        fetchTareas();
        setShowModal(false);
        setEditingTarea(null);
        setFormData({ nombre: '', descripcion: '', compania_id: '', intervalo_minutos: 60 });
        setMensaje(editingTarea ? 'Tarea actualizada correctamente' : 'Tarea creada correctamente');
      } else {
        const errorData = await res.json();
        setMensaje(errorData.error || 'Error al guardar tarea');
      }
    } catch (err) {
      setMensaje('Error de conexión');
    }
  };

  const handleEdit = (tarea) => {
    setEditingTarea(tarea);
    setFormData({
      nombre: tarea.nombre,
      descripcion: tarea.descripcion || '',
      compania_id: tarea.compania_id,
      intervalo_minutos: tarea.intervalo_minutos
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta tarea?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/tareas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchTareas();
        setMensaje('Tarea eliminada correctamente');
      } else {
        setMensaje('Error al eliminar tarea');
      }
    } catch (err) {
      setMensaje('Error de conexión');
    }
  };

  const handleEjecutar = async (id) => {
    setEjecutando(prev => ({ ...prev, [id]: true }));
    setMensaje('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/tareas/${id}/ejecutar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setMensaje('Tarea iniciada correctamente');
        fetchTareas(); // Recargar para ver la última ejecución
      } else {
        setMensaje('Error al ejecutar tarea');
      }
    } catch (err) {
      setMensaje('Error de conexión');
    }

    setEjecutando(prev => ({ ...prev, [id]: false }));
  };

  const handleToggleActivo = async (tarea) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tareas/${tarea.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ activo: !tarea.activo })
      });

      if (res.ok) {
        fetchTareas();
        setMensaje(`Tarea ${tarea.activo ? 'desactivada' : 'activada'} correctamente`);
      } else {
        setMensaje('Error al cambiar estado de la tarea');
      }
    } catch (err) {
      setMensaje('Error de conexión');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-ES');
  };

  const getStatusBadge = (tarea) => {
    if (!tarea.activo) return 'secondary';
    if (tarea.proxima_ejecucion && new Date(tarea.proxima_ejecucion) <= new Date()) {
      return 'warning';
    }
    return 'success';
  };

  useEffect(() => {
    fetchTareas();
    fetchCompanias();
  }, []);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold" style={{ color: 'var(--color-texto)' }}>Tareas Programadas</h4>
        <button 
          className="btn" 
          style={{ background: 'var(--color-principal)', color: '#fff', borderRadius: '0.25rem', fontWeight: 500 }}
          onClick={() => {
            setEditingTarea(null);
            setFormData({ nombre: '', descripcion: '', compania_id: '', intervalo_minutos: 60 });
            setShowModal(true);
          }}
        >
          Nueva Tarea
        </button>
      </div>

      <div className="card shadow-sm border-0" style={{ padding: 20 }}>
        <div className="card-body p-0">
          <table className="table hyper-table align-middle mb-0" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Nombre</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Compañía</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Intervalo</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Estado</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Última Ejecución</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Próxima Ejecución</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!Array.isArray(tareas) || tareas.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted">
                  {!Array.isArray(tareas) ? 'Error: Datos no válidos' : 'No hay tareas programadas'}
                </td></tr>
              ) : (
                tareas.map((tarea) => (
                  <tr key={tarea.id} style={{ borderBottom: '1px solid #f0f1f3' }}>
                    <td style={{ color: 'var(--color-texto)' }}>
                      <div>
                        <strong>{tarea.nombre}</strong>
                        {tarea.descripcion && (
                          <div className="text-muted" style={{ fontSize: 12 }}>{tarea.descripcion}</div>
                        )}
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-texto)' }}>{tarea.compania_nombre}</td>
                    <td style={{ color: 'var(--color-texto)' }}>{tarea.intervalo_minutos} min</td>
                    <td>
                      <span className={`badge bg-${getStatusBadge(tarea)}`} style={{ fontSize: 13, padding: '6px 16px', borderRadius: 12, fontWeight: 500 }}>
                        {tarea.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-texto)' }}>{formatDate(tarea.ultima_ejecucion)}</td>
                    <td style={{ color: 'var(--color-texto)' }}>{formatDate(tarea.proxima_ejecucion)}</td>
                    <td>
                      <div className="btn-group" role="group">
                        <button 
                          className="btn btn-sm btn-outline-primary" 
                          onClick={() => handleEjecutar(tarea.id)}
                          disabled={!!ejecutando[tarea.id]}
                          style={{ marginRight: 5 }}
                        >
                          {ejecutando[tarea.id] ? 'Ejecutando...' : 'Ejecutar'}
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-secondary" 
                          onClick={() => handleEdit(tarea)}
                          style={{ marginRight: 5 }}
                        >
                          Editar
                        </button>
                        <button 
                          className={`btn btn-sm btn-outline-${tarea.activo ? 'warning' : 'success'}`}
                          onClick={() => handleToggleActivo(tarea)}
                          style={{ marginRight: 5 }}
                        >
                          {tarea.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-danger" 
                          onClick={() => handleDelete(tarea.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para crear/editar tarea */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingTarea ? 'Editar Tarea' : 'Nueva Tarea Programada'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Nombre *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.nombre} 
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Descripción</label>
                    <textarea 
                      className="form-control" 
                      value={formData.descripcion} 
                      onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                      rows="3"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Compañía *</label>
                    <select 
                      className="form-control" 
                      value={formData.compania_id} 
                      onChange={(e) => setFormData({...formData, compania_id: e.target.value})}
                      required
                    >
                      <option value="">Seleccionar compañía</option>
                      {Array.isArray(companias) && companias.map(compania => (
                        <option key={compania.id} value={compania.id}>
                          {compania.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Intervalo (minutos) *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={formData.intervalo_minutos} 
                      onChange={(e) => setFormData({...formData, intervalo_minutos: parseInt(e.target.value)})}
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn" style={{ background: 'var(--color-principal)', color: '#fff' }}>
                    {editingTarea ? 'Actualizar' : 'Crear'}
                  </button>
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

export default TareasProgramadas; 
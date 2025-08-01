import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

function Configuraciones() {
  const [configuracion, setConfiguracion] = useState({ usuario_guai: '', password_guai: '' });
  const [mensaje, setMensaje] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const token = localStorage.getItem('token');

  const fetchConfiguracion = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/configuracion`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setConfiguracion(data);
      } else {
        setMensaje('Error al cargar configuración');
      }
    } catch (err) {
      setMensaje('Error de conexión');
    }
  };

  useEffect(() => {
    fetchConfiguracion();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje('');
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/configuracion`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(configuracion)
      });
      
      if (res.ok) {
        setMensaje('Configuración actualizada correctamente');
      } else {
        const data = await res.json();
        setMensaje(data.error || 'Error al actualizar configuración');
      }
    } catch (err) {
      setMensaje('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold" style={{ color: 'var(--color-texto)' }}>Configuraciones</h4>
      </div>
      
      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0" style={{ padding: 20 }}>
            <div className="card-body">
              <h5 className="card-title mb-4" style={{ color: 'var(--color-texto)' }}>
                Configuración de Usuario Guai
              </h5>
              
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold" style={{ color: 'var(--color-texto)' }}>
                      Usuario Guai
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={configuracion.usuario_guai}
                      onChange={e => setConfiguracion({ ...configuracion, usuario_guai: e.target.value })}
                      required
                      style={{ 
                        borderColor: 'var(--color-texto)', 
                        color: 'var(--color-texto)',
                        borderRadius: '0.5rem'
                      }}
                    />
                  </div>
                  
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold" style={{ color: 'var(--color-texto)' }}>
                      Password Guai
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      value={configuracion.password_guai}
                      onChange={e => setConfiguracion({ ...configuracion, password_guai: e.target.value })}
                      required
                      style={{ 
                        borderColor: 'var(--color-texto)', 
                        color: 'var(--color-texto)',
                        borderRadius: '0.5rem'
                      }}
                    />
                  </div>
                </div>
                
                <div className="d-flex justify-content-end mt-4">
                  <button
                    type="submit"
                    className="btn"
                    disabled={isLoading}
                    style={{ 
                      background: 'var(--color-principal)', 
                      color: '#fff', 
                      borderRadius: '2rem', 
                      fontWeight: 500,
                      minWidth: 120
                    }}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Guardando...
                      </>
                    ) : (
                      'Guardar Cambios'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        <div className="col-lg-4">
          <div className="card shadow-sm border-0" style={{ padding: 20 }}>
            <div className="card-body">
              <h6 className="card-title mb-3" style={{ color: 'var(--color-texto)' }}>
                Información
              </h6>
              <p className="text-muted small mb-0">
                Esta configuración se utiliza para la integración con el sistema Guai. 
                Los tokens de autenticación se gestionan automáticamente por el sistema.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mensaje de éxito/error */}
      {mensaje && (
        <div className="alert alert-info position-fixed bottom-0 end-0 m-4" style={{ zIndex: 9999, minWidth: 250 }}>
          {mensaje}
          <button 
            type="button" 
            className="btn-close float-end" 
            style={{ fontSize: 12 }} 
            onClick={() => setMensaje('')}
          ></button>
        </div>
      )}
    </div>
  );
}

export default Configuraciones; 
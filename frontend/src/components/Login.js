import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password })
      });
      const data = await response.json();
      if (response.ok && data.token) {
        onLogin(data.token);
      } else {
        setError(data.message || 'Credenciales incorrectas');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  return (
    <div className="login-container">
      <div className="login-background"></div>
      <div className="container-fluid h-100">
        <div className="row h-100">
          {/* Columna izquierda - Imagen/Ilustración */}
          <div
            className="col-lg-6 d-none d-lg-flex align-items-center justify-content-center login-left"
            style={{
              background: `url(${process.env.PUBLIC_URL + '/bg-auth.jpg'}) center center/cover no-repeat`,
              position: 'relative',
              minHeight: '100vh',
              height: '100vh'
            }}
          >
            <div className="text-center text-white">
              <h2 className="mb-4 fw-bold">Bienvenido al Sistema</h2>
              <p className="lead mb-0">Gestiona tus compañías de manera eficiente y profesional</p>
            </div>
          </div>
          
          {/* Columna derecha - Formulario */}
          <div className="col-lg-6 d-flex align-items-center justify-content-center login-right">
            <div className="login-form-container">
              <div className="text-center mb-4">
                <h3 className="login-title">Iniciar Sesión</h3>
                <p className="login-subtitle">Ingresa tus credenciales para acceder al sistema</p>
              </div>
              
              <form onSubmit={handleSubmit} className="login-form">
                <div className="mb-3">
                  <label className="form-label">Usuario</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-person"></i>
                    </span>
                    <input 
                      type="text" 
                      className="form-control login-input" 
                      placeholder="Ingresa tu usuario"
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Contraseña</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-lock"></i>
                    </span>
                    <input 
                      type="password" 
                      className="form-control login-input" 
                      placeholder="Ingresa tu contraseña"
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                
                {error && (
                  <div className="alert alert-danger login-alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}
                
                <button type="submit" className="btn btn-primary login-btn w-100">
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Iniciar Sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login; 
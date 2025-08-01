import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Companias from './components/Companias';
import Expedientes from './components/Expedientes';
import Configuraciones from './components/Configuraciones';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PipelineBuilder from './components/PipelineBuilder';
import TareasProgramadas from './components/TareasProgramadas';
import './App.css';

function MainLayout({ children, onLogout, active, onNavigate }) {
  return (
    <div className="d-flex" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Sidebar active={active} onNavigate={onNavigate} />
      <div className="flex-grow-1 d-flex flex-column">
        <Header title={active === 'companias' ? 'Compañías' : active === 'expedientes' ? 'Expedientes' : active === 'configuraciones' ? 'Configuraciones' : active === 'pipelines' ? 'Pipelines' : active === 'tareas' ? 'Tareas Programadas' : ''} onLogout={onLogout} />
        <main className="flex-grow-1 p-4" style={{ background: '#f8f9fa' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [active, setActive] = useState('companias');

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const handleNavigate = (section) => {
    setActive(section);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/companias" /> : <Login onLogin={handleLogin} />} />
        <Route
          path="/companias"
          element={
            isAuthenticated ? (
              <MainLayout onLogout={handleLogout} active={active} onNavigate={handleNavigate}>
                <Companias />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/expedientes"
          element={
            isAuthenticated ? (
              <MainLayout onLogout={handleLogout} active={active} onNavigate={handleNavigate}>
                <Expedientes />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/configuraciones"
          element={
            isAuthenticated ? (
              <MainLayout onLogout={handleLogout} active={active} onNavigate={handleNavigate}>
                <Configuraciones />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/pipelines"
          element={
            isAuthenticated ? (
              <MainLayout onLogout={handleLogout} active={active} onNavigate={handleNavigate}>
                <PipelineBuilder />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/tareas"
          element={
            isAuthenticated ? (
              <MainLayout onLogout={handleLogout} active={active} onNavigate={handleNavigate}>
                <TareasProgramadas />
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/companias" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;

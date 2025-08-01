import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

function badgeColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'pendiente':
      return 'warning';
    case 'completado':
    case 'sincronizado':
      return 'success';
    case 'error':
      return 'danger';
    default:
      return 'secondary';
  }
}

function getCaseField(obj, key) {
  if (!obj) return '';
  const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return found ? obj[found] : '';
}

function Expedientes() {
  const [expedientes, setExpedientes] = useState([]);
  const [companias, setCompanias] = useState([]);
  const [companiaSeleccionada, setCompaniaSeleccionada] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [syncing, setSyncing] = useState({});
  const [syncDate, setSyncDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [syncingMassive, setSyncingMassive] = useState(false);
  const [syncingExpedientes, setSyncingExpedientes] = useState(false);
  const [showDataRawModal, setShowDataRawModal] = useState(false);
  const [dataRaw, setDataRaw] = useState(null);
  const [loadingDataRaw, setLoadingDataRaw] = useState(false);
  const pageSize = 8;
  const token = localStorage.getItem('token');
  const [fechaInicio, setFechaInicio] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const fetchExpedientes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/expedientes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setExpedientes(data);
    } catch (err) {
      setMensaje('Error al cargar expedientes');
    }
  };

  const fetchCompanias = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/expedientes/companias`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCompanias(data);
    } catch (err) {
      setMensaje('Error al cargar compañías');
    }
  };

  const handleSincronizar = async () => {
    if (!companiaSeleccionada) {
      setMensaje('Debe seleccionar una compañía');
      return;
    }
    setSyncingExpedientes(true);
    setMensaje('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/expedientes/sincronizar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          fecha_inicio: fechaInicio, 
          fecha_fin: fechaFin,
          compania_id: companiaSeleccionada
        })
      });
      if (res.ok) {
        fetchExpedientes();
        setMensaje('Expedientes sincronizados correctamente');
      } else {
        const errorData = await res.json();
        setMensaje(errorData.error || 'Error al sincronizar expedientes');
      }
    } catch (err) {
      setMensaje('Error de conexión');
    } finally {
      setSyncingExpedientes(false);
    }
  };

  const handleSyncExpediente = async (id) => {
    setSyncing(s => ({ ...s, [id]: true }));
    setMensaje('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/expedientes/${id}/sincronizar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchExpedientes();
        setMensaje('Expediente sincronizado correctamente');
      } else {
        setMensaje('Error al sincronizar expediente');
      }
    } catch (err) {
      setMensaje('Error de conexión');
    }
    setSyncing(s => ({ ...s, [id]: false }));
  };

  const handleViewDataRaw = async (id) => {
    setLoadingDataRaw(true);
    setShowDataRawModal(true);
    setDataRaw(null);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/expedientes/${id}/data-raw`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setDataRaw(data.data_raw);
      } else {
        setMensaje('Error al cargar datos originales');
      }
    } catch (err) {
      setMensaje('Error de conexión');
    }
    
    setLoadingDataRaw(false);
  };

  useEffect(() => {
    fetchExpedientes();
    fetchCompanias();
    // eslint-disable-next-line
  }, []);

  // Filtro y paginación
  const filtered = expedientes.filter(e => {
    let datos = e;
    try {
      datos = typeof e.datos === 'string' ? JSON.parse(e.datos) : e.datos;
    } catch {}
    const caseNumber = getCaseField(e, 'caseNumber') || getCaseField(datos, 'caseNumber');
    const processorName = getCaseField(e, 'processorName') || getCaseField(datos, 'processorName');
    // Filtrar también por fecha_asignacion y cliente
    const fechaAsignacion = e.fecha_asignacion ? String(e.fecha_asignacion) : '';
    const cliente = e.cliente ? String(e.cliente) : '';
    return (
      (caseNumber + '').toLowerCase().includes(search.toLowerCase()) ||
      (processorName + '').toLowerCase().includes(search.toLowerCase()) ||
      (e.status || '').toLowerCase().includes(search.toLowerCase()) ||
      fechaAsignacion.includes(search) ||
      cliente.toLowerCase().includes(search.toLowerCase())
    );
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Validación de rango de fechas
  const rangoInvalido = fechaInicio > fechaFin;

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold" style={{ color: 'var(--color-texto)' }}>Listado de Expedientes</h4>        
      </div>
      <div className="card shadow-sm border-0" style={{ padding: 20 }}>
        <div className="card-body p-0">
          <div className="row mb-3">
            <div className="col-md-2">
              <select 
                className="form-control" 
                value={companiaSeleccionada} 
                onChange={e => setCompaniaSeleccionada(e.target.value)}
                style={{ color: '#6c757d', borderColor: '#e5e8eb', borderRadius: '0.25rem' }}
              >
                <option value="">Seleccionar compañía</option>
                {companias.map(compania => (
                  <option key={compania.id} value={compania.id}>
                    {compania.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <input
                type="date"
                className="form-control"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                style={{ color: '#6c757d', borderColor: '#e5e8eb', borderRadius: '0.25rem' }}
              />
            </div>
            <div className="col-md-2">
              <input
                type="date"
                className="form-control"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                style={{ color: '#6c757d', borderColor: '#e5e8eb', borderRadius: '0.25rem' }}
              />
            </div>
            <div className="col-md-2">
              <input type="text" className="form-control" placeholder="Buscar por Case Number, Processor, cliente o estado..." value={search} onChange={e => setSearch(e.target.value)} style={{ color: '#6c757d', borderColor: '#e5e8eb', borderRadius: '0.25rem' }} />
            </div>
            <div className="col-md-2">
              <button 
                className="btn" 
                style={{ 
                  background: syncingExpedientes ? '#6c757d' : 'var(--color-principal)', 
                  color: '#fff', 
                  borderRadius: '0.25rem', 
                  fontWeight: 500, 
                  float: 'right',
                  opacity: syncingExpedientes ? 0.7 : 1,
                  cursor: syncingExpedientes ? 'not-allowed' : 'pointer'
                }} 
                onClick={handleSincronizar} 
                disabled={rangoInvalido || !companiaSeleccionada || syncingExpedientes}
              >
                {syncingExpedientes ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Sincronizando...
                  </>
                ) : (
                  'Sincronizar Expedientes'
                )}
              </button>
            </div>
          </div>
          {rangoInvalido && (
            <div className="alert alert-warning mt-2" style={{ fontSize: 14 }}>
              La fecha de inicio no puede ser mayor que la fecha de fin.
            </div>
          )}
          {!companiaSeleccionada && (
            <div className="alert alert-info mt-2" style={{ fontSize: 14 }}>
              Debe seleccionar una compañía para poder sincronizar expedientes.
            </div>
          )}
          <table className="table hyper-table align-middle mb-0" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ color: 'var(--color-texto)', width: 60, fontWeight: 700, fontSize: 15 }}>#</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Case Number</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Cliente</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Servicio</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Processor Name</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Fecha Asignación</th>
                <th style={{ color: 'var(--color-texto)', fontWeight: 700, fontSize: 15 }}>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted">No hay expedientes</td></tr>
              ) : (
                paginated.map((e, i) => {
                  let datos = e;
                  try {
                    datos = typeof e.datos === 'string' ? JSON.parse(e.datos) : e.datos;
                  } catch {}
                  const caseNumber = getCaseField(e, 'caseNumber') || getCaseField(datos, 'caseNumber');
                  const processorName = getCaseField(e, 'processorName') || getCaseField(datos, 'processorName');
                  const fechaAsignacion = e.fecha_asignacion || '';
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f1f3' }}>
                      <td style={{ color: 'var(--color-texto)', fontWeight: 500 }}>{(currentPage - 1) * pageSize + i + 1}</td>
                      <td style={{ color: 'var(--color-texto)' }}>{caseNumber}</td>
                      <td style={{ color: 'var(--color-texto)' }}>{e.cliente || '-'}</td>
                      <td style={{ color: 'var(--color-texto)' }}>{e.servicio}</td>
                      <td style={{ color: 'var(--color-texto)' }}>{processorName}</td>
                      <td style={{ color: 'var(--color-texto)' }}>{fechaAsignacion}</td>
                      <td><span className={`badge bg-${badgeColor(e.status)}`} style={{ fontSize: 13, padding: '6px 16px', borderRadius: 12, fontWeight: 500, textTransform: 'capitalize' }}>{e.status}</span></td>
                      <td>
                        <div className="btn-group" role="group">
                          {!(String(e.status).toLowerCase() === 'completado' || String(e.status).toLowerCase() === 'sincronizado') && (
                            <button className="btn btn-sm" style={{ background: 'var(--color-principal)', color: '#fff', borderRadius: 8, fontWeight: 500, marginRight: 5 }}
                              disabled={!!syncing[e.id]}
                              onClick={() => handleSyncExpediente(e.id)}>
                              {syncing[e.id] ? 'Sincronizando...' : 'Sincronizar'}
                            </button>
                          )}
                          <button 
                            className="btn btn-sm btn-outline-info" 
                            onClick={() => handleViewDataRaw(e.id)}
                            title="Ver datos originales"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Paginación */}
      {totalPages > 1 && (
        <nav className="mt-3">
          <ul className="pagination justify-content-end">
            {(() => {
              const pages = [];
              const maxPagesToShow = 5;
              let startPage = Math.max(1, currentPage - 2);
              let endPage = Math.min(totalPages, currentPage + 2);
              if (currentPage <= 3) {
                endPage = Math.min(totalPages, 5);
              }
              if (currentPage >= totalPages - 2) {
                startPage = Math.max(1, totalPages - 4);
              }
              // Primera página
              if (startPage > 1) {
                pages.push(
                  <li key={1} className={`page-item${currentPage === 1 ? ' active' : ''}`}>
                    <button className="page-link" style={{ color: 'var(--color-principal)', border: 'none', background: 'none' }} onClick={() => setCurrentPage(1)}>1</button>
                  </li>
                );
                if (startPage > 2) {
                  pages.push(<li key="start-ellipsis" className="page-item disabled"><span className="page-link">...</span></li>);
                }
              }
              // Páginas intermedias
              for (let i = startPage; i <= endPage; i++) {
                if (i === 1 || i === totalPages) continue;
                pages.push(
                  <li key={i} className={`page-item${currentPage === i ? ' active' : ''}`}>
                    <button className="page-link" style={{ color: 'var(--color-principal)', border: 'none', background: 'none' }} onClick={() => setCurrentPage(i)}>{i}</button>
                  </li>
                );
              }
              // Última página
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  pages.push(<li key="end-ellipsis" className="page-item disabled"><span className="page-link">...</span></li>);
                }
                pages.push(
                  <li key={totalPages} className={`page-item${currentPage === totalPages ? ' active' : ''}`}>
                    <button className="page-link" style={{ color: 'var(--color-principal)', border: 'none', background: 'none' }} onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                  </li>
                );
              }
              return pages;
            })()}
          </ul>
        </nav>
      )}
      {/* Botones para sincronización masiva */}
      <div className="mt-3 d-flex justify-content-end gap-2">
        <button
          className="btn btn-outline-primary"
          onClick={async () => {
            setSyncingMassive(true);
            setMensaje('');
            try {
              const res = await fetch(`${API_BASE_URL}/api/expedientes/sincronizar-masivo`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
              });
              const data = await res.json();
              if (res.ok) {
                fetchExpedientes();
                setMensaje(`Sincronización masiva por fecha: ${data.exitosos || 0} exitosos, ${data.fallidos || 0} fallidos.`);
              } else {
                setMensaje(data.error || 'Error en la sincronización masiva por fecha');
              }
            } catch (err) {
              setMensaje('Error de conexión');
            }
            setSyncingMassive(false);
          }}
          disabled={filtered.length === 0 || syncingMassive || rangoInvalido}
        >
          {syncingMassive ? 'Sincronizando...' : 'Sincronizar por rango de fechas'}
        </button>
        
        <button
          className="btn btn-outline-success"
          onClick={async () => {
            if (!companiaSeleccionada) {
              setMensaje('Debe seleccionar una compañía para sincronizar');
              return;
            }
            
            const companiaSeleccionadaObj = companias.find(c => c.id == companiaSeleccionada);
            if (!companiaSeleccionadaObj) {
              setMensaje('Compañía no encontrada');
              return;
            }
            
            setSyncingMassive(true);
            setMensaje('');
            try {
              const res = await fetch(`${API_BASE_URL}/api/expedientes/sincronizar-masivo-compania`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ compania_nombre: companiaSeleccionadaObj.nombre })
              });
              const data = await res.json();
              if (res.ok) {
                fetchExpedientes();
                setMensaje(`Sincronización masiva por compañía: ${data.exitosos || 0} exitosos, ${data.fallidos || 0} fallidos.`);
              } else {
                setMensaje(data.error || 'Error en la sincronización masiva por compañía');
              }
            } catch (err) {
              setMensaje('Error de conexión');
            }
            setSyncingMassive(false);
          }}
          disabled={!companiaSeleccionada || syncingMassive}
        >
          {syncingMassive ? 'Sincronizando...' : 'Sincronizar pendientes de la compañía'}
        </button>
      </div>
      {/* Modal para mostrar data raw */}
      {showDataRawModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Datos Originales del Expediente</h5>
                <button type="button" className="btn-close" onClick={() => setShowDataRawModal(false)}></button>
              </div>
              <div className="modal-body">
                {loadingDataRaw ? (
                  <div className="text-center">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Cargando...</span>
                    </div>
                    <p className="mt-2">Cargando datos originales...</p>
                  </div>
                ) : dataRaw ? (
                  <div>
                    <pre style={{ 
                      backgroundColor: '#f8f9fa', 
                      padding: '15px', 
                      borderRadius: '5px', 
                      fontSize: '12px',
                      maxHeight: '400px',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(dataRaw, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center text-muted">
                    <p>No se encontraron datos originales para este expediente.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDataRawModal(false)}>
                  Cerrar
                </button>
              </div>
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

export default Expedientes; 
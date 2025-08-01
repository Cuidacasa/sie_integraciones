import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  MiniMap, Controls, Background, addEdge,
  useNodesState, useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { API_BASE_URL } from '../config';

const nodeTypes = [
  { type: 'login', label: 'Login' },
  { type: 'consulta', label: 'Consulta' },
  { type: 'transformacion', label: 'Transformación' }
];

function getNodeLabel(node) {
  return node.data?.label || node.type || 'Paso';
}

export default function PipelineBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const mapeosPlaceholder = `{
  "profesionales": {
    "247201": "MlSev",
    "247301": "MlMalA",
    "248601": "MlBcn",
    "161901": "MlTgn",
    "187801": "MlMad",
    "229601": "MlGra",
    "247401": "MlGir"
  },
  "tipos_caso": {
    "Fontanero": "PLOMBING",
    "Albañil": "MASONRY",
    "Electricista": "ELECTRICAL"
  },
  "estados": {
    "pendiente": "PENDING",
    "en_proceso": "IN_PROGRESS",
    "completado": "COMPLETED"
  }
}`;



  // Cargar lista de pipelines
  const fetchPipelines = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pipelines`);
      const data = await res.json();
      setPipelines(data);
    } catch {
      setMensaje('Error al cargar pipelines');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  // Cargar pipeline seleccionado
  const loadPipeline = (pipeline) => {
    setNodes(pipeline.definicion.nodes || []);
    setEdges(pipeline.definicion.edges || []);
    setNombre(pipeline.nombre);
    setDescripcion(pipeline.descripcion || '');
    setSelectedPipelineId(pipeline.id);
    setSelectedNode(null); // Clear selected node when loading a pipeline
    setMensaje('Pipeline cargado para edición');
  };

  // Nuevo pipeline
  const newPipeline = () => {
    setNodes([]);
    setEdges([]);
    setNombre('');
    setDescripcion('');
    setSelectedPipelineId(null);
    setSelectedNode(null);
    setMensaje('');
  };

  // Eliminar pipeline
  const deletePipeline = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este pipeline?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/pipelines/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMensaje('Pipeline eliminado');
        fetchPipelines();
        if (selectedPipelineId === id) newPipeline();
      } else {
        setMensaje('Error al eliminar');
      }
    } catch {
      setMensaje('Error de conexión');
    }
  };

  // Añadir nodo
  const addNode = (type) => {
    const id = (nodes.length + 1).toString();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'default',
        data: { 
          label: nodeTypes.find(n => n.type === type).label, 
          type, 
          url: '', 
          method: 'POST',
          contentType: 'application/json',
          paramsBody: {}, 
          paramsHeader: {},
          responseExtraction: '',
          transformRules: type === 'transformacion' ? {} : undefined,
          mapeos: type === 'transformacion' ? {
            "profesionales": {
              247201: "MlSev",
              247301: "MlMalA",
              248601: "MlBcn",
              161901: "MlTgn",
              187801: "MlMad",
              229601: "MlGra",
              247401: "MlGir"
            }
          } : undefined
        },
        position: { x: 100 + nds.length * 50, y: 100 }
      }
    ]);
  };

  // Eliminar nodo
  const deleteNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter(n => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  // Seleccionar nodo
  const onNodeClick = (_, node) => setSelectedNode(node);

  // Editar propiedades del nodo seleccionado
  const handleNodeChange = (field, value) => {
    const updatedNode = { ...selectedNode, data: { ...selectedNode.data, [field]: value } };
    setSelectedNode(updatedNode);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? updatedNode
          : n
      )
    );
  };

  // Manejar cambios en campos sin validación en tiempo real
  const handleFieldChange = (field, value) => {
    const updatedNode = { ...selectedNode, data: { ...selectedNode.data, [field + 'Raw']: value } };
    setSelectedNode(updatedNode);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? updatedNode
          : n
      )
    );
  };

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  // Validar y procesar datos antes de guardar
  const processNodesForSave = () => {
    const processedNodes = nodes.map(node => {
      const processedNode = { ...node };
      
      // Procesar paramsBody según el tipo de contenido
      if (node.data.paramsBodyRaw) {
        try {
          if (node.data.contentType === 'application/x-www-form-urlencoded') {
            // Para form-urlencoded, guardar como string original
            processedNode.data.paramsBody = node.data.paramsBodyRaw;
          } else {
            // Para JSON, parsear normalmente
            processedNode.data.paramsBody = JSON.parse(node.data.paramsBodyRaw);
          }
          delete processedNode.data.paramsBodyRaw;
        } catch (error) {
          const contentType = node.data.contentType === 'application/x-www-form-urlencoded' ? 'form-urlencoded' : 'JSON';
          throw new Error(`Formato inválido en paramsBody del nodo "${node.data.label}" (${contentType}): ${error.message}`);
        }
      }
      
      // Procesar paramsHeader (siempre JSON)
      if (node.data.paramsHeaderRaw) {
        try {
          processedNode.data.paramsHeader = JSON.parse(node.data.paramsHeaderRaw);
          delete processedNode.data.paramsHeaderRaw;
        } catch (error) {
          throw new Error(`JSON inválido en paramsHeader del nodo "${node.data.label}": ${error.message}`);
        }
      }
      
      // Procesar responseExtraction
      if (node.data.responseExtractionRaw) {
        processedNode.data.responseExtraction = node.data.responseExtractionRaw;
        delete processedNode.data.responseExtractionRaw;
      }
      
      // Procesar transformRules
      if (node.data.transformRulesRaw) {
        try {
          processedNode.data.transformRules = JSON.parse(node.data.transformRulesRaw);
          delete processedNode.data.transformRulesRaw;
        } catch (error) {
          throw new Error(`JSON inválido en transformRules del nodo "${node.data.label}": ${error.message}`);
        }
      }
      
      // Procesar mapeos
      if (node.data.mapeosRaw) {
        try {
          processedNode.data.mapeos = JSON.parse(node.data.mapeosRaw);
          delete processedNode.data.mapeosRaw;
        } catch (error) {
          throw new Error(`JSON inválido en mapeos del nodo "${node.data.label}": ${error.message}`);
        }
      }
      
      // Nota: Para procesar múltiples extracciones, el backend debería:
      // 1. Dividir por líneas: responseExtraction.split('\n')
      // 2. Aplicar cada regex: regex.exec(response)
      // 3. Guardar resultados: { phpsessid: match1[1], token: match2[1], access_token: match3[1] }
      
      return processedNode;
    });
    
    return processedNodes;
  };

  // Probar pipeline
  const handleTestPipeline = async () => {
    try {
      setMensaje('🔄 Ejecutando pipeline...');
      
      // Validar JSON antes de probar
      const processedNodes = processNodesForSave();
      const definicion = { nodes: processedNodes, edges };
      
      // Debug: mostrar datos que se envían
      console.log('Datos del pipeline a enviar:', JSON.stringify(definicion, null, 2));
      
      const res = await fetch(`${API_BASE_URL}/api/pipelines/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definicion })
      });
      
      if (res.ok) {
        const result = await res.json();
        setMensaje(`✅ Pipeline ejecutado correctamente\n\nResultados:\n${JSON.stringify(result, null, 2)}`);
      } else {
        const error = await res.json();
        setMensaje(`❌ Error al ejecutar pipeline: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      setMensaje(`❌ Error de conexión: ${error.message}`);
    }
  };

  // Guardar (POST o PUT)
  const handleSave = async () => {
    try {
      // Validar JSON antes de guardar
      const processedNodes = processNodesForSave();
      const definicion = { nodes: processedNodes, edges };
      
      let res;
      if (selectedPipelineId) {
        res = await fetch(`${API_BASE_URL}/api/pipelines/${selectedPipelineId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, descripcion, definicion })
        });
      } else {
        res = await fetch(`${API_BASE_URL}/api/pipelines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, descripcion, definicion })
        });
      }
      if (res.ok) {
        setMensaje('Pipeline guardado correctamente');
        // Actualizar el estado local con los nodos procesados
        setNodes(processedNodes);
        fetchPipelines();
      } else setMensaje('Error al guardar');
    } catch (error) {
      setMensaje(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h4>Constructor de Pipeline</h4>
      <div className="mb-3">
        <button className="btn btn-success me-2" onClick={newPipeline}>Nuevo pipeline</button>
        <span className="fw-bold">Pipelines guardados:</span>
        {loading ? <span className="ms-2">Cargando...</span> : (
          pipelines.map(p => (
            <span key={p.id} className="badge bg-secondary ms-2" style={{ cursor: 'pointer' }} onClick={() => loadPipeline(p)}>
              {p.nombre}
              <button className="btn btn-sm btn-danger ms-2" style={{ padding: '0 6px', fontSize: 12 }} onClick={e => { e.stopPropagation(); deletePipeline(p.id); }}>x</button>
            </span>
          ))
        )}
      </div>
      <div className="mb-2">
        {nodeTypes.map((nt) => (
          <button key={nt.type} className="btn btn-outline-primary me-2" onClick={() => addNode(nt.type)}>
            Añadir {nt.label}
          </button>
        ))}
        <button className="btn btn-outline-danger" onClick={deleteNode} disabled={!selectedNode}>
          Eliminar nodo seleccionado
        </button>
      </div>
      <div style={{ height: 350, border: '1px solid #eee', marginBottom: 20 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      {selectedNode && (
        <div className="card mb-3 p-3">
          <h6>Configurar nodo: {getNodeLabel(selectedNode)}</h6>
          <div className="mb-2">
            <label>Tipo:</label>
            <input className="form-control" value={selectedNode.data.type} disabled />
          </div>
          {selectedNode.data.type !== 'transformacion' && (
            <>
              <div className="mb-2">
                <label>URL:</label>
                <input
                  className="form-control"
                  value={selectedNode.data.url || ''}
                  onChange={e => handleNodeChange('url', e.target.value)}
                />
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-2">
                    <label>Método HTTP:</label>
                    <select
                      className="form-control"
                      value={selectedNode.data.method || 'POST'}
                      onChange={e => handleNodeChange('method', e.target.value)}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-2">
                    <label>Tipo de Contenido:</label>
                    <select
                      className="form-control"
                      value={selectedNode.data.contentType || 'application/json'}
                      onChange={e => handleNodeChange('contentType', e.target.value)}
                    >
                      <option value="application/json">application/json</option>
                      <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  {(selectedNode.data.method === 'POST' || selectedNode.data.method === 'PUT' || selectedNode.data.method === 'PATCH') && (
                    <div className="mb-2">
                      <label>Parámetros Body:</label>
                      <textarea
                        className="form-control"
                        rows="6"
                        value={
                          selectedNode.data.paramsBodyRaw || 
                          (selectedNode.data.contentType === 'application/x-www-form-urlencoded' 
                            ? (selectedNode.data.paramsBody || '')
                            : JSON.stringify(selectedNode.data.paramsBody || {}, null, 2))
                        }
                        onChange={e => handleFieldChange('paramsBody', e.target.value)}
                        placeholder={
                          selectedNode.data.contentType === 'application/x-www-form-urlencoded' 
                            ? 'username=user&password=pass&token=abc123' 
                            : '{"username": "user", "password": "pass"}'
                        }
                      />
                    </div>
                  )}
                  {(selectedNode.data.method === 'GET' || selectedNode.data.method === 'DELETE') && (
                    <div className="mb-2">
                      <label>Parámetros Query (para GET) o Headers adicionales:</label>
                      <textarea
                        className="form-control"
                        rows="6"
                        value={
                          selectedNode.data.paramsBodyRaw || 
                          (selectedNode.data.contentType === 'application/x-www-form-urlencoded' 
                            ? (selectedNode.data.paramsBody || '')
                            : JSON.stringify(selectedNode.data.paramsBody || {}, null, 2))
                        }
                        onChange={e => handleFieldChange('paramsBody', e.target.value)}
                        placeholder={
                          selectedNode.data.method === 'GET' 
                            ? 'param1=value1&param2=value2' 
                            : '{"X-Custom-Header": "value"}'
                        }
                      />
                      <small className="text-muted">
                        {selectedNode.data.method === 'GET' 
                          ? 'Para GET: parámetros de query string' 
                          : 'Para DELETE: headers adicionales (JSON)'}
                      </small>
                    </div>
                  )}
                </div>
                <div className="col-md-6">
                  <div className="mb-2">
                    <label>Parámetros Header (JSON):</label>
                    <textarea
                      className="form-control"
                      rows="6"
                      value={selectedNode.data.paramsHeaderRaw || JSON.stringify(selectedNode.data.paramsHeader || {}, null, 2)}
                      onChange={e => handleFieldChange('paramsHeader', e.target.value)}
                      placeholder='{"Authorization": "Bearer 8e0fd88a-a136-30e5-b336-7a0fcb0ad4df", "Content-Type": "application/x-www-form-urlencoded"}'
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          <div className="mb-2">
            <label>Extracción de Respuesta:</label>
            <textarea
              className="form-control"
              rows="5"
              value={selectedNode.data.responseExtractionRaw || selectedNode.data.responseExtraction || ''}
              onChange={e => handleFieldChange('responseExtraction', e.target.value)}
              placeholder={`PHPSESSID=([^&]+)
token=([^&]+)
"access_token":"([^"]+)"`}
            />
            <small className="text-muted">
              <strong>Múltiples extracciones:</strong> Una expresión por línea. Cada línea debe tener un grupo de captura <code>()</code>.<br/>
              <strong>Ejemplos:</strong><br/>
              • <code>PHPSESSID=([^&]+)</code> - Extrae valor de PHPSESSID<br/>
              • <code>token=([^&]+)</code> - Extrae valor de token<br/>
              • <code>"access_token":"([^"]+)"</code> - Extrae access_token de JSON<br/>
              • <code>Bearer ([^\\s]+)</code> - Extrae token Bearer
            </small>
          </div>
          
          {selectedNode.data.type === 'transformacion' && (
            <>
              <div className="mb-2">
                <label>Mapeos Dinámicos (JSON):</label>
                <textarea
                  className="form-control"
                  rows="8"
                  value={selectedNode.data.mapeosRaw || JSON.stringify(selectedNode.data.mapeos || {}, null, 2)}
                  onChange={e => handleFieldChange('mapeos', e.target.value)}
                  placeholder={mapeosPlaceholder}
                />
                <small className="text-muted">
                  <strong>Mapeos dinámicos:</strong> Define múltiples mapeos para diferentes tipos de datos.<br/>
                  <strong>Formato:</strong> <code>"nombre_mapeo": {`{`} "valor_origen": "valor_destino" {`}`}</code><br/>
                  <strong>Ejemplos:</strong><br/>
                  • <code>"profesionales": {`{`} "247201": "MlSev" {`}`}</code> - Mapeo de códigos de profesionales<br/>
                  • <code>"tipos_caso": {`{`} "Fontanero": "PLOMBING" {`}`}</code> - Mapeo de tipos de caso<br/>
                  • <code>"estados": {`{`} "pendiente": "PENDING" {`}`}</code> - Mapeo de estados<br/>
                  <strong>Uso en reglas:</strong> <code>mapeos.profesionales[servicio.Profesional]</code>
                </small>
              </div>
              <div className="mb-2">
                <label>Reglas de Transformación (JSON):</label>
                <textarea
                  className="form-control"
                  rows="8"
                  value={selectedNode.data.transformRulesRaw || JSON.stringify(selectedNode.data.transformRules || {}, null, 2)}
                  onChange={e => handleFieldChange('transformRules', e.target.value)}
                  placeholder="Reglas de transformación JSON"
                />
                                  <small className="text-muted">
                    <strong>Reglas de transformación:</strong> Define cómo transformar cada campo del JSON de entrada.<br/>
                    <strong>Procesamiento:</strong> Se aplica a cada elemento del array <code>Servicios</code> de forma iterativa.<br/>
                    <strong>Variables disponibles:</strong> <code>servicio</code> (objeto individual), <code>mapeos</code> (objeto con todos los mapeos)<br/>
                    <strong>Ejemplos:</strong><br/>
                    • <code>"codigoPostal": "servicio.DistritoPostal.split('-')[0].trim()"</code> - Extrae código postal<br/>
                    • <code>"contractCode": "mapeos.profesionales[servicio.Profesional] || '-'"</code> - Mapea código de profesional<br/>
                    • <code>"tipoCaso": "mapeos.tipos_caso[servicio.Gremio] || 'DEFAULT'"</code> - Mapea tipo de caso<br/>
                    • <code>"estado": "mapeos.estados[servicio.Estado] || 'UNKNOWN'"</code> - Mapea estado<br/>
                    • <code>"clientPhone": "servicio.TelefonoCliente[0]?.Numero || ''"</code> - Primer teléfono del cliente<br/>
                    • <code>"isUrgent": "(servicio.Urgente || '').toUpperCase() === 'SI'"</code> - Convierte a booleano
                  </small>
              </div>
            </>
          )}
          
          <div className="mb-2">
            <label>Variables Disponibles:</label>
            <div className="alert alert-info" style={{ fontSize: '12px' }}>
              <strong>Para usar valores extraídos en otros nodos:</strong><br/>
              • <code>{'{{node1.phpsessid}}'}</code> - Valor extraído del nodo "Login"<br/>
              • <code>{'{{node1.token}}'}</code> - Token extraído del nodo "Login"<br/>
              • <code>{'{{node2.access_token}}'}</code> - Access token del nodo "Consulta"<br/>
              <strong>Ejemplo en URL:</strong> <code>https://api.example.com/data?session={'{{node1.phpsessid}}'}</code><br/>
              <strong>Ejemplo en Header:</strong> <code>{'{"Authorization": "Bearer {{node1.token}}"'}</code>
            </div>
          </div>
        </div>
      )}
      <input className="form-control mb-2" placeholder="Nombre del pipeline" value={nombre} onChange={e => setNombre(e.target.value)} />
      <textarea className="form-control mb-2" placeholder="Descripción" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
      <div className="d-flex gap-2">
        <button className="btn btn-primary" onClick={handleSave}>{selectedPipelineId ? 'Guardar Cambios' : 'Guardar Pipeline'}</button>
        <button className="btn btn-success" onClick={handleTestPipeline} disabled={nodes.length === 0}>
          🚀 Probar Pipeline
        </button>
      </div>
      {mensaje && <div className="alert alert-info mt-2">{mensaje}</div>}
    </div>
  );
} 
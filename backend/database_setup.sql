-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS api_integraciones;
USE api_integraciones;

-- Tabla de cuentas de usuario
CREATE TABLE accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_asignacion DATE 
);

-- Crear tabla de compañías
CREATE TABLE IF NOT EXISTS companias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(100),
    password VARCHAR(255),
    api_token VARCHAR(500), -- Token de API para cada compañía
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar datos iniciales de compañías
INSERT INTO companias (nombre, username, password, api_token) VALUES
('MultiAsistencia Sevilla', '247401', '191817', 'tu_token_api_aqui'),
('MultiAsistencia Madrid', '187801', '191817', 'tu_token_api_aqui'),
('MultiAsistencia Barcelona', '248601', '191817', 'tu_token_api_aqui'),
('MultiAsistencia Málaga', '247301', '191817', 'tu_token_api_aqui'),
('MultiAsistencia Granada', '255701', '191817', 'tu_token_api_aqui'),
('MultiAsistencia Tarragona', '161901', '191817', 'tu_token_api_aqui'),
('MultiAsistencia Girona', '247401', '191817', 'tu_token_api_aqui');

-- Insertar usuario administrador inicial
-- Contraseña: admin123 (hash bcrypt)
INSERT INTO accounts (username, password, role)
VALUES (
    'admin',
    '$2b$10$o29H7HUZa7Z13H6490p7J.A9PAwhLkgAtYJ0OnMVan2/k8RpTduAe',
    'admin'
);

-- Tabla de configuraciones
CREATE TABLE configuraciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_guai VARCHAR(100) NOT NULL,
    password_guai VARCHAR(255) NOT NULL,
    token_bearer TEXT,
    token_refresh TEXT,
    expired_time TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar configuración inicial
INSERT INTO configuraciones (usuario_guai, password_guai)
VALUES ('usuario_inicial', 'password_inicial'); 

-- Tabla de pipelines para flujos visuales
CREATE TABLE pipelines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    definicion JSON NOT NULL,
    programacion JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 

-- Crear tabla de expedientes
CREATE TABLE IF NOT EXISTS expedientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data JSON NOT NULL,
    data_raw TEXT, -- Datos originales extraídos
    status VARCHAR(50) DEFAULT 'pendiente',
    servicio VARCHAR(100),
    fecha_asignacion DATE,
    cliente VARCHAR(100),
    id_unico VARCHAR(200), -- Identificador único cliente_servicio
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_cliente_servicio (id_unico)
);

-- Crear tabla de tareas programadas
CREATE TABLE IF NOT EXISTS tareas_programadas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    compania_id INT NOT NULL,
    intervalo_minutos INT NOT NULL DEFAULT 60,
    activo BOOLEAN DEFAULT TRUE,
    ultima_ejecucion TIMESTAMP NULL,
    proxima_ejecucion TIMESTAMP NULL,
    configuracion JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (compania_id) REFERENCES companias(id) ON DELETE CASCADE
);

-- Crear tabla de logs de tareas
CREATE TABLE IF NOT EXISTS logs_tareas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tarea_id INT NOT NULL,
    estado ENUM('iniciado', 'completado', 'error') NOT NULL,
    mensaje TEXT,
    expedientes_procesados INT DEFAULT 0,
    expedientes_omitidos INT DEFAULT 0,
    tiempo_ejecucion_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tarea_id) REFERENCES tareas_programadas(id) ON DELETE CASCADE
); 
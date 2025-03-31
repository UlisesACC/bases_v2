CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Tabla de especies
CREATE TABLE IF NOT EXISTS especies (
  id_especie SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL
);

-- Tabla de razas
CREATE TABLE IF NOT EXISTS razas (
  id_raza SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  id_especie INTEGER REFERENCES especies(id_especie) ON DELETE CASCADE,
  UNIQUE (nombre, id_especie)
);

-- Tabla de mascotas
CREATE TABLE IF NOT EXISTS mascotas (
  id_mascota SERIAL PRIMARY KEY,
  nombre VARCHAR(50),
  ruac INTEGER,                
  collar BOOLEAN,             
  numero_collar INTEGER,       
  id_raza INTEGER REFERENCES razas(id_raza) ON DELETE SET NULL,
  descripcion TEXT,
  fotografia TEXT,
  fecha_perdida DATE
);


-- Tabla de vacunas
CREATE TABLE IF NOT EXISTS vacunas (
  nombre_cientifico VARCHAR(100) PRIMARY KEY,
  nombre_comun VARCHAR(100) NOT NULL,
  fabricante VARCHAR(100),
  dosis_recomendada INTEGER,
  via_administracion VARCHAR(50),
  edad_minima_meses INTEGER
);

-- Tabla intermedia: mascotas ↔ vacunas
CREATE TABLE IF NOT EXISTS mascotas_vacunas (
  id_mascota INTEGER REFERENCES mascotas(id_mascota) ON DELETE CASCADE,
  nombre_cientifico VARCHAR(100) REFERENCES vacunas(nombre_cientifico) ON DELETE CASCADE,
  fecha_aplicacion DATE,
  PRIMARY KEY (id_mascota, nombre_cientifico)
);
-- Tabla de usuarios registrados
CREATE TABLE IF NOT EXISTS registro_usuario (
  nombre_usuario VARCHAR(30) PRIMARY KEY,
  contrasena TEXT NOT NULL,
  fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Tabla de localidad
CREATE TABLE IF NOT EXISTS localidad (
  id_localidad SERIAL PRIMARY KEY,
  calle VARCHAR(100),
  colonia VARCHAR(100),
  codigo_postal VARCHAR(10)
);
-- Tabla de persona
CREATE TABLE IF NOT EXISTS persona (
  id_persona UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_pila VARCHAR(50) NOT NULL,
  apellido_paterno VARCHAR(50) NOT NULL,
  apellido_materno VARCHAR(50),
  correo_electronico VARCHAR(100) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  id_localidad INTEGER REFERENCES localidad(id_localidad) ON DELETE SET NULL,
  nombre_usuario VARCHAR(30) REFERENCES registro_usuario(nombre_usuario) ON DELETE CASCADE
);

-- Datos base: especies
INSERT INTO especies (nombre) VALUES
  ('Perro'),
  ('Gato')
ON CONFLICT DO NOTHING;

-- Datos base: razas
INSERT INTO razas (nombre, id_especie) VALUES
  ('Labrador', (SELECT id_especie FROM especies WHERE nombre = 'Perro')),
  ('Chihuahua', (SELECT id_especie FROM especies WHERE nombre = 'Perro')),
  ('Pomerania', (SELECT id_especie FROM especies WHERE nombre = 'Perro')),
  ('Chihuahua', (SELECT id_especie FROM especies WHERE nombre = 'Perro')),
  ('Schnauzer', (SELECT id_especie FROM especies WHERE nombre = 'Perro')),
  ('Persa', (SELECT id_especie FROM especies WHERE nombre = 'Gato')),
  ('Siames', (SELECT id_especie FROM especies WHERE nombre = 'Gato'))
ON CONFLICT DO NOTHING;

-- Datos base: vacunas
INSERT INTO vacunas (
  nombre_cientifico,
  nombre_comun,
  fabricante,
  dosis_recomendada,
  via_administracion,
  edad_minima_meses
) VALUES
  (
    'Rabies Virus Vaccine',
    'Vacuna contra la rabia',
    'Zoetis',
    1,
    'Intramuscular',
    3
  ),
  (
    'Canine Parvovirus Vaccine',
    'Vacuna contra el parvovirus',
    'Pfizer',
    3,
    'Subcutánea',
    2
  ),
  (
    'Canine Distemper Vaccine',
    'Vacuna contra el moquillo',
    'Boehringer Ingelheim',
    3,
    'Subcutánea',
    2
  )
ON CONFLICT DO NOTHING;

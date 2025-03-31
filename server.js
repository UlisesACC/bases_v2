require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const PORT = process.env.PORT || 3000;
const {Pool} = require("pg");
//para la subida de fotos
const multer = require('multer');
const upload = multer({ dest: 'uploads/' })
//configurando la base de datos
app.use(express.static(__dirname + '/src/formulario_perdido'));
const db = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB
});
//inicio de sesion
const session = require('express-session');
app.use(session({
  secret: 'huellitas-secret',
  resave: false,
  saveUninitialized: true
}));
//ruta al login
app.get('/login', (req, res) => {
  const error = req.session.error || null;
  req.session.error = null;
  res.render('ingresa_o_registro/login', { error });
});
//ruta de logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});
// org de carpetas
app.set("views", path.join(__dirname, "src"));
//procesamiento de formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
//Conectando a la base de datos
async function conectarDB(reintentos = 5) {
  while (reintentos) {
    try {
      await db.connect();
      console.log('🟢 Conectado a PostgreSQL');
      return db;
    } catch (err) {
      console.log(`🔁 Reintentando conexión a PostgreSQL... (${5 - reintentos + 1})`);
      reintentos--;
      await new Promise(res => setTimeout(res, 2000)); // espera 2 segundos
    }
  }

  console.error('❌ No se pudo conectar a PostgreSQL después de varios intentos');
  process.exit(1);
}
//ruta principal
app.get('/', async (req, res) => {
  const mascotas = await db.query('SELECT * FROM mascotas');
  const usuario = req.session?.usuario || null;
  res.render('inicio/index', { usuario, mascotas: mascotas.rows });
});
// Configurar EJS como motor de plantillas
app.set("view engine", "ejs");
// Ruta para renderizar el de registro
app.get('/registro', (req, res) => {
  res.render('ingresa_o_registro/registro');
});
// Ruta para renderizar el archivo perdido.ejs
app.get('/', async (req, res) => {
    try {
      const especies = await db.query('SELECT * FROM especies');
      const vacunas = await db.query('SELECT * FROM vacunas');
      res.render('perdido', {
        especies: especies.rows,
        vacunas: vacunas.rows
      });
    } catch (error) {
      console.error("❌ Error al cargar datos:", error);
      res.status(500).send("Error interno");
    }
  });

  app.get('/perdido', async (req, res) => {
    try {
      const especies = await db.query('SELECT * FROM especies');
      const vacunas = await db.query('SELECT * FROM vacunas');
      res.render('formulario_perdido/perdido', {
        especies: especies.rows,
        vacunas: vacunas.rows
      });
    } catch (error) {
      console.error("❌ Error al cargar /perdido:", error);
      res.status(500).send("Error interno al cargar el formulario");
    }
  });
  
//consulta de las especies
/*
app.get("/", async (req, res) => {
  const especies = await db.query("SELECT * FROM especies");
  res.render("perdido", { especies: especies.rows });
});
*/

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


// Consulta para obtener las razas por especie
app.get("/razas/:id_especie", async (req, res) => {
  const { id_especie } = req.params;
  const razas = await db.query("SELECT * FROM razas WHERE id_especie = $1", [
    id_especie,
  ]);
  res.json(razas.rows);
});
// Consulta para dar de alta una mascota
app.post('/registrar', upload.single('fotografia'), async (req, res) => {
    const { nombre, id_raza, descripcion, fecha_perdida, ruac, collar, numero_collar } = req.body;
    const vacunas = req.body.vacunas; // puede ser undefined, string o array
  
    const fotografia = req.file ? req.file.path : null;
  
    try {
      const mascotaResult = await db.query(
        `INSERT INTO mascotas 
         (nombre, id_raza, descripcion, fotografia, fecha_perdida, ruac, collar, numero_collar)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id_mascota`,
        [nombre, id_raza, descripcion, fotografia, fecha_perdida, ruac || null, collar === "true", numero_collar || null]
      );     

      const id_mascota = mascotaResult.rows[0].id_mascota;
  
      // Normaliza vacunas a array
      const vacunasSeleccionadas = Array.isArray(vacunas) ? vacunas : (vacunas ? [vacunas] : []);
  
      for (const nombre_cientifico of vacunasSeleccionadas) {
        await db.query(
          `INSERT INTO mascotas_vacunas (id_mascota, nombre_cientifico, fecha_aplicacion)
           VALUES ($1, $2, CURRENT_DATE)`,
          [id_mascota, nombre_cientifico]
        );
      }
  
      res.send("✅ Mascota registrada con sus vacunas.");
    } catch (err) {
      console.error("❌ Error al registrar mascota:", err);
      res.status(500).send("Error al registrar mascota");
    }
  });
//guardar los datos del usuario
app.post('/registrar-usuario', async (req, res) => {
  const {
    nombre_pila,
    apellido_paterno,
    apellido_materno,
    correo_electronico,
    telefono,
    calle,
    colonia,
    codigo_postal,
    nombre_usuario,
    contrasena
  } = req.body;

  try {
    // 1. Insertar en registro_usuario
    await db.query(`
      INSERT INTO registro_usuario (nombre_usuario, contrasena)
      VALUES ($1, $2)
    `, [nombre_usuario, contrasena]);

    // 2. Insertar en localidad
    const localidadResult = await db.query(`
      INSERT INTO localidad (calle, colonia, codigo_postal)
      VALUES ($1, $2, $3)
      RETURNING id_localidad
    `, [calle, colonia, codigo_postal]);

    const id_localidad = localidadResult.rows[0].id_localidad;

    // 3. Insertar en persona
    await db.query(`
      INSERT INTO persona (
        nombre_pila, apellido_paterno, apellido_materno,
        correo_electronico, telefono, id_localidad, nombre_usuario
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      nombre_pila, apellido_paterno, apellido_materno || null,
      correo_electronico, telefono, id_localidad, nombre_usuario
    ]);

    res.redirect('/login');
  } catch (error) {
    console.error('❌ Error al registrar usuario:', error);
    res.status(500).send('Error al registrar usuario');
  }
});

//validacion de credenciales
app.post('/login', async (req, res) => {
  const { nombre_usuario, contrasena } = req.body;

  try {
    const result = await db.query(
      'SELECT * FROM registro_usuario WHERE nombre_usuario = $1 AND contrasena = $2',
      [nombre_usuario, contrasena]
    );

    if (result.rows.length === 1) {
      req.session.usuario = nombre_usuario;
      res.redirect('/');
    } else {
      req.session.error = 'Nombre de usuario o contraseña incorrectos.';
      res.redirect('/login');
    }
  } catch (error) {
    console.error('❌ Error en inicio de sesión:', error);
    req.session.error = 'Hubo un error al intentar iniciar sesión.';
    res.redirect('/login');
  }
});


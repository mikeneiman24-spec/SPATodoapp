const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Crear tabla si no existe
pool.query(`
  CREATE TABLE IF NOT EXISTS log_entries (
    id SERIAL PRIMARY KEY,
    content VARCHAR(255) NOT NULL,
    priority VARCHAR(10) DEFAULT 'normal',
    resolved BOOLEAN DEFAULT false,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// ========== CRUD ==========

// CREATE - Registrar entrada de bitácora
app.post('/api/logs', async (req, res) => {
  try {
    const { content, priority } = req.body;
    const result = await pool.query(
      'INSERT INTO log_entries (content, priority, resolved) VALUES ($1, $2, false) RETURNING *',
      [content, priority || 'normal']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ - Obtener todas las entradas
app.get('/api/logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM log_entries ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE - Actualizar entrada (contenido, prioridad o estado)
app.put('/api/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, priority, resolved } = req.body;
    const result = await pool.query(
      'UPDATE log_entries SET content = $1, priority = $2, resolved = $3 WHERE id = $4 RETURNING *',
      [content, priority, resolved, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Eliminar entrada
app.delete('/api/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM log_entries WHERE id = $1', [id]);
    res.json({ message: 'Entrada eliminada del registro' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Server listen
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Mission log backend running on port ${PORT}`);
});

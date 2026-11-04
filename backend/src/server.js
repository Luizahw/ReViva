require('dotenv').config();
const express = require('express');
const usuariosRoutes = require('./routes/usuariosRoutes');
const { pool } = require('./database/conexao');

const app = express();
app.use(express.json({ limit: '10kb' }));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api/usuarios', usuariosRoutes);
app.use((req, res) => res.status(404).json({ mensagem: 'Rota não encontrada.' }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(err);
  return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
});

const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Configure as variáveis obrigatórias no .env: ${missing.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET deve ter pelo menos 32 caracteres.');
  process.exit(1);
}

const port = Number(process.env.PORT) || 3000;
pool.getConnection()
  .then((connection) => {
    connection.release();
    app.listen(port, () => console.log(`API ReViva disponível em http://localhost:${port}`));
  })
  .catch((error) => {
    console.error('Não foi possível conectar ao MySQL. Verifique o .env e execute sql/schema.sql.', error.message);
    process.exit(1);
  });

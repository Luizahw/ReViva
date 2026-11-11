import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import usuariosRoutes from '../routes/usuariosRoutes.js';
import reciclagensRoutes from '../routes/reciclagensRoutes.js';
import catalogoRoutes from '../routes/catalogoRoutes.js';
import { pool } from '../database/conexao.js';

const ausentes = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'].filter((nome) => !process.env[nome]);
if (ausentes.length) { console.error(`Configure no arquivo .env: ${ausentes.join(', ')}.`); process.exit(1); }
if (process.env.JWT_SECRET.length < 32) { console.error('JWT_SECRET deve ter pelo menos 32 caracteres.'); process.exit(1); }

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10kb' }));
app.get('/', (req, res) => res.status(200).json({ mensagem: 'API ReViva funcionando!' }));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/reciclagens', reciclagensRoutes);
app.use('/api', catalogoRoutes);
app.use((req, res) => res.status(404).json({ mensagem: 'Rota não encontrada.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) return res.status(400).json({ mensagem: 'O corpo da requisição contém JSON inválido.' });
  console.error(error);
  return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
});

const porta = Number(process.env.PORT) || 3300;
try {
  const conexao = await pool.getConnection();
  conexao.release();
  app.listen(porta, () => console.log(`API ReViva disponível em http://localhost:${porta}`));
} catch (error) {
  console.error('Não foi possível conectar ao MySQL. Confira DB_* e se o serviço está ativo.');
  console.error(`Código do erro: ${error.code || 'desconhecido'}`);
  process.exit(1);
}

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import usuariosRoutes from './routes/usuariosRoutes.js';
import { pool } from './database/conexao.js';

const variaveisObrigatorias = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const ausentes = variaveisObrigatorias.filter((nome) => !process.env[nome]);

if (ausentes.length > 0) {
  console.error(`Configure no arquivo .env: ${ausentes.join(', ')}.`);
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET deve ter pelo menos 32 caracteres.');
  process.exit(1);
}

const app = express();
const origemPermitida = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: origemPermitida }));
app.use(express.json({ limit: '10kb' }));
app.get('/', (req, res) => res.status(200).json({ mensagem: 'API ReViva funcionando!' }));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api/usuarios', usuariosRoutes);
app.use((req, res) => res.status(404).json({ mensagem: 'Rota não encontrada.' }));
app.use((erro, req, res, next) => {
  if (res.headersSent) return next(erro);
  if (erro instanceof SyntaxError && erro.status === 400 && 'body' in erro) {
    return res.status(400).json({ mensagem: 'O corpo da requisição contém JSON inválido.' });
  }
  console.error(erro);
  return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
});

const porta = Number(process.env.PORT) || 3000;

try {
  const conexao = await pool.getConnection();
  conexao.release();
  app.listen(porta, () => {
    console.log(`API ReViva disponível em http://localhost:${porta}`);
  });
} catch (erro) {
  console.error('Não foi possível conectar ao MySQL. Confira as variáveis DB_* e se o serviço está ativo.');
  console.error(`Código do erro: ${erro.code || 'desconhecido'}`);
  process.exit(1);
}

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../database/conexao.js';

const arquivo = fileURLToPath(new URL('../../sql/migrations/001_plataforma.sql', import.meta.url));
const conteudo = await readFile(arquivo, 'utf8');
const comandos = conteudo.split(';').map((comando) => comando.trim()).filter(Boolean);

try {
  const conexao = await pool.getConnection();
  try {
    for (const comando of comandos) await conexao.query(comando);
    console.log('Migração 001 aplicada. Tabelas adicionais e dados de jornada conferidos.');
  } finally { conexao.release(); }
} finally { await pool.end(); }

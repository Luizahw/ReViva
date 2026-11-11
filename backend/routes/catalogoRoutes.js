import express from 'express';
import { pool } from '../database/conexao.js';

const router = express.Router();
router.get('/materiais', async (req, res, next) => {
  try {
    const [materiais] = await pool.execute('SELECT id_material, nome, descricao, pontos_por_kg FROM materiais ORDER BY nome');
    return res.status(200).json({ materiais });
  } catch (error) { return next(error); }
});
router.get('/pontos', async (req, res, next) => {
  try {
    const [pontos] = await pool.execute('SELECT id_ponto, nome, endereco, cidade, descricao FROM pontos_coleta ORDER BY cidade, nome');
    return res.status(200).json({ pontos });
  } catch (error) { return next(error); }
});
export default router;

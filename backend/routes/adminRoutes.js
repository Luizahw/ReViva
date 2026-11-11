import express from 'express';
import { autenticar, exigirAdministrador } from '../middlewares/usuariosMiddleware.js';
import {
  indicadoresAdmin, criarMaterial, atualizarMaterial, excluirMaterial,
  criarPonto, atualizarPonto, excluirPonto, listarRecompensasAdmin,
  salvarRecompensa, excluirRecompensa, listarTodosResgates
} from '../controllers/adminController.js';
import { listarTodasDoacoes, atualizarStatusDoacao } from '../controllers/doacoesController.js';
import { atualizarStatusResgate } from '../controllers/recompensasController.js';

const router = express.Router();
router.use(autenticar, exigirAdministrador);
router.get('/indicadores', indicadoresAdmin);
router.post('/materiais', criarMaterial);
router.put('/materiais/:id', atualizarMaterial);
router.delete('/materiais/:id', excluirMaterial);
router.post('/pontos', criarPonto);
router.put('/pontos/:id', atualizarPonto);
router.delete('/pontos/:id', excluirPonto);
router.get('/recompensas', listarRecompensasAdmin);
router.post('/recompensas', salvarRecompensa);
router.put('/recompensas/:id', salvarRecompensa);
router.delete('/recompensas/:id', excluirRecompensa);
router.get('/resgates', listarTodosResgates);
router.patch('/resgates/:id/status', atualizarStatusResgate);
router.get('/doacoes', listarTodasDoacoes);
router.patch('/doacoes/:id/status', atualizarStatusDoacao);
export default router;

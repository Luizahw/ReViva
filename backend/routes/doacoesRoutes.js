import express from 'express';
import { autenticar } from '../middlewares/usuariosMiddleware.js';
import { criarDoacao, listarMinhasDoacoes } from '../controllers/doacoesController.js';

const router = express.Router();
router.use(autenticar);
router.get('/', listarMinhasDoacoes);
router.post('/', criarDoacao);
export default router;

import express from 'express';
import { autenticar } from '../middlewares/usuariosMiddleware.js';
import { listar, consultar, criar, atualizar, excluir, resumo } from '../controllers/reciclagensController.js';

const router = express.Router();
router.use(autenticar);
router.get('/resumo', resumo);
router.get('/', listar);
router.get('/:id', consultar);
router.post('/', criar);
router.put('/:id', atualizar);
router.delete('/:id', excluir);

export default router;

import express from 'express';
import { autenticar } from '../middlewares/usuariosMiddleware.js';
import { listarRecompensas, resgatarRecompensa, listarResgates } from '../controllers/recompensasController.js';

const router = express.Router();
router.use(autenticar);
router.get('/', listarRecompensas);
router.get('/resgates', listarResgates);
router.post('/:id/resgatar', resgatarRecompensa);
export default router;

import express from 'express';
import { autenticar } from '../middlewares/usuariosMiddleware.js';
import { consultarJornada, consultarRanking } from '../controllers/jornadaController.js';

const router = express.Router();
router.use(autenticar);
router.get('/', consultarJornada);
router.get('/ranking', consultarRanking);
export default router;

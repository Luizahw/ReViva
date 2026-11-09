import express from 'express';
import { cadastrar, login, perfil } from '../controllers/usuariosController.js';
import { autenticar, exigirAdministrador } from '../middlewares/usuariosMiddleware.js';

const router = express.Router();

router.post('/cadastro', cadastrar);
router.post('/login', login);
router.get('/me', autenticar, perfil);
// Rota demonstrativa para verificar a autorização, sem CRUD administrativo.
router.get('/admin', autenticar, exigirAdministrador, (req, res) => {
  res.status(200).json({ mensagem: 'Acesso de administrador autorizado.' });
});

export default router;

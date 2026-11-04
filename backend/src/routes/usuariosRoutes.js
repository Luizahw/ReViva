const express = require('express');
const { cadastrar, login, perfil } = require('../controllers/usuariosController');
const { autenticar, exigirAdministrador } = require('../middlewares/usuariosMiddleware');

const router = express.Router();

router.post('/cadastro', cadastrar);
router.post('/login', login);
router.get('/me', autenticar, perfil);
// Rota demonstrativa para verificar a autorização, sem CRUD administrativo.
router.get('/admin', autenticar, exigirAdministrador, (req, res) => {
  res.status(200).json({ mensagem: 'Acesso de administrador autorizado.' });
});

module.exports = router;

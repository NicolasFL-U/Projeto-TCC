const express = require('express');
const usuarioController = require('../controllers/usuarioController');
const router = express.Router();
const path = require('path');

router.get('/cadastrar', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/cadastro.html'));
});

router.post('/validar', usuarioController.cadastrarUsuario);

module.exports = router;
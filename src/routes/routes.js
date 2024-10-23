const express = require('express');
const Usuario = require('../models/usuario');

const usuarioController = require('../controllers/usuarioController');
const partidaController = require('../controllers/partidaController');
const vodController = require('../controllers/vodController');
const metaController = require('../controllers/metaController');

const router = express.Router();
const path = require('path');

// Cadastro
router.get('/cadastrar', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/cadastro.html'));
});
router.post('/validarCadastro', usuarioController.cadastrarUsuario);

// Login
router.get('/logar', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/login.html'));
});
router.post('/validarLogin', usuarioController.logarUsuario);

// Partidas
router.get('/partidas', partidaController.mostrarPartidas);
router.post('/atualizarPartidas', partidaController.atualizarPartidas);
router.get('/dadosUsuario', async (req, res) => {
    const puuid = req.session.puuid;

    if (!puuid) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    try {
        const usuarioModel = new Usuario();
        const dadosUsuario = await usuarioModel.encontrarDadosGeraisUsuario(puuid);

        if (dadosUsuario) {
            res.json(dadosUsuario);
        } else {
            res.status(500).json({ error: 'Erro ao obter os dados do usuário' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro interno ao buscar os dados do usuário' });
    }
});
router.post('/salvarVod', vodController.salvarVOD);

// VODs
router.get('/vod/:id', vodController.mostrarVod);
router.get('/api/vod/:id/tags-comentarios', vodController.buscarTagsComentarios);
router.post('/alterarVisibilidadeVod', vodController.alterarVisibilidadeVod);
router.post('/adicionarTag', vodController.adicionarTag);
router.post('/adicionarComentario', vodController.adicionarComentario);
router.put('/editarItem/:id', vodController.editarItem);
router.delete('/removerItem/:id', vodController.removerItem);

// Metas
router.get('/metas', metaController.mostrarMetas);
router.get('/obterMetas', metaController.obterMetas);
router.post('/adicionarMeta', metaController.adicionarMeta);
router.post('/removerMeta', metaController.removerMeta);
router.post('/atualizarMetas', metaController.atualizarMetas);
router.post('/alterarMetaEspecifica', metaController.alterarMetaEspecifica);
router.post('/atualizarStatusMetaLivre', metaController.atualizarStatusMetaLivre);
router.get('/obterCampeoes', metaController.obterCampeoes);

// Logoff
router.post('/logoff', usuarioController.deslogarUsuario);

module.exports = router;
const express = require('express');
const Usuario = require('../models/usuario');

const db = require('../database');

const usuarioController = require('../controllers/usuarioController');
const partidaController = require('../controllers/partidaController');
const vodController = require('../controllers/vodController');

const router = express.Router();
const path = require('path');

router.get('/cadastrar', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/cadastro.html'));
});

router.post('/validarCadastro', usuarioController.cadastrarUsuario);

router.get('/logar', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/login.html'));
});

router.post('/validarLogin', usuarioController.logarUsuario);

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

router.get('/vod/:id', vodController.mostrarVod);

router.get('/api/vod/:id/tags-comentarios', vodController.buscarTagsComentarios);

router.post('/alterarVisibilidadeVod', async (req, res) => {
    const { link_vod, vod_publica } = req.body;
    
    try {
        // Converte o valor do checkbox em booleano
        const isPublic = vod_publica === 'on' ? true : false;

        // Query para atualizar a visibilidade da VOD no banco de dados
        const query = `
            UPDATE partidas
            SET vod_publica = $1
            WHERE link_vod = $2
        `;
        const values = [isPublic, link_vod];
        
        // Executa a query no banco de dados
        await db.query(query, values);

        // Redireciona de volta para a página da VOD após salvar
        res.redirect(`/vod/${link_vod}`);
    } catch (error) {
        console.error('Erro ao alterar visibilidade da VOD:', error);
        res.status(500).send('Erro ao alterar visibilidade da VOD.');
    }
});

router.post('/adicionarTag', vodController.adicionarTag);

router.post('/adicionarComentario', vodController.adicionarComentario);

router.post('/logoff', usuarioController.deslogarUsuario);

module.exports = router;
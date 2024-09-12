const express = require('express');
const Usuario = require('../models/usuario');

const db = require('../database');

const usuarioController = require('../controllers/usuarioController');
const partidaController = require('../controllers/partidaController');

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

router.post('/salvarVod', async (req, res) => {
    const { partida_id, link_vod } = req.body;
    const puuid = req.session.puuid;

    try {
        const query = `
            UPDATE partidas
            SET link_vod = $1
            WHERE id_partida = $2 AND puuid = $3
        `;
        const values = [link_vod, partida_id, puuid];

        await db.query(query, values);

        res.status(200).send('VOD salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar o VOD:', error.message);
        res.status(500).send('Erro ao salvar o VOD.');
    }
});

router.post('/logoff', usuarioController.deslogarUsuario);

module.exports = router;
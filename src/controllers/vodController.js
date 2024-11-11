const Vod = require('../models/vod');
const db = require('../database');
const axios = require('axios');

exports.salvarVOD = async (req, res) => {
    const { partida_id, link_vod } = req.body;
    const puuid = req.session.puuid;

    try {
        const result = await Vod.salvarVOD(partida_id, link_vod, puuid);
        res.status(200).json(result);
    } catch (error) {
        if (error.message.includes('Link inválido')) {
            res.status(400).json({ error: error.message });
        } else if (error.message.includes('associado a outra partida')) {
            res.status(409).json({ error: error.message });
        } else if (error.message.includes('não foi encontrado no YouTube')) {
            res.status(404).json({ error: error.message });
        } else {
            console.error('Erro ao salvar o VOD:', error.message);
            res.status(500).json({ error: 'Erro ao salvar o VOD.' });
        }
    }
};

exports.mostrarVod = async (req, res) => {
    // Verifica se o usuário está logado
    if (!req.session.puuid) {
        return res.redirect('/logar');
    }

    const { id } = req.params;
    const puuid = req.session.puuid;

    try {
        // Busca e valida os dados da VOD usando o modelo
        const { vodDados, isDono } = await Vod.buscarVodComValidacao(id, puuid);

        // Renderizar a página de review e passa o parâmetro 'isDono'
        res.render('vod', {
            vod: vodDados,  // Passa os dados da VOD para a página de review
            isDono: isDono  // Indica se o usuário é o dono da VOD
        });
    } catch (error) {
        if (error.message === 'VOD não encontrada') {
            return res.render('erro', {
                mensagem: `A VOD para esta partida não existe!`,
                instrucoes: `Para adicionar uma VOD a uma partida, vá para a página de partidas`,
                linkTexto: 'Partidas',
                linkDestino: '/partidas'
            });
        } else if (error.message === 'Acesso não autorizado') {
            return res.render('erro', {
                mensagem: `Você não tem acesso a esta VOD.`,
                instrucoes: `Caso possível, contate o dono da partida e peça para o mesmo liberar o acesso público.`,
                linkTexto: 'Voltar',
                linkDestino: '/partidas'
            });
        } else {
            console.error('Erro ao buscar os dados da VOD:', error.message);
            res.status(500).send('Erro ao carregar a VOD.');
        }
    }
};

exports.alterarVisibilidadeVod = async (req, res) => {
    const { link_vod, vod_publica } = req.body;
    const puuid = req.session.puuid; // Obtém o PUUID da sessão do usuário

    try {
        // Converte o valor do checkbox em booleano
        const isPublic = vod_publica === 'on';

        // Chama o método do modelo para alterar a visibilidade
        await Vod.alterarVisibilidade(link_vod, puuid, isPublic);

        // Redireciona de volta para a página da VOD após salvar
        res.redirect(`/vod/${link_vod}`);
    } catch (error) {
        if (error.message === 'Partida não encontrada') {
            res.status(404).send('Partida não encontrada.');
        } else if (error.message === 'Permissão negada para alterar a visibilidade desta VOD') {
            res.status(403).send('Você não tem permissão para alterar a visibilidade desta VOD.');
        } else {
            console.error('Erro ao alterar visibilidade da VOD:', error.message);
            res.status(500).send('Erro ao alterar visibilidade da VOD.');
        }
    }
};

exports.adicionarTag = async (req, res) => {
    const io = require('../server').io;

    try {
        const { link_vod, tag, inicio, fim, cor } = req.body;
        const puuidSession = req.session.puuid;

        const novaTag = await Vod.adicionarTag({ link_vod, tag, inicio, fim, cor, puuidSession });

        // Emitir o evento para todos os clientes conectados
        io.to(link_vod).emit('novaTag', novaTag);

        res.status(201).json({ message: 'Tag adicionada com sucesso.' });
    } catch (error) {
        if (error.message.includes('Parâmetros inválidos')) {
            return res.status(400).json({ error: error.message });
        } else if (error.message.includes('Tempos de início e fim inválidos')) {
            return res.status(400).json({ error: error.message });
        } else if (error.message.includes('Partida não encontrada')) {
            return res.status(404).json({ error: error.message });
        } else if (error.message.includes('Permissão negada')) {
            return res.status(403).json({ error: error.message });
        } else if (error.message.includes('Já existe uma TAG')) {
            return res.status(409).json({ error: error.message });
        } else {
            console.error('Erro ao adicionar tag:', error.message);
            return res.status(500).json({ error: 'Ocorreu um erro ao processar sua solicitação.' });
        }
    }
};

exports.adicionarComentario = async (req, res) => {
    const io = require('../server').io;

    try {
        const { link_vod, comentario, inicio, fim } = req.body;
        const puuidSession = req.session.puuid;

        const novoComentario = await Vod.adicionarComentario({ link_vod, comentario, inicio, fim, puuidSession });

        // Emitir o evento para todos os clientes conectados
        io.to(link_vod).emit('novoComentario', novoComentario);

        res.status(201).json({ message: 'Comentário adicionado com sucesso.' });
    } catch (error) {
        if (error.message.includes('Parâmetros inválidos')) {
            return res.status(400).json({ error: error.message });
        } else if (error.message.includes('Tempos de início e fim inválidos')) {
            return res.status(400).json({ error: error.message });
        } else if (error.message.includes('Partida não encontrada')) {
            return res.status(404).json({ error: error.message });
        } else if (error.message.includes('Permissão negada')) {
            return res.status(403).json({ error: error.message });
        } else if (error.message.includes('Conflito de tempo')) {
            return res.status(409).json({ error: error.message });
        } else {
            console.error('Erro ao adicionar comentário:', error.message);
            return res.status(500).json({ error: 'Ocorreu um erro ao processar sua solicitação.' });
        }
    }
};

exports.buscarTagsComentarios = async (req, res) => {
    const { id } = req.params; // ID da VOD

    try {
        // Chama o método do modelo para buscar tags e comentários
        const { tags, comentarios } = await Vod.buscarTagsComentarios(id);

        // Retorna as tags e os comentários em formato JSON
        res.status(200).json({ tags, comentarios });
    } catch (error) {
        console.error('Erro ao buscar tags e comentários:', error.message);
        res.status(500).json({ error: 'Erro ao buscar tags e comentários.' });
    }
};

// Função para editar uma tag ou comentário
exports.editarItem = async (req, res) => {
    const io = require('../server').io;
    const { id } = req.params;
    const { nome, inicio, fim, cor, link_vod, tipo } = req.body;
    const puuidSession = req.session.puuid;

    try {
        const itemEditado = await Vod.editarItem({ id, nome, inicio, fim, cor, link_vod, tipo, puuidSession });

        // Emitir o evento para todos os clientes conectados
        io.to(link_vod).emit('atualizarItem', itemEditado);

        res.status(200).json({ message: 'Item editado com sucesso!' });
    } catch (error) {
        if (error.message.includes('Parâmetros inválidos')) {
            return res.status(400).json({ error: error.message });
        } else if (error.message.includes('Tempos de início e fim inválidos')) {
            return res.status(400).json({ error: error.message });
        } else if (error.message.includes('Cor inválida')) {
            return res.status(400).json({ error: error.message });
        } else if (error.message.includes('Partida não encontrada')) {
            return res.status(404).json({ error: error.message });
        } else if (error.message.includes('Permissão negada')) {
            return res.status(403).json({ error: error.message });
        } else if (error.message.includes('Conflito de tempo')) {
            return res.status(409).json({ error: error.message });
        } else if (error.message.includes('Item não encontrado')) {
            return res.status(404).json({ error: error.message });
        } else {
            console.error('Erro ao editar item:', error.message);
            return res.status(500).json({ error: 'Erro ao editar item.' });
        }
    }
};

// Função para remover uma tag ou comentário
exports.removerItem = async (req, res) => {
    const io = require('../server').io;
    const { id } = req.params;
    const { link_vod, tipo } = req.body;

    try {
        const itemRemovido = await Vod.removerItem({ id, link_vod, tipo });

        // Emitindo o evento de remoção para os clientes conectados ao VOD
        io.to(link_vod).emit('removerItem', itemRemovido);

        res.status(200).json({ message: 'Item removido com sucesso!' });
    } catch (error) {
        if (error.message.includes('Tipo inválido')) {
            return res.status(400).json({ error: error.message });
        } else if (error.message.includes('Item não encontrado')) {
            return res.status(404).json({ error: error.message });
        } else {
            console.error('Erro ao remover item:', error.message);
            return res.status(500).json({ error: 'Erro ao remover item.' });
        }
    }
};


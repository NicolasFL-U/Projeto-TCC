const Vod = require('../models/vod');
const db = require('../database');

exports.salvarVOD = async (req, res) => {
    const { partida_id, link_vod } = req.body;
    const puuid = req.session.puuid;

    // Expressão regular para validar o formato do link do YouTube e capturar o ID do vídeo
    const youtubeRegex = /^https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:[&?].*)?$/;

    // Verifica se o link segue o formato correto
    const match = link_vod.match(youtubeRegex);

    if (!match) {
        // Se o link não for válido, ignorar e retornar um erro
        return res.status(400).send('Link inválido. O link deve seguir o formato https://www.youtube.com/watch?v=[id]');
    }

    // Se o link for válido, extrair o ID do vídeo e sanitizar removendo caracteres inválidos
    let videoId = match[1];

    // Sanitização: manter apenas letras, números, traço (-) e sublinhado (_)
    videoId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');

    try {
        // Query para atualizar a partida com o ID do VOD (em vez de todo o link)
        const query = `
            UPDATE partidas
            SET link_vod = $1
            WHERE id_partida = $2 AND puuid = $3
        `;
        const values = [videoId, partida_id, puuid];

        // Executa a query de atualização
        await db.query(query, values);

        // Retorna uma resposta de sucesso
        res.status(200).send('VOD salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar o VOD:', error.message);
        res.status(500).send('Erro ao salvar o VOD.');
    }
};

exports.mostrarVod = async (req, res) => {
    // Verifica se o usuário está logado
    if (!req.session.puuid) {
        return res.redirect('/logar');
    }

    const { id } = req.params;
    const puuid = req.session.puuid;

    // Instancia um novo objeto VOD com o ID da VOD
    const vod = new Vod(id);

    try {
        // Busca os dados da VOD com base no ID e no PUUID
        const vodDados = await vod.buscarDadosVod(puuid);

        // Caso não exista nenhuma VOD com esses parâmetros
        if (!vodDados) {
            return res.render('erro', {
                mensagem: `A VOD para esta partida não existe!`,
                instrucoes: `Para adicionar uma VOD à uma partida, vá para a página de partidas`,
                linkTexto: 'Partidas',
                linkDestino: '/partidas'
            });
        }

        // Verifica se o puuid da sessão não é o mesmo do dono da VOD e se a VOD não é pública
        if (vodDados.puuid !== puuid && !vodDados.vod_publica) {
            return res.render('erro', {
                mensagem: `Você não tem acesso à esta VOD.`,
                instrucoes: `Caso possível, contate o dono da partida e peça para o mesmo liberar o acesso público.`,
                linkTexto: 'Voltar',
                linkDestino: '/partidas'
            });
        }

        // Se for o dono da VOD ou a VOD for pública, renderizar a página de review
        res.render('vod', {
            vod: vodDados // Passa os dados da VOD para a página de review
        });
    } catch (error) {
        console.error('Erro ao buscar os dados da VOD:', error.message);
        res.status(500).send('Erro ao carregar a VOD.');
    }
};

exports.adicionarTag = async (req, res) => {
    console.log(req.body);
    
    try {
        const { link_vod, tag, inicio, fim, cor } = req.body;
        const puuidSession = req.session.puuid;

        if (link_vod == '' || tag == '' || inicio == '' || fim == '' || cor == '' || !puuidSession) {
            return res.status(400).json({ error: 'Parâmetros inválidos ou incompletos. Preencha os campos adequadamente.' });
        }

        let tagName = tag.trim();
        if (tagName.length > 30) {
            tagName = tagName.substring(0, 30);
        }

        const inicioInt = parseInt(inicio, 10);
        const fimInt = parseInt(fim, 10);
        if (isNaN(inicioInt) || isNaN(fimInt) || inicioInt >= fimInt) {
            return res.status(400).json({ error: 'O tempo de início deve ser menor que o tempo de fim.' });
        }

        const coresValidas = ['bd4a4a', 'bd844a', 'ffff4f', '6fff4f'];
        let corValida = cor;
        if (!coresValidas.includes(cor)) {
            corValida = 'bd4a4a';
        }

        const queryPartida = `SELECT puuid, vod_publica FROM partidas WHERE link_vod = $1`;
        const { rows: partidas } = await db.query(queryPartida, [link_vod]);
        const partida = partidas[0];

        if (!partida) {
            return res.status(404).json({ error: 'Partida não encontrada.' });
        }

        if (partida.puuid !== puuidSession && !partida.vod_publica) {
            return res.status(403).json({ error: 'Você não tem permissão para adicionar uma tag a esta VOD.' });
        }

        const queryTags = `SELECT inicio, fim FROM tags WHERE link_vod = $1`;
        const { rows: tags } = await db.query(queryTags, [link_vod]);

        for (let tagExistente of tags) {
            if (
                (inicioInt >= tagExistente.inicio && inicioInt <= tagExistente.fim) ||
                (fimInt >= tagExistente.inicio && fimInt <= tagExistente.fim) ||
                (inicioInt <= tagExistente.inicio && fimInt >= tagExistente.fim)
            ) {
                return res.status(409).json({ error: 'Já existe uma TAG que ocupa o mesmo ou parte do periodo de tempo escolhido.' });
            }
        }

        const insertTagQuery = `
            INSERT INTO tags (link_vod, tag, inicio, fim, cor)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await db.query(insertTagQuery, [link_vod, tagName, inicioInt, fimInt, corValida]);

        // Emitir o evento para todos os clientes conectados
        const io = require('../server').io; // Importa o io de server.js
        io.emit('novaTag', { link_vod, tag: tagName, inicio: inicioInt, fim: fimInt, cor: corValida });

        return res.status(201).json({ message: 'Tag adicionada com sucesso.' });

    } catch (error) {
        console.error('Erro ao adicionar tag:', error);
        return res.status(500).json({ error: 'Ocorreu um erro ao processar sua solicitação.' });
    }
};

exports.adicionarComentario = async (req, res) => {
    console.log(req.body);

    try {
        const { link_vod, comentario, inicio, fim } = req.body;
        const puuidSession = req.session.puuid;

        if (link_vod == '' || comentario == '' || inicio == '' || fim == '' || !puuidSession) {
            return res.status(400).json({ error: 'Parâmetros inválidos ou incompletos. Preencha os campos adequadamente.' });
        }

        let comentarioLimpo = comentario.trim();
        if (comentarioLimpo.length > 200) {
            comentarioLimpo = comentarioLimpo.substring(0, 200);
        }

        const inicioInt = parseInt(inicio, 10);
        const fimInt = parseInt(fim, 10);
        if (isNaN(inicioInt) || isNaN(fimInt) || inicioInt >= fimInt) {
            return res.status(400).json({ error: 'O tempo de início deve ser menor que o tempo de fim.' });
        }

        const queryPartida = `SELECT puuid, vod_publica FROM partidas WHERE link_vod = $1`;
        const { rows: partidas } = await db.query(queryPartida, [link_vod]);
        const partida = partidas[0];

        if (!partida) {
            return res.status(404).json({ error: 'Partida não encontrada.' });
        }

        if (partida.puuid !== puuidSession && !partida.vod_publica) {
            return res.status(403).json({ error: 'Você não tem permissão para adicionar um comentário a esta VOD.' });
        }

        const queryComentarios = `SELECT inicio, fim FROM comentarios WHERE link_vod = $1`;
        const { rows: comentarios } = await db.query(queryComentarios, [link_vod]);

        for (let comentarioExistente of comentarios) {
            if (
                (inicioInt >= comentarioExistente.inicio && inicioInt <= comentarioExistente.fim) ||
                (fimInt >= comentarioExistente.inicio && fimInt <= comentarioExistente.fim) ||
                (inicioInt <= comentarioExistente.inicio && fimInt >= comentarioExistente.fim)
            ) {
                return res.status(409).json({ error: 'Conflito de tempo com um comentário existente.' });
            }
        }

        const insertComentarioQuery = `
            INSERT INTO comentarios (link_vod, comentario, inicio, fim)
            VALUES ($1, $2, $3, $4)
        `;
        await db.query(insertComentarioQuery, [link_vod, comentarioLimpo, inicioInt, fimInt]);

        // Emitir o evento para todos os clientes conectados
        const io = require('../server').io; // Importa o io de server.js
        io.emit('novoComentario', { link_vod, comentario: comentarioLimpo, inicio: inicioInt, fim: fimInt });

        return res.status(201).json({ message: 'Comentário adicionado com sucesso.' });

    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        return res.status(500).json({ error: 'Ocorreu um erro ao processar sua solicitação.' });
    }
};

// Função para buscar as tags e os comentários de uma VOD específica
exports.buscarTagsComentarios = async (req, res) => {
    const { id } = req.params; // ID da VOD
    try {
        // Buscar todas as tags e comentários do banco com base no link_vod
        const tagsQuery = `SELECT tag, inicio, fim, cor FROM tags WHERE link_vod = $1`;
        const comentariosQuery = `SELECT comentario, inicio, fim FROM comentarios WHERE link_vod = $1`;

        const { rows: tags } = await db.query(tagsQuery, [id]);
        const { rows: comentarios } = await db.query(comentariosQuery, [id]);

        // Retornar as tags e os comentários em formato JSON
        return res.status(200).json({ tags, comentarios });
    } catch (error) {
        console.error('Erro ao buscar tags e comentários:', error);
        return res.status(500).json({ error: 'Erro ao buscar tags e comentários.' });
    }
};

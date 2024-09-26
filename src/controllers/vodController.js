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
    try {
        const { link_vod, tag, inicio, fim, cor } = req.body;
        const puuidSession = req.session.puuid; // Pegue o puuid do usuário da sessão

        console.log('Dados recebidos:', link_vod, tag, inicio, fim, cor, puuidSession);

        if (link_vod == '' || tag == '' || inicio == '' || fim == '' || cor == '' || !puuidSession) {
            return res.status(400).json({ error: 'Parâmetros inválidos ou incompletos. Preencha os campos adequadamente.' });
        }

        // 1 - Validar e limpar os dados:
        // 1.1 - Cortar qualquer caractere acima de 30 do nome da tag
        let tagName = tag.trim();
        if (tagName.length > 30) {
            tagName = tagName.substring(0, 30); // Limita a tag para no máximo 30 caracteres
        }

        // 1.2 - Validar o tempo (inicio deve ser menor que fim)
        const inicioInt = parseInt(inicio, 10);
        const fimInt = parseInt(fim, 10);
        if (isNaN(inicioInt) || isNaN(fimInt) || inicioInt >= fimInt) {
            return res.status(400).json({ error: 'O tempo de início deve ser menor que o tempo de fim.' });
        }

        // 1.3 - Validar a cor (verificar se está entre as cores válidas)
        const coresValidas = ['bd4a4a', 'bd844a', 'ffff4f', '6fff4f'];
        let corValida = cor;
        if (!coresValidas.includes(cor)) {
            corValida = 'bd4a4a'; // Definir para vermelho se for inválida
        }

        // 1.4 - Validar que o linkVod existe e que o usuário tem permissão.
        const queryPartida = `SELECT puuid, vod_publica FROM partidas WHERE link_vod = $1`;
        const { rows: partidas } = await db.query(queryPartida, [link_vod]);
        const partida = partidas[0];

        if (!partida) {
            return res.status(404).json({ error: 'Partida não encontrada.' });
        }

        // 1.4.1, 1.4.2, 1.4.3 - Verificar permissão do usuário
        if (partida.puuid !== puuidSession && !partida.vod_publica) {
            return res.status(403).json({ error: 'Você não tem permissão para adicionar uma tag a esta VOD.' });
        }

        // 2 - Validar que não haverá conflitos.
        // 2.1 - Pesquisar todas as tags com o link_vod atual e validar sobreposição
        const queryTags = `SELECT inicio, fim FROM tags WHERE link_vod = $1`;
        const { rows: tags } = await db.query(queryTags, [link_vod]);

        for (let i = 0; i < tags.length; i++) {
            const tagExistente = tags[i];
            // Verificar se a nova tag sobrepõe alguma tag existente
            if (
                (inicioInt >= tagExistente.inicio && inicioInt <= tagExistente.fim) || // Novo início dentro de tag existente
                (fimInt >= tagExistente.inicio && fimInt <= tagExistente.fim) || // Novo fim dentro de tag existente
                (inicioInt <= tagExistente.inicio && fimInt >= tagExistente.fim) // Nova tag engloba a tag existente
            ) {
                return res.status(409).json({ error: 'Já existe uma TAG que ocupa o mesmo ou parte do periodo de tempo escolhido.' });
            }
        }

        // 3 - Caso tudo der certo, salvar no banco a tag nova.
        const insertTagQuery = `
            INSERT INTO tags (link_vod, tag, inicio, fim, cor)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await db.query(insertTagQuery, [link_vod, tagName, inicioInt, fimInt, corValida]);

        // 4 - Retornar a informação do processo
        return res.status(201).json({ message: 'Tag adicionada com sucesso.' });

    } catch (error) {
        console.error('Erro ao adicionar tag:', error);
        return res.status(500).json({ error: 'Ocorreu um erro ao processar sua solicitação.' });
    }
};

exports.adicionarComentario = async (req, res) => {
    try {
        const { link_vod, comentario, inicio, fim } = req.body;
        const puuidSession = req.session.puuid; // Pegue o puuid do usuário da sessão

        // 1 - Validar e limpar os dados:

        // 1.1 - Verificar se todos os parâmetros obrigatórios estão presentes
        if (link_vod == '' || comentario == '' || inicio == '' || fim == '' || !puuidSession) {
            return res.status(400).json({ error: 'Parâmetros inválidos ou incompletos. Preencha os campos adequadamente.' });
        }

        // 1.2 - Cortar qualquer caractere acima de 200 do comentário
        let comentarioLimpo = comentario.trim();
        if (comentarioLimpo.length > 200) {
            comentarioLimpo = comentarioLimpo.substring(0, 200); // Limita o comentário para no máximo 200 caracteres
        }

        // 1.3 - Validar o tempo (inicio deve ser menor que fim)
        const inicioInt = parseInt(inicio, 10);
        const fimInt = parseInt(fim, 10);
        if (isNaN(inicioInt) || isNaN(fimInt) || inicioInt >= fimInt) {
            return res.status(400).json({ error: 'O tempo de início deve ser menor que o tempo de fim.' });
        }

        // 1.4 - Validar que o linkVod existe e que o usuário tem permissão.
        const queryPartida = `SELECT puuid, vod_publica FROM partidas WHERE link_vod = $1`;
        const { rows: partidas } = await db.query(queryPartida, [link_vod]);
        const partida = partidas[0];

        if (!partida) {
            return res.status(404).json({ error: 'Partida não encontrada.' });
        }

        // 1.4.1, 1.4.2, 1.4.3 - Verificar permissão do usuário
        if (partida.puuid !== puuidSession && !partida.vod_publica) {
            return res.status(403).json({ error: 'Você não tem permissão para adicionar um comentário a esta VOD.' });
        }

        // 2 - Validar que não haverá conflitos.
        // 2.1 - Pesquisar todos os comentários com o link_vod atual e validar sobreposição
        const queryComentarios = `SELECT inicio, fim FROM comentarios WHERE link_vod = $1`;
        const { rows: comentarios } = await db.query(queryComentarios, [link_vod]);

        for (let i = 0; i < comentarios.length; i++) {
            const comentarioExistente = comentarios[i];
            // Verificar se o novo comentário sobrepõe algum comentário existente
            if (
                (inicioInt >= comentarioExistente.inicio && inicioInt <= comentarioExistente.fim) || // Novo início dentro de comentário existente
                (fimInt >= comentarioExistente.inicio && fimInt <= comentarioExistente.fim) || // Novo fim dentro de comentário existente
                (inicioInt <= comentarioExistente.inicio && fimInt >= comentarioExistente.fim) // Novo comentário engloba o comentário existente
            ) {
                return res.status(409).json({ error: 'Conflito de tempo com um comentário existente.' });
            }
        }

        // 3 - Caso tudo der certo, salvar no banco o comentário novo.
        const insertComentarioQuery = `
            INSERT INTO comentarios (link_vod, comentario, inicio, fim)
            VALUES ($1, $2, $3, $4)
        `;
        await db.query(insertComentarioQuery, [link_vod, comentarioLimpo, inicioInt, fimInt]);

        // 4 - Retornar a informação do processo
        return res.status(201).json({ message: 'Comentário adicionado com sucesso.', inicio: inicioInt });

    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        return res.status(500).json({ error: 'Ocorreu um erro ao processar sua solicitação.' });
    }
};

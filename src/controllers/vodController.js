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

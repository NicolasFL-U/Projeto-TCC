const { obterMetasEspecificas,
        obterMetasLivres,
        adicionarMetaEspecifica,
        adicionarMetaLivre,
        atualizarProgressoMetaEspecifica,
        atualizarStatusMetaLivre,
        alterarMetaEspecifica,
        removerMetaEspecifica,
        removerMetaLivre } = require('../models/meta');

const path = require('path');
const fs = require('fs');
const db = require('../database');

exports.mostrarMetas = (req, res) => {
    const email = req.session.email; // Assumindo que o e-mail está salvo na sessão
    const usuario = req.session.puuid; // Assumindo que o PUUID está salvo na sessão
    const logado = req.session.logado; // Assumindo que a informação de login está salva na sessão

    if (!logado || !email || !usuario) {
        return res.redirect('/logar');
    }

    res.render('metas');
};

exports.obterMetas = async (req, res) => {
    const puuid = req.session.puuid;
    if (!puuid) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    try {
        // Obtendo as metas específicas e livres
        const metasEspecificas = await obterMetasEspecificas(puuid);
        const metasLivres = await obterMetasLivres(puuid);

        // Retorna um JSON com ambas as listas de metas em um formato padronizado
        res.json({
            especificas: metasEspecificas,
            livres: metasLivres
        });
    } catch (error) {
        console.error('Erro ao obter metas:', error);
        res.status(500).json({ error: 'Erro ao obter metas' });
    }
};

exports.adicionarMeta = async (req, res) => {
    const { tipo, nome, tipoMeta, objetivo, limite } = req.body;
    const puuid = req.session.puuid;

    if (!puuid) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    try {
        let novaMeta;

        if (tipo === 'especifica') {
            if (!tipoMeta || !objetivo) {
                throw new Error('Parâmetros inválidos para a meta específica');
            }
            novaMeta = await adicionarMetaEspecifica(puuid, tipoMeta, objetivo, limite);
        } else if (tipo === 'livre') {
            if (!nome) {
                throw new Error('Parâmetro "nome" é obrigatório para meta livre');
            }
            novaMeta = await adicionarMetaLivre(puuid, nome);
        } else {
            throw new Error('Tipo de meta inválido');
        }

        res.status(200).json({ message: 'Meta adicionada com sucesso', meta: novaMeta });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.atualizarMetas = async (req, res) => {
    const puuid = req.session.puuid;

    if (!puuid) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    try {
        // Buscar todas as metas específicas do usuário
        const metasQuery = await db.query('SELECT id FROM metas_especificas WHERE puuid = $1', [puuid]);
        const idsMetas = metasQuery.rows.map(meta => meta.id);

        // Atualizar o progresso de cada meta específica
        const atualizacoes = idsMetas.map(id => atualizarProgressoMetaEspecifica(id));
        const resultados = await Promise.all(atualizacoes);

        res.status(200).json({ message: 'Metas atualizadas com sucesso', metasAtualizadas: resultados });
    } catch (error) {
        console.error('Erro ao atualizar metas:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.alterarMetaEspecifica = async (req, res) => {
    const puuid = req.session.puuid;
    const { idMeta, novoObjetivo, novoLimite } = req.body;  // Incluindo novoLimite

    // Verificar se o usuário está autenticado
    if (!puuid) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Validação dos dados
    if (isNaN(parseFloat(novoObjetivo)) || parseFloat(novoObjetivo) <= 0) {
        return res.status(400).json({ error: 'O objetivo deve ser um número válido maior que 0' });
    }

    if (novoLimite && (isNaN(parseInt(novoLimite)) || parseInt(novoLimite) <= 0)) {
        return res.status(400).json({ error: 'O limite deve ser um número válido maior que 0, se fornecido' });
    }

    try {
        // Chamar a função de alteração da meta específica, passando também o limite
        const metaAtualizada = await alterarMetaEspecifica(
            idMeta, 
            parseFloat(novoObjetivo), 
            novoLimite ? parseInt(novoLimite) : null,  // Passar o novo limite se ele existir
            puuid
        );

        // Responder com a meta atualizada
        res.status(200).json({
            message: 'Meta atualizada com sucesso',
            meta: metaAtualizada
        });
    } catch (error) {
        console.error('Erro ao atualizar meta específica:', error);
        res.status(500).json({ error: error.message });
    }
};

// Controller para atualizar o status de uma meta livre
exports.atualizarStatusMetaLivre = async (req, res) => {
    const { idMeta } = req.body;  // Id da meta passada no corpo da requisição
    const puuid = req.session.puuid;  // PUUID do usuário logado na sessão

    if (!puuid) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    try {
        // Chama a função do model para atualizar o status da meta
        const metaAtualizada = await atualizarStatusMetaLivre(idMeta, puuid);

        res.status(200).json({ message: 'Status da meta atualizado com sucesso', meta: metaAtualizada });
    } catch (error) {
        console.error('Erro ao atualizar status da meta livre:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.removerMeta = async (req, res) => {
    const { tipo, id } = req.body;
    const puuid = req.session.puuid;

    if (!puuid) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    try {
        let metaExcluida;
        
        // Verificar o tipo de meta
        if (tipo === 'especifica') {
            metaExcluida = await removerMetaEspecifica(id, puuid);
        } else if (tipo === 'livre') {
            metaExcluida = await removerMetaLivre(id, puuid);
        } else {
            throw new Error('Tipo de meta inválido');
        }

        res.status(200).json({ message: 'Meta excluída com sucesso', metaExcluida });
    } catch (error) {
        console.error('Erro ao excluir meta:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.obterCampeoes = (req, res) => {
    const filePath = path.join(__dirname, '../utils/champion.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Erro ao ler o arquivo de campeões:', err);
            return res.status(500).json({ error: 'Erro ao carregar lista de campeões' });
        }

        try {
            const champions = JSON.parse(data);

            // Verifique se "champions.data" existe corretamente
            if (!champions.data) {
                throw new Error('Formato inválido no arquivo de campeões');
            }

            const championList = Object.keys(champions.data).sort();  // Pega os nomes dos campeões e ordena alfabeticamente
            res.status(200).json({ campeoes: championList });  // Certifique-se de que está enviando a chave correta 'campeoes'
        } catch (parseError) {
            console.error('Erro ao analisar o JSON de campeões:', parseError);
            res.status(500).json({ error: 'Erro ao processar lista de campeões' });
        }
    });
};
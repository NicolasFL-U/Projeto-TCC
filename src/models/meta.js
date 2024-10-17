const db = require('../database');
const axios = require('axios');
const champions = require('../utils/champion.json');

// Função para obter metas específicas
async function obterMetasEspecificas(puuid) {
    const query = `
        SELECT id, 'especifica' AS tipo, tipo_meta, objetivo, limite_partidas, progresso_atual, descricao
        FROM metas_especificas
        WHERE puuid = $1
        ORDER BY data_criacao DESC;
    `;
    const { rows } = await db.query(query, [puuid]);
    return rows.map(row => ({
        ...row,
        tipo: row.tipo_meta === 'objetivo_elo' ? 'objetivo_elo' : 'especifica'
    }));
}

// Função para obter metas livres
async function obterMetasLivres(puuid) {
    const query = `
        SELECT id, 'livre' AS tipo, nome_meta, status
        FROM metas_livres
        WHERE puuid = $1
        ORDER BY data_criacao DESC;
    `;
    const { rows } = await db.query(query, [puuid]);
    return rows;
}

async function adicionarMetaEspecifica(puuid, tipo, objetivo, limite = null) {
    let progressoAtual = 0;
    let descricao = '';

    // Mapeamento de rotas para termos comuns
    const rotaMap = {
        'TOP': 'TopLane',
        'JUNGLE': 'Jungle',
        'MIDDLE': 'MidLane',
        'BOTTOM': 'AdCarry',
        'UTILITY': 'Suporte'
    };

    // Mapeamento de elos para português
    const eloMap = [
        'Sem ranking', 'Ferro IV', 'Ferro III', 'Ferro II', 'Ferro I',
        'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I',
        'Prata IV', 'Prata III', 'Prata II', 'Prata I',
        'Ouro IV', 'Ouro III', 'Ouro II', 'Ouro I',
        'Platina IV', 'Platina III', 'Platina II', 'Platina I',
        'Diamante IV', 'Diamante III', 'Diamante II', 'Diamante I',
        'Mestre', 'Grão-mestre', 'Desafiante'
    ];

    try {
        switch (tipo) {
            case 'partidas_total':
                if (objetivo <= 0 || objetivo >= 100000 || limite !== null) throw new Error('Parâmetros inválidos para meta do tipo "partidas totais"');
                const partidasTotal = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1', [puuid]);
                progressoAtual = partidasTotal.rows[0].count;
                descricao = `Jogar ${objetivo} partidas`;
                break;

            case (tipo.match(/^partidas_campeao_/) || {}).input:
                const campeao = tipo.replace('partidas_campeao_', '');
                if (!champions.data[campeao] || objetivo <= 0 || objetivo >= 100000 || limite !== null) throw new Error('Parâmetros inválidos para meta do tipo "partidas com campeao"');
                const partidasCampeao = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1 AND campeao = $2', [puuid, campeao]);
                progressoAtual = partidasCampeao.rows[0].count;
                descricao = `Jogar ${objetivo} partidas de ${campeao}`;
                break;

            case (tipo.match(/^partidas_rota_/) || {}).input:
                const rota = tipo.replace('partidas_rota_', '').toUpperCase();
                if (!['BOTTOM', 'JUNGLE', 'TOP', 'UTILITY', 'MIDDLE'].includes(rota) || objetivo <= 0 || objetivo >= 100000 || limite !== null) throw new Error('Parâmetros inválidos para meta do tipo "partidas na rota"');
                const partidasRota = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1 AND rota = $2', [puuid, rota]);
                progressoAtual = partidasRota.rows[0].count;
                // Ajustando a descrição com base na rota
                if (rota === 'BOTTOM' || rota === 'UTILITY') {
                    descricao = `Jogar ${objetivo} partidas de ${rotaMap[rota]}`;
                } else {
                    descricao = `Jogar ${objetivo} partidas na ${rotaMap[rota]}`;
                }
                break;

            case 'media_cs':
                if (objetivo <= 0.0 || objetivo > 10.0 || limite <= 0 || limite >= 100000) throw new Error('Parâmetros inválidos para meta do tipo "media de cs"');
                const mediaCsQuery = await db.query(
                    `SELECT SUM((totalMinionsKilled + neutralMinionsKilled) / (duracao / 60)) / $1 as media_cs 
                     FROM (SELECT * FROM partidas WHERE puuid = $2 ORDER BY data_partida DESC LIMIT $1) as ultimas_partidas`,
                    [limite, puuid]
                );
                progressoAtual = mediaCsQuery.rows[0].media_cs || 0;
                descricao = `Alcançar a média de ${objetivo} CS/min nas últimas ${limite} partidas`;
                break;

            case 'media_wr':
                if (objetivo <= 0.0 || objetivo > 100.0 || limite <= 0 || limite >= 100000) throw new Error('Parâmetros inválidos para meta do tipo "media de wr"');
                const mediaWrQuery = await db.query(
                    `SELECT COUNT(*) FILTER (WHERE resultado = 'Vitória') * 100.0 / COUNT(*) as winrate
                     FROM (SELECT * FROM partidas WHERE puuid = $1 ORDER BY data_partida DESC LIMIT $2) as ultimas_partidas`,
                    [puuid, limite]
                );
                progressoAtual = mediaWrQuery.rows[0].winrate || 0;
                descricao = `Alcançar a média de ${objetivo}% de winrate nas últimas ${limite} partidas`;
                break;

            case 'objetivo_elo':
                if (objetivo <= 0 || objetivo > 27 || limite !== null) throw new Error('Parâmetros inválidos para meta do tipo "objetivo de elo"');
                const summonerIdQuery = await db.query('SELECT summoner_id FROM jogadores WHERE puuid = $1', [puuid]);
                const summonerId = summonerIdQuery.rows[0]?.summoner_id;
                if (!summonerId) throw new Error('Summoner ID não encontrado para este jogador');
                
                const riotApiUrl = `https://br1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
                const response = await axios.get(riotApiUrl, {
                    headers: { 'X-Riot-Token': process.env.RIOT_API_KEY }
                });
                const rankData = response.data.find(entry => entry.queueType === 'RANKED_SOLO_5x5');
                progressoAtual = mapEloToNumber(rankData?.tier, rankData?.rank);
                // Ajustando a descrição para exibir o elo em português
                descricao = `Alcançar o Elo ${eloMap[objetivo]}`;
                break;

            case 'vod_reviews':
                if (objetivo <= 0 || objetivo >= 100000 || limite !== null) throw new Error('Parâmetros inválidos para tipo "vod_reviews"');
                const vodReviewsQuery = await db.query(
                    `SELECT COUNT(DISTINCT p.link_vod) as reviews
                     FROM partidas p 
                     JOIN tags t ON p.link_vod = t.link_vod OR p.link_vod = (SELECT link_vod FROM comentarios WHERE link_vod = p.link_vod)
                     WHERE p.puuid = $1 AND p.link_vod IS NOT NULL`,
                    [puuid]
                );
                progressoAtual = vodReviewsQuery.rows[0].reviews || 0;
                descricao = `Realizar ${objetivo} VOD reviews`;
                break;

            default:
                throw new Error('Tipo de meta específica não reconhecido');
        }

        // Inserir a meta específica na tabela
        const insertQuery = `
            INSERT INTO metas_especificas (puuid, tipo_meta, objetivo, limite_partidas, progresso_atual, descricao)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const result = await db.query(insertQuery, [puuid, tipo, objetivo, limite, progressoAtual, descricao]);
        return result.rows[0];
    } catch (error) {
        console.error('Erro ao adicionar meta específica:', error);
        throw new Error('Erro ao adicionar meta específica');
    }
}

async function atualizarProgressoMetaEspecifica(idMeta) {
    try {
        // Obter informações da meta com base no ID
        const metaQuery = await db.query('SELECT * FROM metas_especificas WHERE id = $1', [idMeta]);
        const meta = metaQuery.rows[0];
        if (!meta) throw new Error('Meta não encontrada');

        const { puuid, tipo_meta: tipo, objetivo, limite_partidas: limite } = meta;
        let progressoAtual = 0;

        // Lógica de cálculo do progresso baseada no tipo
        switch (tipo) {
            case 'partidas_total':
                const partidasTotal = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1', [puuid]);
                progressoAtual = partidasTotal.rows[0].count;
                break;

            case (tipo.match(/^partidas_campeao_/) || {}).input:
                const campeao = tipo.replace('partidas_campeao_', '');
                const partidasCampeao = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1 AND campeao = $2', [puuid, campeao]);
                progressoAtual = partidasCampeao.rows[0].count;
                break;

            case (tipo.match(/^partidas_rota_/) || {}).input:
                const rota = tipo.replace('partidas_rota_', '').toUpperCase();
                const partidasRota = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1 AND rota = $2', [puuid, rota]);
                progressoAtual = partidasRota.rows[0].count;
                break;

            case 'media_cs':
                const mediaCsQuery = await db.query(
                    `SELECT SUM((totalMinionsKilled + neutralMinionsKilled) / (duracao / 60)) / $1 as media_cs 
                     FROM (SELECT * FROM partidas WHERE puuid = $2 ORDER BY data_partida DESC LIMIT $1) as ultimas_partidas`,
                    [limite, puuid]
                );
                progressoAtual = mediaCsQuery.rows[0].media_cs || 0;
                break;

            case 'media_wr':
                const mediaWrQuery = await db.query(
                    `SELECT COUNT(*) FILTER (WHERE resultado = 'Vitória') * 100.0 / COUNT(*) as winrate
                     FROM (SELECT * FROM partidas WHERE puuid = $1 ORDER BY data_partida DESC LIMIT $2) as ultimas_partidas`,
                    [puuid, limite]
                );
                progressoAtual = mediaWrQuery.rows[0].winrate || 0;
                break;

            case 'objetivo_elo':
                const summonerIdQuery = await db.query('SELECT summoner_id FROM jogadores WHERE puuid = $1', [puuid]);
                const summonerId = summonerIdQuery.rows[0]?.summoner_id;
                if (!summonerId) throw new Error('Summoner ID não encontrado para este jogador');
                
                const riotApiUrl = `https://br1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
                const response = await axios.get(riotApiUrl, {
                    headers: { 'X-Riot-Token': process.env.RIOT_API_KEY }
                });
                const rankData = response.data.find(entry => entry.queueType === 'RANKED_SOLO_5x5');
                progressoAtual = mapEloToNumber(rankData?.tier, rankData?.rank);
                break;

            case 'vod_reviews':
                const vodReviewsQuery = await db.query(
                    `SELECT COUNT(DISTINCT p.link_vod) as reviews
                     FROM partidas p 
                     JOIN tags t ON p.link_vod = t.link_vod OR p.link_vod = (SELECT link_vod FROM comentarios WHERE link_vod = p.link_vod)
                     WHERE p.puuid = $1 AND p.link_vod IS NOT NULL`,
                    [puuid]
                );
                progressoAtual = vodReviewsQuery.rows[0].reviews || 0;
                break;

            default:
                throw new Error('Tipo de meta específica não reconhecido');
        }

        // Atualizar o progresso na tabela
        const updateQuery = `
            UPDATE metas_especificas 
            SET progresso_atual = $1
            WHERE id = $2
            RETURNING *;
        `;
        const result = await db.query(updateQuery, [progressoAtual, idMeta]);
        return result.rows[0];
        
    } catch (error) {
        console.error('Erro ao atualizar progresso da meta específica:', error);
        throw new Error('Erro ao atualizar progresso da meta específica');
    }
}

async function alterarMetaEspecifica(idMeta, novoObjetivo, puuid) {
    try {
        // Verificar se a meta existe e pertence ao usuário
        const metaQuery = await db.query(
            'SELECT * FROM metas_especificas WHERE id = $1 AND puuid = $2',
            [idMeta, puuid]
        );
        const meta = metaQuery.rows[0];
        if (!meta) {
            throw new Error('Meta não encontrada ou usuário não autorizado');
        }

        // Validar o novo objetivo conforme o tipo de meta
        const tipo = meta.tipo_meta;
        const limite = meta.limite_partidas;
        let progressoAtual = 0;
        let descricao = '';

        switch (tipo) {
            case 'partidas_total':
                if (novoObjetivo <= 0 || novoObjetivo >= 100000) throw new Error('Objetivo inválido para meta do tipo "partidas totais"');
                const partidasTotal = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1', [puuid]);
                progressoAtual = partidasTotal.rows[0].count;
                descricao = `Jogar ${novoObjetivo} partidas`;
                break;

            case (tipo.match(/^partidas_campeao_/) || {}).input:
                const campeao = tipo.replace('partidas_campeao_', '');
                if (!champions.data[campeao] || novoObjetivo <= 0 || novoObjetivo >= 100000) throw new Error('Objetivo inválido para meta do tipo "partidas com campeao"');
                const partidasCampeao = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1 AND campeao = $2', [puuid, campeao]);
                progressoAtual = partidasCampeao.rows[0].count;
                descricao = `Jogar ${novoObjetivo} partidas de ${campeao}`;
                break;

            case (tipo.match(/^partidas_rota_/) || {}).input:
                const rota = tipo.replace('partidas_rota_', '').toUpperCase();
                if (!['BOTTOM', 'JUNGLE', 'TOP', 'UTILITY', 'MIDDLE'].includes(rota) || novoObjetivo <= 0 || novoObjetivo >= 100000) throw new Error('Objetivo inválido para meta do tipo "partidas na rota"');
                const partidasRota = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1 AND rota = $2', [puuid, rota]);
                progressoAtual = partidasRota.rows[0].count;
                descricao = rota === 'BOTTOM' || rota === 'UTILITY' ? `Jogar ${novoObjetivo} partidas de ${rotaMap[rota]}` : `Jogar ${novoObjetivo} partidas na ${rotaMap[rota]}`;
                break;

            case 'media_cs':
                if (novoObjetivo <= 0.0 || novoObjetivo > 10.0 || limite <= 0 || limite >= 100000) throw new Error('Objetivo inválido para meta do tipo "media de cs"');
                const mediaCsQuery = await db.query(
                    `SELECT SUM((totalMinionsKilled + neutralMinionsKilled) / (duracao / 60)) / $1 as media_cs 
                     FROM (SELECT * FROM partidas WHERE puuid = $2 ORDER BY data_partida DESC LIMIT $1) as ultimas_partidas`,
                    [limite, puuid]
                );
                progressoAtual = mediaCsQuery.rows[0].media_cs || 0;
                descricao = `Alcançar a média de ${novoObjetivo} CS/min nas últimas ${limite} partidas`;
                break;

            case 'media_wr':
                if (novoObjetivo <= 0.0 || novoObjetivo > 100.0 || limite <= 0 || limite >= 100000) throw new Error('Objetivo inválido para meta do tipo "media de wr"');
                const mediaWrQuery = await db.query(
                    `SELECT COUNT(*) FILTER (WHERE resultado = 'Vitória') * 100.0 / COUNT(*) as winrate
                     FROM (SELECT * FROM partidas WHERE puuid = $1 ORDER BY data_partida DESC LIMIT $2) as ultimas_partidas`,
                    [puuid, limite]
                );
                progressoAtual = mediaWrQuery.rows[0].winrate || 0;
                descricao = `Alcançar a média de ${novoObjetivo}% de winrate nas últimas ${limite} partidas`;
                break;

            case 'objetivo_elo':
                if (novoObjetivo <= 0 || novoObjetivo > 27) throw new Error('Objetivo inválido para meta do tipo "objetivo de elo"');
                const summonerIdQuery = await db.query('SELECT summoner_id FROM jogadores WHERE puuid = $1', [puuid]);
                const summonerId = summonerIdQuery.rows[0]?.summoner_id;
                if (!summonerId) throw new Error('Summoner ID não encontrado para este jogador');

                const riotApiUrl = `https://br1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
                const response = await axios.get(riotApiUrl, {
                    headers: { 'X-Riot-Token': process.env.RIOT_API_KEY }
                });
                const rankData = response.data.find(entry => entry.queueType === 'RANKED_SOLO_5x5');
                progressoAtual = mapEloToNumber(rankData?.tier, rankData?.rank);
                descricao = `Alcançar o Elo ${eloMap[novoObjetivo]}`;
                break;

            case 'vod_reviews':
                if (novoObjetivo <= 0 || novoObjetivo >= 100000) throw new Error('Objetivo inválido para meta do tipo "vod_reviews"');
                const vodReviewsQuery = await db.query(
                    `SELECT COUNT(DISTINCT p.link_vod) as reviews
                     FROM partidas p 
                     JOIN tags t ON p.link_vod = t.link_vod OR p.link_vod = (SELECT link_vod FROM comentarios WHERE link_vod = p.link_vod)
                     WHERE p.puuid = $1 AND p.link_vod IS NOT NULL`,
                    [puuid]
                );
                progressoAtual = vodReviewsQuery.rows[0].reviews || 0;
                descricao = `Realizar ${novoObjetivo} VOD reviews`;
                break;

            default:
                throw new Error('Tipo de meta específica não reconhecido');
        }

        // Atualizar a meta com o novo objetivo e progresso calculado
        const updateQuery = `
            UPDATE metas_especificas 
            SET objetivo = $1, progresso_atual = $2, descricao = $3 
            WHERE id = $4 AND puuid = $5
            RETURNING *;
        `;
        const result = await db.query(updateQuery, [novoObjetivo, progressoAtual, descricao, idMeta, puuid]);
        return result.rows[0];
    } catch (error) {
        console.error('Erro ao alterar meta específica:', error);
        throw new Error('Erro ao alterar meta específica');
    }
}

async function removerMetaEspecifica(idMeta, puuid) {
    try {
        // Verificar se a meta existe e se o puuid corresponde
        const metaQuery = await db.query('SELECT puuid FROM metas_especificas WHERE id = $1', [idMeta]);
        const meta = metaQuery.rows[0];
        if (!meta) throw new Error('Meta não encontrada');

        // Verificar se o puuid corresponde ao do jogador
        if (meta.puuid !== puuid) {
            throw new Error('Permissão negada: PUUID não corresponde ao dono da meta');
        }

        // Excluir a meta
        const deleteQuery = 'DELETE FROM metas_especificas WHERE id = $1 RETURNING *';
        const result = await db.query(deleteQuery, [idMeta]);
        if (result.rowCount === 0) throw new Error('Erro ao excluir a meta');

        return { message: 'Meta excluída com sucesso', metaExcluida: result.rows[0] };
    } catch (error) {
        console.error('Erro ao excluir meta específica:', error);
        throw new Error(error.message);
    }
}

async function adicionarMetaLivre(puuid, nomeMeta) {
    try {
        // Verificar o comprimento do nome da meta
        if (nomeMeta.length > 100) throw new Error('O nome da meta deve ter no máximo 100 caracteres');
        
        // Inserir a nova meta livre com status padrão como `false`
        const insertQuery = `
            INSERT INTO metas_livres (puuid, nome_meta, status)
            VALUES ($1, $2, false)
            RETURNING *
        `;
        const result = await db.query(insertQuery, [puuid, nomeMeta]);
        return result.rows[0];
    } catch (error) {
        console.error('Erro ao adicionar meta livre:', error);
        throw new Error('Erro ao adicionar meta livre');
    }
}

async function atualizarStatusMetaLivre(idMeta, puuid) {
    try {
        // Buscar a meta pelo id e verificar o `puuid`
        const metaQuery = await db.query('SELECT puuid, status FROM metas_livres WHERE id = $1', [idMeta]);
        const meta = metaQuery.rows[0];
        if (!meta) throw new Error('Meta não encontrada');

        // Verificar se o `puuid` é o do jogador que está tentando alterar a meta
        if (meta.puuid !== puuid) {
            throw new Error('Permissão negada: PUUID não corresponde ao dono da meta');
        }

        // Inverter o status atual
        const novoStatus = !meta.status;

        // Atualizar o status na tabela
        const updateQuery = 'UPDATE metas_livres SET status = $1 WHERE id = $2 RETURNING *';
        const result = await db.query(updateQuery, [novoStatus, idMeta]);
        
        return result.rows[0];
    } catch (error) {
        console.error('Erro ao atualizar status da meta livre:', error);
        throw new Error('Erro ao atualizar status da meta livre');
    }
}

async function removerMetaLivre(idMeta, puuid) {
    try {
        // Verificar se a meta existe e se o `puuid` corresponde ao dono
        const metaQuery = await db.query('SELECT puuid FROM metas_livres WHERE id = $1', [idMeta]);
        const meta = metaQuery.rows[0];
        if (!meta) throw new Error('Meta não encontrada');

        // Verificar se o `puuid` é o mesmo do jogador
        if (meta.puuid !== puuid) {
            throw new Error('Permissão negada: PUUID não corresponde ao dono da meta');
        }

        // Excluir a meta
        const deleteQuery = 'DELETE FROM metas_livres WHERE id = $1 RETURNING *';
        const result = await db.query(deleteQuery, [idMeta]);
        
        return { message: 'Meta excluída com sucesso', metaExcluida: result.rows[0] };
    } catch (error) {
        console.error('Erro ao excluir meta livre:', error);
        throw new Error('Erro ao excluir meta livre');
    }
}

// Mapeamentos
function mapEloToNumber(tier, rank) {
    const tiers = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
    const divisions = { "IV": 0, "III": 1, "II": 2, "I": 3 };
    if (tier === "MASTER") return 25;
    if (tier === "GRANDMASTER") return 26;
    if (tier === "CHALLENGER") return 27;
    const tierIndex = tiers.indexOf(tier);
    const division = divisions[rank];
    return tierIndex * 4 + division + 1;
}

function mapNumberToElo(number) {
    const elos = ["Unranked", "Iron IV", "Iron III", "Iron II", "Iron I", "Bronze IV", "Bronze III", "Bronze II", "Bronze I", 
                  "Silver IV", "Silver III", "Silver II", "Silver I", "Gold IV", "Gold III", "Gold II", "Gold I", 
                  "Platinum IV", "Platinum III", "Platinum II", "Platinum I", "Diamond IV", "Diamond III", "Diamond II", 
                  "Diamond I", "Master", "Grandmaster", "Challenger"];
    return elos[number] || "Unranked";
}

module.exports = {
    obterMetasEspecificas,
    obterMetasLivres,
    adicionarMetaEspecifica,
    atualizarProgressoMetaEspecifica,
    removerMetaEspecifica,
    adicionarMetaLivre,
    atualizarStatusMetaLivre,
    removerMetaLivre
};

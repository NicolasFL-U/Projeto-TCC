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
    return rows;
}

// Função para obter metas livres
async function obterMetasLivres(puuid) {
    const query = `
        SELECT id, 'livre' AS tipo, 'livre' AS tipo_meta, nome_meta, status
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
        'Esmeralda IV', 'Esmeralda III', 'Esmeralda II', 'Esmeralda I',
        'Diamante IV', 'Diamante III', 'Diamante II', 'Diamante I',
        'Mestre', 'Grão-mestre', 'Desafiante'
    ];

    try {
        switch (tipo) {
            case 'partidas_total':
                // arredonda o objetivo caso venha com casas decimais
                objetivo = Math.round(objetivo);

                if (objetivo <= 0 || objetivo >= 100000 || limite !== null) throw new Error('Parâmetros inválidos para meta do tipo "partidas totais"');
                const partidasTotal = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1', [puuid]);
                progressoAtual = partidasTotal.rows[0].count;
                descricao = `Jogar ${objetivo} partidas`;
                break;

            case (tipo.match(/^partidas_campeao_/) || {}).input:
                // arredonda o objetivo caso venha com casas decimais
                objetivo = Math.round(objetivo);

                const campeao = tipo.replace('partidas_campeao_', '');
                if (!champions.data[campeao] || objetivo <= 0 || objetivo >= 100000 || limite !== null) throw new Error('Parâmetros inválidos para meta do tipo "partidas com campeao"');
                const partidasCampeao = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1 AND campeao = $2', [puuid, campeao]);
                progressoAtual = partidasCampeao.rows[0].count;
                descricao = `Jogar ${objetivo} partidas de ${campeao}`;
                break;

            case (tipo.match(/^partidas_rota_/) || {}).input:
                // arredonda o objetivo caso venha com casas decimais
                objetivo = Math.round(objetivo);
                const rota = tipo.replace('partidas_rota_', '').toUpperCase();

                if (!['BOTTOM', 'JUNGLE', 'TOP', 'UTILITY', 'MIDDLE'].includes(rota) || objetivo <= 0 || objetivo >= 100000 || limite !== null) throw new Error('Parâmetros inválidos para meta do tipo "partidas na rota"');
                const partidasRota = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1 AND role = $2', [puuid, rota]);
                progressoAtual = partidasRota.rows[0].count;
                // Ajustando a descrição com base na rota
                if (rota === 'BOTTOM' || rota === 'UTILITY') {
                    descricao = `Jogar ${objetivo} partidas de ${rotaMap[rota]}`;
                } else {
                    descricao = `Jogar ${objetivo} partidas na ${rotaMap[rota]}`;
                }

                break;

            case 'media_cs':
                // arredonda o objetivo para 1 casa decimal
                objetivo = Math.round(objetivo * 10) / 10;

                if (objetivo <= 0.0 || objetivo > 10.0 || limite <= 0 || limite >= 100000) {
                    throw new Error('Parâmetros inválidos para meta do tipo "media de cs"');
                }
                const mediaCsQuery = await db.query(
                    `SELECT SUM((creep_score->>'totalMinionsKilled')::int + (creep_score->>'neutralMinionsKilled')::int) / SUM(duracao_partida::float / 60) as media_cs 
                     FROM (SELECT * FROM partidas WHERE puuid = $2 ORDER BY data_partida DESC LIMIT $1) as ultimas_partidas`,
                    [limite, puuid]
                );
                progressoAtual = mediaCsQuery.rows[0].media_cs || 0;
                descricao = `Alcançar a média de ${objetivo} CS/min nas últimas ${limite} partidas`;
                break;

            case 'media_wr':
                // arredonda o limite caso venha com casas decimais
                limite = Math.round(limite);
                // arredonda o objetivo para 1 casa decimal
                objetivo = Math.round(objetivo * 10) / 10;

                if (objetivo <= 0 || objetivo > 100 || limite <= 0 || limite >= 100000) throw new Error('Parâmetros inválidos para meta do tipo "media de wr"');
                const mediaWrQuery = await db.query(
                    `SELECT COUNT(*) FILTER (WHERE resultado = 'Vitória') * 100.0 / COUNT(*) as winrate
                     FROM (SELECT * FROM partidas WHERE puuid = $1 ORDER BY data_partida DESC LIMIT $2) as ultimas_partidas`,
                    [puuid, limite]
                );
                progressoAtual = mediaWrQuery.rows[0].winrate || 0;
                descricao = `Alcançar a média de ${objetivo}% de winrate nas últimas ${limite} partidas`;
                break;

            case 'objetivo_elo':
                // arredonda o objetivo caso venha com casas decimais
                objetivo = Math.round(objetivo);

                if (objetivo <= 0 || objetivo > 31 || limite !== null) throw new Error('Parâmetros inválidos para meta do tipo "objetivo de elo"');
                const summonerIdQuery = await db.query('SELECT summoner_id FROM jogadores WHERE puuid = $1', [puuid]);
                const summonerId = summonerIdQuery.rows[0]?.summoner_id;
                if (!summonerId) throw new Error('Summoner ID não encontrado para este jogador');
                
                const riotApiUrl = `https://br1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
                const response = await axios.get(riotApiUrl, {
                    headers: { 'X-Riot-Token': process.env.RIOT_API_KEY }
                });
                if (!response.data || response.data.length === 0) {
                    progressoAtual = 0;
                } else {
                    const rankData = response.data.find(entry => entry.queueType === 'RANKED_SOLO_5x5');
                    progressoAtual = rankData ? mapEloToNumber(rankData?.tier, rankData?.rank) : 0;  // Se não houver dados, progresso será 0
                }

                // Ajusta a descrição para exibir o elo em português
                descricao = `Alcançar o Elo ${eloMap[objetivo]}`;
                break;

            case 'vod_reviews':
                // arredonda o objetivo caso venha com casas decimais
                objetivo = Math.round(objetivo);

                if (objetivo <= 0 || objetivo >= 100000 || limite !== null) throw new Error('Parâmetros inválidos para tipo "vod_reviews"');
                const vodReviewsQuery = await db.query(
                    `SELECT COUNT(DISTINCT p.link_vod) as reviews
                    FROM partidas p 
                    LEFT JOIN tags t ON p.link_vod = t.link_vod
                    LEFT JOIN comentarios c ON p.link_vod = c.link_vod
                    WHERE p.puuid = $1
                    AND p.link_vod IS NOT NULL
                    AND (t.link_vod IS NOT NULL OR c.link_vod IS NOT NULL)`,
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
        throw error;
    }
}

async function atualizarProgressoMetaEspecifica(idMeta) {
    try {
        // Obter informações da meta com base no ID
        const metaQuery = await db.query('SELECT * FROM metas_especificas WHERE id = $1', [idMeta]);
        const meta = metaQuery.rows[0];
        if (!meta) throw new Error('Meta não encontrada');

        const { puuid, tipo_meta: tipo, limite_partidas: limite } = meta;
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
                const partidasRota = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1 AND role = $2', [puuid, rota]);
                progressoAtual = partidasRota.rows[0].count;
                break;

            case 'media_cs':
                const mediaCsQuery = await db.query(
                    `SELECT SUM((creep_score->>'totalMinionsKilled')::int + (creep_score->>'neutralMinionsKilled')::int) / SUM(duracao_partida::float / 60) as media_cs 
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
                if (!response.data || response.data.length === 0) {
                    progressoAtual = 0; 
                } else {
                    const rankData = response.data.find(entry => entry.queueType === 'RANKED_SOLO_5x5');
                    progressoAtual = rankData ? mapEloToNumber(rankData?.tier, rankData?.rank) : 0;
                }
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
        const updateQuery = 'UPDATE metas_especificas SET progresso_atual = $1 WHERE id = $2 RETURNING *;';

        const result = await db.query(updateQuery, [progressoAtual, idMeta]);
        return result.rows[0];
        
    } catch (error) {
        console.error('Erro ao atualizar progresso da meta específica:', error);
        throw error;
    }
}

async function alterarMetaEspecifica(idMeta, novoObjetivo, novoLimite, puuid) {
    // Mapeamento de elos para português
    const eloMap = [
        'Sem ranking', 'Ferro IV', 'Ferro III', 'Ferro II', 'Ferro I',
        'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I',
        'Prata IV', 'Prata III', 'Prata II', 'Prata I',
        'Ouro IV', 'Ouro III', 'Ouro II', 'Ouro I',
        'Platina IV', 'Platina III', 'Platina II', 'Platina I',
        'Esmeralda IV', 'Esmeralda III', 'Esmeralda II', 'Esmeralda I',
        'Diamante IV', 'Diamante III', 'Diamante II', 'Diamante I',
        'Mestre', 'Grão-mestre', 'Desafiante'
    ];

    const rotaMap = {
        'TOP': 'TopLane',
        'JUNGLE': 'Jungle',
        'MIDDLE': 'MidLane',
        'BOTTOM': 'AdCarry',
        'UTILITY': 'Suporte'
    };

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
        let limite = novoLimite !== undefined ? novoLimite : meta.limite_partidas;
        let progressoAtual = 0;
        let descricao = '';

        // Validação e ajuste de limite, quando aplicável
        if (limite !== null) {
            limite = Math.round(limite);
            if (limite <= 0 || limite >= 100000) {
                throw new Error('Limite inválido para esta meta');
            }
        }

        // Validações e cálculos baseados no tipo de meta
        switch (tipo) {
            case 'partidas_total':
                if (novoObjetivo <= 0 || novoObjetivo >= 100000) throw new Error('Objetivo inválido para meta do tipo "partidas totais"');
                novoObjetivo = Math.round(novoObjetivo);
                const partidasTotal = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1', [puuid]);
                progressoAtual = partidasTotal.rows[0].count;
                descricao = `Jogar ${novoObjetivo} partidas`;
                break;

            case (tipo.match(/^partidas_campeao_/) || {}).input:
                novoObjetivo = Math.round(novoObjetivo);
                const campeao = tipo.replace('partidas_campeao_', '');
                if (!champions.data[campeao] || novoObjetivo <= 0 || novoObjetivo >= 100000) throw new Error('Objetivo inválido para meta do tipo "partidas com campeao"');
                const partidasCampeao = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1 AND campeao = $2', [puuid, campeao]);
                progressoAtual = partidasCampeao.rows[0].count;
                descricao = `Jogar ${novoObjetivo} partidas de ${campeao}`;
                break;

            case (tipo.match(/^partidas_rota_/) || {}).input:
                novoObjetivo = Math.round(novoObjetivo);
                const rota = tipo.replace('partidas_rota_', '').toUpperCase();
                if (!['BOTTOM', 'JUNGLE', 'TOP', 'UTILITY', 'MIDDLE'].includes(rota) || novoObjetivo <= 0 || novoObjetivo >= 100000) throw new Error('Objetivo inválido para meta do tipo "partidas na rota"');
                const partidasRota = await db.query('SELECT COUNT(*) FROM partidas WHERE puuid = $1 AND role = $2', [puuid, rota]);
                progressoAtual = partidasRota.rows[0].count;
                descricao = rota === 'BOTTOM' || rota === 'UTILITY' ? `Jogar ${novoObjetivo} partidas de ${rotaMap[rota]}` : `Jogar ${novoObjetivo} partidas na ${rotaMap[rota]}`;
                break;

            case 'media_cs':
                novoObjetivo = Math.round(novoObjetivo * 10) / 10;
                if (novoObjetivo <= 0.0 || novoObjetivo > 10.0 || limite <= 0 || limite >= 100000) {
                    throw new Error('Objetivo ou limite inválido para meta do tipo "media de cs"');
                }
                const mediaCsQuery = await db.query(
                    `SELECT SUM((creep_score->>'totalMinionsKilled')::int + (creep_score->>'neutralMinionsKilled')::int) / SUM(duracao_partida::float / 60) as media_cs 
                    FROM (SELECT * FROM partidas WHERE puuid = $2 ORDER BY data_partida DESC LIMIT $1) as ultimas_partidas`,
                    [limite, puuid]
                );
                progressoAtual = mediaCsQuery.rows[0].media_cs || 0;
                descricao = `Alcançar a média de ${novoObjetivo} CS/min nas últimas ${limite} partidas`;
                break;

            case 'media_wr':
                novoObjetivo = Math.round(novoObjetivo * 10) / 10;
                if (novoObjetivo <= 0.0 || novoObjetivo > 100.0 || limite <= 0 || limite >= 100000) throw new Error('Objetivo ou limite inválido para meta do tipo "media de wr"');
                const mediaWrQuery = await db.query(
                    `SELECT COUNT(*) FILTER (WHERE resultado = 'Vitória') * 100.0 / COUNT(*) as winrate
                     FROM (SELECT * FROM partidas WHERE puuid = $1 ORDER BY data_partida DESC LIMIT $2) as ultimas_partidas`,
                    [puuid, limite]
                );
                progressoAtual = mediaWrQuery.rows[0].winrate || 0;
                descricao = `Alcançar a média de ${novoObjetivo}% de winrate nas últimas ${limite} partidas`;
                break;

            case 'objetivo_elo':
                novoObjetivo = Math.round(novoObjetivo);
                if (novoObjetivo <= 0 || novoObjetivo > 31) throw new Error('Objetivo inválido para meta do tipo "objetivo de elo"');
                const summonerIdQuery = await db.query('SELECT summoner_id FROM jogadores WHERE puuid = $1', [puuid]);
                const summonerId = summonerIdQuery.rows[0]?.summoner_id;
                if (!summonerId) throw new Error('Summoner ID não encontrado para este jogador');

                const riotApiUrl = `https://br1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
                const response = await axios.get(riotApiUrl, {
                    headers: { 'X-Riot-Token': process.env.RIOT_API_KEY }
                });
                if (!response.data || response.data.length === 0) {
                    progressoAtual = 0;  // Se a resposta estiver vazia, define o progresso como 0
                } else {
                    const rankData = response.data.find(entry => entry.queueType === 'RANKED_SOLO_5x5');
                    progressoAtual = rankData ? mapEloToNumber(rankData.tier, rankData.rank) : 0;  // Se não houver dados, progresso será 0
                }
                descricao = `Alcançar o Elo ${eloMap[novoObjetivo]}`;
                break;

            case 'vod_reviews':
                novoObjetivo = Math.round(novoObjetivo);
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

        // Atualizar a meta com o novo objetivo, limite (se aplicável) e progresso calculado
        const updateQuery = `UPDATE metas_especificas SET objetivo = $1, limite_partidas = $2, progresso_atual = $3, descricao = $4 WHERE id = $5 AND puuid = $6 RETURNING *;
        `;
        const result = await db.query(updateQuery, [novoObjetivo, limite, progressoAtual, descricao, idMeta, puuid]);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

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
        throw error;
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
        throw error;
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
        throw error;
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
        throw error;
    }
}

// Mapeamentos
function mapEloToNumber(tier, rank) {
    const tiers = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
    const divisions = { "IV": 0, "III": 1, "II": 2, "I": 3 };
    if (tier === "MASTER") return 29;
    if (tier === "GRANDMASTER") return 30;
    if (tier === "CHALLENGER") return 31;
    const tierIndex = tiers.indexOf(tier);
    const division = divisions[rank];
    return tierIndex * 4 + division + 1;
}

module.exports = {
    obterMetasEspecificas,
    obterMetasLivres,
    adicionarMetaEspecifica,
    atualizarProgressoMetaEspecifica,
    alterarMetaEspecifica,
    removerMetaEspecifica,
    adicionarMetaLivre,
    atualizarStatusMetaLivre,
    removerMetaLivre
};

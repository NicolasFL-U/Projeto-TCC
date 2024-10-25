const db = require('../database');

const obterEstatisticasPorPuuid = async (puuid) => {
    const queryEstatisticas = `
        SELECT 
            COUNT(*) AS quantidade_partidas,
            AVG(duracao_partida) AS media_duracao_partidas,
            AVG(CAST(SPLIT_PART(kda, '/', 1) AS NUMERIC)) AS media_kills,
            AVG(CAST(SPLIT_PART(kda, '/', 2) AS NUMERIC)) AS media_deaths,
            AVG(CAST(SPLIT_PART(kda, '/', 3) AS NUMERIC)) AS media_assists,
            AVG(
                (CAST(creep_score->>'totalMinionsKilled' AS NUMERIC) + 
                 CAST(creep_score->>'neutralMinionsKilled' AS NUMERIC)) / 
                 (CAST(duracao_partida AS FLOAT) / 60)
            ) AS media_cs_min,
            AVG(
                CAST(dano_total AS NUMERIC) / (CAST(duracao_partida AS FLOAT) / 60)
            )::INT AS media_dano_por_minuto,
            AVG(
                CAST(ouro_ganho AS NUMERIC) / (CAST(duracao_partida AS FLOAT) / 60)
            )::INT AS media_ouro_por_minuto,
            COUNT(link_vod) FILTER (WHERE link_vod IS NOT NULL AND link_vod <> '') AS partidas_com_vod,
            COUNT(DISTINCT p.link_vod) FILTER (
                WHERE p.link_vod IS NOT NULL 
                AND p.link_vod <> ''
                AND (
                    EXISTS (SELECT 1 FROM tags t WHERE t.link_vod = p.link_vod) OR
                    EXISTS (SELECT 1 FROM comentarios c WHERE c.link_vod = p.link_vod)
                )
            ) AS partidas_com_vod_tags_ou_comentarios,
            SUM(CASE WHEN resultado = 'Vitória' THEN 1 ELSE 0 END) AS total_vitorias
        FROM partidas p
        WHERE puuid = $1
    `;

    const queryCampeoes = `
        SELECT 
            campeao, 
            COUNT(*) AS partidas_jogadas,
            SUM(CASE WHEN resultado = 'Vitória' THEN 1 ELSE 0 END) AS vitorias,
            SUM(CASE WHEN resultado = 'Derrota' THEN 1 ELSE 0 END) AS derrotas
        FROM partidas
        WHERE puuid = $1
        GROUP BY campeao
        ORDER BY partidas_jogadas DESC
    `;

    const queryRoles = `
        SELECT 
            role, 
            COUNT(*) AS partidas_jogadas,
            SUM(CASE WHEN resultado = 'Vitória' THEN 1 ELSE 0 END) AS vitorias,
            SUM(CASE WHEN resultado = 'Derrota' THEN 1 ELSE 0 END) AS derrotas
        FROM partidas
        WHERE puuid = $1
        GROUP BY role
        ORDER BY partidas_jogadas DESC
    `;

    // Query para contar as tags e comentários para os link_vod do puuid
    const queryTagsComentarios = `
        SELECT 
            (SELECT COUNT(*) FROM tags WHERE link_vod IN (SELECT link_vod FROM partidas WHERE puuid = $1)) AS total_tags,
            (SELECT COUNT(*) FROM comentarios WHERE link_vod IN (SELECT link_vod FROM partidas WHERE puuid = $1)) AS total_comentarios
    `;

    // Query para contar metas específicas e metas livres
    const queryMetas = `
        SELECT 
            (SELECT COUNT(*) FROM metas_especificas WHERE puuid = $1) AS total_metas_especificas,
            (SELECT COUNT(*) FROM metas_especificas WHERE puuid = $1 AND progresso_atual > objetivo) AS metas_especificas_completas,
            (SELECT COUNT(*) FROM metas_livres WHERE puuid = $1) AS total_metas_livres,
            (SELECT COUNT(*) FROM metas_livres WHERE puuid = $1 AND status = true) AS metas_livres_completas
    `;

    const valores = [puuid];

    try {
        // Executa as queries para estatísticas gerais, campeões, roles, tags/comentários e metas
        const resultadoEstatisticas = await db.query(queryEstatisticas, valores);
        const resultadoCampeoes = await db.query(queryCampeoes, valores);
        const resultadoRoles = await db.query(queryRoles, valores);
        const resultadoTagsComentarios = await db.query(queryTagsComentarios, valores);
        const resultadoMetas = await db.query(queryMetas, valores);

        // Calcula a porcentagem de vitórias
        const totalPartidas = parseInt(resultadoEstatisticas.rows[0].quantidade_partidas, 10);
        const totalVitorias = parseInt(resultadoEstatisticas.rows[0].total_vitorias, 10);
        const porcentagemVitorias = totalPartidas > 0 ? ((totalVitorias / totalPartidas) * 100).toFixed(2) : 0;

        // Monta o objeto de estatísticas gerais
        const estatisticas = {
            quantidade_partidas: totalPartidas,
            media_duracao_partidas: parseFloat(resultadoEstatisticas.rows[0].media_duracao_partidas).toFixed(1),
            media_kills: parseFloat(resultadoEstatisticas.rows[0].media_kills).toFixed(1),
            media_deaths: parseFloat(resultadoEstatisticas.rows[0].media_deaths).toFixed(1),
            media_assists: parseFloat(resultadoEstatisticas.rows[0].media_assists).toFixed(1),
            media_cs_min: parseFloat(resultadoEstatisticas.rows[0].media_cs_min).toFixed(1),
            media_dano_por_minuto: parseInt(resultadoEstatisticas.rows[0].media_dano_por_minuto, 10),
            media_ouro_por_minuto: parseInt(resultadoEstatisticas.rows[0].media_ouro_por_minuto, 10),
            partidas_com_vod: parseInt(resultadoEstatisticas.rows[0].partidas_com_vod, 10),
            partidas_com_vod_tags_ou_comentarios: parseInt(resultadoEstatisticas.rows[0].partidas_com_vod_tags_ou_comentarios, 10),
            porcentagem_vitorias: porcentagemVitorias,
            total_tags: parseInt(resultadoTagsComentarios.rows[0].total_tags, 10),
            total_comentarios: parseInt(resultadoTagsComentarios.rows[0].total_comentarios, 10),
            total_metas_especificas: parseInt(resultadoMetas.rows[0].total_metas_especificas, 10),
            metas_especificas_completas: parseInt(resultadoMetas.rows[0].metas_especificas_completas, 10),
            total_metas_livres: parseInt(resultadoMetas.rows[0].total_metas_livres, 10),
            metas_livres_completas: parseInt(resultadoMetas.rows[0].metas_livres_completas, 10)
        };

        // Monta a lista de campeões com as estatísticas
        const campeoes = resultadoCampeoes.rows.map(campeao => ({
            nome: campeao.campeao,
            partidas_jogadas: parseInt(campeao.partidas_jogadas, 10),
            vitorias: parseInt(campeao.vitorias, 10),
            derrotas: parseInt(campeao.derrotas, 10)
        }));

        // Monta a lista de roles com as estatísticas
        const roles = resultadoRoles.rows.map(role => ({
            nome: role.role,
            partidas_jogadas: parseInt(role.partidas_jogadas, 10),
            vitorias: parseInt(role.vitorias, 10),
            derrotas: parseInt(role.derrotas, 10)
        }));

        return { estatisticas, campeoes, roles }; // Retorna as estatísticas gerais, campeões, roles, metas, tags e comentários
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        throw error;
    }
};

module.exports = {
    obterEstatisticasPorPuuid
};

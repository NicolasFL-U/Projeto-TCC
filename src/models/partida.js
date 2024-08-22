const axios = require('axios');
const db = require('../database');
require('dotenv').config();

class Partida {
    constructor(puuid) {
        this.puuid = puuid;
    }

    async buscarIdsPartidas(queue = 420, count = 10) {
        try {
            // Consultando a data da última partida no banco de dados
            const ultimaPartidaQuery = 'SELECT ultima_partida FROM jogadores WHERE puuid = $1';
            const result = await db.query(ultimaPartidaQuery, [this.puuid]);
            const ultimaPartidaEpoch = (Math.floor(result.rows[0]?.ultima_partida / 1000)) + 5;

            // Parâmetros para a requisição
            const params = {
                api_key: process.env.RIOT_API_KEY,
                queue: queue,
                count: count,
            };
    
            // Se existe uma data de última partida, adicionar startTime aos parâmetros
            if (ultimaPartidaEpoch) {
               params.startTime = ultimaPartidaEpoch;
            }

            // Fazendo a requisição para obter os IDs das partidas
            const response = await axios.get(`https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${this.puuid}/ids`, { params });
    
            if (response.status === 200 && response.data.length > 0) {
                // Retornar os IDs das partidas
                return response.data;
            } else {
                return []; // Nenhuma partida encontrada
            }
        } catch (error) {
            console.error('Erro ao buscar IDs de partidas:', error.message);
            return [];
        }
    }

    async buscarDadosPartida(matchId) {
        try {
            const response = await axios.get(`https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`, {
                params: {
                    api_key: process.env.RIOT_API_KEY
                }
            });
    
            if (response.status === 200) {
                const partida = response.data;
                const jogador = partida.info.participants.find(p => p.puuid === this.puuid);
    
                // Determinando o resultado da partida (vitória ou derrota)
                const resultado = jogador.win ? 'Vitória' : 'Derrota';
    
                // Determinando a posição do jogador
                let role = jogador.individualPosition;
                if (role === 'INVALID') {
                    const rolesTime = partida.info.participants
                        .filter(p => p.teamId === jogador.teamId)
                        .map(p => p.individualPosition)
                        .filter(r => r !== 'INVALID');
                    
                    const todasRoles = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
                    role = todasRoles.find(r => !rolesTime.includes(r)) || 'UNKNOWN';
                }
    
                // Dados da partida
                const dados = {
                    idPartida: partida.metadata.matchId,
                    dataPartida: partida.info.gameEndTimestamp,
                    duracaoPartida: partida.info.gameDuration,
                    campeao: jogador.championName,
                    resultado,
                    role,
                    kda: {
                        kills: jogador.kills,
                        deaths: jogador.deaths,
                        assists: jogador.assists,
                    },
                    summonerSpells: {
                        spell1: jogador.summoner1Id,
                        spell2: jogador.summoner2Id,
                    },
                    runas: {
                        primarias: jogador.perks.styles[0].selections.map(runa => runa.perk),
                        secundarias: jogador.perks.styles[1].selections.map(runa => runa.perk),
                    },
                    itensFinais: [
                        jogador.item0,
                        jogador.item1,
                        jogador.item2,
                        jogador.item3,
                        jogador.item4,
                        jogador.item5,
                        jogador.item6,
                    ],
                    creepScore: {
                        totalMinionsKilled: jogador.totalMinionsKilled,
                        neutralMinionsKilled: jogador.neutralMinionsKilled,
                    },
                    danoTotal: jogador.totalDamageDealtToChampions,
                };
    
                return dados;
            } else {
                return null;
            }
        } catch (error) {
            console.error(`Erro ao buscar dados da partida ${matchId}:`, error.message);
            return null;
        }
    }
    
    async salvarPartidaBanco(dados) {
        try {
            // Iniciar a transação
            await db.query('BEGIN');
    
            const queryText = `
                INSERT INTO partidas (puuid, id_partida, data_partida, duracao_partida, campeao, resultado, role, kda, summoner_spells, runas, itens_finais, creep_score, dano_total)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `;
            const queryParams = [
                this.puuid,
                dados.idPartida,
                dados.dataPartida,
                dados.duracaoPartida,
                dados.campeao,
                dados.resultado,
                dados.role,
                `${dados.kda.kills}/${dados.kda.deaths}/${dados.kda.assists}`,
                JSON.stringify(dados.summonerSpells),
                JSON.stringify(dados.runas),
                JSON.stringify(dados.itensFinais),
                JSON.stringify(dados.creepScore),
                dados.danoTotal
            ];
    
            await db.query(queryText, queryParams);
    
            const updateUltimaPartidaQuery = `
                UPDATE jogadores
                SET ultima_partida = (
                    SELECT MAX(data_partida)
                    FROM partidas
                    WHERE puuid = $1
                )
                WHERE puuid = $1
            `;
    
            await db.query(updateUltimaPartidaQuery, [this.puuid]);
    
            // Comitar a transação
            await db.query('COMMIT');
            console.log(`Dados da partida ${dados.idPartida} salvos com sucesso.`);
        } catch (error) {
            // Reverter a transação em caso de erro
            await db.query('ROLLBACK');
            console.error('Erro ao salvar os dados da partida no banco:', error.message);
        }
    }

    async buscarPartidasNoBanco() {
        try {
            const query = `
                SELECT 
                    id_partida,
                    to_char(to_timestamp(data_partida / 1000), 'DD-MM-YYYY HH24:MI:SS') as data_formatada,
                    duracao_partida,
                    kda,
                    summoner_spells,
                    runas,
                    itens_finais,
                    creep_score,
                    dano_total,
                    campeao,
                    resultado,
                    role
                FROM partidas
                WHERE puuid = $1
                ORDER BY data_partida DESC
            `;
            const result = await db.query(query, [this.puuid]);

            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar partidas no banco:', error.message);
            throw new Error('Erro ao buscar partidas no banco');
        }
    }
}

module.exports = Partida;
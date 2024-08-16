const axios = require('axios');
const db = require('../database');
require('dotenv').config();

class Partida {
    constructor(puuid) {
        this.puuid = puuid;
    }

    async buscarIdsPartidas(queue = 420, count = 10) {
        try {
            const ultimaPartidaQuery = 'SELECT MAX(data) as ultima_partida FROM partidas WHERE puuid = $1';
            const result = await db.query(ultimaPartidaQuery, [this.puuid]);
            const ultimaPartidaEpoch = result.rows[0].ultima_partida || null;

            const params = {
                api_key: process.env.RIOT_API_KEY,
                queue: queue,
                count: count
            };

            if (ultimaPartidaEpoch) {
                params.startTime = ultimaPartidaEpoch;
                params.endTime = Math.floor(Date.now() / 1000);
                params.count = 100;
            } else {
                params.endTime = Math.floor(Date.now() / 1000);
            }

            const response = await axios.get(`https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${this.puuid}/ids`, { params });

            if (response.status === 200) {
                return response.data;
            } else {
                return [];
            }
        } catch (error) {
            console.error('Erro ao buscar IDs de partidas:', error.message);
            return [];
        }
    }

    async buscarDadosPartidas(idsPartidas) {
        const dadosPartidas = [];
    
        for (const matchId of idsPartidas) {
            try {
                const response = await axios.get(`https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`, {
                    params: {
                        api_key: process.env.RIOT_API_KEY
                    }
                });
    
                if (response.status === 200) {
                    const partida = response.data;
                    const jogador = partida.info.participants.find(p => p.puuid === this.puuid);
    
                    const dados = {
                        idPartida: partida.metadata.matchId,
                        dataPartida: partida.info.gameStartTimestamp,
                        duracaoPartida: partida.info.gameDuration,
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
    
                    dadosPartidas.push(dados);
                }
            } catch (error) {
                console.error(`Erro ao buscar dados da partida ${matchId}:`, error.message);
            }
        }
    
        return dadosPartidas;
    }
}

const partida = new Partida('tc4ovXsn10l8_5-_heIoSgQGnaI-MZUtVPhr0wRP4Tqy6IeyefHBvzkf2yHNiRuF_o8ylEM36qd26A');
partida.buscarDadosPartidas(['BR1_2983237130'])
    .then(dadosPartida => {
        console.log(JSON.stringify(dadosPartida, null, 2));
    })
    .catch(error => {
        console.error('Erro ao buscar dados da partida:', error);
    });

module.exports = Partida;
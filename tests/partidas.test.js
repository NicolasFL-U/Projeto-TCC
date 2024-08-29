const axios = require('axios');
const db = require('../src/database');
const Partida = require('../src/models/partida');

jest.mock('axios');
jest.mock('../src/database');

describe('Testes da função buscarIdsPartidas', () => {
    let partida;

    beforeEach(() => {
        partida = new Partida('exemplo-puuid');
    });

    test('Deve retornar os IDs das partidas quando há uma última partida registrada', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ ultima_partida: 1625151600000 }] });
        axios.get.mockResolvedValueOnce({
            status: 200,
            data: ['id1', 'id2', 'id3'],
        });

        const ids = await partida.buscarIdsPartidas();

        expect(db.query).toHaveBeenCalledWith('SELECT ultima_partida FROM jogadores WHERE puuid = $1', ['exemplo-puuid']);
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/lol/match/v5/matches/by-puuid/'), {
            params: expect.objectContaining({
                startTime: Math.floor(1625151600000 / 1000) + 5,
                queue: 420,
                count: 10,
                api_key: process.env.RIOT_API_KEY,
            }),
        });
        expect(ids).toEqual(['id1', 'id2', 'id3']);
    });

    test('Deve retornar os IDs das partidas quando não há última partida registrada', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ ultima_partida: null }] });
        axios.get.mockResolvedValueOnce({
            status: 200,
            data: ['id1', 'id2', 'id3'],
        });

        const ids = await partida.buscarIdsPartidas();

        expect(db.query).toHaveBeenCalledWith('SELECT ultima_partida FROM jogadores WHERE puuid = $1', ['exemplo-puuid']);
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/lol/match/v5/matches/by-puuid/'), {
            params: expect.objectContaining({
                queue: 420,
                count: 10,
                api_key: process.env.RIOT_API_KEY,
            }),
        });
        expect(ids).toEqual(['id1', 'id2', 'id3']);
    });

    test('Deve retornar uma lista vazia quando a API não retorna IDs', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ ultima_partida: 1625151600000 }] });
        axios.get.mockResolvedValueOnce({
            status: 200,
            data: [],
        });

        const ids = await partida.buscarIdsPartidas();

        expect(ids).toEqual([]);
    });

    test('Deve retornar uma lista vazia quando ocorre um erro na API', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ ultima_partida: 1625151600000 }] });
        axios.get.mockRejectedValueOnce(new Error('Erro na API'));

        const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

        const ids = await partida.buscarIdsPartidas();

        expect(ids).toEqual([]);
        expect(consoleErrorMock).toHaveBeenCalledWith('Erro ao buscar IDs de partidas:', 'Erro na API');

        consoleErrorMock.mockRestore();
    });
});

describe('Testes da função buscarDadosPartida', () => {
    let partida;

    beforeEach(() => {
        partida = new Partida('exemplo-puuid');
    });

    test('Deve retornar os dados da partida corretamente', async () => {
        const mockResponse = {
            status: 200,
            data: {
                metadata: {
                    matchId: 'BR1_2983237130',
                },
                info: {
                    gameEndTimestamp: 1625151600000,
                    gameDuration: 1800,
                    participants: [
                        {
                            puuid: 'exemplo-puuid',
                            championName: 'Aatrox',
                            win: true,
                            kills: 10,
                            deaths: 2,
                            assists: 8,
                            summoner1Id: 4,
                            summoner2Id: 14,
                            perks: {
                                styles: [
                                    {
                                        selections: [{ perk: 8005 }, { perk: 9111 }],
                                    },
                                    {
                                        selections: [{ perk: 9104 }, { perk: 8299 }],
                                    },
                                ],
                            },
                            item0: 3071,
                            item1: 3047,
                            item2: 6692,
                            item3: 6333,
                            item4: 3156,
                            item5: 3076,
                            item6: 3364,
                            totalMinionsKilled: 200,
                            neutralMinionsKilled: 50,
                            totalDamageDealtToChampions: 25000,
                            individualPosition: 'TOP',
                            teamId: 100,
                        },
                    ],
                },
            },
        };

        axios.get.mockResolvedValueOnce(mockResponse);

        const dados = await partida.buscarDadosPartida('BR1_2983237130');

        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/lol/match/v5/matches/BR1_2983237130'), {
            params: { api_key: process.env.RIOT_API_KEY },
        });

        expect(dados).toEqual({
            idPartida: 'BR1_2983237130',
            dataPartida: 1625151600000,
            duracaoPartida: 1800,
            campeao: 'Aatrox',
            resultado: 'Vitória',
            role: 'TOP',
            kda: { kills: 10, deaths: 2, assists: 8 },
            summonerSpells: { spell1: 4, spell2: 14 },
            runas: {
                primarias: [8005, 9111],
                secundarias: [9104, 8299],
            },
            itensFinais: [3071, 3047, 6692, 6333, 3156, 3076, 3364],
            creepScore: {
                totalMinionsKilled: 200,
                neutralMinionsKilled: 50,
            },
            danoTotal: 25000,
        });
    });

    test('Deve retornar null se a API não encontrar a partida', async () => {
        axios.get.mockResolvedValueOnce({
            status: 404,
            data: {},
        });

        const dados = await partida.buscarDadosPartida('BR1_2983237130');

        expect(dados).toBeNull();
    });

    test('Deve retornar null e logar erro se ocorrer erro na API', async () => {
        axios.get.mockRejectedValueOnce(new Error('Erro na API'));

        const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

        const dados = await partida.buscarDadosPartida('BR1_2983237130');

        expect(dados).toBeNull();
        expect(consoleErrorMock).toHaveBeenCalledWith('Erro ao buscar dados da partida BR1_2983237130:', 'Erro na API');

        consoleErrorMock.mockRestore();
    });

    test('Deve determinar a role corretamente quando individualPosition é INVALID', async () => {
        const mockResponse = {
            status: 200,
            data: {
                metadata: {
                    matchId: 'BR1_2983237130',
                },
                info: {
                    gameEndTimestamp: 1625151600000,
                    gameDuration: 1800,
                    participants: [
                        {
                            puuid: 'exemplo-puuid',
                            championName: 'Aatrox',
                            win: true,
                            kills: 10,
                            deaths: 2,
                            assists: 8,
                            summoner1Id: 4,
                            summoner2Id: 14,
                            perks: {
                                styles: [
                                    {
                                        selections: [{ perk: 8005 }, { perk: 9111 }],
                                    },
                                    {
                                        selections: [{ perk: 9104 }, { perk: 8299 }],
                                    },
                                ],
                            },
                            item0: 3071,
                            item1: 3047,
                            item2: 6692,
                            item3: 6333,
                            item4: 3156,
                            item5: 3076,
                            item6: 3364,
                            totalMinionsKilled: 200,
                            neutralMinionsKilled: 50,
                            totalDamageDealtToChampions: 25000,
                            individualPosition: 'INVALID',
                            teamId: 100,
                        },
                        {
                            puuid: 'outro-puuid',
                            individualPosition: 'TOP',
                            teamId: 100,
                        },
                        {
                            puuid: 'outro-puuid-2',
                            individualPosition: 'JUNGLE',
                            teamId: 100,
                        },
                        {
                            puuid: 'outro-puuid-3',
                            individualPosition: 'MIDDLE',
                            teamId: 100,
                        },
                        {
                            puuid: 'outro-puuid-4',
                            individualPosition: 'UTILITY',
                            teamId: 100,
                        },
                    ],
                },
            },
        };

        axios.get.mockResolvedValueOnce(mockResponse);

        const dados = await partida.buscarDadosPartida('BR1_2983237130');

        expect(dados.role).toBe('BOTTOM');
    });
});

describe('Testes da função salvarPartidaBanco', () => {
    let partida;

    beforeEach(() => {
        partida = new Partida('exemplo-puuid');
        db.query.mockReset();
    });

    test('Deve salvar a partida no banco de dados e atualizar ultima_partida com sucesso', async () => {
        const mockDadosPartida = {
            idPartida: 'BR1_2983237130',
            dataPartida: 1625151600000,
            duracaoPartida: 1800,
            campeao: 'Aatrox',
            resultado: 'Vitória',
            role: 'TOP',
            kda: { kills: 10, deaths: 2, assists: 8 },
            summonerSpells: { spell1: 4, spell2: 14 },
            runas: {
                primarias: [8005, 9111],
                secundarias: [9104, 8299],
            },
            itensFinais: [3071, 3047, 6692, 6333, 3156, 3076, 3364],
            creepScore: { totalMinionsKilled: 200, neutralMinionsKilled: 50 },
            danoTotal: 25000,
        };

        db.query.mockResolvedValueOnce({}); 
        db.query.mockResolvedValueOnce({}); 
        db.query.mockResolvedValueOnce({}); 
        db.query.mockResolvedValueOnce({}); 

        await partida.salvarPartidaBanco(mockDadosPartida);

        expect(db.query).toHaveBeenCalledWith('BEGIN');
        expect(db.query).toHaveBeenCalledWith(
            `
                INSERT INTO partidas (puuid, id_partida, data_partida, duracao_partida, campeao, resultado, role, kda, summoner_spells, runas, itens_finais, creep_score, dano_total)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `,
            [
                'exemplo-puuid',
                'BR1_2983237130',
                1625151600000,
                1800,
                'Aatrox',
                'Vitória',
                'TOP',
                '10/2/8',
                JSON.stringify({ spell1: 4, spell2: 14 }),
                JSON.stringify({
                    primarias: [8005, 9111],
                    secundarias: [9104, 8299],
                }),
                JSON.stringify([3071, 3047, 6692, 6333, 3156, 3076, 3364]),
                JSON.stringify({
                    totalMinionsKilled: 200,
                    neutralMinionsKilled: 50,
                }),
                25000,
            ]
        );

        expect(db.query).toHaveBeenCalledWith(
            `
                UPDATE jogadores
                SET ultima_partida = (
                    SELECT MAX(data_partida)
                    FROM partidas
                    WHERE puuid = $1
                )
                WHERE puuid = $1
            `,
            ['exemplo-puuid']
        );

        expect(db.query).toHaveBeenCalledWith('COMMIT');
    });

    test('Deve fazer rollback em caso de erro ao salvar a partida', async () => {
        const mockDadosPartida = {
            idPartida: 'BR1_2983237130',
            dataPartida: 1625151600000,
            duracaoPartida: 1800,
            campeao: 'Aatrox',
            resultado: 'Vitória',
            role: 'TOP',
            kda: { kills: 10, deaths: 2, assists: 8 },
            summonerSpells: { spell1: 4, spell2: 14 },
            runas: {
                primarias: [8005, 9111],
                secundarias: [9104, 8299],
            },
            itensFinais: [3071, 3047, 6692, 6333, 3156, 3076, 3364],
            creepScore: { totalMinionsKilled: 200, neutralMinionsKilled: 50 },
            danoTotal: 25000,
        };

        db.query.mockResolvedValueOnce({});
        db.query.mockRejectedValueOnce(new Error('Erro no banco de dados'));

        const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

        await partida.salvarPartidaBanco(mockDadosPartida);

        expect(db.query).toHaveBeenCalledWith('BEGIN');
        expect(db.query).toHaveBeenCalledWith('ROLLBACK');
        expect(consoleErrorMock).toHaveBeenCalledWith('Erro ao salvar os dados da partida no banco:', 'Erro no banco de dados');

        consoleErrorMock.mockRestore();
    });
});

describe('Testes da função buscarPartidasNoBanco', () => {
    let partida;

    beforeEach(() => {
        partida = new Partida('exemplo-puuid');
        db.query.mockReset();
    });

    test('Deve retornar uma lista de partidas do banco de dados', async () => {
        const mockPartidas = [
            {
                id_partida: 'BR1_2983237130',
                data_formatada: '01-08-2024 14:30:00',
                duracao_partida: 1800,
                kda: '10/2/8',
                summoner_spells: JSON.stringify({ spell1: 4, spell2: 14 }),
                runas: JSON.stringify({
                    primarias: [8005, 9111],
                    secundarias: [9104, 8299],
                }),
                itens_finais: JSON.stringify([3071, 3047, 6692, 6333, 3156, 3076, 3364]),
                creep_score: JSON.stringify({ totalMinionsKilled: 200, neutralMinionsKilled: 50 }),
                dano_total: 25000,
                campeao: 'Aatrox',
                resultado: 'Vitória',
                role: 'TOP',
            },
        ];

        db.query.mockResolvedValueOnce({ rows: mockPartidas });

        const result = await partida.buscarPartidasNoBanco();

        expect(db.query).toHaveBeenCalledWith(
            `
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
            `,
            ['exemplo-puuid']
        );

        expect(result).toEqual(mockPartidas);
    });

    test('Deve lançar um erro ao falhar em buscar as partidas', async () => {
        db.query.mockRejectedValueOnce(new Error('Erro no banco de dados'));

        const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(partida.buscarPartidasNoBanco()).rejects.toThrow('Erro ao buscar partidas no banco');

        expect(consoleErrorMock).toHaveBeenCalledWith('Erro ao buscar partidas no banco:', 'Erro no banco de dados');

        consoleErrorMock.mockRestore();
    });
});
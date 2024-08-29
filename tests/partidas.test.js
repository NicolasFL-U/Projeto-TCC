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

        // Mock do console.error
        const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

        const ids = await partida.buscarIdsPartidas();

        expect(ids).toEqual([]);
        expect(consoleErrorMock).toHaveBeenCalledWith('Erro ao buscar IDs de partidas:', 'Erro na API');

        // Restaurar o console.error original
        consoleErrorMock.mockRestore();
    });
});
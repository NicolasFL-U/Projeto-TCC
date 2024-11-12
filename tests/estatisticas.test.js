const { obterEstatisticasPorPuuid } = require('../src/models/estatisticas');
const db = require('../src/database');

jest.mock('../src/database'); // Mocka o módulo db

describe('Testes para a função obterEstatisticasPorPuuid', () => {
    const puuid = 'test-puuid';

    afterEach(() => {
        jest.clearAllMocks(); // Limpa todos os mocks após cada teste
    });

    test('Deve obter estatísticas com sucesso quando existem partidas', async () => {
        // Mock dos resultados das consultas
        const mockEstatisticas = {
            quantidade_partidas: '10',
            media_duracao_partidas: '1800.0',
            media_kills: '5.0',
            media_deaths: '3.0',
            media_assists: '7.0',
            media_cs_min: '6.5',
            media_dano_por_minuto: '500',
            media_ouro_por_minuto: '400',
            partidas_com_vod: '5',
            partidas_com_vod_tags_ou_comentarios: '3',
            total_vitorias: '6',
        };

        const mockCampeoes = [
            { campeao: 'Campeão A', partidas_jogadas: '5', vitorias: '3', derrotas: '2' },
            { campeao: 'Campeão B', partidas_jogadas: '3', vitorias: '2', derrotas: '1' },
        ];

        const mockRoles = [
            { role: 'Top', partidas_jogadas: '4', vitorias: '2', derrotas: '2' },
            { role: 'Mid', partidas_jogadas: '6', vitorias: '4', derrotas: '2' },
        ];

        const mockTagsComentarios = {
            total_tags: '15',
            total_comentarios: '10',
        };

        const mockMetas = {
            total_metas_especificas: '5',
            metas_especificas_completas: '3',
            total_metas_livres: '2',
            metas_livres_completas: '1',
        };

        // Configura os mocks das consultas
        db.query
            .mockResolvedValueOnce({ rows: [mockEstatisticas] })     // Estatísticas gerais
            .mockResolvedValueOnce({ rows: mockCampeoes })            // Campeões
            .mockResolvedValueOnce({ rows: mockRoles })               // Roles
            .mockResolvedValueOnce({ rows: [mockTagsComentarios] })   // Tags e comentários
            .mockResolvedValueOnce({ rows: [mockMetas] });            // Metas

        const result = await obterEstatisticasPorPuuid(puuid);

        // Verificações das consultas
        expect(db.query).toHaveBeenCalledTimes(5);
        expect(db.query).toHaveBeenNthCalledWith(1, expect.any(String), [puuid]);
        expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [puuid]);
        expect(db.query).toHaveBeenNthCalledWith(3, expect.any(String), [puuid]);
        expect(db.query).toHaveBeenNthCalledWith(4, expect.any(String), [puuid]);
        expect(db.query).toHaveBeenNthCalledWith(5, expect.any(String), [puuid]);

        // Verificação do resultado
        expect(result).toEqual({
            estatisticas: {
                quantidade_partidas: 10,
                media_duracao_partidas: '1800.0',
                media_kills: '5.0',
                media_deaths: '3.0',
                media_assists: '7.0',
                media_cs_min: '6.5',
                media_dano_por_minuto: 500,
                media_ouro_por_minuto: 400,
                partidas_com_vod: 5,
                partidas_com_vod_tags_ou_comentarios: 3,
                porcentagem_vitorias: '60.00',
                total_tags: 15,
                total_comentarios: 10,
                total_metas_especificas: 5,
                metas_especificas_completas: 3,
                total_metas_livres: 2,
                metas_livres_completas: 1,
            },
            campeoes: [
                { nome: 'Campeão A', partidas_jogadas: 5, vitorias: 3, derrotas: 2 },
                { nome: 'Campeão B', partidas_jogadas: 3, vitorias: 2, derrotas: 1 },
            ],
            roles: [
                { nome: 'Top', partidas_jogadas: 4, vitorias: 2, derrotas: 2 },
                { nome: 'Mid', partidas_jogadas: 6, vitorias: 4, derrotas: 2 },
            ],
        });
    });

    test('Deve retornar estatísticas padrão quando não existem partidas', async () => {
        // Mock dos resultados das consultas com valores nulos ou zero
        const mockEstatisticas = {
            quantidade_partidas: '0',
            media_duracao_partidas: null,
            media_kills: null,
            media_deaths: null,
            media_assists: null,
            media_cs_min: null,
            media_dano_por_minuto: null,
            media_ouro_por_minuto: null,
            partidas_com_vod: '0',
            partidas_com_vod_tags_ou_comentarios: '0',
            total_vitorias: '0',
        };

        const mockTagsComentarios = {
            total_tags: '0',
            total_comentarios: '0',
        };

        const mockMetas = {
            total_metas_especificas: '0',
            metas_especificas_completas: '0',
            total_metas_livres: '0',
            metas_livres_completas: '0',
        };

        // Configura os mocks das consultas
        db.query
            .mockResolvedValueOnce({ rows: [mockEstatisticas] })     // Estatísticas gerais
            .mockResolvedValueOnce({ rows: [] })                      // Campeões
            .mockResolvedValueOnce({ rows: [] })                      // Roles
            .mockResolvedValueOnce({ rows: [mockTagsComentarios] })   // Tags e comentários
            .mockResolvedValueOnce({ rows: [mockMetas] });            // Metas

        const result = await obterEstatisticasPorPuuid(puuid);

        // Verificações das consultas
        expect(db.query).toHaveBeenCalledTimes(5);

        // Verificação do resultado
        expect(result).toEqual({
            estatisticas: {
                quantidade_partidas: 0,
                media_duracao_partidas: 'NaN',
                media_kills: 'NaN',
                media_deaths: 'NaN',
                media_assists: 'NaN',
                media_cs_min: 'NaN',
                media_dano_por_minuto: NaN,
                media_ouro_por_minuto: NaN,
                partidas_com_vod: 0,
                partidas_com_vod_tags_ou_comentarios: 0,
                porcentagem_vitorias: 0,
                total_tags: 0,
                total_comentarios: 0,
                total_metas_especificas: 0,
                metas_especificas_completas: 0,
                total_metas_livres: 0,
                metas_livres_completas: 0,
            },
            campeoes: [],
            roles: [],
        });
    });

    test('Deve lançar erro quando ocorre um erro ao consultar o banco de dados', async () => {
        const mockError = new Error('Erro na consulta ao banco de dados');
        db.query.mockRejectedValueOnce(mockError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(obterEstatisticasPorPuuid(puuid)).rejects.toThrow(mockError);

        expect(consoleSpy).toHaveBeenCalledWith('Erro ao obter estatísticas:', mockError);

        consoleSpy.mockRestore();
    });
});
const Vod = require('../src/models/vod');
const db = require('../src/database');
const axios = require('axios');

jest.mock('../src/database'); // Mocka o módulo db
jest.mock('axios'); // Mocka o módulo axios

describe('Testes da função buscarDadosVod', () => {
    let vod;

    beforeEach(() => {
        vod = new Vod('testVodId');
    });

    afterEach(() => {
        jest.clearAllMocks(); // Limpa todos os mocks após cada teste
    });

    test('deve retornar os dados da VOD quando encontrada', async () => {
        // Mocka o retorno do db.query quando a VOD é encontrada
        const mockResult = {
            rows: [{
                id_partida: 1,
                vod_publica: true,
                puuid: 'somePuuid',
                link_vod: 'testVodId'
            }]
        };
        db.query.mockResolvedValue(mockResult);

        const result = await vod.buscarDadosVod();

        expect(db.query).toHaveBeenCalledWith(expect.any(String), ['testVodId']);
        expect(result).toEqual(mockResult.rows[0]);
    });

    test('deve retornar null quando a VOD não é encontrada', async () => {
        // Mocka o retorno do db.query quando não há resultados
        db.query.mockResolvedValue({ rows: [] });

        const result = await vod.buscarDadosVod();

        expect(db.query).toHaveBeenCalledWith(expect.any(String), ['testVodId']);
        expect(result).toBeNull();
    });

    test('deve retornar null e logar o erro quando ocorre uma exceção', async () => {
        // Mocka uma exceção lançada pelo db.query
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const mockError = new Error('Database error');
        db.query.mockRejectedValue(mockError);

        const result = await vod.buscarDadosVod();

        expect(db.query).toHaveBeenCalledWith(expect.any(String), ['testVodId']);
        expect(consoleSpy).toHaveBeenCalledWith('Erro ao buscar dados da VOD:', mockError.message);
        expect(result).toBeNull();

        consoleSpy.mockRestore();
    });
});

describe('Testes para a função salvarVOD', () => {
    const originalEnv = process.env;
    const partida_id = 1;
    const puuid = 'test-puuid';
    const videoId = 'validVideo1'; // 11 caracteres
    const validLink = `https://www.youtube.com/watch?v=${videoId}`;
    const invalidLink = 'https://www.youtube.com/watch?v=invalid'; // Mantenha para testar link inválido
    const youtubeApiKey = 'test-api-key';

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        process.env.YOUTUBE_API_KEY = youtubeApiKey;
    });

    afterAll(() => {
        process.env = originalEnv; // Restaura as variáveis de ambiente originais
    });

    test('Deve salvar o VOD com sucesso quando todas as validações passam', async () => {
        // Mock da validação do link_vod já existente
        db.query.mockResolvedValueOnce({ rows: [] });

        // Mock da chamada à API do YouTube
        axios.get.mockResolvedValueOnce({
            data: {
                items: [{ id: videoId }]
            }
        });

        // Mock da atualização no banco de dados
        db.query.mockResolvedValueOnce({ rowCount: 1 });

        const result = await Vod.salvarVOD(partida_id, validLink, puuid);

        expect(db.query).toHaveBeenNthCalledWith(1, expect.any(String), [videoId, partida_id]);
        expect(axios.get).toHaveBeenCalledWith(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtubeApiKey}&part=id`);
        expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [videoId, partida_id, puuid]);
        expect(result).toEqual({ message: 'VOD salvo com sucesso!' });
    });

    test('Deve lançar erro para link inválido', async () => {
        await expect(Vod.salvarVOD(partida_id, 'link-invalido', puuid)).rejects.toThrow('Link inválido. O link deve seguir o formato:\nhttps://www.youtube.com/watch?v=[id]');
    });

    test('Deve lançar erro se o link já está associado a outra partida', async () => {
        // Mock para simular que o link já está associado a outra partida
        db.query.mockResolvedValueOnce({
            rows: [{ id_partida: 2 }]
        });

        await expect(Vod.salvarVOD(partida_id, validLink, puuid)).rejects.toThrow('Este link já está associado a outra partida.');

        expect(db.query).toHaveBeenCalledWith(expect.any(String), [videoId, partida_id]);
    });

    test('Deve lançar erro se o vídeo não for encontrado no YouTube', async () => {
        // Mock da validação do link_vod já existente
        db.query.mockResolvedValueOnce({ rows: [] });

        // Mock da chamada à API do YouTube com vídeo não encontrado
        axios.get.mockResolvedValueOnce({
            data: {
                items: []
            }
        });

        await expect(Vod.salvarVOD(partida_id, validLink, puuid)).rejects.toThrow('O vídeo não foi encontrado no YouTube. Verifique o link.');

        expect(axios.get).toHaveBeenCalledWith(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtubeApiKey}&part=id`);
    });

    test('Deve lançar erro se ocorrer um erro na chamada à API do YouTube', async () => {
        // Mock da validação do link_vod já existente
        db.query.mockResolvedValueOnce({ rows: [] });

        // Mock para simular erro na chamada à API do YouTube
        axios.get.mockRejectedValueOnce(new Error('Erro na API do YouTube'));

        await expect(Vod.salvarVOD(partida_id, validLink, puuid)).rejects.toThrow('Erro na API do YouTube');

        expect(axios.get).toHaveBeenCalledWith(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtubeApiKey}&part=id`);
    });

    test('Deve lançar erro se ocorrer um erro na atualização do banco de dados', async () => {
        // Mock da validação do link_vod já existente
        db.query.mockResolvedValueOnce({ rows: [] });

        // Mock da chamada à API do YouTube
        axios.get.mockResolvedValueOnce({
            data: {
                items: [{ id: videoId }]
            }
        });

        // Mock para simular erro na atualização do banco de dados
        db.query.mockRejectedValueOnce(new Error('Erro ao atualizar o banco de dados'));

        await expect(Vod.salvarVOD(partida_id, validLink, puuid)).rejects.toThrow('Erro ao atualizar o banco de dados');

        expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [videoId, partida_id, puuid]);
    });

    test('Deve lançar erro se a variável de ambiente YOUTUBE_API_KEY não estiver definida', async () => {
        delete process.env.YOUTUBE_API_KEY;

        await expect(Vod.salvarVOD(partida_id, validLink, puuid)).rejects.toThrow();

        // Podemos verificar se o erro é devido à chave da API não definida
        expect(axios.get).not.toHaveBeenCalled();
    });
});

describe('Testes para a função buscarVodComValidacao', () => {
    const vodId = 'testVodId';
    const puuidDono = 'user-123';
    const puuidOutro = 'user-456';

    afterEach(() => {
        jest.clearAllMocks(); // Limpa todos os mocks após cada teste
    });

    test('Deve retornar vodDados e isDono=true quando o usuário é o dono', async () => {
        const mockResult = {
            rows: [{
                id_partida: 1,
                vod_publica: false,
                puuid: puuidDono,
                link_vod: vodId
            }]
        };
        db.query.mockResolvedValue(mockResult);

        const result = await Vod.buscarVodComValidacao(vodId, puuidDono);

        expect(db.query).toHaveBeenCalledWith(expect.any(String), [vodId]);
        expect(result).toEqual({
            vodDados: mockResult.rows[0],
            isDono: true
        });
    });

    test('Deve retornar vodDados e isDono=false quando a VOD é pública e o usuário não é o dono', async () => {
        const mockResult = {
            rows: [{
                id_partida: 1,
                vod_publica: true,
                puuid: puuidDono,
                link_vod: vodId
            }]
        };
        db.query.mockResolvedValue(mockResult);

        const result = await Vod.buscarVodComValidacao(vodId, puuidOutro);

        expect(db.query).toHaveBeenCalledWith(expect.any(String), [vodId]);
        expect(result).toEqual({
            vodDados: mockResult.rows[0],
            isDono: false
        });
    });

    test('Deve lançar erro "Acesso não autorizado" quando a VOD não é pública e o usuário não é o dono', async () => {
        const mockResult = {
            rows: [{
                id_partida: 1,
                vod_publica: false,
                puuid: puuidDono,
                link_vod: vodId
            }]
        };
        db.query.mockResolvedValue(mockResult);

        await expect(Vod.buscarVodComValidacao(vodId, puuidOutro)).rejects.toThrow('Acesso não autorizado');

        expect(db.query).toHaveBeenCalledWith(expect.any(String), [vodId]);
    });

    test('Deve lançar erro "VOD não encontrada" quando a VOD não existe', async () => {
        db.query.mockResolvedValue({ rows: [] });

        await expect(Vod.buscarVodComValidacao(vodId, puuidDono)).rejects.toThrow('VOD não encontrada');

        expect(db.query).toHaveBeenCalledWith(expect.any(String), [vodId]);
    });

    test('Deve logar o erro e lançar exceção quando ocorre um erro no db.query', async () => {
        const mockError = new Error('Erro no banco de dados');
        db.query.mockRejectedValue(mockError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(Vod.buscarVodComValidacao(vodId, puuidDono)).rejects.toThrow(mockError);

        expect(db.query).toHaveBeenCalledWith(expect.any(String), [vodId]);
        expect(consoleSpy).toHaveBeenCalledWith('Erro ao buscar e validar dados da VOD:', mockError.message);

        consoleSpy.mockRestore();
    });
});

describe('Testes para a função alterarVisibilidade', () => {
    const link_vod = 'testLinkVod';
    const puuidDono = 'user-123';
    const puuidOutro = 'user-456';
    const isPublic = true;

    afterEach(() => {
        jest.clearAllMocks(); // Limpa todos os mocks após cada teste
    });

    test('Deve alterar a visibilidade da VOD com sucesso quando o usuário é o dono', async () => {
        // Mock da consulta para verificar o dono da VOD
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: puuidDono }]
        });

        // Mock da atualização da visibilidade
        db.query.mockResolvedValueOnce({ rowCount: 1 });

        const result = await Vod.alterarVisibilidade(link_vod, puuidDono, isPublic);

        expect(db.query).toHaveBeenNthCalledWith(1, expect.any(String), [link_vod]);
        expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [isPublic, link_vod]);
        expect(result).toEqual({ message: 'Visibilidade da VOD alterada com sucesso' });
    });

    test('Deve lançar erro "Partida não encontrada" quando a partida não existe', async () => {
        // Mock da consulta que retorna nenhuma partida
        db.query.mockResolvedValueOnce({ rows: [] });

        await expect(Vod.alterarVisibilidade(link_vod, puuidDono, isPublic)).rejects.toThrow('Partida não encontrada');

        expect(db.query).toHaveBeenCalledWith(expect.any(String), [link_vod]);
    });

    test('Deve lançar erro "Permissão negada" quando o usuário não é o dono da VOD', async () => {
        // Mock da consulta que retorna uma partida pertencente a outro usuário
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: puuidOutro }]
        });

        await expect(Vod.alterarVisibilidade(link_vod, puuidDono, isPublic)).rejects.toThrow('Permissão negada para alterar a visibilidade desta VOD');

        expect(db.query).toHaveBeenCalledWith(expect.any(String), [link_vod]);
    });

    test('Deve lançar erro ao atualizar a visibilidade no banco de dados', async () => {
        // Mock da consulta para verificar o dono da VOD
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: puuidDono }]
        });

        // Mock para simular erro na atualização da visibilidade
        const mockError = new Error('Erro ao atualizar o banco de dados');
        db.query.mockRejectedValueOnce(mockError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(Vod.alterarVisibilidade(link_vod, puuidDono, isPublic)).rejects.toThrow(mockError);

        expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [isPublic, link_vod]);
        expect(consoleSpy).toHaveBeenCalledWith('Erro ao alterar visibilidade da VOD:', mockError.message);

        consoleSpy.mockRestore();
    });
});

describe('Testes para a função adicionarTag', () => {
    const link_vod = 'testLinkVod';
    const tag = 'Test Tag';
    const inicio = 10;
    const fim = 20;
    const cor = 'bd4a4a';
    const puuidSession = 'user-123';

    afterEach(() => {
        jest.clearAllMocks(); // Limpa todos os mocks após cada teste
    });

    test('Deve adicionar uma tag com sucesso quando todas as validações passam', async () => {
        // Mock da consulta para verificar a partida
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: puuidSession, vod_publica: false }],
        });
    
        // Mock da consulta para verificar tags existentes
        db.query.mockResolvedValueOnce({
            rows: [],
        });
    
        // Mock da inserção da nova tag
        db.query.mockResolvedValueOnce({ rowCount: 1 });
    
        const result = await Vod.adicionarTag({
            link_vod,
            tag,
            inicio,
            fim,
            cor,
            puuidSession,
        });
    
        expect(db.query).toHaveBeenNthCalledWith(1, expect.any(String), [link_vod]);
        expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [link_vod]);
        expect(db.query).toHaveBeenNthCalledWith(3, expect.any(String), [link_vod, expect.any(String), expect.any(Number), expect.any(Number), expect.any(String)]);
        expect(result).toEqual({
            link_vod,
            tag: tag,
            inicio: inicio,
            fim: fim,
            cor: cor,
        });
    });

    test('Deve lançar erro quando parâmetros estão faltando', async () => {
        await expect(
            Vod.adicionarTag({
                link_vod: '',
                tag: '',
                inicio: undefined,
                fim: undefined,
                cor: '',
                puuidSession: '',
            })
        ).rejects.toThrow('Parâmetros inválidos ou incompletos.');
    });

    test('Deve lançar erro quando tempos de início e fim são inválidos', async () => {
        await expect(
            Vod.adicionarTag({
                link_vod,
                tag,
                inicio: 'abc',
                fim: 'def',
                cor,
                puuidSession,
            })
        ).rejects.toThrow('Tempos de início e fim inválidos.');

        await expect(
            Vod.adicionarTag({
                link_vod,
                tag,
                inicio: -10,
                fim: -5,
                cor,
                puuidSession,
            })
        ).rejects.toThrow('Tempos de início e fim inválidos.');

        await expect(
            Vod.adicionarTag({
                link_vod,
                tag,
                inicio: 20,
                fim: 10,
                cor,
                puuidSession,
            })
        ).rejects.toThrow('Tempos de início e fim inválidos.');
    });

    test('Deve truncar o nome da tag se exceder 30 caracteres', async () => {
        const longTagName = 'A'.repeat(35);
        const truncatedTagName = 'A'.repeat(30);

        // Mock da consulta para verificar a partida
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: puuidSession, vod_publica: false }],
        });

        // Mock da consulta para verificar tags existentes
        db.query.mockResolvedValueOnce({
            rows: [],
        });

        // Mock da inserção da nova tag
        db.query.mockResolvedValueOnce({ rowCount: 1 });

        const result = await Vod.adicionarTag({
            link_vod,
            tag: longTagName,
            inicio,
            fim,
            cor,
            puuidSession,
        });

        expect(result.tag).toBe(truncatedTagName);
    });

    test('Deve usar a cor padrão se uma cor inválida for fornecida', async () => {
        const invalidCor = 'invalidColor';
        const defaultCor = 'bd4a4a';

        // Mock da consulta para verificar a partida
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: puuidSession, vod_publica: false }],
        });

        // Mock da consulta para verificar tags existentes
        db.query.mockResolvedValueOnce({
            rows: [],
        });

        // Mock da inserção da nova tag
        db.query.mockResolvedValueOnce({ rowCount: 1 });

        const result = await Vod.adicionarTag({
            link_vod,
            tag,
            inicio,
            fim,
            cor: invalidCor,
            puuidSession,
        });

        expect(result.cor).toBe(defaultCor);
    });

    test('Deve lançar erro quando a partida não é encontrada', async () => {
        // Mock da consulta que retorna nenhuma partida
        db.query.mockResolvedValueOnce({ rows: [] });

        await expect(
            Vod.adicionarTag({
                link_vod,
                tag,
                inicio,
                fim,
                cor,
                puuidSession,
            })
        ).rejects.toThrow('Partida não encontrada.');
    });

    test('Deve lançar erro quando o usuário não tem permissão para adicionar a tag', async () => {
        // Mock da consulta que retorna uma partida pertencente a outro usuário e não pública
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: 'anotherUser', vod_publica: false }],
        });

        await expect(
            Vod.adicionarTag({
                link_vod,
                tag,
                inicio,
                fim,
                cor,
                puuidSession,
            })
        ).rejects.toThrow('Permissão negada para adicionar uma tag a esta VOD.');
    });

    test('Deve lançar erro quando a tag se sobrepõe a uma existente', async () => {
        // Mock da consulta para verificar a partida
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: puuidSession, vod_publica: false }],
        });

        // Mock da consulta que retorna uma tag existente que se sobrepõe
        db.query.mockResolvedValueOnce({
            rows: [{ inicio: 15, fim: 25 }],
        });

        await expect(
            Vod.adicionarTag({
                link_vod,
                tag,
                inicio,
                fim,
                cor,
                puuidSession,
            })
        ).rejects.toThrow('Já existe uma TAG que ocupa o mesmo ou parte do período de tempo escolhido.');
    });

    test('Deve lançar erro quando ocorre um erro ao inserir a tag no banco de dados', async () => {
        // Mock da consulta para verificar a partida
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: puuidSession, vod_publica: false }],
        });

        // Mock da consulta para verificar tags existentes
        db.query.mockResolvedValueOnce({
            rows: [],
        });

        // Mock para simular erro na inserção da tag
        const mockError = new Error('Erro ao inserir no banco de dados');
        db.query.mockRejectedValueOnce(mockError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(
            Vod.adicionarTag({
                link_vod,
                tag,
                inicio,
                fim,
                cor,
                puuidSession,
            })
        ).rejects.toThrow(mockError);

        expect(consoleSpy).toHaveBeenCalledWith('Erro ao adicionar tag:', mockError.message);

        consoleSpy.mockRestore();
    });
});

describe('Testes para a função adicionarComentario', () => {
    const link_vod = 'testLinkVod';
    const comentario = 'Comentário de Teste';
    const inicio = 10;
    const fim = 20;
    const puuidSession = 'user-123';

    afterEach(() => {
        jest.clearAllMocks(); // Limpa todos os mocks após cada teste
    });

    test('Deve adicionar um comentário com sucesso quando todas as validações passam', async () => {
        // Mock da consulta para verificar a partida
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: puuidSession, vod_publica: false }],
        });

        // Mock da consulta para verificar comentários existentes
        db.query.mockResolvedValueOnce({
            rows: [],
        });

        // Mock da inserção do novo comentário
        db.query.mockResolvedValueOnce({ rowCount: 1 });

        const result = await Vod.adicionarComentario({
            link_vod,
            comentario,
            inicio,
            fim,
            puuidSession,
        });

        expect(db.query).toHaveBeenNthCalledWith(1, expect.any(String), [link_vod]);
        expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [link_vod]);
        expect(db.query).toHaveBeenNthCalledWith(3, expect.any(String), [link_vod, expect.any(String), expect.any(Number), expect.any(Number)]);

        expect(result).toEqual({
            link_vod,
            comentario: comentario,
            inicio: inicio,
            fim: fim,
        });
    });

    test('Deve lançar erro quando parâmetros estão faltando', async () => {
        await expect(
            Vod.adicionarComentario({
                link_vod: '',
                comentario: '',
                inicio: undefined,
                fim: undefined,
                puuidSession: '',
            })
        ).rejects.toThrow('Parâmetros inválidos ou incompletos.');
    });

    test('Deve lançar erro quando tempos de início e fim são inválidos', async () => {
        await expect(
            Vod.adicionarComentario({
                link_vod,
                comentario,
                inicio: 'abc',
                fim: 'def',
                puuidSession,
            })
        ).rejects.toThrow('Tempos de início e fim inválidos.');

        await expect(
            Vod.adicionarComentario({
                link_vod,
                comentario,
                inicio: -10,
                fim: -5,
                puuidSession,
            })
        ).rejects.toThrow('Tempos de início e fim inválidos.');

        await expect(
            Vod.adicionarComentario({
                link_vod,
                comentario,
                inicio: 20,
                fim: 10,
                puuidSession,
            })
        ).rejects.toThrow('Tempos de início e fim inválidos.');
    });

    test('Deve truncar o comentário se exceder 200 caracteres', async () => {
        const comentarioLongo = 'A'.repeat(250);
        const comentarioTruncado = 'A'.repeat(200);

        // Mock da consulta para verificar a partida
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: puuidSession, vod_publica: false }],
        });

        // Mock da consulta para verificar comentários existentes
        db.query.mockResolvedValueOnce({
            rows: [],
        });

        // Mock da inserção do novo comentário
        db.query.mockResolvedValueOnce({ rowCount: 1 });

        const result = await Vod.adicionarComentario({
            link_vod,
            comentario: comentarioLongo,
            inicio,
            fim,
            puuidSession,
        });

        expect(result.comentario).toBe(comentarioTruncado);
    });

    test('Deve lançar erro quando a partida não é encontrada', async () => {
        // Mock da consulta que retorna nenhuma partida
        db.query.mockResolvedValueOnce({ rows: [] });

        await expect(
            Vod.adicionarComentario({
                link_vod,
                comentario,
                inicio,
                fim,
                puuidSession,
            })
        ).rejects.toThrow('Partida não encontrada.');
    });

    test('Deve lançar erro quando o usuário não tem permissão para adicionar o comentário', async () => {
        // Mock da consulta que retorna uma partida pertencente a outro usuário e não pública
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: 'outroUsuario', vod_publica: false }],
        });

        await expect(
            Vod.adicionarComentario({
                link_vod,
                comentario,
                inicio,
                fim,
                puuidSession,
            })
        ).rejects.toThrow('Permissão negada para adicionar um comentário a esta VOD.');
    });

    test('Deve lançar erro quando o comentário se sobrepõe a um existente', async () => {
        // Mock da consulta para verificar a partida
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: puuidSession, vod_publica: false }],
        });

        // Mock da consulta que retorna um comentário existente que se sobrepõe
        db.query.mockResolvedValueOnce({
            rows: [{ inicio: 15, fim: 25 }],
        });

        await expect(
            Vod.adicionarComentario({
                link_vod,
                comentario,
                inicio,
                fim,
                puuidSession,
            })
        ).rejects.toThrow('Conflito de tempo com um comentário existente.');
    });

    test('Deve lançar erro quando ocorre um erro ao inserir o comentário no banco de dados', async () => {
        // Mock da consulta para verificar a partida
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: puuidSession, vod_publica: false }],
        });

        // Mock da consulta para verificar comentários existentes
        db.query.mockResolvedValueOnce({
            rows: [],
        });

        // Mock para simular erro na inserção do comentário
        const mockError = new Error('Erro ao inserir no banco de dados');
        db.query.mockRejectedValueOnce(mockError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(
            Vod.adicionarComentario({
                link_vod,
                comentario,
                inicio,
                fim,
                puuidSession,
            })
        ).rejects.toThrow(mockError);

        expect(consoleSpy).toHaveBeenCalledWith('Erro ao adicionar comentário:', mockError.message);

        consoleSpy.mockRestore();
    });
});

describe('Testes para a função buscarTagsComentarios', () => {
    const link_vod = 'testLinkVod';

    afterEach(() => {
        jest.clearAllMocks(); // Limpa todos os mocks após cada teste
    });

    test('Deve retornar tags e comentários com sucesso quando existem registros', async () => {
        const mockTags = [
            { id: 1, tag: 'Tag1', inicio: 10, fim: 20, cor: 'bd4a4a' },
            { id: 2, tag: 'Tag2', inicio: 30, fim: 40, cor: '6fff4f' },
        ];

        const mockComentarios = [
            { id: 1, comentario: 'Comentário 1', inicio: 15, fim: 25 },
            { id: 2, comentario: 'Comentário 2', inicio: 35, fim: 45 },
        ];

        // Mock das consultas ao banco de dados
        db.query
            .mockResolvedValueOnce({ rows: mockTags })        // Primeiro db.query para tags
            .mockResolvedValueOnce({ rows: mockComentarios }); // Segundo db.query para comentários

        const result = await Vod.buscarTagsComentarios(link_vod);

        expect(db.query).toHaveBeenNthCalledWith(1, expect.any(String), [link_vod]);
        expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [link_vod]);

        expect(result).toEqual({
            tags: mockTags,
            comentarios: mockComentarios,
        });
    });

    test('Deve retornar arrays vazios quando não existem tags ou comentários', async () => {
        // Mock das consultas ao banco de dados retornando arrays vazios
        db.query
            .mockResolvedValueOnce({ rows: [] }) // Para tags
            .mockResolvedValueOnce({ rows: [] }); // Para comentários

        const result = await Vod.buscarTagsComentarios(link_vod);

        expect(db.query).toHaveBeenNthCalledWith(1, expect.any(String), [link_vod]);
        expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [link_vod]);

        expect(result).toEqual({
            tags: [],
            comentarios: [],
        });
    });

    test('Deve lançar erro quando ocorre um erro na consulta ao banco de dados', async () => {
        const mockError = new Error('Erro na consulta ao banco de dados');
        db.query.mockRejectedValueOnce(mockError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(Vod.buscarTagsComentarios(link_vod)).rejects.toThrow(mockError);

        expect(db.query).toHaveBeenCalledWith(expect.any(String), [link_vod]);
        expect(consoleSpy).toHaveBeenCalledWith('Erro ao buscar tags e comentários:', mockError.message);

        consoleSpy.mockRestore();
    });

    test('Deve lançar erro quando link_vod não é fornecido', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
        await expect(Vod.buscarTagsComentarios(undefined)).rejects.toThrow('link_vod é obrigatório');
    
        expect(consoleSpy).toHaveBeenCalledWith('Erro ao buscar tags e comentários:', 'link_vod é obrigatório');
    
        consoleSpy.mockRestore();
    });
});

describe('Testes para a função editarItem', () => {
    const link_vod = 'testLinkVod';
    const puuidSession = 'user-123';
    const id = 1;
    const inicio = 10;
    const fim = 20;
    const nomeTag = 'Nova Tag';
    const nomeComentario = 'Novo Comentário';
    const cor = 'bd4a4a';
    const tipoTag = 'tag';
    const tipoComentario = 'comentario';

    afterEach(() => {
        jest.clearAllMocks(); // Limpa todos os mocks após cada teste
    });

    test('Deve editar uma tag com sucesso quando todas as validações passam', async () => {
        // Mock da consulta para verificar a partida
        db.query.mockResolvedValueOnce({ rows: [{ puuid: puuidSession, vod_publica: false }] });

        // Mock da consulta para verificar itens existentes (sem conflitos)
        db.query.mockResolvedValueOnce({ rows: [] });

        // Mock da atualização do item
        db.query.mockResolvedValueOnce({ rowCount: 1 });

        const result = await Vod.editarItem({
            id,
            nome: nomeTag,
            inicio,
            fim,
            cor,
            link_vod,
            tipo: tipoTag,
            puuidSession,
        });

        expect(db.query).toHaveBeenNthCalledWith(1, expect.any(String), [link_vod]);
        expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [link_vod, id]);
        expect(db.query).toHaveBeenNthCalledWith(3, expect.any(String), [nomeTag, inicio, fim, cor, id, link_vod]);

        expect(result).toEqual({
            id,
            nome: nomeTag,
            inicio,
            fim,
            cor,
            tipo: tipoTag,
            link_vod,
        });
    });

    test('Deve editar um comentário com sucesso quando todas as validações passam', async () => {
        // Mock da consulta para verificar a partida
        db.query.mockResolvedValueOnce({ rows: [{ puuid: puuidSession, vod_publica: false }] });

        // Mock da consulta para verificar itens existentes (sem conflitos)
        db.query.mockResolvedValueOnce({ rows: [] });

        // Mock da atualização do item
        db.query.mockResolvedValueOnce({ rowCount: 1 });

        const result = await Vod.editarItem({
            id,
            nome: nomeComentario,
            inicio,
            fim,
            link_vod,
            tipo: tipoComentario,
            puuidSession,
        });

        expect(db.query).toHaveBeenNthCalledWith(1, expect.any(String), [link_vod]);
        expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [link_vod, id]);
        expect(db.query).toHaveBeenNthCalledWith(3, expect.any(String), [nomeComentario, inicio, fim, id, link_vod]);

        expect(result).toEqual({
            id,
            nome: nomeComentario,
            inicio,
            fim,
            cor: undefined,
            tipo: tipoComentario,
            link_vod,
        });
    });

    test('Deve lançar erro quando parâmetros estão faltando', async () => {
        await expect(
            Vod.editarItem({
                id,
                nome: '',
                inicio: undefined,
                fim: undefined,
                cor,
                link_vod: '',
                tipo: tipoTag,
                puuidSession,
            })
        ).rejects.toThrow('Parâmetros inválidos ou incompletos.');
    });

    test('Deve lançar erro quando tempos de início e fim são inválidos', async () => {
        await expect(
            Vod.editarItem({
                id,
                nome: nomeTag,
                inicio: 'abc',
                fim: 'def',
                cor,
                link_vod,
                tipo: tipoTag,
                puuidSession,
            })
        ).rejects.toThrow('Tempos de início e fim inválidos.');

        await expect(
            Vod.editarItem({
                id,
                nome: nomeTag,
                inicio: -10,
                fim: -5,
                cor,
                link_vod,
                tipo: tipoTag,
                puuidSession,
            })
        ).rejects.toThrow('Tempos de início e fim inválidos.');

        await expect(
            Vod.editarItem({
                id,
                nome: nomeTag,
                inicio: 20,
                fim: 10,
                cor,
                link_vod,
                tipo: tipoTag,
                puuidSession,
            })
        ).rejects.toThrow('Tempos de início e fim inválidos.');
    });

    test('Deve lançar erro quando a cor fornecida é inválida ao editar uma tag', async () => {
        const corInvalida = 'invalidColor';

        await expect(
            Vod.editarItem({
                id,
                nome: nomeTag,
                inicio,
                fim,
                cor: corInvalida,
                link_vod,
                tipo: tipoTag,
                puuidSession,
            })
        ).rejects.toThrow('Cor inválida.');
    });

    test('Deve lançar erro quando o usuário não tem permissão para editar o item', async () => {
        // Mock da consulta que retorna uma partida pertencente a outro usuário
        db.query.mockResolvedValueOnce({ rows: [{ puuid: 'outroUsuario', vod_publica: false }] });

        await expect(
            Vod.editarItem({
                id,
                nome: nomeTag,
                inicio,
                fim,
                cor,
                link_vod,
                tipo: tipoTag,
                puuidSession,
            })
        ).rejects.toThrow('Permissão negada para editar este item.');
    });

    test('Deve lançar erro devido a conflito de tempo com outros itens', async () => {
        // Mock da consulta para verificar a partida
        db.query.mockResolvedValueOnce({ rows: [{ puuid: puuidSession, vod_publica: false }] });

        // Mock da consulta que retorna um item existente que se sobrepõe
        db.query.mockResolvedValueOnce({ rows: [{ inicio: 15, fim: 25 }] });

        await expect(
            Vod.editarItem({
                id,
                nome: nomeTag,
                inicio,
                fim,
                cor,
                link_vod,
                tipo: tipoTag,
                puuidSession,
            })
        ).rejects.toThrow('Conflito de tempo com um item existente.');
    });

    test('Deve lançar erro quando o item não é encontrado ou não pertence à VOD', async () => {
        // Mock da consulta para verificar a partida
        db.query.mockResolvedValueOnce({ rows: [{ puuid: puuidSession, vod_publica: false }] });

        // Mock da consulta para verificar itens existentes (sem conflitos)
        db.query.mockResolvedValueOnce({ rows: [] });

        // Mock da atualização do item que não atualiza nenhuma linha
        db.query.mockResolvedValueOnce({ rowCount: 0 });

        await expect(
            Vod.editarItem({
                id,
                nome: nomeTag,
                inicio,
                fim,
                cor,
                link_vod,
                tipo: tipoTag,
                puuidSession,
            })
        ).rejects.toThrow('Item não encontrado ou não pertence a esta VOD.');
    });

    test('Deve lançar erro ao atualizar o item no banco de dados', async () => {
        // Mock da consulta para verificar a partida
        db.query.mockResolvedValueOnce({ rows: [{ puuid: puuidSession, vod_publica: false }] });

        // Mock da consulta para verificar itens existentes (sem conflitos)
        db.query.mockResolvedValueOnce({ rows: [] });

        // Mock para simular erro na atualização do item
        const mockError = new Error('Erro ao atualizar no banco de dados');
        db.query.mockRejectedValueOnce(mockError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(
            Vod.editarItem({
                id,
                nome: nomeTag,
                inicio,
                fim,
                cor,
                link_vod,
                tipo: tipoTag,
                puuidSession,
            })
        ).rejects.toThrow(mockError);

        expect(consoleSpy).toHaveBeenCalledWith('Erro ao editar item:', mockError.message);

        consoleSpy.mockRestore();
    });
});

describe('Testes para a função removerItem', () => {
    const id = 1;
    const link_vod = 'testLinkVod';
    const tipoTag = 'tag';
    const tipoComentario = 'comentario';

    afterEach(() => {
        jest.clearAllMocks(); // Limpa todos os mocks após cada teste
    });

    test('Deve remover uma tag com sucesso quando todas as validações passam', async () => {
        // Mock da query de remoção retornando rowCount > 0
        db.query.mockResolvedValueOnce({ rowCount: 1 });

        const result = await Vod.removerItem({ id, link_vod, tipo: tipoTag });

        expect(db.query).toHaveBeenCalledWith(
            'DELETE FROM tags WHERE id = $1 AND link_vod = $2',
            [id, link_vod]
        );
        expect(result).toEqual({ id, tipo: tipoTag, link_vod });
    });

    test('Deve remover um comentário com sucesso quando todas as validações passam', async () => {
        // Mock da query de remoção retornando rowCount > 0
        db.query.mockResolvedValueOnce({ rowCount: 1 });

        const result = await Vod.removerItem({ id, link_vod, tipo: tipoComentario });

        expect(db.query).toHaveBeenCalledWith(
            'DELETE FROM comentarios WHERE id = $1 AND link_vod = $2',
            [id, link_vod]
        );
        expect(result).toEqual({ id, tipo: tipoComentario, link_vod });
    });

    test('Deve lançar erro quando um tipo inválido é fornecido', async () => {
        const tipoInvalido = 'invalidType';

        await expect(
            Vod.removerItem({ id, link_vod, tipo: tipoInvalido })
        ).rejects.toThrow('Tipo inválido. Deve ser "tag" ou "comentario".');

        // Verifica que db.query não foi chamado
        expect(db.query).not.toHaveBeenCalled();
    });

    test('Deve lançar erro quando o item não é encontrado ou não pertence à VOD', async () => {
        // Mock da query de remoção retornando rowCount = 0
        db.query.mockResolvedValueOnce({ rowCount: 0 });

        await expect(
            Vod.removerItem({ id, link_vod, tipo: tipoTag })
        ).rejects.toThrow('Item não encontrado ou não pertence a esta VOD.');

        expect(db.query).toHaveBeenCalledWith(
            'DELETE FROM tags WHERE id = $1 AND link_vod = $2',
            [id, link_vod]
        );
    });

    test('Deve lançar erro ao executar a query de remoção no banco de dados', async () => {
        const mockError = new Error('Erro no banco de dados');
        db.query.mockRejectedValueOnce(mockError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(
            Vod.removerItem({ id, link_vod, tipo: tipoTag })
        ).rejects.toThrow(mockError);

        expect(db.query).toHaveBeenCalledWith(
            'DELETE FROM tags WHERE id = $1 AND link_vod = $2',
            [id, link_vod]
        );
        expect(consoleSpy).toHaveBeenCalledWith('Erro ao remover item:', mockError.message);

        consoleSpy.mockRestore();
    });

    test('Deve lançar erro quando parâmetros obrigatórios estão faltando', async () => {
        await expect(
            Vod.removerItem({ id: undefined, link_vod: undefined, tipo: undefined })
        ).rejects.toThrow();

        // Verifica que db.query não foi chamado
        expect(db.query).not.toHaveBeenCalled();
    });
});
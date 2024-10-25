const { obterMetasEspecificas,
    obterMetasLivres,
    adicionarMetaEspecifica,
    alterarMetaEspecifica,
    atualizarProgressoMetaEspecifica,
    adicionarMetaLivre,
    atualizarStatusMetaLivre,
    removerMetaEspecifica,
    removerMetaLivre } = require('../src/models/meta');

jest.mock('../src/database');
const db = require('../src/database');

jest.mock('axios');
const axios = require('axios');

describe('obterMetasEspecificas', () => {
    const puuid = 'mock-puuid';

    beforeEach(() => {
        jest.clearAllMocks(); // Limpa os mocks antes de cada teste
    });

    it('deve retornar uma lista de metas específicas quando db.query for bem-sucedido', async () => {
        // Mock dos dados retornados pelo db.query
        const mockMetas = [
            { id: 1, tipo: 'especifica', tipo_meta: 'partidas_total', objetivo: 100, limite_partidas: null, progresso_atual: 50, descricao: 'Jogar 100 partidas' },
            { id: 2, tipo: 'especifica', tipo_meta: 'media_cs', objetivo: 8, limite_partidas: 10, progresso_atual: 7.5, descricao: 'Alcançar média de 8 CS/min' }
        ];

        db.query.mockResolvedValueOnce({ rows: mockMetas });

        // Executa a função a ser testada
        const result = await obterMetasEspecificas(puuid);

        // Verifica se o db.query foi chamado corretamente
        expect(db.query).toHaveBeenCalledWith(expect.any(String), [puuid]);

        // Verifica se o resultado corresponde ao mock
        expect(result).toEqual(mockMetas);
    });

    it('deve retornar uma lista vazia se não houver metas', async () => {
        // Mock do retorno do db.query sem resultados
        db.query.mockResolvedValueOnce({ rows: [] });

        const result = await obterMetasEspecificas(puuid);

        expect(db.query).toHaveBeenCalledWith(expect.any(String), [puuid]);
        expect(result).toEqual([]);
    });

    it('deve lançar um erro se o db.query falhar', async () => {
        // Mock de um erro no db.query
        const mockError = new Error('Erro no banco de dados');
        db.query.mockRejectedValueOnce(mockError);

        // Verifica se a função lança o erro
        await expect(obterMetasEspecificas(puuid)).rejects.toThrow('Erro no banco de dados');
    });
});

describe('obterMetasLivres', () => {
    const puuid = 'mock-puuid';

    beforeEach(() => {
        jest.clearAllMocks(); // Limpa os mocks antes de cada teste
    });

    it('deve retornar uma lista de metas livres quando db.query for bem-sucedido', async () => {
        // Mock dos dados retornados pelo db.query
        const mockMetasLivres = [
            { id: 1, tipo: 'livre', tipo_meta: 'livre', nome_meta: 'Meta Livre 1', status: true },
            { id: 2, tipo: 'livre', tipo_meta: 'livre', nome_meta: 'Meta Livre 2', status: false }
        ];

        // Simula o comportamento de db.query resolvendo com o mock
        db.query.mockResolvedValueOnce({ rows: mockMetasLivres });

        // Executa a função a ser testada
        const result = await obterMetasLivres(puuid);

        // Verifica se o db.query foi chamado com os parâmetros corretos
        expect(db.query).toHaveBeenCalledWith(expect.any(String), [puuid]);

        // Verifica se o resultado corresponde ao mock
        expect(result).toEqual(mockMetasLivres);
    });

    it('deve retornar uma lista vazia se não houver metas livres', async () => {
        // Simula o retorno de uma lista vazia
        db.query.mockResolvedValueOnce({ rows: [] });

        const result = await obterMetasLivres(puuid);

        // Verifica se o db.query foi chamado corretamente
        expect(db.query).toHaveBeenCalledWith(expect.any(String), [puuid]);

        // Verifica se a função retorna uma lista vazia
        expect(result).toEqual([]);
    });

    it('deve lançar um erro se o db.query falhar', async () => {
        // Mock de um erro no db.query
        const mockError = new Error('Erro no banco de dados');
        db.query.mockRejectedValueOnce(mockError);

        // Verifica se a função lança o erro
        await expect(obterMetasLivres(puuid)).rejects.toThrow('Erro no banco de dados');
    });
});

describe('adicionarMetaEspecifica', () => {
    const puuid = 'mock-puuid';

    beforeEach(() => {
        jest.clearAllMocks();  // Limpa os mocks antes de cada teste
    });

    it('deve adicionar uma meta do tipo "partidas_total" com sucesso', async () => {
        const objetivo = 50;
        const tipo = 'partidas_total';

        // Mock do retorno de db.query para contar partidas
        db.query.mockResolvedValueOnce({ rows: [{ count: 25 }] });

        // Mock do retorno do INSERT no banco
        db.query.mockResolvedValueOnce({ rows: [{ puuid, tipo_meta: tipo, objetivo, limite_partidas: null, progresso_atual: 25 }] });

        const result = await adicionarMetaEspecifica(puuid, tipo, objetivo);

        // Verifica se a query de contagem de partidas foi chamada corretamente
        expect(db.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM partidas WHERE puuid = $1', [puuid]);

        // Verifica se a inserção foi feita com os dados corretos
        expect(db.query).toHaveBeenCalledWith(expect.any(String), [puuid, tipo, objetivo, null, 25, 'Jogar 50 partidas']);

        // Verifica se o resultado final é o esperado
        expect(result).toEqual({ puuid, tipo_meta: tipo, objetivo, limite_partidas: null, progresso_atual: 25 });
    });

    it('deve adicionar uma meta do tipo "partidas_campeao_" com sucesso', async () => {
        const tipo = 'partidas_campeao_Nunu';
        const objetivo = 30;

        // Mock da consulta para contagem de partidas com o campeão
        db.query.mockResolvedValueOnce({ rows: [{ count: 10 }] });

        // Mock do INSERT da meta específica
        db.query.mockResolvedValueOnce({ rows: [{ puuid, tipo_meta: tipo, objetivo, limite_partidas: null, progresso_atual: 10 }] });

        const result = await adicionarMetaEspecifica(puuid, tipo, objetivo);

        // Verifica se a query de contagem de partidas com campeão foi chamada corretamente
        expect(db.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM partidas WHERE puuid = $1 AND campeao = $2', [puuid, 'Nunu']);

        // Verifica se a inserção foi feita com os dados corretos
        expect(db.query).toHaveBeenCalledWith(expect.any(String), [puuid, tipo, objetivo, null, 10, 'Jogar 30 partidas de Nunu']);

        // Verifica o resultado final
        expect(result).toEqual({ puuid, tipo_meta: tipo, objetivo, limite_partidas: null, progresso_atual: 10 });
    });

    it('deve adicionar uma meta do tipo "objetivo_elo" com sucesso', async () => {
        const tipo = 'objetivo_elo';
        const objetivo = 21; // Exemplo de Esmeralda IV

        // Mock do retorno da consulta para obter o Summoner ID
        db.query.mockResolvedValueOnce({ rows: [{ summoner_id: 'mockSummonerId' }] });

        // Mock da chamada à API da Riot para retornar Esmeralda I
        axios.get.mockResolvedValueOnce({ data: [{ queueType: 'RANKED_SOLO_5x5', tier: 'EMERALD', rank: 'IV' }] });

        // Mock do INSERT da meta no banco
        db.query.mockResolvedValueOnce({ rows: [{ puuid, tipo_meta: tipo, objetivo, limite_partidas: null, progresso_atual: 20 }] });

        const result = await adicionarMetaEspecifica(puuid, tipo, objetivo);

        // Verifica se a query para obter o Summoner ID foi chamada
        expect(db.query).toHaveBeenCalledWith('SELECT summoner_id FROM jogadores WHERE puuid = $1', [puuid]);

        // Verifica se a chamada à API da Riot foi feita corretamente
        expect(axios.get).toHaveBeenCalledWith(
            `https://br1.api.riotgames.com/lol/league/v4/entries/by-summoner/mockSummonerId`,
            { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
        );

        // Verifica se o INSERT foi chamado corretamente com Esmeralda IV
        expect(db.query).toHaveBeenCalledWith(expect.any(String), [puuid, tipo, objetivo, null, 21, 'Alcançar o Elo Esmeralda IV']);

        // Verifica o resultado final
        expect(result).toEqual({ puuid, tipo_meta: tipo, objetivo, limite_partidas: null, progresso_atual: 20 });
    });

    it('deve lançar um erro se os parâmetros forem inválidos', async () => {
        const tipo = 'partidas_total';
        const objetivo = -1;  // Objetivo inválido

        // Espera que a função lance um erro
        await expect(adicionarMetaEspecifica(puuid, tipo, objetivo)).rejects.toThrow('Parâmetros inválidos para meta do tipo "partidas totais"');
    });
});

describe('atualizarProgressoMetaEspecifica', () => {
    beforeEach(() => {
        jest.clearAllMocks();  // Limpa os mocks antes de cada teste
    });

    it('deve atualizar o progresso de uma meta do tipo "partidas_total" corretamente', async () => {
        const idMeta = 1;
        const puuid = 'mock-puuid';
        
        // Mock da consulta que retorna a meta específica
        db.query.mockResolvedValueOnce({
            rows: [{ id: idMeta, puuid, tipo_meta: 'partidas_total' }]
        });
        
        // Mock da consulta que retorna o número de partidas
        db.query.mockResolvedValueOnce({
            rows: [{ count: 50 }]
        });
        
        // Mock da atualização da meta
        db.query.mockResolvedValueOnce({
            rows: [{ id: idMeta, progresso_atual: 50 }]
        });
        
        // Executa a função
        const result = await atualizarProgressoMetaEspecifica(idMeta);
        
        // Verifica se a consulta foi feita corretamente para obter a meta
        expect(db.query).toHaveBeenNthCalledWith(1, 'SELECT * FROM metas_especificas WHERE id = $1', [idMeta]);

        // Verifica se o progresso foi calculado corretamente
        expect(db.query).toHaveBeenNthCalledWith(2, 'SELECT COUNT(*) FROM partidas WHERE puuid = $1', [puuid]);

        // Verifica se a atualização foi feita corretamente
        expect(db.query).toHaveBeenNthCalledWith(
            3,
            expect.stringContaining('UPDATE metas_especificas'),
            [50, idMeta]
        );
        
        // Verifica o resultado final
        expect(result).toEqual({ id: idMeta, progresso_atual: 50 });
    });

    it('deve atualizar o progresso de uma meta do tipo "objetivo_elo" com sucesso', async () => {
        const idMeta = 2;
        const puuid = 'mock-puuid';
        const progressoEsperado = 21; // Valor correto para Esmeralda IV
        
        // Mock da consulta que retorna a meta específica
        db.query.mockResolvedValueOnce({
            rows: [{ id: idMeta, puuid, tipo_meta: 'objetivo_elo' }]
        });
        
        // Mock da consulta para obter o Summoner ID
        db.query.mockResolvedValueOnce({
            rows: [{ summoner_id: 'mockSummonerId' }]
        });
        
        // Mock da chamada à API da Riot para retornar Esmeralda IV
        axios.get.mockResolvedValueOnce({
            data: [{ queueType: 'RANKED_SOLO_5x5', tier: 'EMERALD', rank: 'IV' }]
        });
        
        // Mock da atualização da meta
        db.query.mockResolvedValueOnce({
            rows: [{ id: idMeta, progresso_atual: progressoEsperado }] // Esmeralda IV mapeia para 21
        });
        
        // Executa a função
        const result = await atualizarProgressoMetaEspecifica(idMeta);
        
        // Verifica se a consulta foi feita corretamente para obter a meta
        expect(db.query).toHaveBeenCalledWith('SELECT * FROM metas_especificas WHERE id = $1', [idMeta]);
        
        // Verifica se a consulta para o Summoner ID foi feita corretamente
        expect(db.query).toHaveBeenCalledWith('SELECT summoner_id FROM jogadores WHERE puuid = $1', [puuid]);
        
        // Verifica se a chamada à API da Riot foi feita corretamente
        expect(axios.get).toHaveBeenCalledWith(
            'https://br1.api.riotgames.com/lol/league/v4/entries/by-summoner/mockSummonerId',
            { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
        );
        
        // Verifica se a atualização foi feita corretamente
        expect(db.query).toHaveBeenCalledWith(
            'UPDATE metas_especificas SET progresso_atual = $1 WHERE id = $2 RETURNING *;',
            [progressoEsperado, idMeta]
        );
        
        // Verifica o resultado final
        expect(result).toEqual({ id: idMeta, progresso_atual: progressoEsperado });
    });

    it('deve lançar um erro se a meta não for encontrada', async () => {
        const idMeta = 3;

        // Mock da consulta que não encontra a meta
        db.query.mockResolvedValueOnce({ rows: [] });

        await expect(atualizarProgressoMetaEspecifica(idMeta)).rejects.toThrow('Meta não encontrada');

        // Verifica se a consulta foi feita corretamente
        expect(db.query).toHaveBeenCalledWith('SELECT * FROM metas_especificas WHERE id = $1', [idMeta]);
    });

    it('deve lançar um erro se a meta não for encontrada', async () => {
        const idMeta = 3;
    
        // Mock da consulta que não encontra a meta
        db.query.mockResolvedValueOnce({ rows: [] });
    
        await expect(atualizarProgressoMetaEspecifica(idMeta)).rejects.toThrow('Meta não encontrada');
    
        // Verifica se a consulta foi feita corretamente
        expect(db.query).toHaveBeenCalledWith('SELECT * FROM metas_especificas WHERE id = $1', [idMeta]);
    });
});

describe('alterarMetaEspecifica', () => {
    beforeEach(() => {
        jest.resetAllMocks(); // Reseta todos os mocks após cada teste
    });

    it('deve alterar a meta do tipo "partidas_total" com sucesso', async () => {
        const idMeta = 1;
        const puuid = 'mock-puuid';
        const novoObjetivo = 100;
        const novoLimite = null;

        // Mock da consulta que retorna a meta específica
        db.query.mockResolvedValueOnce({
            rows: [{ id: idMeta, puuid, tipo_meta: 'partidas_total', limite_partidas: null }]
        });

        // Mock da consulta que retorna o número de partidas
        db.query.mockResolvedValueOnce({
            rows: [{ count: 50 }]
        });

        // Mock da atualização da meta
        db.query.mockResolvedValueOnce({
            rows: [{ id: idMeta, progresso_atual: 50, objetivo: novoObjetivo, descricao: 'Jogar 100 partidas' }]
        });

        const result = await alterarMetaEspecifica(idMeta, novoObjetivo, novoLimite, puuid);

        // Verifica se a consulta foi feita corretamente para obter a meta
        expect(db.query).toHaveBeenNthCalledWith(1, 'SELECT * FROM metas_especificas WHERE id = $1 AND puuid = $2', [idMeta, puuid]);

        // Verifica se o progresso foi calculado corretamente
        expect(db.query).toHaveBeenNthCalledWith(2, 'SELECT COUNT(*) FROM partidas WHERE puuid = $1', [puuid]);

        // Verifica se a atualização foi feita corretamente
        expect(db.query).toHaveBeenNthCalledWith(
            3,
            expect.stringContaining('UPDATE metas_especificas'),
            [100, null, 50, 'Jogar 100 partidas', idMeta, puuid]
        );

        // Verifica o resultado final
        expect(result).toEqual({ id: idMeta, progresso_atual: 50, objetivo: novoObjetivo, descricao: 'Jogar 100 partidas' });
    });

    it('deve alterar a meta do tipo "objetivo_elo" com sucesso', async () => {
        const idMeta = 2;
        const puuid = 'mock-puuid';
        const novoObjetivo = 21; // Esmeralda IV
        const novoLimite = null;

        // Mock da consulta que retorna a meta específica
        db.query.mockResolvedValueOnce({
            rows: [{ id: idMeta, puuid, tipo_meta: 'objetivo_elo', limite_partidas: null }]
        });

        // Mock da consulta para obter o Summoner ID
        db.query.mockResolvedValueOnce({
            rows: [{ summoner_id: 'mockSummonerId' }]
        });

        // Mock da chamada à API da Riot para retornar Esmeralda IV
        axios.get.mockResolvedValueOnce({
            data: [{ queueType: 'RANKED_SOLO_5x5', tier: 'EMERALD', rank: 'IV' }]
        });

        // Mock da atualização da meta
        db.query.mockResolvedValueOnce({
            rows: [{ id: idMeta, progresso_atual: 21, objetivo: novoObjetivo, descricao: 'Alcançar o Elo Esmeralda IV' }]
        });

        const result = await alterarMetaEspecifica(idMeta, novoObjetivo, novoLimite, puuid);

        // Verifica se a consulta foi feita corretamente para obter a meta
        expect(db.query).toHaveBeenNthCalledWith(1, 'SELECT * FROM metas_especificas WHERE id = $1 AND puuid = $2', [idMeta, puuid]);

        // Verifica se a consulta para o Summoner ID foi feita corretamente
        expect(db.query).toHaveBeenNthCalledWith(2, 'SELECT summoner_id FROM jogadores WHERE puuid = $1', [puuid]);

        // Verifica se a chamada à API da Riot foi feita corretamente
        expect(axios.get).toHaveBeenCalledWith(
            'https://br1.api.riotgames.com/lol/league/v4/entries/by-summoner/mockSummonerId',
            { headers: { 'X-Riot-Token': process.env.RIOT_API_KEY } }
        );

        // Verifica se a atualização foi feita corretamente
        expect(db.query).toHaveBeenNthCalledWith(
            3,
            expect.stringContaining('UPDATE metas_especificas'),
            [21, null, 21, 'Alcançar o Elo Esmeralda IV', idMeta, puuid]
        );

        // Verifica o resultado final
        expect(result).toEqual({ id: idMeta, progresso_atual: 21, objetivo: novoObjetivo, descricao: 'Alcançar o Elo Esmeralda IV' });
    });

    it('deve lançar um erro se a meta não for encontrada ou o usuário não for autorizado', async () => {
        const idMeta = 3;
        const puuid = 'mock-puuid';
        const novoObjetivo = 50;
        const novoLimite = null;

        // Mock da consulta que não encontra a meta
        db.query.mockResolvedValueOnce({ rows: [] });

        await expect(alterarMetaEspecifica(idMeta, novoObjetivo, novoLimite, puuid)).rejects.toThrow('Meta não encontrada ou usuário não autorizado');

        // Verifica se a consulta foi feita corretamente
        expect(db.query).toHaveBeenCalledWith('SELECT * FROM metas_especificas WHERE id = $1 AND puuid = $2', [idMeta, puuid]);
    });
});

describe('removerMetaEspecifica', () => {
    beforeEach(() => {
        jest.resetAllMocks(); // Reseta todos os mocks após cada teste
    });

    it('deve remover a meta específica com sucesso quando a meta existe e pertence ao usuário', async () => {
        const idMeta = 1;
        const puuid = 'user-puuid';

        // Mock da consulta que verifica se a meta existe e pertence ao usuário
        db.query.mockResolvedValueOnce({
            rows: [{ puuid }]
        });

        // Mock da consulta que exclui a meta
        db.query.mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ id: idMeta, puuid }]
        });

        // Executa a função
        const result = await removerMetaEspecifica(idMeta, puuid);

        // Verifica se a primeira consulta foi feita corretamente
        expect(db.query).toHaveBeenNthCalledWith(1, 'SELECT puuid FROM metas_especificas WHERE id = $1', [idMeta]);

        // Verifica se a segunda consulta (exclusão) foi feita corretamente
        expect(db.query).toHaveBeenNthCalledWith(2, 'DELETE FROM metas_especificas WHERE id = $1 RETURNING *', [idMeta]);

        // Verifica o resultado
        expect(result).toEqual({
            message: 'Meta excluída com sucesso',
            metaExcluida: { id: idMeta, puuid }
        });
    });

    it('deve lançar um erro se a meta não for encontrada', async () => {
        const idMeta = 2;
        const puuid = 'user-puuid';

        // Mock da consulta que verifica se a meta existe e retorna vazio
        db.query.mockResolvedValueOnce({
            rows: []
        });

        // Executa a função e espera que lance um erro
        await expect(removerMetaEspecifica(idMeta, puuid)).rejects.toThrow('Meta não encontrada');

        // Verifica se a primeira consulta foi feita corretamente
        expect(db.query).toHaveBeenCalledWith('SELECT puuid FROM metas_especificas WHERE id = $1', [idMeta]);
    });

    it('deve lançar um erro se o PUUID não corresponder ao dono da meta', async () => {
        const idMeta = 3;
        const puuid = 'user-puuid';
        const metaOwnerPuuid = 'other-user-puuid';

        // Mock da consulta que verifica se a meta existe e retorna meta com puuid diferente
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: metaOwnerPuuid }]
        });

        // Executa a função e espera que lance um erro
        await expect(removerMetaEspecifica(idMeta, puuid)).rejects.toThrow('Permissão negada: PUUID não corresponde ao dono da meta');

        // Verifica se a primeira consulta foi feita corretamente
        expect(db.query).toHaveBeenCalledWith('SELECT puuid FROM metas_especificas WHERE id = $1', [idMeta]);
    });

    it('deve lançar um erro se ocorrer um erro ao excluir a meta', async () => {
        const idMeta = 4;
        const puuid = 'user-puuid';

        // Mock da consulta que verifica se a meta existe e pertence ao usuário
        db.query.mockResolvedValueOnce({
            rows: [{ puuid }]
        });

        // Mock da consulta que tenta excluir a meta mas não afeta nenhuma linha
        db.query.mockResolvedValueOnce({
            rowCount: 0,
            rows: []
        });

        // Executa a função e espera que lance um erro
        await expect(removerMetaEspecifica(idMeta, puuid)).rejects.toThrow('Erro ao excluir a meta');

        // Verifica se as consultas foram feitas corretamente
        expect(db.query).toHaveBeenNthCalledWith(1, 'SELECT puuid FROM metas_especificas WHERE id = $1', [idMeta]);
        expect(db.query).toHaveBeenNthCalledWith(2, 'DELETE FROM metas_especificas WHERE id = $1 RETURNING *', [idMeta]);
    });
});

describe('adicionarMetaLivre', () => {
    beforeEach(() => {
        jest.resetAllMocks(); // Reseta todos os mocks após cada teste
    });

    it('deve adicionar uma nova meta livre com sucesso', async () => {
        const puuid = 'user-puuid';
        const nomeMeta = 'Minha nova meta livre';

        // Mock da consulta que insere a nova meta
        db.query.mockResolvedValueOnce({
            rows: [{
                id: 1,
                puuid,
                nome_meta: nomeMeta,
                status: false
            }]
        });

        // Executa a função
        const result = await adicionarMetaLivre(puuid, nomeMeta);

        // Verifica se a consulta foi chamada corretamente
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO metas_livres'),
            [puuid, nomeMeta]
        );

        // Verifica o resultado
        expect(result).toEqual({
            id: 1,
            puuid,
            nome_meta: nomeMeta,
            status: false
        });
    });

    it('deve lançar um erro se o nome da meta tiver mais de 100 caracteres', async () => {
        const puuid = 'user-puuid';
        const nomeMeta = 'a'.repeat(101); // 101 caracteres

        // Executa a função e espera que lance o erro
        await expect(adicionarMetaLivre(puuid, nomeMeta)).rejects.toThrow('O nome da meta deve ter no máximo 100 caracteres');

        // Verifica que o db.query não foi chamado
        expect(db.query).not.toHaveBeenCalled();
    });

    it('deve propagar erros inesperados do banco de dados', async () => {
        const puuid = 'user-puuid';
        const nomeMeta = 'Minha nova meta livre';

        // Mock da consulta que lança um erro
        const dbError = new Error('Erro no banco de dados');
        db.query.mockRejectedValueOnce(dbError);

        // Executa a função e espera que lance o erro
        await expect(adicionarMetaLivre(puuid, nomeMeta)).rejects.toThrow(dbError);

        // Verifica se a consulta foi chamada corretamente
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO metas_livres'),
            [puuid, nomeMeta]
        );
    });
});

describe('atualizarStatusMetaLivre', () => {
    beforeEach(() => {
        jest.resetAllMocks(); // Reseta todos os mocks após cada teste
    });

    it('deve atualizar o status da meta livre com sucesso quando a meta existe e pertence ao usuário', async () => {
        const idMeta = 1;
        const puuid = 'user-puuid';
        const statusAtual = false;
        const novoStatus = !statusAtual;

        // Mock da consulta que retorna a meta livre
        db.query.mockResolvedValueOnce({
            rows: [{ puuid, status: statusAtual }]
        });

        // Mock da consulta que atualiza o status da meta
        db.query.mockResolvedValueOnce({
            rows: [{ id: idMeta, puuid, status: novoStatus }]
        });

        // Executa a função
        const result = await atualizarStatusMetaLivre(idMeta, puuid);

        // Verifica se a primeira consulta foi chamada corretamente
        expect(db.query).toHaveBeenNthCalledWith(1, 'SELECT puuid, status FROM metas_livres WHERE id = $1', [idMeta]);

        // Verifica se a segunda consulta foi chamada corretamente
        expect(db.query).toHaveBeenNthCalledWith(2, 'UPDATE metas_livres SET status = $1 WHERE id = $2 RETURNING *', [novoStatus, idMeta]);

        // Verifica o resultado
        expect(result).toEqual({ id: idMeta, puuid, status: novoStatus });
    });

    it('deve lançar um erro se a meta não for encontrada', async () => {
        const idMeta = 2;
        const puuid = 'user-puuid';

        // Mock da consulta que retorna nenhuma meta
        db.query.mockResolvedValueOnce({
            rows: []
        });

        // Executa a função e espera que lance um erro
        await expect(atualizarStatusMetaLivre(idMeta, puuid)).rejects.toThrow('Meta não encontrada');

        // Verifica se a consulta foi chamada corretamente
        expect(db.query).toHaveBeenCalledWith('SELECT puuid, status FROM metas_livres WHERE id = $1', [idMeta]);
    });

    it('deve lançar um erro se o PUUID não corresponder ao dono da meta', async () => {
        const idMeta = 3;
        const puuid = 'user-puuid';
        const metaOwnerPuuid = 'other-user-puuid';

        // Mock da consulta que retorna uma meta que não pertence ao usuário
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: metaOwnerPuuid, status: false }]
        });

        // Executa a função e espera que lance um erro
        await expect(atualizarStatusMetaLivre(idMeta, puuid)).rejects.toThrow('Permissão negada: PUUID não corresponde ao dono da meta');

        // Verifica se a consulta foi chamada corretamente
        expect(db.query).toHaveBeenCalledWith('SELECT puuid, status FROM metas_livres WHERE id = $1', [idMeta]);
    });

    it('deve propagar erros inesperados do banco de dados', async () => {
        const idMeta = 4;
        const puuid = 'user-puuid';

        // Mock da consulta que lança um erro
        const dbError = new Error('Erro no banco de dados');
        db.query.mockRejectedValueOnce(dbError);

        // Executa a função e espera que lance o mesmo erro
        await expect(atualizarStatusMetaLivre(idMeta, puuid)).rejects.toThrow(dbError);

        // Verifica se a consulta foi chamada corretamente
        expect(db.query).toHaveBeenCalledWith('SELECT puuid, status FROM metas_livres WHERE id = $1', [idMeta]);
    });
});

describe('removerMetaLivre', () => {
    beforeEach(() => {
        jest.resetAllMocks(); // Reseta todos os mocks após cada teste
    });

    it('deve remover a meta livre com sucesso quando a meta existe e pertence ao usuário', async () => {
        const idMeta = 1;
        const puuid = 'user-puuid';

        // Mock da consulta que verifica se a meta existe e pertence ao usuário
        db.query.mockResolvedValueOnce({
            rows: [{ puuid }]
        });

        // Mock da consulta que exclui a meta
        db.query.mockResolvedValueOnce({
            rows: [{ id: idMeta, puuid }],
            rowCount: 1
        });

        // Executa a função
        const result = await removerMetaLivre(idMeta, puuid);

        // Verifica se a primeira consulta foi chamada corretamente
        expect(db.query).toHaveBeenNthCalledWith(1, 'SELECT puuid FROM metas_livres WHERE id = $1', [idMeta]);

        // Verifica se a segunda consulta foi chamada corretamente
        expect(db.query).toHaveBeenNthCalledWith(2, 'DELETE FROM metas_livres WHERE id = $1 RETURNING *', [idMeta]);

        // Verifica o resultado
        expect(result).toEqual({
            message: 'Meta excluída com sucesso',
            metaExcluida: { id: idMeta, puuid }
        });
    });

    it('deve lançar um erro se a meta não for encontrada', async () => {
        const idMeta = 2;
        const puuid = 'user-puuid';

        // Mock da consulta que retorna nenhuma meta
        db.query.mockResolvedValueOnce({
            rows: []
        });

        // Executa a função e espera que lance um erro
        await expect(removerMetaLivre(idMeta, puuid)).rejects.toThrow('Meta não encontrada');

        // Verifica se a consulta foi chamada corretamente
        expect(db.query).toHaveBeenCalledWith('SELECT puuid FROM metas_livres WHERE id = $1', [idMeta]);
    });

    it('deve lançar um erro se o PUUID não corresponder ao dono da meta', async () => {
        const idMeta = 3;
        const puuid = 'user-puuid';
        const metaOwnerPuuid = 'other-user-puuid';

        // Mock da consulta que retorna uma meta que não pertence ao usuário
        db.query.mockResolvedValueOnce({
            rows: [{ puuid: metaOwnerPuuid }]
        });

        // Executa a função e espera que lance um erro
        await expect(removerMetaLivre(idMeta, puuid)).rejects.toThrow('Permissão negada: PUUID não corresponde ao dono da meta');

        // Verifica se a consulta foi chamada corretamente
        expect(db.query).toHaveBeenCalledWith('SELECT puuid FROM metas_livres WHERE id = $1', [idMeta]);
    });

    it('deve propagar erros inesperados do banco de dados', async () => {
        const idMeta = 4;
        const puuid = 'user-puuid';

        // Mock da consulta que lança um erro
        const dbError = new Error('Erro no banco de dados');
        db.query.mockRejectedValueOnce(dbError);

        // Executa a função e espera que lance o mesmo erro
        await expect(removerMetaLivre(idMeta, puuid)).rejects.toThrow(dbError);

        // Verifica se a consulta foi chamada corretamente
        expect(db.query).toHaveBeenCalledWith('SELECT puuid FROM metas_livres WHERE id = $1', [idMeta]);
    });
});
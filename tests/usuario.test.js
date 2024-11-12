const Usuario = require('../src/models/usuario');

describe('Validação dos dados do usuário', () => {

    test('Nome da conta Riot deve ter entre 3 e 16 caracteres', () => {
        let usuario = new Usuario('AB', 'BR1', 'teste@teste.com', 'senha123', 'senha123');
        expect(usuario.validarDados()).toContain(1);

        usuario = new Usuario('NomeValido', 'BR1', 'teste@teste.com', 'senha123', 'senha123');
        expect(usuario.validarDados()).not.toContain(1);

        usuario = new Usuario('NomeMuitoLongoParaUmaContaRiot', 'BR1', 'teste@teste.com', 'senha123', 'senha123');
        expect(usuario.validarDados()).toContain(1);
    });

    test('Tag da conta Riot deve ter entre 3 e 5 caracteres', () => {
        let usuario = new Usuario('NomeValido', 'BR', 'teste@teste.com', 'senha123', 'senha123');
        expect(usuario.validarDados()).toContain(2);

        usuario = new Usuario('NomeValido', 'BR123', 'teste@teste.com', 'senha123', 'senha123');
        expect(usuario.validarDados()).not.toContain(2);

        usuario = new Usuario('NomeValido', 'BR123456', 'teste@teste.com', 'senha123', 'senha123');
        expect(usuario.validarDados()).toContain(2);
    });

    test('E-mail deve ser válido', () => {
        let usuario = new Usuario('NomeValido', 'BR1', 'emailinvalido', 'senha123', 'senha123');
        expect(usuario.validarDados()).toContain(3);

        usuario = new Usuario('NomeValido', 'BR1', 'email@valido.com', 'senha123', 'senha123');
        expect(usuario.validarDados()).not.toContain(3);
    });

    test('Senha deve ter entre 8 e 128 caracteres', () => {
        let usuario = new Usuario('NomeValido', 'BR1', 'teste@teste.com', '123', '123');
        expect(usuario.validarDados()).toContain(4);

        usuario = new Usuario('NomeValido', 'BR1', 'teste@teste.com', 'senha123', 'senha123');
        expect(usuario.validarDados()).not.toContain(4);

        usuario = new Usuario('NomeValido', 'BR1', 'teste@teste.com', 'senha'.repeat(33), 'senha'.repeat(33));
        expect(usuario.validarDados()).toContain(4);
    });

    test('As senhas devem coincidir', () => {
        let usuario = new Usuario('NomeValido', 'BR1', 'teste@teste.com', 'senha123', 'senha456');
        expect(usuario.validarDados()).toContain(5);

        usuario = new Usuario('NomeValido', 'BR1', 'teste@teste.com', 'senha123', 'senha123');
        expect(usuario.validarDados()).not.toContain(5);
    });

});

const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

const mock = new MockAdapter(axios);

describe('Validação da Conta Riot', () => {
    
    beforeAll(() => {
        mock.onGet(/riotgames.com/).reply(config => {
            console.log('Interceptando URL:', config.url);

            if (config.url.includes('MAFIA BOSS NUNU') && config.url.includes('BOLAS')) {
                return [200, { puuid: 'valid-puuid' }];
            }

            return [404, {}];
        });
    });

    afterAll(() => {
        mock.reset();
    });

    test('Deve validar uma conta Riot válida', async () => {
        const usuario = new Usuario('MAFIA BOSS NUNU', 'BOLAS', 'teste@teste.com', 'senha123', 'senha123');
        const resultado = await usuario.validarContaRiot();

        expect(resultado).toEqual({ valido: true });
    });

    test('Deve invalidar uma conta Riot inválida', async () => {
        const usuario = new Usuario('Riot Não Existe', 'Riot', 'teste@teste.com', 'senha123', 'senha123');
        const resultado = await usuario.validarContaRiot();

        expect(resultado).toEqual({ valido: false });
    });

    test('Deve tratar erros na chamada da API e retornar inválido', async () => {
        const usuario = new Usuario('ErroAPI', 'Erro', 'teste@teste.com', 'senha123', 'senha123');
        const resultado = await usuario.validarContaRiot();

        expect(resultado).toEqual({ valido: false });
    });
});

describe('Buscar PUUID da Conta Riot', () => {
    
    beforeAll(() => {
        mock.onGet(/riotgames.com/).reply(config => {
            console.log('Interceptando URL:', config.url);

            if (config.url.includes('MAFIA BOSS NUNU') && config.url.includes('BOLAS')) {
                return [200, { puuid: 'valid-puuid' }];
            }

            return [404, {}];
        });
    });

    afterAll(() => {
        mock.reset();
    });

    test('Deve retornar o PUUID para uma conta Riot válida', async () => {
        const usuario = new Usuario('MAFIA BOSS NUNU', 'BOLAS', 'teste@teste.com', 'senha123', 'senha123');
        const puuid = await usuario.encontrarPuuidContaRiot();

        expect(puuid).toBe('valid-puuid');
    });

    test('Deve retornar null para uma conta Riot inválida', async () => {
        const usuario = new Usuario('Riot Não Existe', 'Riot', 'teste@teste.com', 'senha123', 'senha123');
        const puuid = await usuario.encontrarPuuidContaRiot();

        expect(puuid).toBeNull();
    });

    test('Deve retornar null em caso de erro na chamada da API', async () => {
        const usuario = new Usuario('ErroAPI', 'Erro', 'teste@teste.com', 'senha123', 'senha123');
        const puuid = await usuario.encontrarPuuidContaRiot();

        expect(puuid).toBeNull();
    });
});

jest.mock('pg', () => {
    const mPool = {
        query: jest.fn(),
        connect: jest.fn(),
        end: jest.fn(),
    };
    return { Pool: jest.fn(() => mPool) };
});

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

describe('Testes das funções de banco de dados', () => {
    let mockPool;

    beforeAll(() => {
        mockPool = new Pool();
    });

    beforeEach(() => {
        mockPool.query.mockReset();
        bcrypt.hash.mockReset();
        bcrypt.compare.mockReset();
    });

    // Teste para verificarExistenciaPUUIDBanco
    test('Deve retornar true se o PUUID existir no banco de dados', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ exists: true }] });

        const usuario = new Usuario('MAFIA BOSS NUNU', 'BOLAS', 'teste@teste.com', 'senha123', 'senha123');
        const existe = await usuario.verificarExistenciaPUUIDBanco('valid-puuid');

        expect(mockPool.query).toHaveBeenCalledWith('SELECT 1 FROM jogadores WHERE puuid = $1', ['valid-puuid']);
        expect(existe).toBe(true);
    });

    test('Deve retornar false se o PUUID não existir no banco de dados', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const usuario = new Usuario('Riot Não Existe', 'Riot', 'teste@teste.com', 'senha123', 'senha123');
        const existe = await usuario.verificarExistenciaPUUIDBanco('invalid-puuid');

        expect(mockPool.query).toHaveBeenCalledWith('SELECT 1 FROM jogadores WHERE puuid = $1', ['invalid-puuid']);
        expect(existe).toBe(false);
    });

    // Testes para verificarExistenciaEmailBanco
    test('Deve retornar true se o email existir no banco de dados', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ email: 'hashed-email' }] });
        bcrypt.compare.mockResolvedValueOnce(true);

        const usuario = new Usuario('MAFIA BOSS NUNU', 'BOLAS', 'teste@teste.com', 'senha123', 'senha123');
        const existe = await usuario.verificarExistenciaEmailBanco();

        expect(mockPool.query).toHaveBeenCalledWith('SELECT email FROM jogadores', undefined);
        expect(existe).toBe(true);
    });

    test('Deve retornar false se o email não existir no banco de dados', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const usuario = new Usuario('MAFIA BOSS NUNU', 'BOLAS', 'teste@teste.com', 'senha123', 'senha123');
        const existe = await usuario.verificarExistenciaEmailBanco();

        expect(mockPool.query).toHaveBeenCalledWith('SELECT email FROM jogadores', undefined);
        expect(existe).toBe(false);
    });

    // Testes para verificarLogin
    test('Deve validar o login corretamente com email e senha corretos', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ email: 'hashed-email', senha: 'hashed-password' }] });
        bcrypt.compare.mockResolvedValueOnce(true);
        bcrypt.compare.mockResolvedValueOnce(true);

        const usuario = new Usuario('MAFIA BOSS NUNU', 'BOLAS', 'teste@teste.com', 'senha123', 'senha123');
        const resultado = await usuario.verificarLogin();

        expect(mockPool.query).toHaveBeenCalledWith('SELECT email, senha FROM jogadores', undefined);
        expect(resultado).toEqual({ sucesso: true });
    });

    test('Deve falhar no login com senha incorreta', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ email: 'hashed-email', senha: 'hashed-password' }] });
        bcrypt.compare.mockResolvedValueOnce(true);
        bcrypt.compare.mockResolvedValueOnce(false);

        const usuario = new Usuario('MAFIA BOSS NUNU', 'BOLAS', 'teste@teste.com', 'senha123', 'senha123');
        const resultado = await usuario.verificarLogin();

        expect(mockPool.query).toHaveBeenCalledWith('SELECT email, senha FROM jogadores', undefined);
        expect(resultado).toEqual({ sucesso: false });
    });

    // Teste para salvarUsuarioBanco
    test('Deve salvar o usuário no banco de dados com o summonerId', async () => {
        const mockSummonerId = 'mock-summoner-id';
    
        // Criando a instância do usuário primeiro
        const usuario = new Usuario('MAFIA BOSS NUNU', 'BOLAS', 'teste@teste.com', 'senha123', 'senha123');
    
        // Mockando a função `encontrarSummonerIdPorPUUID` para retornar um summonerId válido
        jest.spyOn(usuario, 'encontrarSummonerIdPorPUUID').mockResolvedValueOnce(mockSummonerId);
    
        // Mockando o bcrypt.hash para retornar um valor encriptado fixo
        bcrypt.hash.mockResolvedValueOnce('hashed-password');
        bcrypt.hash.mockResolvedValueOnce('hashed-email');
    
        await usuario.salvarUsuarioBanco('valid-puuid');
    
        expect(bcrypt.hash).toHaveBeenCalledWith('senha123', 10);
        expect(bcrypt.hash).toHaveBeenCalledWith('teste@teste.com', 10);
        expect(mockPool.query).toHaveBeenCalledWith(
            'INSERT INTO jogadores(puuid, email, senha, summoner_id) VALUES($1, $2, $3, $4)',
            ['valid-puuid', 'hashed-email', 'hashed-password', mockSummonerId]
        );
    });
});

describe('Encontrar Summoner ID por PUUID', () => {
    let mock;

    beforeAll(() => {
        mock = new MockAdapter(axios);
    });

    afterEach(() => {
        mock.reset();
    });

    afterAll(() => {
        mock.restore();
    });

    test('Deve retornar o Summoner ID para um PUUID válido', async () => {
        const validPuuid = 'valid-puuid';
        const expectedSummonerId = 'valid-summoner-id';

        // Mockando a resposta da API para um PUUID válido
        mock.onGet(`https://br1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${validPuuid}`)
            .reply(200, { id: expectedSummonerId });

        const usuario = new Usuario('NomeValido', 'BR1', 'teste@teste.com', 'senha123', 'senha123');
        const summonerId = await usuario.encontrarSummonerIdPorPUUID(validPuuid);

        expect(summonerId).toBe(expectedSummonerId);
    });

    test('Deve retornar null para um PUUID inválido', async () => {
        const invalidPuuid = 'invalid-puuid';

        // Mockando a resposta da API para um PUUID inválido
        mock.onGet(`https://br1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${invalidPuuid}`)
            .reply(404);

        const usuario = new Usuario('NomeInvalido', 'BR1', 'teste@teste.com', 'senha123', 'senha123');
        const summonerId = await usuario.encontrarSummonerIdPorPUUID(invalidPuuid);

        expect(summonerId).toBeNull();
    });

    test('Deve retornar null em caso de erro na chamada da API', async () => {
        const errorPuuid = 'error-puuid';

        // Mockando um erro na chamada da API
        mock.onGet(`https://br1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${errorPuuid}`)
            .networkError();

        const usuario = new Usuario('ErroAPI', 'BR1', 'teste@teste.com', 'senha123', 'senha123');
        const summonerId = await usuario.encontrarSummonerIdPorPUUID(errorPuuid);

        expect(summonerId).toBeNull();
    });
});

describe('Encontrar Dados Gerais do Usuário', () => {
    let db;

    beforeAll(() => {
        db = new Pool()
        process.env.RIOT_API_KEY = 'mock-api-key';
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        mock.reset();
        db.query.mockReset();
    });

    afterAll(() => {
        mock.restore();
        console.error.mockRestore();
    });

    test('Deve retornar os dados gerais do usuário com sucesso', async () => {
        const puuid = 'valid-puuid';
        const summonerId = 'valid-summoner-id';

        // Mockando a consulta ao banco de dados para retornar o summonerId
        db.query.mockResolvedValueOnce({
            rows: [{ summoner_id: summonerId }],
        });

        // Mockando as chamadas da API
        mock.onGet(/api\.riotgames\.com/).reply(config => {
            if (config.url.includes(`/riot/account/v1/accounts/by-puuid/${puuid}`)) {
                return [200, {
                    gameName: 'MockGameName',
                    tagLine: 'MockTagLine',
                }];
            }

            if (config.url.includes(`/lol/summoner/v4/summoners/by-puuid/${puuid}`)) {
                return [200, {
                    profileIconId: 1234,
                    summonerLevel: 30,
                }];
            }

            if (config.url.includes(`/lol/league/v4/entries/by-summoner/${summonerId}`)) {
                return [200, [
                    {
                        queueType: 'RANKED_SOLO_5x5',
                        tier: 'Gold',
                        rank: 'IV',
                        wins: 10,
                        losses: 5,
                        leaguePoints: 50,
                    },
                ]];
            }

            return [404, {}];
        });

        const usuario = new Usuario('NomeValido', 'BR1', 'teste@teste.com', 'senha123', 'senha123');
        const dadosGerais = await usuario.encontrarDadosGeraisUsuario(puuid);

        expect(dadosGerais).toEqual({
            gameName: 'MockGameName',
            tagLine: 'MockTagLine',
            profileIconId: 1234,
            summonerLevel: 30,
            tier: 'Gold',
            rank: 'IV',
            wins: 10,
            losses: 5,
            leaguePoints: 50,
        });
    });

    test('Deve retornar null se o summonerId não for encontrado no banco de dados', async () => {
        const puuid = 'puuid-sem-summonerId';

        // Mockando a consulta ao banco de dados para retornar vazio
        db.query.mockResolvedValueOnce({
            rows: [],
        });

        const usuario = new Usuario('NomeValido', 'BR1', 'teste@teste.com', 'senha123', 'senha123');
        const dadosGerais = await usuario.encontrarDadosGeraisUsuario(puuid);

        expect(dadosGerais).toBeNull();
        expect(console.error).toHaveBeenCalledWith('Erro ao buscar dados gerais do usuário:', 'SummonerId não encontrado no banco de dados');
    });

    test('Deve retornar null se ocorrer um erro na primeira chamada da API', async () => {
        const puuid = 'puuid-com-erro-na-primeira-api';
        const summonerId = 'valid-summoner-id';

        db.query.mockResolvedValueOnce({
            rows: [{ summoner_id: summonerId }],
        });

        mock.onGet(/api\.riotgames\.com/).reply(config => {
            if (config.url.includes(`/riot/account/v1/accounts/by-puuid/${puuid}`)) {
                return [500];
            }

            // Mockando as outras chamadas normalmente
            if (config.url.includes(`/lol/summoner/v4/summoners/by-puuid/${puuid}`)) {
                return [200, {
                    profileIconId: 1234,
                    summonerLevel: 30,
                }];
            }

            if (config.url.includes(`/lol/league/v4/entries/by-summoner/${summonerId}`)) {
                return [200, []];
            }

            return [404, {}];
        });

        const usuario = new Usuario('NomeValido', 'BR1', 'teste@teste.com', 'senha123', 'senha123');
        const dadosGerais = await usuario.encontrarDadosGeraisUsuario(puuid);

        expect(dadosGerais).toBeNull();
        expect(console.error).toHaveBeenCalled();
    });

    test('Deve retornar dados com tier "Unranked" se o jogador não tiver rank', async () => {
        const puuid = 'puuid-unranked';
        const summonerId = 'valid-summoner-id';

        db.query.mockResolvedValueOnce({
            rows: [{ summoner_id: summonerId }],
        });

        mock.onGet(/api\.riotgames\.com/).reply(config => {
            if (config.url.includes(`/riot/account/v1/accounts/by-puuid/${puuid}`)) {
                return [200, {
                    gameName: 'MockGameName',
                    tagLine: 'MockTagLine',
                }];
            }

            if (config.url.includes(`/lol/summoner/v4/summoners/by-puuid/${puuid}`)) {
                return [200, {
                    profileIconId: 1234,
                    summonerLevel: 30,
                }];
            }

            if (config.url.includes(`/lol/league/v4/entries/by-summoner/${summonerId}`)) {
                // Retornando um array vazio, indicando que o jogador não tem rank
                return [200, []];
            }

            return [404, {}];
        });

        const usuario = new Usuario('NomeValido', 'BR1', 'teste@teste.com', 'senha123', 'senha123');
        const dadosGerais = await usuario.encontrarDadosGeraisUsuario(puuid);

        expect(dadosGerais).toEqual({
            gameName: 'MockGameName',
            tagLine: 'MockTagLine',
            profileIconId: 1234,
            summonerLevel: 30,
            tier: 'Unranked',
            rank: '',
            wins: 0,
            losses: 0,
            leaguePoints: 0,
        });
    });

    test('Deve retornar null se ocorrer um erro na segunda chamada da API', async () => {
        const puuid = 'puuid-com-erro-na-segunda-api';
        const summonerId = 'valid-summoner-id';

        db.query.mockResolvedValueOnce({
            rows: [{ summoner_id: summonerId }],
        });

        mock.onGet(/api\.riotgames\.com/).reply(config => {
            if (config.url.includes(`/riot/account/v1/accounts/by-puuid/${puuid}`)) {
                return [200, {
                    gameName: 'MockGameName',
                    tagLine: 'MockTagLine',
                }];
            }

            if (config.url.includes(`/lol/summoner/v4/summoners/by-puuid/${puuid}`)) {
                return [500];
            }

            if (config.url.includes(`/lol/league/v4/entries/by-summoner/${summonerId}`)) {
                return [200, []];
            }

            return [404, {}];
        });

        const usuario = new Usuario('NomeValido', 'BR1', 'teste@teste.com', 'senha123', 'senha123');
        const dadosGerais = await usuario.encontrarDadosGeraisUsuario(puuid);

        expect(dadosGerais).toBeNull();
        expect(console.error).toHaveBeenCalled();
    });

    test('Deve retornar null se ocorrer um erro na terceira chamada da API', async () => {
        const puuid = 'puuid-com-erro-na-terceira-api';
        const summonerId = 'valid-summoner-id';

        db.query.mockResolvedValueOnce({
            rows: [{ summoner_id: summonerId }],
        });

        mock.onGet(/api\.riotgames\.com/).reply(config => {
            if (config.url.includes(`/riot/account/v1/accounts/by-puuid/${puuid}`)) {
                return [200, {
                    gameName: 'MockGameName',
                    tagLine: 'MockTagLine',
                }];
            }

            if (config.url.includes(`/lol/summoner/v4/summoners/by-puuid/${puuid}`)) {
                return [200, {
                    profileIconId: 1234,
                    summonerLevel: 30,
                }];
            }

            if (config.url.includes(`/lol/league/v4/entries/by-summoner/${summonerId}`)) {
                return [500];
            }

            return [404, {}];
        });

        const usuario = new Usuario('NomeValido', 'BR1', 'teste@teste.com', 'senha123', 'senha123');
        const dadosGerais = await usuario.encontrarDadosGeraisUsuario(puuid);

        expect(dadosGerais).toBeNull();
        expect(console.error).toHaveBeenCalled();
    });
});

describe('getPuuidPorEmail', () => {
    let db

    beforeAll(() => {
        db = new Pool()
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(() => {
        console.error.mockRestore();
    });

    beforeEach(() => {
        db.query.mockReset();
        bcrypt.compare.mockReset();
    });

    test('Deve retornar o PUUID se o email existir e bcrypt.compare retornar true', async () => {
        const mockEmail = 'teste@teste.com';
        const mockPuuid = 'valid-puuid';
        const mockHashedEmail = 'hashed-email';

        // Mockando db.query para retornar um email e puuid
        db.query.mockResolvedValueOnce({
            rows: [{ email: mockHashedEmail, puuid: mockPuuid }],
        });

        // Mockando bcrypt.compare para retornar true
        bcrypt.compare.mockResolvedValueOnce(true);

        const usuario = new Usuario('Nome', 'BR1', mockEmail, 'senha123', 'senha123');

        const puuid = await usuario.getPuuidPorEmail();

        expect(db.query).toHaveBeenCalledWith('SELECT email, puuid FROM jogadores', undefined);
        expect(bcrypt.compare).toHaveBeenCalledWith(mockEmail, mockHashedEmail);
        expect(puuid).toBe(mockPuuid);
    });

    test('Deve retornar null se o email não existir no banco de dados', async () => {
        const mockEmail = 'teste@teste.com';

        // Mockando db.query para retornar nenhuma linha
        db.query.mockResolvedValueOnce({
            rows: [],
        });

        const usuario = new Usuario('Nome', 'BR1', mockEmail, 'senha123', 'senha123');

        const puuid = await usuario.getPuuidPorEmail();

        expect(db.query).toHaveBeenCalledWith('SELECT email, puuid FROM jogadores', undefined);
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(puuid).toBeNull();
    });

    test('Deve retornar null se bcrypt.compare retornar false para todos os emails', async () => {
        const mockEmail = 'teste@teste.com';

        // Mockando db.query para retornar algumas linhas
        db.query.mockResolvedValueOnce({
            rows: [
                { email: 'hashed-email-1', puuid: 'puuid-1' },
                { email: 'hashed-email-2', puuid: 'puuid-2' },
            ],
        });

        // Mockando bcrypt.compare para retornar false para todas as comparações
        bcrypt.compare.mockResolvedValue(false);

        const usuario = new Usuario('Nome', 'BR1', mockEmail, 'senha123', 'senha123');

        const puuid = await usuario.getPuuidPorEmail();

        expect(db.query).toHaveBeenCalledWith('SELECT email, puuid FROM jogadores', undefined);
        expect(bcrypt.compare).toHaveBeenCalledTimes(2);
        expect(puuid).toBeNull();
    });

    test('Deve lançar um erro se ocorrer um erro durante db.query', async () => {
        const mockEmail = 'teste@teste.com';
        const mockError = new Error('Erro no banco de dados');

        // Mockando db.query para lançar um erro
        db.query.mockRejectedValueOnce(mockError);

        const usuario = new Usuario('Nome', 'BR1', mockEmail, 'senha123', 'senha123');

        await expect(usuario.getPuuidPorEmail()).rejects.toThrow(mockError);

        expect(db.query).toHaveBeenCalledWith('SELECT email, puuid FROM jogadores', undefined);
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith('Erro ao buscar PUUID por email:', mockError);
    });

    test('Deve lançar um erro se ocorrer um erro durante bcrypt.compare', async () => {
        const mockEmail = 'teste@teste.com';
        const mockHashedEmail = 'hashed-email';
        const mockPuuid = 'puuid-1';
        const mockError = new Error('Erro no bcrypt');

        // Mockando db.query para retornar uma linha
        db.query.mockResolvedValueOnce({
            rows: [{ email: mockHashedEmail, puuid: mockPuuid }],
        });

        // Mockando bcrypt.compare para lançar um erro
        bcrypt.compare.mockRejectedValueOnce(mockError);

        const usuario = new Usuario('Nome', 'BR1', mockEmail, 'senha123', 'senha123');

        await expect(usuario.getPuuidPorEmail()).rejects.toThrow(mockError);

        expect(db.query).toHaveBeenCalledWith('SELECT email, puuid FROM jogadores', undefined);
        expect(bcrypt.compare).toHaveBeenCalledWith(mockEmail, mockHashedEmail);
        expect(console.error).toHaveBeenCalledWith('Erro ao buscar PUUID por email:', mockError);
    });
});

describe('verificarExistenciaPUUIDBanco', () => {
    let db;

    beforeEach(() => {
        db = new Pool();
        db.query.mockReset();
    });

    test('Deve retornar true se o PUUID existir no banco de dados', async () => {
        const puuid = 'existing-puuid';

        // Mockando db.query para retornar uma linha, indicando que o PUUID existe
        db.query.mockResolvedValueOnce({
            rows: [{}], // Pode ser qualquer objeto dentro do array
        });

        const usuario = new Usuario('Nome', 'BR1', 'email@test.com', 'senha123', 'senha123');
        const result = await usuario.verificarExistenciaPUUIDBanco(puuid);

        expect(db.query).toHaveBeenCalledWith('SELECT 1 FROM jogadores WHERE puuid = $1', [puuid]);
        expect(result).toBe(true);
    });

    test('Deve retornar false se o PUUID não existir no banco de dados', async () => {
        const puuid = 'nonexistent-puuid';

        // Mockando db.query para retornar um array vazio, indicando que o PUUID não existe
        db.query.mockResolvedValueOnce({
            rows: [],
        });

        const usuario = new Usuario('Nome', 'BR1', 'email@test.com', 'senha123', 'senha123');
        const result = await usuario.verificarExistenciaPUUIDBanco(puuid);

        expect(db.query).toHaveBeenCalledWith('SELECT 1 FROM jogadores WHERE puuid = $1', [puuid]);
        expect(result).toBe(false);
    });

    test('Deve lançar um erro se ocorrer um erro durante db.query', async () => {
        const puuid = 'some-puuid';
        const mockError = new Error('Erro no banco de dados');

        // Mockando db.query para lançar um erro
        db.query.mockRejectedValueOnce(mockError);

        const usuario = new Usuario('Nome', 'BR1', 'email@test.com', 'senha123', 'senha123');

        await expect(usuario.verificarExistenciaPUUIDBanco(puuid)).rejects.toThrow(mockError);

        expect(db.query).toHaveBeenCalledWith('SELECT 1 FROM jogadores WHERE puuid = $1', [puuid]);
    });
});
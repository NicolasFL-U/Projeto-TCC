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
    test('Deve salvar o usuário no banco de dados', async () => {
        bcrypt.hash.mockResolvedValueOnce('hashed-password');
        bcrypt.hash.mockResolvedValueOnce('hashed-email');

        const usuario = new Usuario('MAFIA BOSS NUNU', 'BOLAS', 'teste@teste.com', 'senha123', 'senha123');
        await usuario.salvarUsuarioBanco('valid-puuid');

        expect(bcrypt.hash).toHaveBeenCalledWith('senha123', 10);
        expect(bcrypt.hash).toHaveBeenCalledWith('teste@teste.com', 10);
        expect(mockPool.query).toHaveBeenCalledWith(
            'INSERT INTO jogadores(puuid, email, senha) VALUES($1, $2, $3)',
            ['valid-puuid', 'hashed-email', 'hashed-password']
        );
    });
});
const Usuario = require('../models/usuario');

exports.cadastrarUsuario = async (req, res) => {
    const { nomeContaRiot, tagContaRiot, email, senha, confirmarSenha } = req.body;

    const usuario = new Usuario(nomeContaRiot, tagContaRiot, email, senha, confirmarSenha);

    // Validações de dados
    const erros = usuario.validarDados();
    if (erros.length > 0) {
        const queryParams = new URLSearchParams({ erro: erros.join(',') }).toString();
        return res.redirect(`/cadastrar?${queryParams}`);
    }

    // Validação de conta
    const validacaoRiot = await usuario.validarContaRiot();
    if (!validacaoRiot.valido) {
        const queryParams = new URLSearchParams({ erro: 6, conta: `${nomeContaRiot}#${tagContaRiot}` }).toString();
        return res.redirect(`/cadastrar?${queryParams}`);
    }

    // Identificar PUUID da conta
    const puuid = await usuario.encontrarPuuidContaRiot();

    if (!puuid) {
        const queryParams = new URLSearchParams({ erro: 7, conta: `${nomeContaRiot}#${tagContaRiot}` }).toString();
        return res.redirect(`/cadastrar?${queryParams}`);
    }

    // Salvar o usuário no banco de dados
    try {
        // Verificar se o PUUID já existe
        if (await usuario.verificarExistenciaPUUIDBanco(puuid)) {
            const queryParams = new URLSearchParams({ erro: 8, conta: `${nomeContaRiot}#${tagContaRiot}` }).toString();
            return res.redirect(`/cadastrar?${queryParams}`);
        }

        // Verificar se o E-mail já existe
        if (await usuario.verificarExistenciaEmailBanco()) {
            const queryParams = new URLSearchParams({ erro: 9, conta: `${nomeContaRiot}#${tagContaRiot}` }).toString();
            return res.redirect(`/cadastrar?${queryParams}`);
        }

        // Salvar o usuário
        await usuario.salvarUsuarioBanco(puuid);
        return res.status(201).send('Usuário cadastrado com sucesso!');

    } catch (error) {
        const queryParams = new URLSearchParams({ erro: 10, conta: `${nomeContaRiot}#${tagContaRiot}` }).toString();
        console.error(error);
        return res.redirect(`/cadastrar?${queryParams}`);
    }
};

exports.logarUsuario = async (req, res) => {
    const { email, senha } = req.body;
    const usuario = new Usuario(null, null, email, senha, null);

    const loginResult = await usuario.verificarLogin();

    if (!loginResult.sucesso) {
        const queryParams = new URLSearchParams({ erro: 1 }).toString();
        return res.redirect(`/logar?${queryParams}`);
    }

    const puuid = await usuario.getPuuidPorEmail();
    
    if (puuid) {
        req.session.puuid = puuid;
        req.session.email = email;
        req.session.logado = true;

        return res.redirect('/dashboard');
    } else {
        const queryParams = new URLSearchParams({ erro: 2 }).toString();
        return res.redirect(`/logar?${queryParams}`);
    }
};

exports.mostrarDashboard = (req, res) => {
    if (req.session.logado) {
        res.render('dashboard', { 
            puuid: req.session.puuid,
            email: req.session.email
        });
    } else {
        res.redirect('/logar');
    }
};
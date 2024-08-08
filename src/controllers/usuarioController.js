const Usuario = require('../models/Usuario');
const db = require('../database');
const bcrypt = require('bcrypt');

exports.cadastrarUsuario = async (req, res) => {
    const { nomeContaRiot, tagContaRiot, email, senha, confirmarSenha } = req.body;

    const usuario = new Usuario(nomeContaRiot, tagContaRiot, email, senha, confirmarSenha);

    // Validações de dados
    const erros = usuario.validar();
    if (erros.length > 0) {
        const queryParams = new URLSearchParams({ erro: erros.join(',') }).toString();
        return res.redirect(`/cadastrar?${queryParams}`);
    }

    const validacaoRiot = await usuario.validarContaRiot();
    if (!validacaoRiot.valido) {
        const queryParams = new URLSearchParams({ erro: 6, conta: `${nomeContaRiot}#${tagContaRiot}` }).toString();
        return res.redirect(`/cadastrar?${queryParams}`);
    }

    const puuid = await usuario.encontrarPuuidContaRiot();

    if (!puuid) {
        const queryParams = new URLSearchParams({ erro: 7, conta: `${nomeContaRiot}#${tagContaRiot}` }).toString();
        return res.redirect(`/cadastrar?${queryParams}`);
    }

    // Salvar o usuário no banco de dados
    try {
        // Verificar PUUID
        const puuidExistsQuery = 'SELECT 1 FROM jogadores WHERE puuid = $1';
        const puuidExistsResult = await db.query(puuidExistsQuery, [puuid]);

        if (puuidExistsResult.rows.length > 0) {
            const queryParams = new URLSearchParams({ erro: 8, conta: `${nomeContaRiot}#${tagContaRiot}` }).toString();
            return res.redirect(`/cadastrar?${queryParams}`);
        }

        // Verificar Email
        const emailQuery = 'SELECT email FROM jogadores';
        const emailResults = await db.query(emailQuery);

        for (const row of emailResults.rows) {
            const isEmailMatch = await bcrypt.compare(email, row.email);
            if (isEmailMatch) {
                const queryParams = new URLSearchParams({ erro: 9, conta: `${nomeContaRiot}#${tagContaRiot}` }).toString();
                return res.redirect(`/cadastrar?${queryParams}`);
            }
        }

        // Salvar usuário
        const hashedPassword = await bcrypt.hash(senha, 10);
        const hashedEmail = await bcrypt.hash(email, 10);

        const queryText = 'INSERT INTO jogadores(puuid, email, senha) VALUES($1, $2, $3)';
        const queryParams = [puuid, hashedEmail, hashedPassword];

        await db.query(queryText, queryParams);

        return res.status(201).send('Usuário cadastrado com sucesso!');

    } catch (error) {
        const queryParams = new URLSearchParams({ erro: 10, conta: `${nomeContaRiot}#${tagContaRiot}` }).toString();
        console.error(error);
        return res.redirect(`/cadastrar?${queryParams}`);
    }
};
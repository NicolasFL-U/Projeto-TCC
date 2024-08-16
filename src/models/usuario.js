const axios = require('axios');
const bcrypt = require('bcrypt');
const db = require('../database');
require('dotenv').config();

class Usuario {
    constructor(nomeContaRiot, tagContaRiot, email, senha, confirmarSenha) {
        this.nomeContaRiot = nomeContaRiot;
        this.tagContaRiot = tagContaRiot;
        this.email = email;
        this.senha = senha;
        this.confirmarSenha = confirmarSenha;
    }

    validarDados() {
        const erros = [];

        if (this.nomeContaRiot.length < 3 || this.nomeContaRiot.length > 16) {
            erros.push(1); // "O nome da conta Riot deve ter entre 3 e 16 caracteres."
        }

        if (this.tagContaRiot.length < 3 || this.tagContaRiot.length > 5) {
            erros.push(2); // "A tag da conta Riot deve ter entre 3 e 5 caracteres."
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.email)) {
            erros.push(3); // "O e-mail não é válido."
        }

        if (this.senha.length < 8 || this.senha.length > 128) {
            erros.push(4); // "A senha deve ter entre 8 e 128 caracteres."
        }

        if (this.senha !== this.confirmarSenha) {
            erros.push(5); // "As senhas não coincidem."
        }

        return erros;
    }

    async validarContaRiot() {
        try {
            const response = await axios.get(`https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${this.nomeContaRiot}/${this.tagContaRiot}`, {
                params: {
                    api_key: process.env.RIOT_API_KEY
                }
            });

            if (response.status === 200) {
                return { valido: true };
            } else {
                return { valido: false };
            }
        } catch (error) {
            return { valido: false };
        }
    }

    async encontrarPuuidContaRiot() {
        try {
            const response = await axios.get(`https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${this.nomeContaRiot}/${this.tagContaRiot}`, {
                params: {
                    api_key: process.env.RIOT_API_KEY
                }
            });

            if (response.status === 200) {
                return response.data.puuid;
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    async getPuuidPorEmail() {
        try {
            const emailQuery = 'SELECT email, puuid FROM jogadores';
            const result = await db.query(emailQuery);
    
            for (const row of result.rows) {
                const isEmailMatch = await bcrypt.compare(this.email, row.email);
                if (isEmailMatch) {
                    return row.puuid;
                }
            }
    
            return null; 
        } catch (error) {
            console.error('Erro ao buscar PUUID por email:', error);
            throw error;
        }
    }

    async verificarExistenciaPUUIDBanco(puuid) {
        const result = await db.query('SELECT 1 FROM jogadores WHERE puuid = $1', [puuid]);
        return result.rows.length > 0;
    }

    async verificarExistenciaEmailBanco() {
        const emailQuery = 'SELECT email FROM jogadores';
        const emailResults = await db.query(emailQuery);

        for (const row of emailResults.rows) {
            const isEmailMatch = await bcrypt.compare(this.email, row.email);
            if (isEmailMatch) {
                return true;
            }
        }

        return false;
    }
    
    async verificarLogin() {
        const emailQuery = 'SELECT email, senha FROM jogadores';
        const emailResults = await db.query(emailQuery);

        for (const row of emailResults.rows) {
            const isEmailMatch = await bcrypt.compare(this.email, row.email);

            if (isEmailMatch) {
                const isPasswordMatch = await bcrypt.compare(this.senha, row.senha);
                
                if (isPasswordMatch) {
                    return { sucesso: true };
                } else {
                    return { sucesso: false };
                }
            }
        }

        return { sucesso: false };
    }

    async salvarUsuarioBanco(puuid) {
        const hashedPassword = await bcrypt.hash(this.senha, 10);
        const hashedEmail = await bcrypt.hash(this.email, 10);

        const queryText = 'INSERT INTO jogadores(puuid, email, senha) VALUES($1, $2, $3)';
        const queryParams = [puuid, hashedEmail, hashedPassword];

        await db.query(queryText, queryParams);
    }
}

module.exports = Usuario;
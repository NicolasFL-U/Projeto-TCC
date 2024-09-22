const db = require('../database');
require('dotenv').config();

class Vod {
    constructor(vodId) {
        this.vodId = vodId;
    }

    async buscarDadosVod() {
        try {
            const query = `
                SELECT id_partida, vod_publica, puuid, link_vod
                FROM partidas
                WHERE link_vod = $1
            `;
            const values = [this.vodId];

            const result = await db.query(query, values);

            if (result.rows.length > 0) {
                return result.rows[0]; // Retorna os dados da VOD
            } else {
                return null; // Nenhuma VOD encontrada
            }
        } catch (error) {
            console.error('Erro ao buscar dados da VOD:', error.message);
            return null;
        }
    }
}

module.exports = Vod;
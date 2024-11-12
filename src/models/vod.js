const db = require('../database');
require('dotenv').config();

const axios = require('axios');

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

    static async salvarVOD(partida_id, link_vod, puuid) {
        // Expressão regular para validar o formato do link do YouTube e capturar o ID do vídeo
        const youtubeRegex = /^https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:[&?].*)?$/;

        // Verifica se o link segue o formato correto
        const match = link_vod.match(youtubeRegex);

        if (!match) {
            // Se o link não for válido, lança um erro
            throw new Error('Link inválido. O link deve seguir o formato:\nhttps://www.youtube.com/watch?v=[id]');
        }

        // Se o link for válido, extrair o ID do vídeo e sanitizar removendo caracteres inválidos
        let videoId = match[1];

        // Sanitização: manter apenas letras, números, traço (-) e sublinhado (_)
        videoId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');

        try {
            // 1. Verifica se o link_vod já existe para outra partida
            const queryVerificar = `SELECT id_partida FROM partidas WHERE link_vod = $1 AND id_partida != $2`;
            const { rows: partidasExistentes } = await db.query(queryVerificar, [videoId, partida_id]);

            if (partidasExistentes.length > 0) {
                throw new Error('Este link já está associado a outra partida.');
            }

            // 2. Verifica se o ID do vídeo existe no YouTube usando a API do YouTube
            const youtubeApiKey = process.env.YOUTUBE_API_KEY;
            const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtubeApiKey}&part=id`;

            const response = await axios.get(youtubeApiUrl);
            if (response.data.items.length === 0) {
                // O vídeo não existe
                throw new Error('O vídeo não foi encontrado no YouTube. Verifique o link.');
            }

            // 3. Atualiza a partida com o ID do VOD
            const query = `
                UPDATE partidas
                SET link_vod = $1
                WHERE id_partida = $2 AND puuid = $3
            `;
            const values = [videoId, partida_id, puuid];

            // Executa a query de atualização
            await db.query(query, values);

            return { message: 'VOD salvo com sucesso!' };
        } catch (error) {
            console.error('Erro ao salvar o VOD:', error.message);
            throw error;
        }
    }

    static async buscarVodComValidacao(vodId, puuid) {
        try {
            const query = `
                SELECT id_partida, vod_publica, puuid, link_vod
                FROM partidas
                WHERE link_vod = $1
            `;
            const values = [vodId];

            const result = await db.query(query, values);
            const vodDados = result.rows[0];

            // Verifica se a VOD foi encontrada e se o usuário tem acesso
            if (!vodDados) {
                throw new Error('VOD não encontrada');
            } else if (vodDados.puuid !== puuid && !vodDados.vod_publica) {
                throw new Error('Acesso não autorizado');
            }

            return {
                vodDados,
                isDono: vodDados.puuid === puuid
            };
        } catch (error) {
            console.error('Erro ao buscar e validar dados da VOD:', error.message);
            throw error;
        }
    }

    static async alterarVisibilidade(link_vod, puuid, isPublic) {
        try {
            // Verifica se o usuário logado é o dono da VOD
            const queryPartida = `
                SELECT puuid 
                FROM partidas 
                WHERE link_vod = $1
            `;
            const { rows: partidas } = await db.query(queryPartida, [link_vod]);
            const partida = partidas[0];

            // Caso a partida não seja encontrada
            if (!partida) {
                throw new Error('Partida não encontrada');
            }

            // Verifica se o puuid da sessão corresponde ao puuid da partida
            if (partida.puuid !== puuid) {
                throw new Error('Permissão negada para alterar a visibilidade desta VOD');
            }

            // Query para atualizar a visibilidade da VOD no banco de dados
            const queryUpdate = `
                UPDATE partidas
                SET vod_publica = $1
                WHERE link_vod = $2
            `;
            const values = [isPublic, link_vod];

            // Executa a query de atualização
            await db.query(queryUpdate, values);

            return { message: 'Visibilidade da VOD alterada com sucesso' };
        } catch (error) {
            console.error('Erro ao alterar visibilidade da VOD:', error.message);
            throw error;
        }
    }

    static async adicionarTag({ link_vod, tag, inicio, fim, cor, puuidSession }) {
        try {
            // Validações de parâmetros
            if (!link_vod || !tag || inicio === undefined || fim === undefined || !cor || !puuidSession) {
                throw new Error('Parâmetros inválidos ou incompletos.');
            }

            const inicioInt = parseInt(inicio, 10);
            const fimInt = parseInt(fim, 10);
            if (isNaN(inicioInt) || isNaN(fimInt) || inicioInt < 0 || fimInt < 0 || inicioInt >= fimInt) {
                throw new Error('Tempos de início e fim inválidos.');
            }

            let tagName = tag.trim();
            if (tagName.length > 30) {
                tagName = tagName.substring(0, 30);
            }

            const coresValidas = ['bd4a4a', 'bd844a', 'ffff4f', '6fff4f'];
            const corValida = coresValidas.includes(cor) ? cor : 'bd4a4a';

            // Verifica se o usuário é o dono da VOD ou se a VOD é pública
            const queryPartida = `SELECT puuid, vod_publica FROM partidas WHERE link_vod = $1`;
            const { rows: partidas } = await db.query(queryPartida, [link_vod]);
            const partida = partidas[0];

            if (!partida) {
                throw new Error('Partida não encontrada.');
            }

            if (partida.puuid !== puuidSession && !partida.vod_publica) {
                throw new Error('Permissão negada para adicionar uma tag a esta VOD.');
            }

            // Verifica sobreposição de tempos com outras tags
            const queryTags = `SELECT inicio, fim FROM tags WHERE link_vod = $1`;
            const { rows: tags } = await db.query(queryTags, [link_vod]);

            for (const tagExistente of tags) {
                if (
                    (inicioInt >= tagExistente.inicio && inicioInt <= tagExistente.fim) ||
                    (fimInt >= tagExistente.inicio && fimInt <= tagExistente.fim) ||
                    (inicioInt <= tagExistente.inicio && fimInt >= tagExistente.fim)
                ) {
                    throw new Error('Já existe uma TAG que ocupa o mesmo ou parte do período de tempo escolhido.');
                }
            }

            // Inserção da nova tag no banco de dados
            const insertTagQuery = `
                INSERT INTO tags (link_vod, tag, inicio, fim, cor)
                VALUES ($1, $2, $3, $4, $5)
            `;
            await db.query(insertTagQuery, [link_vod, tagName, inicioInt, fimInt, corValida]);

            return { link_vod, tag: tagName, inicio: inicioInt, fim: fimInt, cor: corValida };
        } catch (error) {
            console.error('Erro ao adicionar tag:', error.message);
            throw error;
        }
    }

    static async adicionarComentario({ link_vod, comentario, inicio, fim, puuidSession }) {
        try {
            // Validações iniciais
            if (!link_vod || !comentario || inicio === undefined || fim === undefined || !puuidSession) {
                throw new Error('Parâmetros inválidos ou incompletos.');
            }

            const inicioInt = parseInt(inicio, 10);
            const fimInt = parseInt(fim, 10);
            if (isNaN(inicioInt) || isNaN(fimInt) || inicioInt < 0 || fimInt < 0 || inicioInt >= fimInt) {
                throw new Error('Tempos de início e fim inválidos.');
            }

            let comentarioLimpo = comentario.trim();
            if (comentarioLimpo.length > 200) {
                comentarioLimpo = comentarioLimpo.substring(0, 200);
            }

            // Verifica se o usuário é o dono da VOD ou se a VOD é pública
            const queryPartida = `SELECT puuid, vod_publica FROM partidas WHERE link_vod = $1`;
            const { rows: partidas } = await db.query(queryPartida, [link_vod]);
            const partida = partidas[0];

            if (!partida) {
                throw new Error('Partida não encontrada.');
            }

            if (partida.puuid !== puuidSession && !partida.vod_publica) {
                throw new Error('Permissão negada para adicionar um comentário a esta VOD.');
            }

            // Verifica sobreposição de tempos com outros comentários
            const queryComentarios = `SELECT inicio, fim FROM comentarios WHERE link_vod = $1`;
            const { rows: comentarios } = await db.query(queryComentarios, [link_vod]);

            for (const comentarioExistente of comentarios) {
                if (
                    (inicioInt >= comentarioExistente.inicio && inicioInt <= comentarioExistente.fim) ||
                    (fimInt >= comentarioExistente.inicio && fimInt <= comentarioExistente.fim) ||
                    (inicioInt <= comentarioExistente.inicio && fimInt >= comentarioExistente.fim)
                ) {
                    throw new Error('Conflito de tempo com um comentário existente.');
                }
            }

            // Inserção do novo comentário no banco de dados
            const insertComentarioQuery = `
                INSERT INTO comentarios (link_vod, comentario, inicio, fim)
                VALUES ($1, $2, $3, $4)
            `;
            await db.query(insertComentarioQuery, [link_vod, comentarioLimpo, inicioInt, fimInt]);

            return { link_vod, comentario: comentarioLimpo, inicio: inicioInt, fim: fimInt };
        } catch (error) {
            console.error('Erro ao adicionar comentário:', error.message);
            throw error;
        }
    }

    static async buscarTagsComentarios(link_vod) {
        try {
            // Verifica se link_vod foi fornecido
            if (!link_vod) {
                throw new Error('link_vod é obrigatório');
            }

            // Consultas para buscar tags e comentários
            const tagsQuery = `SELECT id, tag, inicio, fim, cor FROM tags WHERE link_vod = $1`;
            const comentariosQuery = `SELECT id, comentario, inicio, fim FROM comentarios WHERE link_vod = $1`;

            // Executa as consultas e armazena os resultados
            const { rows: tags } = await db.query(tagsQuery, [link_vod]);
            const { rows: comentarios } = await db.query(comentariosQuery, [link_vod]);

            return { tags, comentarios };
        } catch (error) {
            console.error('Erro ao buscar tags e comentários:', error.message);
            throw error;
        }
    }

    static async editarItem({ id, nome, inicio, fim, cor, link_vod, tipo, puuidSession }) {
        try {
            // Validação inicial
            if (!link_vod || !nome || inicio === undefined || fim === undefined) {
                throw new Error('Parâmetros inválidos ou incompletos.');
            }

            const inicioInt = parseInt(inicio, 10);
            const fimInt = parseInt(fim, 10);
            if (isNaN(inicioInt) || isNaN(fimInt) || inicioInt < 0 || fimInt < 0 || inicioInt >= fimInt) {
                throw new Error('Tempos de início e fim inválidos.');
            }

            let nomeLimpo = nome.trim();
            if (tipo === 'tag' && nomeLimpo.length > 30) {
                nomeLimpo = nomeLimpo.substring(0, 30);
            } else if (tipo === 'comentario' && nomeLimpo.length > 200) {
                nomeLimpo = nomeLimpo.substring(0, 200);
            }

            if (tipo === 'tag') {
                const coresValidas = ['bd4a4a', 'bd844a', 'ffff4f', '6fff4f'];
                if (!coresValidas.includes(cor)) {
                    throw new Error('Cor inválida.');
                }
            }

            // Verificação de permissão do usuário
            const queryPartida = `SELECT puuid, vod_publica FROM partidas WHERE link_vod = $1`;
            const { rows: partidas } = await db.query(queryPartida, [link_vod]);
            const partida = partidas[0];

            if (!partida) {
                throw new Error('Partida não encontrada.');
            }

            if (partida.puuid !== puuidSession && !partida.vod_publica) {
                throw new Error('Permissão negada para editar este item.');
            }

            // Verificar sobreposição de tempos com outros itens
            const queryItens = tipo === 'tag'
                ? `SELECT inicio, fim FROM tags WHERE link_vod = $1 AND id != $2`
                : `SELECT inicio, fim FROM comentarios WHERE link_vod = $1 AND id != $2`;

            const { rows: itensExistentes } = await db.query(queryItens, [link_vod, id]);

            for (let item of itensExistentes) {
                if (
                    (inicioInt >= item.inicio && inicioInt <= item.fim) ||
                    (fimInt >= item.inicio && fimInt <= item.fim) ||
                    (inicioInt <= item.inicio && fimInt >= item.fim)
                ) {
                    throw new Error(`Conflito de tempo com um item existente.`);
                }
            }

            // Construir e executar a query de atualização
            let query;
            let values;

            if (tipo === 'tag') {
                query = `UPDATE tags SET tag = $1, inicio = $2, fim = $3, cor = $4 WHERE id = $5 AND link_vod = $6`;
                values = [nomeLimpo, inicioInt, fimInt, cor, id, link_vod];
            } else {
                query = `UPDATE comentarios SET comentario = $1, inicio = $2, fim = $3 WHERE id = $4 AND link_vod = $5`;
                values = [nomeLimpo, inicioInt, fimInt, id, link_vod];
            }

            const result = await db.query(query, values);

            if (result.rowCount === 0) {
                throw new Error('Item não encontrado ou não pertence a esta VOD.');
            }

            return { id, nome: nomeLimpo, inicio: inicioInt, fim: fimInt, cor, tipo, link_vod };
        } catch (error) {
            console.error('Erro ao editar item:', error.message);
            throw error;
        }
    }
    
    static async removerItem({ id, link_vod, tipo }) {
        try {
            // Definindo a query com base no tipo do item
            let query;
            if (tipo === 'tag') {
                query = `DELETE FROM tags WHERE id = $1 AND link_vod = $2`;
            } else if (tipo === 'comentario') {
                query = `DELETE FROM comentarios WHERE id = $1 AND link_vod = $2`;
            } else {
                throw new Error('Tipo inválido. Deve ser "tag" ou "comentario".');
            }

            // Executa a query de remoção
            const result = await db.query(query, [id, link_vod]);

            if (result.rowCount === 0) {
                throw new Error('Item não encontrado ou não pertence a esta VOD.');
            }

            return { id, tipo, link_vod };
        } catch (error) {
            console.error('Erro ao remover item:', error.message);
            throw error;
        }
    }
}

module.exports = Vod;
const Partida = require('../models/partida');
const { getRuneImage } = require('../utils/partidas_funcoes');

// Controller para lidar com o botão de atualizar e buscar partidas
exports.atualizarPartidas = async (req, res) => {
    const usuario = req.session.puuid; // Assumindo que o PUUID está salvo na sessão
    const partidaModel = new Partida(usuario);

    try {
        // Buscar os IDs das partidas
        const idsPartidas = await partidaModel.buscarIdsPartidas();

        // Buscar os dados completos das partidas
        for (const idPartida of idsPartidas) {
            const dadosPartida = await partidaModel.buscarDadosPartida(idPartida);

            // Salvar a partida no banco de dados
            await partidaModel.salvarPartidaBanco(dadosPartida);
        }

        // Redirecionar de volta para a página de partidas
        res.redirect('/partidas');
    } catch (error) {
        console.error('Erro ao atualizar partidas:', error);
        res.status(500).send('Erro ao atualizar partidas');
    }
};

// Controller para renderizar a página de partidas
exports.mostrarPartidas = async (req, res) => {
    const email = req.session.email; // Assumindo que o e-mail está salvo na sessão
    const usuario = req.session.puuid; // Assumindo que o PUUID está salvo na sessão
    const logado = req.session.logado; // Assumindo que a informação de login está salva na sessão

    if (!logado || !email || !usuario) {
        return res.redirect('/logar');
    }

    const partidaModel = new Partida(usuario);

    try {
        // Buscar as partidas do banco de dados para exibir na página
        const partidas = await partidaModel.buscarPartidasNoBanco();

        // Renderizar a página de partidas com os dados obtidos
        res.render('partidas', { partidas, getRuneImage });
    } catch (error) {
        console.error('Erro ao exibir as partidas:', error);
        res.status(500).send('Erro ao exibir as partidas');
    }
};
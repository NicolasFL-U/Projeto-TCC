const { obterEstatisticasPorPuuid } = require('../models/estatisticas'); // Importa a função do model

exports.exibirEstatisticas = async (req, res) => {
    const puuid = req.session.puuid;

    if (puuid === undefined) {
        return res.redirect('/logar');
    }

    try {
        const { estatisticas, campeoes, roles } = await obterEstatisticasPorPuuid(puuid);

        // Renderiza a página sem enviar as funções de utilitários
        res.render('estatisticas', { estatisticas, campeoes, roles });

    } catch (error) {
        console.error('Erro ao exibir estatísticas:', error);
        res.status(500).json({ erro: 'Erro ao carregar estatísticas' });
    }
};

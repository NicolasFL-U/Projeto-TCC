document.addEventListener('DOMContentLoaded', function () {
    const btnAtualizar = document.getElementById('btnAtualizar');

    btnAtualizar.addEventListener('click', function () {
        // Mostrar o modal de atualização
        $('#atualizarModal').modal('show');
    });

    fetch('/dadosUsuario')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Erro ao carregar os dados:', data.error);
                return;
            }

            // Exibir os dados do usuário na página
            document.getElementById('gameName').textContent = `${data.gameName}#${data.tagLine}`;
            document.getElementById('profileIcon').src = `https://ddragon.leagueoflegends.com/cdn/14.20.1/img/profileicon/${data.profileIconId}.png`;
            document.getElementById('summonerLevel').textContent = `Nível: ${data.summonerLevel}`;
            document.getElementById('tier').textContent = data.tier;
            document.getElementById('rank').textContent = data.rank;
            document.getElementById('leaguePoints').textContent = `${data.leaguePoints} PDL`;

            // Vitórias/Derrotas e Winrate
            const wins = data.wins;
            const losses = data.losses;
            const totalPartidas = wins + losses;
            const winrate = ((wins / totalPartidas) * 100).toFixed(1); // Calcula o winrate com 1 casa decimal
            document.getElementById('wins').textContent = wins;
            document.getElementById('losses').textContent = losses;
            document.getElementById('winrate').textContent = `(${winrate}% WR)`;

            // Adicionar o ícone do elo ao lado do Elo e PDL
            const eloIconPath = `/ranked/${data.tier}.png`; // Supondo que os ícones dos elos estão na pasta "/ranks/"
            document.getElementById('eloIcon').src = eloIconPath;
        })
        .catch(error => console.error('Erro ao carregar os dados do usuário:', error));

    // Adicionar evento ao botão de salvar VOD
    document.getElementById('salvarVodButton').addEventListener('click', function (event) {
        event.preventDefault(); // Impede o envio padrão do formulário

        const partidaId = document.getElementById('partida_id').value;
        let linkVod = document.getElementById('link_vod').value;

        // Verifica se o link do YouTube é válido
        const youtubeBaseUrl = "https://www.youtube.com/watch?v=";
        if (!linkVod.startsWith(youtubeBaseUrl)) {
            alert("Por favor, insira um link válido do YouTube que comece com 'https://www.youtube.com/watch?v='");
            return;
        }

        // Remove parâmetros extras após "v=" no link
        const urlWithoutParams = linkVod.split('&')[0];
        document.getElementById('link_vod').value = urlWithoutParams;

        // Preparar os dados para enviar
        const data = {
            partida_id: partidaId,
            link_vod: urlWithoutParams
        };

        // Enviar os dados via fetch para salvar a VOD
        fetch('/salvarVod', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                // Exibir mensagem de erro no modal de erro
                document.getElementById('errorMessage').innerText = data.error;
                $('#vodModal').modal('hide');
                $('#errorModal').modal('show');
            } else {
                // Exibir mensagem de sucesso e fechar o modal
                $('#vodModal').modal('hide');
                location.reload(); // Atualizar a página para refletir as alterações
            }
        })
        .catch(error => {
            console.error('Erro ao salvar o VOD:', error);
            document.getElementById('errorMessage').innerText = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
            $('#vodModal').modal('hide');
            $('#errorModal').modal('show');
        });
    });

    // Preencher o modal com os dados da partida ao clicar no botão
    $('.vod-btn').click(function () {
        const partidaId = $(this).data('partida-id');
        const linkVod = $(this).data('link-vod');

        $('#partida_id').val(partidaId);
        $('#link_vod').val(linkVod || ''); // Caso não tenha link, deixar vazio
    });
});

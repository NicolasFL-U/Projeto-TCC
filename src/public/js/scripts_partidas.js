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
            document.getElementById('profileIcon').src = `https://ddragon.leagueoflegends.com/cdn/14.17.1/img/profileicon/${data.profileIconId}.png`;
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
});


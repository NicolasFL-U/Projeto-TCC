document.addEventListener('DOMContentLoaded', function () {
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

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('adicionarTag').addEventListener('click', function() {
        const nomeTag = document.getElementById('nomeTag').value;
        const inicioMin = document.getElementById('inicioMin').value;
        const inicioSeg = document.getElementById('inicioSeg').value;
        const fimMin = document.getElementById('fimMin').value;
        const fimSeg = document.getElementById('fimSeg').value;
        const corTag = document.getElementById('corTag').value;
    
        const inicio = converterTempoEmSegundos(inicioMin, inicioSeg);
        const fim = converterTempoEmSegundos(fimMin, fimSeg);
    
        const tagData = {
            link_vod: linkVod,  // linkVod definido via EJS
            tag: nomeTag,
            inicio: inicio,
            fim: fim,
            cor: corTag
        };
    
        // Envia os dados para a rota /adicionarTag usando POST
        fetch('/adicionarTag', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tagData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                // Se houver erro, exibir a mensagem no modal
                document.getElementById('errorMessage').innerText = data.error;
                $('#errorModal').modal('show');
            } else {
                // Caso sucesso, avançar o vídeo para o tempo de início
                const player = document.querySelector('iframe');
                const playerSrc = player.src;
                const newSrc = playerSrc.split('?')[0] + `?start=${inicio}&autoplay=1`;
                player.src = newSrc;
            }
        })
        .catch((error) => {
            console.error('Erro ao adicionar Tag:', error);
            document.getElementById('errorMessage').innerText = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
            $('#errorModal').modal('show');
        });
    });

    document.getElementById('resetarTag').addEventListener('click', function() {
        document.getElementById('nomeTag').value = '';
        document.getElementById('inicioMin').value = '';
        document.getElementById('inicioSeg').value = '';
        document.getElementById('fimMin').value = '';
        document.getElementById('fimSeg').value = '';
        document.getElementById('corTag').value = 'bd4a4a'; // Valor padrão
    });

    document.getElementById('adicionarComentario').addEventListener('click', function() {
        const comentario = document.getElementById('comentario').value;
        const inicioMin = document.getElementById('inicioMinComment').value;
        const inicioSeg = document.getElementById('inicioSegComment').value;
        const fimMin = document.getElementById('fimMinComment').value;
        const fimSeg = document.getElementById('fimSegComment').value;
    
        const inicio = converterTempoEmSegundos(inicioMin, inicioSeg);
        const fim = converterTempoEmSegundos(fimMin, fimSeg);
    
        const comentarioData = {
            link_vod: linkVod,  // linkVod definido via EJS
            comentario: comentario,
            inicio: inicio,
            fim: fim
        };
    
        // Envia os dados para a rota /adicionarComentario usando POST
        fetch('/adicionarComentario', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(comentarioData),
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                // Se houver erro, exibir a mensagem no modal
                document.getElementById('errorMessage').innerText = data.error;
                $('#errorModal').modal('show'); // Mostra o modal de erro
            } else {
                // Caso sucesso, avançar o vídeo para o tempo de início
                const player = document.querySelector('iframe'); // Pegando o iframe do YouTube
                const playerSrc = player.src;
                const newSrc = playerSrc.split('?')[0] + `?start=${data.inicio}&autoplay=1`;
                player.src = newSrc; // Atualiza o tempo de início no vídeo
            }
        })
        .catch((error) => {
            console.error('Erro ao adicionar Comentário:', error);
            document.getElementById('errorMessage').innerText = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
            $('#errorModal').modal('show'); // Mostra o modal de erro
        });
    });

    document.getElementById('resetarComentario').addEventListener('click', function() {
        document.getElementById('comentario').value = '';
        document.getElementById('inicioMinComment').value = '';
        document.getElementById('inicioSegComment').value = '';
        document.getElementById('fimMinComment').value = '';
        document.getElementById('fimSegComment').value = '';
    });    
});

// Função para converter minutos e segundos em segundos
function converterTempoEmSegundos(min, seg) {
    return (parseInt(min) * 60) + parseInt(seg);
}
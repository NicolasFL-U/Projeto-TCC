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
                document.getElementById('errorMessage').innerText = data.error;
                $('#errorModal').modal('show');
            } else {
                socket.emit('novaTag', tagData); // Emite evento via Socket.io
                renderizarTags([tagData]);
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
                document.getElementById('errorMessage').innerText = data.error;
                $('#errorModal').modal('show');
            } else {
                socket.emit('novoComentario', comentarioData); // Emite evento via Socket.io
                renderizarComentarios([comentarioData]);
            }
        })
        .catch((error) => {
            console.error('Erro ao adicionar Comentário:', error);
            document.getElementById('errorMessage').innerText = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
            $('#errorModal').modal('show');
        });
    });

    document.getElementById('resetarComentario').addEventListener('click', function() {
        document.getElementById('comentario').value = '';
        document.getElementById('inicioMinComment').value = '';
        document.getElementById('inicioSegComment').value = '';
        document.getElementById('fimMinComment').value = '';
        document.getElementById('fimSegComment').value = '';
    });

    carregarTagsComentarios();
});

// Função para converter minutos e segundos em segundos
function converterTempoEmSegundos(min, seg) {
    return (parseInt(min) * 60) + parseInt(seg);
}

function renderizarTimeline(tags, comentarios) {
    const timelineContent = document.getElementById('timelineContent');
    timelineContent.innerHTML = ''; // Limpa a timeline anterior

    // Combina tags e comentários e ordena pelo tempo de início
    const itens = [...tags, ...comentarios].sort((a, b) => a.inicio - b.inicio);

    itens.forEach(item => {
        const timelineItem = document.createElement('div');
        timelineItem.classList.add('timeline-item');

        // Cria o contêiner de conteúdo
        const contentContainer = document.createElement('div');
        contentContainer.classList.add('timeline-item-content');

        // Cria o elemento para o texto (nome da tag ou comentário)
        const middleText = document.createElement('div');
        middleText.classList.add('timeline-item-text');
        let textContent = item.tag ? item.tag : item.comentario;
        if (textContent.length > 20) {
            textContent = textContent.substring(0, 20) + '...';
        }
        middleText.textContent = textContent;

        // Cria o elemento para o tempo de início
        const bottomTime = document.createElement('div');
        bottomTime.classList.add('timeline-item-time');
        const minutes = Math.floor(item.inicio / 60);
        const seconds = item.inicio % 60;
        bottomTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Adiciona os elementos ao contêiner de conteúdo
        contentContainer.appendChild(middleText);
        contentContainer.appendChild(bottomTime);

        // Função para pular para o momento do item
        timelineItem.addEventListener('click', () => {
            player.seekTo(item.inicio);
        });

        // Cria o contêiner dos botões
        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('timeline-item-buttons');

        // Botão de editar com ícone SVG
        const editButton = document.createElement('button');
        editButton.classList.add('edit-btn');
        editButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Impede o clique no item
            // Lógica de edição aqui
        });

        // Cria o elemento img para o ícone de edição
        const editIcon = document.createElement('img');
        editIcon.src = '/icons/edit.svg'; // Ajuste o caminho conforme necessário
        editIcon.alt = 'Editar';
        editIcon.classList.add('icon');

        editButton.appendChild(editIcon);

        // Botão de remover com ícone SVG
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-btn');
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Impede o clique no item
            // Lógica de exclusão aqui
        });

        // Cria o elemento img para o ícone de remoção
        const deleteIcon = document.createElement('img');
        deleteIcon.src = '/icons/trash.svg'; // Ajuste o caminho conforme necessário
        deleteIcon.alt = 'Remover';
        deleteIcon.classList.add('icon');

        deleteButton.appendChild(deleteIcon);

        // Adiciona os botões ao contêiner
        buttonContainer.appendChild(editButton);
        buttonContainer.appendChild(deleteButton);

        // Adiciona o contêiner de conteúdo e o contêiner de botões ao item da timeline
        timelineItem.appendChild(contentContainer);
        timelineItem.appendChild(buttonContainer);

        // Define a cor de fundo
        if (item.tag) {
            timelineItem.style.backgroundColor = `rgba(${hexToRgb(item.cor)}, 0.4)`; // Cor da tag
        } else {
            timelineItem.style.backgroundColor = '#181818'; 
        }

        timelineContent.appendChild(timelineItem);
    });
}

// Função que renderiza tanto a timeline quanto as tags/comentários
function carregarTagsComentarios() {
    fetch(`/api/vod/${linkVod}/tags-comentarios`)
        .then(response => response.json())
        .then(data => {
            const timelineContainer = document.getElementById('timeline-container');
            const timelineContent = document.getElementById('timelineContent');
            const timelineVazia = document.getElementById('timeline-vazia');

            // Limpa o conteúdo anterior
            timelineContent.innerHTML = '';

            console.log(data.tags.length, data.comentarios.length);

            if (data.tags.length === 0 && data.comentarios.length === 0) {
                // Não há tags/comentários, esconde a timeline e mostra a mensagem
                timelineContainer.style.visibility = 'hidden';
                timelineVazia.style.visibility = 'visible';
            } else {
                // Há tags/comentários, mostra a timeline e esconde a mensagem
                timelineContainer.style.visibility = 'visible';
                timelineVazia.style.visibility = 'hidden';

                // Renderiza os itens na timeline
                renderizarTimeline(data.tags, data.comentarios);
            }
        })
        .catch(error => console.error('Erro ao carregar tags e comentários:', error));
}

// Atualiza a timeline em tempo real via Socket.io
socket.on('novaTag', (data) => {
    if (data.link_vod === linkVod) {
        carregarTagsComentarios();
    }
});

socket.on('novoComentario', (data) => {
    if (data.link_vod === linkVod) {
        carregarTagsComentarios();
    }
});

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

        if (item.tag) {
            // É uma tag
            timelineItem.textContent = item.tag.length > 15 ? item.tag.substring(0, 15) + '...' : item.tag;
            timelineItem.style.backgroundColor = `rgba(${hexToRgb(item.cor)}, 0.4)`; // Cor da tag
        } else {
            // É um comentário
            timelineItem.textContent = item.comentario.length > 15 ? item.comentario.substring(0, 15) + '...' : item.comentario;
            timelineItem.style.backgroundColor = 'lightgray'; // Cor para comentário
        }

        // Função para pular para o momento do item
        timelineItem.addEventListener('click', () => {
            player.seekTo(item.inicio);
        });

        // Adicionar botões de edição e exclusão
        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('timeline-item-buttons');
        
        const editButton = document.createElement('button');
        editButton.classList.add('edit-btn');
        // Adicionar comportamento ao clicar no botão de editar
        editButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Impede o clique no item
            // Lógica de edição aqui
        });

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-btn');
        // Adicionar comportamento ao clicar no botão de deletar
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Impede o clique no item
            // Lógica de exclusão aqui
        });

        buttonContainer.appendChild(editButton);
        buttonContainer.appendChild(deleteButton);
        timelineItem.appendChild(buttonContainer);

        timelineContent.appendChild(timelineItem);
    });
}

// Função que renderiza tanto a timeline quanto as tags/comentários
function carregarTagsComentarios() {
    fetch(`/api/vod/${linkVod}/tags-comentarios`)
        .then(response => response.json())
        .then(data => {
            renderizarTags(data.tags);
            renderizarComentarios(data.comentarios);
            renderizarTimeline(data.tags, data.comentarios); // Renderiza a pseudo-timeline
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

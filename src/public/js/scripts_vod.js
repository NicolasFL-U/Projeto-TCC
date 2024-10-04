document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('adicionarTag').addEventListener('click', function () {
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
                    socket.emit('novaTag', data); // Emite evento via Socket.io
                    carregarTagsComentarios();
                }
            })
            .catch((error) => {
                console.error('Erro ao adicionar Tag:', error);
                document.getElementById('errorMessage').innerText = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
                $('#errorModal').modal('show');
            });
    });

    document.getElementById('resetarTag').addEventListener('click', function () {
        document.getElementById('nomeTag').value = '';
        document.getElementById('inicioMin').value = '';
        document.getElementById('inicioSeg').value = '';
        document.getElementById('fimMin').value = '';
        document.getElementById('fimSeg').value = '';
        document.getElementById('corTag').value = 'bd4a4a'; // Valor padrão
    });

    document.getElementById('adicionarComentario').addEventListener('click', function () {
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
                    carregarTagsComentarios();
                }
            })
            .catch((error) => {
                console.error('Erro ao adicionar Comentário:', error);
                document.getElementById('errorMessage').innerText = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
                $('#errorModal').modal('show');
            });
    });

    document.getElementById('resetarComentario').addEventListener('click', function () {
        document.getElementById('comentario').value = '';
        document.getElementById('inicioMinComment').value = '';
        document.getElementById('inicioSegComment').value = '';
        document.getElementById('fimMinComment').value = '';
        document.getElementById('fimSegComment').value = '';
    });

    carregarTagsComentarios();

    document.getElementById('salvarEdicao').addEventListener('click', function() {
        const id = document.getElementById('editItemId').value;
        const tipo = document.getElementById('editTipo').value;
    
        const inicioMin = document.getElementById('editInicioMin').value;
        const inicioSeg = document.getElementById('editInicioSeg').value;
        const fimMin = document.getElementById('editFimMin').value;
        const fimSeg = document.getElementById('editFimSeg').value;
    
        const inicio = converterTempoEmSegundos(inicioMin, inicioSeg);
        const fim = converterTempoEmSegundos(fimMin, fimSeg);
    
        let nome;
        let cor;
    
        if (tipo === 'tag') {
            nome = document.getElementById('editNomeTag').value;
            cor = document.getElementById('editCorTag').value;
        } else if (tipo === 'comentario') {
            nome = document.getElementById('editComentario').value;
            // Não precisamos da cor para comentários
        }
    
        const data = {
            id: id,
            nome: nome,
            inicio: inicio,
            fim: fim,
            link_vod: linkVod,
            tipo: tipo
        };
    
        // Adiciona a cor apenas se for uma tag
        if (tipo === 'tag') {
            data.cor = cor;
        }
    
        fetch(`/editarItem/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(responseData => {
            if (responseData.error) {
                document.getElementById('errorMessage').innerText = responseData.error;
                $('#editModal').modal('hide');
                $('#errorModal').modal('show');
            } else {
                socket.emit('atualizarItem', responseData); // Emitir o evento para todos os clientes conectados
                $('#editModal').modal('hide');
                carregarTagsComentarios();
            }
        })
        .catch((error) => {
            console.error('Erro ao editar item:', error);
            document.getElementById('errorMessage').innerText = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
            $('#errorModal').modal('show');
        });
    });
    
    document.getElementById('confirmarRemocao').addEventListener('click', function() {
        const id = document.getElementById('deleteItemId').value;
        const tipo = document.getElementById('deleteTipo').value; // Aqui pegamos se é uma tag ou comentário
    
        fetch(`/removerItem/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ link_vod: linkVod, tipo: tipo }), // Passa o link_vod e o tipo
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Erro ao remover item: ' + data.error);
            } else {
                $('#deleteModal').modal('hide');
            }
        })
        .catch((error) => {
            console.error('Erro ao remover item:', error);
        });
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
            e.stopPropagation();
            abrirModalEdicao(item); // Função para abrir modal de edição
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
            e.stopPropagation();
            abrirModalRemocao(item); // Função para abrir modal de remoção
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

function carregarTagsComentarios() {
    fetch(`/api/vod/${linkVod}/tags-comentarios`, {
        method: 'GET',
        cache: 'no-cache', // Importante para prevenir cache
        })
        .then(response => response.json())
        .then(data => {
            const timelineContainer = document.getElementById('timeline-container');
            const timelineContent = document.getElementById('timelineContent');
            const timelineVazia = document.getElementById('timeline-vazia');
            

            if (data.tags.length === 0 && data.comentarios.length === 0) {
                // Não há tags/comentários, esconde a timeline e mostra a mensagem
                timelineContainer.style.display = 'none';
                timelineVazia.style.display = 'flex';

                // Limpa o conteúdo anterior
                timelineContent.innerHTML = '';

                const tagOverlay = document.getElementById('tagOverlay');
                tagOverlay.innerHTML = ''; // Limpa as tags anteriores

                const comentarioOverlay = document.getElementById('comentarioOverlay');
                comentarioOverlay.innerHTML = ''; // Limpa os comentários anteriores
            } else {
                // Há tags/comentários, mostra a timeline e esconde a mensagem
                timelineContainer.style.display = 'flex'; // Certifique-se de que o display seja 'flex'
                timelineVazia.style.display = 'none';

                // Renderiza os itens na timeline
                renderizarTimeline(data.tags, data.comentarios);

                // **Renderiza as tags e comentários nos overlays**
                renderizarTags(data.tags);
                renderizarComentarios(data.comentarios);
            }
        })
        .catch(error => console.error('Erro ao carregar tags e comentários:', error));
}

// Função para abrir o modal de edição com os campos corretos
function abrirModalEdicao(item) {
    const isTag = !!item.tag;
    
    // Preenche os valores no modal de acordo com o tipo
    document.getElementById('editItemId').value = item.id;
    document.getElementById('editTipo').value = isTag ? 'tag' : 'comentario';
    
    if (isTag) {
        // Exibir campos para tag
        document.getElementById('editNomeTag').value = item.tag;
        document.getElementById('editNomeTagContainer').style.display = 'block';
        document.getElementById('editComentarioContainer').style.display = 'none';
        document.getElementById('editCorTagContainer').style.display = 'block';
        document.getElementById('editCorTag').value = item.cor;
    } else {
        // Exibir campos para comentário
        document.getElementById('editComentario').value = item.comentario;
        document.getElementById('editComentarioContainer').style.display = 'block';
        document.getElementById('editNomeTagContainer').style.display = 'none';
        document.getElementById('editCorTagContainer').style.display = 'none'; // Esconde o seletor de cor
    }

    // Define valores de início e fim
    document.getElementById('editInicioMin').value = Math.floor(item.inicio / 60);
    document.getElementById('editInicioSeg').value = item.inicio % 60;
    document.getElementById('editFimMin').value = Math.floor(item.fim / 60);
    document.getElementById('editFimSeg').value = item.fim % 60;

    $('#editModal').modal('show');
}

// Função para abrir o modal de remoção
function abrirModalRemocao(item) {
    const tipo = item.tag ? 'tag' : 'comentario';
    const nomeItem = item.tag ? item.tag : item.comentario;

    // Define a mensagem correta com base no tipo
    const mensagem = tipo === 'tag' 
        ? `Deseja realmente remover a tag?\n"${nomeItem}"`
        : `Deseja realmente remover o comentário?\n"${nomeItem}"`;

    document.getElementById('deleteItemMessage').textContent = mensagem;
    document.getElementById('deleteItemId').value = item.id;
    document.getElementById('deleteTipo').value = tipo;

    $('#deleteModal').modal('show');
}

// Atualiza a timeline em tempo real via Socket.io
socket.on('novaTag', (data) => {
    if (data.link_vod === linkVod) {
        setTimeout(() => carregarTagsComentarios(), 200); // Delay para garantir que a tag seja salva no banco de dados
    }
});

socket.on('novoComentario', (data) => {
    if (data.link_vod === linkVod) {
        setTimeout(() => carregarTagsComentarios(), 200); // Delay para garantir que o comentário seja salvo no banco de dados
    }
});

socket.on('atualizarItem', (data) => {
    if (data.link_vod === linkVod) {
        setTimeout(() => carregarTagsComentarios(), 200); // Delay para garantir que a edição seja salva no banco de dados
    }
});

socket.on('removerItem', (data) => {
    if (data.link_vod === linkVod) {
        setTimeout(() => carregarTagsComentarios(), 200); // Delay para garantir que a remoção seja salva no banco de dados
    }
});
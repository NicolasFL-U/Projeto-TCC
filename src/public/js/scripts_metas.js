window.abrirModalExclusao = function(id, tipo, nome) {
    idMetaExcluir = id;
    tipoMetaExcluir = tipo;
    nomeMetaExcluir = nome;
    document.getElementById('metaNomeExcluir').textContent = nome;
    $('#confirmDeleteModal').modal('show');
};

document.addEventListener('DOMContentLoaded', function() {
    const statusMessage = document.getElementById('statusMessage');
    const metasList = document.getElementById('metasList');

    // Função para calcular a cor da barra de progresso
    function calcularCorProgresso(proporcao) {
        const red = Math.round(255 * (1 - proporcao));
        const green = Math.round(255 * proporcao);
        return `rgb(${red}, ${green}, 0)`;
    }

    // Função para mapear números de elo para o nome de elo
    function mapNumberToElo(numero) {
        const elos = [
            'Sem ranking', 'Ferro IV', 'Ferro III', 'Ferro II', 'Ferro I',
            'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I',
            'Prata IV', 'Prata III', 'Prata II', 'Prata I',
            'Ouro IV', 'Ouro III', 'Ouro II', 'Ouro I',
            'Platina IV', 'Platina III', 'Platina II', 'Platina I',
            'Diamante IV', 'Diamante III', 'Diamante II', 'Diamante I',
            'Mestre', 'Grão-mestre', 'Desafiante'
        ];
        return elos[numero] || 'Desconhecido';
    }

    // Requisição para excluir meta
    document.getElementById('confirmDeleteButton').addEventListener('click', function() {
        if (idMetaExcluir && tipoMetaExcluir) {
            fetch('/removerMeta', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: idMetaExcluir, tipo: tipoMetaExcluir })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Erro ao excluir meta: ' + data.error);
                } else {
                    alert('Meta excluída com sucesso');
                    location.reload();
                }
            })
            .catch(error => console.error('Erro ao excluir meta:', error));
        }
    });

    // Requisição para obter metas
    fetch('/obterMetas')
        .then(response => response.json())
        .then(data => {
            statusMessage.textContent = '';

            if ((data.especificas || []).length === 0 && (data.livres || []).length === 0) {
                statusMessage.textContent = 'Nenhuma meta encontrada';
                return;
            }

            [...(data.especificas || []), ...(data.livres || [])].forEach(meta => {
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item meta-item';
                const nomeMeta = meta.descricao || meta.nome_meta;

                let progressoTexto = '';
                let progressoAtualBarra = 0;
                let corProgresso;
                
                const progressoAtual = parseFloat(meta.progresso_atual) || 0;
                const objetivo = parseFloat(meta.objetivo) || 1;

                if (meta.tipo === 'livre') {
                    progressoTexto = meta.status ? 'Completo' : 'Incompleto';
                    progressoAtualBarra = meta.status ? 100 : 0; 
                } else if (meta.tipo === 'objetivo_elo') {
                    const eloAtual = mapNumberToElo(Math.round(progressoAtual));
                    const eloObjetivo = mapNumberToElo(objetivo);
                    progressoTexto = `${eloAtual} / ${eloObjetivo}`;
                    progressoAtualBarra = (progressoAtual / objetivo) * 100;
                } else {
                    if (progressoAtual >= objetivo) {
                        progressoTexto = `Completo (${progressoAtual}/${objetivo})`;
                        progressoAtualBarra = 100;
                    } else {
                        progressoAtualBarra = (progressoAtual / objetivo) * 100;
                        progressoTexto = Number.isInteger(objetivo) ? `${Math.round(progressoAtual)}/${objetivo}` : `${progressoAtual.toFixed(1)}/${objetivo.toFixed(1)}`;
                    }
                }

                corProgresso = calcularCorProgresso(progressoAtualBarra / 100);

                listItem.innerHTML = `
                    <div class="d-flex justify-content-between" style="width: 100%">
                        <div class="meta-conteudo">
                            <h5 class="meta-nome">${nomeMeta}</h5>
                            <div class="meta-progresso-container" style="margin-top: 20px; margin-bottom: 5px;">
                                <p class="meta-progresso-text">Progresso</p>
                                <p class="meta-progresso-num" style="color: ${corProgresso};">${progressoTexto}</p>
                            </div>
                            <div class="progress meta-progress-bar">
                                <div class="progress-bar" role="progressbar" 
                                     style="width: ${progressoAtualBarra}%; background-color: ${corProgresso};">
                                </div>
                            </div>
                        </div>
                        <div class="meta-acoes">
                            <button class="btn btn-link" style="padding: 0px; margin-top: 0;">
                                <img src="/icons/edit.svg" alt="Editar" class="meta-icon">
                            </button>
                            <button class="btn btn-link" style="padding: 0px; margin-top: 0;" onclick="abrirModalExclusao(${meta.id}, '${meta.tipo}', '${nomeMeta}')">
                                <img src="/icons/trash.svg" alt="Excluir" class="meta-icon">
                            </button>
                        </div>
                    </div>
                `;
                metasList.appendChild(listItem);
            });
        })
        .catch(error => {
            console.error('Erro ao carregar as metas:', error);
            statusMessage.textContent = 'Erro ao carregar as metas. Tente novamente mais tarde.';
        });
});

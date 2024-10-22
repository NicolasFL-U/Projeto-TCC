window.abrirModalExclusao = function(id, tipo, nome) {
    idMetaExcluir = id;
    tipoMetaExcluir = tipo;
    nomeMetaExcluir = nome;
    document.getElementById('metaNomeExcluir').textContent = nome;
    $('#confirmDeleteModal').modal('show');
};

document.addEventListener('DOMContentLoaded', function() {
    carregarCampeoes();
    
    const statusMessage = document.getElementById('statusMessage');
    const metasList = document.getElementById('metasList');
    const errorMessage = document.getElementById('errorMessage');

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
                    errorMessage.textContent = 'Erro ao excluir meta: ' + data.error;
                    $('#confirmDeleteModal').modal('hide');
                    $('#errorModal').modal('show');
                } else {
                    location.reload();
                }
            })
            .catch(error => {
                console.error('Erro ao excluir meta:', error);
                errorMessage.textContent = 'Erro ao excluir meta: ' + error.message;
                $('#errorModal').modal('show');
            });
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

    // Definir a primeira opção como padrão para cada seletor
    document.getElementById('tipoMeta').selectedIndex = 0;
    document.getElementById('tipoMetaEspecifica').selectedIndex = 0;
    document.getElementById('campeaoMeta').selectedIndex = 0;
    document.getElementById('rotaMeta').selectedIndex = 0;
    document.getElementById('eloMeta').selectedIndex = 0;

    // Controle da exibição de campos conforme o tipo de meta
    document.getElementById('tipoMeta').addEventListener('change', function() {
        const tipo = this.value;
        document.getElementById('campoNomeMeta').style.display = tipo === 'livre' ? 'block' : 'none';
        document.getElementById('camposMetaEspecifica').style.display = tipo === 'especifica' ? 'block' : 'none';
    });

    document.getElementById('tipoMetaEspecifica').addEventListener('change', function() {
        const tipoMetaEspecifica = this.value;
    
        // Mostrar ou ocultar campos conforme o tipo selecionado
        document.getElementById('campoCampeaoMeta').style.display = tipoMetaEspecifica === 'partidas_campeao' ? 'block' : 'none';
        document.getElementById('campoRotaMeta').style.display = tipoMetaEspecifica === 'partidas_rota' ? 'block' : 'none';
        document.getElementById('campoLimiteMeta').style.display = ['media_cs', 'media_wr'].includes(tipoMetaEspecifica) ? 'block' : 'none';
        document.getElementById('campoEloMeta').style.display = tipoMetaEspecifica === 'objetivo_elo' ? 'block' : 'none';
        
        // Se for um objetivo de elo, o campo objetivo padrão desaparece
        document.getElementById('campoObjetivoMeta').style.display = tipoMetaEspecifica !== 'objetivo_elo' ? 'block' : 'none';
    });

    // Abrir o modal para adicionar uma meta
    document.getElementById('btnAdicionar').addEventListener('click', function() {
        $('#adicionarMetaModal').modal('show');
    });

    // Adicionar a meta ao confirmar
    document.getElementById('confirmAddButton').addEventListener('click', function() {
        const tipo = document.getElementById('tipoMeta').value;
        let body;

        if (tipo === 'livre') {
            body = {
                tipo: 'livre',
                nome: document.getElementById('nomeMeta').value
            };
        } else if (tipo === 'especifica') {
            const tipoMetaEspecifica = document.getElementById('tipoMetaEspecifica').value;

            // Se o tipo for objetivo_elo, usa o valor do campo eloMeta para definir o objetivo
            const objetivo = tipoMetaEspecifica === 'objetivo_elo'
                ? parseInt(document.getElementById('eloMeta').value)
                : parseFloat(document.getElementById('objetivoMeta').value);
            
            const limite = document.getElementById('limiteMeta').value ? parseInt(document.getElementById('limiteMeta').value) : null;
            
            body = {
                tipo: 'especifica',
                tipoMeta: tipoMetaEspecifica,
                objetivo,
                limite: ['media_cs', 'media_wr'].includes(tipoMetaEspecifica) ? limite : null
            };

            if (tipoMetaEspecifica === 'partidas_campeao') {
                body.tipoMeta = `partidas_campeao_${document.getElementById('campeaoMeta').value}`;
            } else if (tipoMetaEspecifica === 'partidas_rota') {
                body.tipoMeta = `partidas_rota_${document.getElementById('rotaMeta').value}`;
            }
        }

        fetch('/adicionarMeta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                $('#errorModal').modal('show');
                document.getElementById('errorMessage').textContent = data.error;
            } else {
                alert('Meta adicionada com sucesso');
                location.reload();
            }
        })
        .catch(error => console.error('Erro ao adicionar meta:', error));
    });
});

// Função para popular o campo de seleção de campeões
function carregarCampeoes() {
    fetch('/obterCampeoes')
        .then(response => response.json())
        .then(data => {
            const campeaoSelect = document.getElementById('campeaoMeta');
            campeaoSelect.innerHTML = ''; // Limpar o select antes de preencher

            if (data.campeoes && Array.isArray(data.campeoes)) {
                data.campeoes.forEach(campeao => {
                    const option = document.createElement('option');
                    option.value = campeao;
                    option.textContent = campeao;
                    campeaoSelect.appendChild(option);
                });
            } else {
                console.error('Erro: Lista de campeões não disponível');
            }
        })
        .catch(error => {
            console.error('Erro ao carregar lista de campeões:', error);
        });
}

window.abrirModalExclusao = function(id, tipo, nome) {
    idMetaExcluir = id;
    tipoMetaExcluir = tipo;
    nomeMetaExcluir = nome;
    document.getElementById('metaNomeExcluir').textContent = nome;
    $('#confirmDeleteModal').modal('show');
};

// Variáveis globais para armazenar o id e o nome da meta a ser alterada
let idMetaStatus = null;
let nomeMetaStatus = '';

// Função para abrir o modal de confirmação ao tentar alterar o status
window.abrirModalStatus = function(id, nome) {
    idMetaStatus = id; // Armazena o id da meta
    nomeMetaStatus = nome; // Armazena o nome da meta
    document.getElementById('metaNomeStatus').textContent = nome; // Define o nome da meta no modal
    $('#confirmStatusModal').modal('show'); // Abre o modal
};

let idMetaAlterar = null;
let tipoMetaAlterar = null;

window.abrirModalAlterar = function(id, nome, tipoMeta, objetivoAtual, limiteAtual) {
    idMetaAlterar = id;
    tipoMetaAlterar = tipoMeta;

    // Configura o nome da meta no modal
    document.getElementById('metaNomeAlterar').textContent = nome;

    // Define os valores atuais nos campos
    document.getElementById('novoObjetivoMeta').value = objetivoAtual || '';
    document.getElementById('novoLimiteMeta').value = limiteAtual || '';

    // Mostrar ou ocultar campos com base no tipo da meta
    if (tipoMeta === 'objetivo_elo') {
        document.getElementById('campoObjetivoMetaAlterar').style.display = 'none';
        document.getElementById('campoEloMetaAlterar').style.display = 'block';
    } else {
        document.getElementById('campoObjetivoMetaAlterar').style.display = 'block';
        document.getElementById('campoEloMetaAlterar').style.display = 'none';
    }

    document.getElementById('campoLimiteMetaAlterar').style.display = ['media_cs', 'media_wr'].includes(tipoMeta) ? 'block' : 'none';

    // Ajustar o label do campo "Objetivo" baseado no tipo
    const labelObjetivoMeta = document.querySelector('label[for="novoObjetivoMeta"]');
    switch(tipoMeta) {
        case 'partidas_total':
        case 'partidas_campeao':
        case 'partidas_rota':
            labelObjetivoMeta.textContent = "Quantidade de partidas";
            break;
        case 'media_cs':
            labelObjetivoMeta.textContent = "Média (entre 0.0 a 10.0)";
            break;
        case 'media_wr':
            labelObjetivoMeta.textContent = "Winrate em % (entre 0 a 100)";
            break;
        case 'vod_reviews':
            labelObjetivoMeta.textContent = "Quantidade de VOD reviews";
            break;
        default:
            labelObjetivoMeta.textContent = "Objetivo";
    }

    // Abre o modal
    $('#alterarMetaModal').modal('show');
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
            'Esmeralda IV', 'Esmeralda III', 'Esmeralda II', 'Esmeralda I',
            'Diamante IV', 'Diamante III', 'Diamante II', 'Diamante I',
            'Mestre', 'Grão-mestre', 'Desafiante'
        ];
        return elos[numero] || 'Desconhecido';
    }

    // Função para formatar números com 1 casa decimal
    function formatarNumero(value) {
        return parseFloat(value).toFixed(1);
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
                errorMessage.textContent = 'Erro ao excluir meta: ' + error.message;
                $('#errorModal').modal('show');
            });
        }
    });

    // Requisição para obter metas
    fetch(`/obterMetas?cacheBuster=${new Date().getTime()}`)
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
                    listItem.innerHTML = `
                        <div class="d-flex justify-content-between" style="width: 100%">
                            <div class="meta-conteudo">
                                <h5 class="meta-nome">${nomeMeta}</h5>
                                <div class="meta-progresso-container" style="margin-top: 20px; margin-bottom: 5px;">
                                    <p class="meta-progresso-text">Progresso</p>
                                    <p class="meta-progresso-num" style="color: ${calcularCorProgresso(progressoAtualBarra / 100)};">${progressoTexto}</p>
                                </div>
                                <div class="progress meta-progress-bar">
                                    <div class="progress-bar" role="progressbar" 
                                         style="width: ${progressoAtualBarra}%; background-color: ${calcularCorProgresso(progressoAtualBarra / 100)};">
                                    </div>
                                </div>
                            </div>
                            <div class="meta-acoes">
                                <button class="btn btn-link" style="padding: 0px; margin-top: 0;" onclick="abrirModalStatus(${meta.id}, '${nomeMeta}')">
                                    <img src="/icons/edit.svg" alt="Alterar Status" class="meta-icon">
                                </button>
                                <button class="btn btn-link" style="padding: 0px; margin-top: 0;" onclick="abrirModalExclusao(${meta.id}, '${meta.tipo}', '${nomeMeta}')">
                                    <img src="/icons/trash.svg" alt="Excluir" class="meta-icon">
                                </button>
                            </div>
                        </div>
                    `;
                } else if (meta.tipo_meta === 'objetivo_elo') {
                    const eloAtual = mapNumberToElo(Math.round(progressoAtual));
                    const eloObjetivo = mapNumberToElo(objetivo);
                    progressoTexto = `${eloAtual} / ${eloObjetivo}`;
                    progressoAtualBarra = (progressoAtual / objetivo) * 100;
                } else if (meta.tipo_meta === 'media_cs') {
                    progressoTexto = `${formatarNumero(progressoAtual)} / ${formatarNumero(objetivo)}`;
                    progressoAtualBarra = (progressoAtual / objetivo) * 100;
                } else if (meta.tipo_meta === 'media_wr') {
                    progressoTexto = `${formatarNumero(progressoAtual)}% / ${formatarNumero(objetivo)}%`;
                    progressoAtualBarra = (progressoAtual / objetivo) * 100;
                } else {
                    progressoAtualBarra = (progressoAtual / objetivo) * 100;
                    progressoTexto = `${progressoAtual} / ${objetivo}`;
                }
                
                if (progressoAtual >= objetivo) {
                    progressoTexto = 'Completo (' + progressoTexto + ')';
                    progressoAtualBarra = 100;
                }

                corProgresso = calcularCorProgresso(progressoAtualBarra / 100);

                if (meta.tipo !== 'livre') {
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
                                <button class="btn btn-link" style="padding: 0px;" onclick="abrirModalAlterar(${meta.id}, '${nomeMeta}', '${meta.tipo_meta}', ${meta.objetivo}, ${meta.limite_partidas})">
                                    <img src="/icons/edit.svg" alt="Alterar" class="meta-icon">
                                </button>
                                <button class="btn btn-link" style="padding: 0px; margin-top: 0;" onclick="abrirModalExclusao(${meta.id}, '${meta.tipo}', '${nomeMeta}')">
                                    <img src="/icons/trash.svg" alt="Excluir" class="meta-icon">
                                </button>
                            </div>
                        </div>
                    `;
                }
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
        const labelObjetivoMeta = document.querySelector('label[for="objetivoMeta"]');
    
        // Mostrar ou ocultar campos conforme o tipo selecionado
        document.getElementById('campoCampeaoMeta').style.display = tipoMetaEspecifica === 'partidas_campeao' ? 'block' : 'none';
        document.getElementById('campoRotaMeta').style.display = tipoMetaEspecifica === 'partidas_rota' ? 'block' : 'none';
        document.getElementById('campoLimiteMeta').style.display = ['media_cs', 'media_wr'].includes(tipoMetaEspecifica) ? 'block' : 'none';
        document.getElementById('campoEloMeta').style.display = tipoMetaEspecifica === 'objetivo_elo' ? 'block' : 'none';
        
        document.getElementById('campoObjetivoMeta').style.display = tipoMetaEspecifica !== 'objetivo_elo' ? 'block' : 'none';
    
        switch(tipoMetaEspecifica) {
            case 'partidas_total':
            case 'partidas_campeao':
            case 'partidas_rota':
                labelObjetivoMeta.textContent = "Quantidade de partidas";
                break;
            case 'media_cs':
                labelObjetivoMeta.textContent = "Média (entre 0.0 a 10.0)";
                break;
            case 'media_wr':
                labelObjetivoMeta.textContent = "Winrate em % (entre 0 a 100)";
                break;
            case 'vod_reviews':
                labelObjetivoMeta.textContent = "Quantidade de VOD reviews";
                break;
            default:
                labelObjetivoMeta.textContent = "Objetivo";
        }
    });

    // Abrir o modal para adicionar uma meta
    document.getElementById('btnAdicionar').addEventListener('click', function() {
        $('#adicionarMetaModal').modal('show');
    });

    // Atualizar as metas
    document.getElementById('btnAtualizar').addEventListener('click', function() {
        fetch('/atualizarMetas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                errorMessage.textContent = 'Erro ao atualizar metas: ' + data.error;
                $('#errorModal').modal('show');
            } else {
                location.reload();  // Recarrega a página para mostrar as metas atualizadas
            }
        })
        .catch(error => {
            console.error('Erro ao atualizar metas:', error);
        });
    });

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
                $('#adicionarMetaModal').modal('hide');
                $('#errorModal').modal('show');
                document.getElementById('errorMessage').textContent = data.error;
            } else {
                location.reload();
            }
        })
        .catch(error => {
            $('#errorModal').modal('show');
            document.getElementById('errorMessage').textContent = 'Erro ao adicionar meta. Tente novamente mais tarde.';
        });
    });

    // Função para alterar o status da meta livre ao confirmar no modal
    document.getElementById('confirmStatusButton').addEventListener('click', function() {
        if (idMetaStatus) {
            fetch('/atualizarStatusMetaLivre', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ idMeta: idMetaStatus })
            })
            .then(response => {
                // Certifique-se de que a resposta esteja retornando JSON antes de converter
                if (response.ok && response.headers.get('Content-Type').includes('application/json')) {
                    return response.json(); // Somente tenta converter para JSON se for realmente JSON
                } else {
                    throw new Error('Resposta inesperada do servidor');
                }
            })
            .then(data => {
                if (data.error) {
                } else {
                    location.reload();
                }
            })
            .catch(error => {
                console.error('Erro ao alterar o status da meta:', error);
            });
        }
    });

    // Função para confirmar as alterações da meta específica
    document.getElementById('confirmAlterarButton').addEventListener('click', function() {
        const novoObjetivo = tipoMetaAlterar === 'objetivo_elo'
            ? parseInt(document.getElementById('novoEloMeta').value) // O valor de Elo como objetivo
            : parseFloat(document.getElementById('novoObjetivoMeta').value); // Caso contrário, usar o valor de objetivo normal

        const novoLimite = document.getElementById('novoLimiteMeta').value ? parseInt(document.getElementById('novoLimiteMeta').value) : null;

        const body = {
            idMeta: idMetaAlterar,
            novoObjetivo: novoObjetivo, // Para metas de Elo, o objetivo será o Elo
            novoLimite: novoLimite
        };

        fetch('/alterarMetaEspecifica', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                $('#alterarMetaModal').modal('hide');
                $('#errorModal').modal('show');
                document.getElementById('errorMessage').textContent = data.error;
            } else {
                location.reload(); // Atualiza a página para refletir as mudanças
            }
        })
        .catch(error => {
            console.error('Erro ao alterar meta:', error);
        });
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

// Funções de utilitários
function formatarDuracao(segundos) {
    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = segundos % 60;
    return `${minutos}m ${Math.round(segundosRestantes)}s`;
}

function calcularCorPorcentagem(porcentagem) {
    const verde = Math.min(255, Math.round((porcentagem / 100) * 255));
    const vermelho = 255 - verde;
    return `rgb(${vermelho}, ${verde}, 0)`;
}

function calcularCorCS(csMin) {
    const verde = Math.min(255, Math.round((csMin / 10) * 255));
    const vermelho = 255 - verde;
    return `rgb(${vermelho}, ${verde}, 0)`;
}

function calcularCorMetasConcluidas(completas, total) {
    if (total === 0) {
        return 'rgb(255, 0, 0)';  // Se não houver metas, a cor será vermelha
    }
    const porcentagem = (completas / total) * 100;
    const verde = Math.min(255, Math.round((porcentagem / 100) * 255));
    const vermelho = 255 - verde;
    return `rgb(${vermelho}, ${verde}, 0)`;  // Retorna a cor baseada na porcentagem
}

// Atualizando o conteúdo da página com as funções
window.onload = function() {
    const duracaoMedia = document.getElementById('duracao-media');
    duracaoMedia.textContent = formatarDuracao(duracaoMedia.textContent);

    const taxaVitorias = document.getElementById('taxa-vitorias');
    taxaVitorias.style.color = calcularCorPorcentagem(parseFloat(taxaVitorias.textContent));

    const csMinMedio = document.getElementById('cs-min-medio');
    csMinMedio.style.color = calcularCorCS(parseFloat(csMinMedio.textContent));

    // Metas específicas
    const metasEspecificasConcluidasElem = document.getElementById('metas-especificas-concluidas');
    const metasEspecificasConcluidas = parseInt(metasEspecificasConcluidasElem.dataset.concluidas, 10);
    const totalMetasEspecificas = parseInt(metasEspecificasConcluidasElem.dataset.total, 10);
    metasEspecificasConcluidasElem.style.color = calcularCorMetasConcluidas(metasEspecificasConcluidas, totalMetasEspecificas);

    // Metas livres
    const metasLivresConcluidasElem = document.getElementById('metas-livres-concluidas');
    const metasLivresConcluidas = parseInt(metasLivresConcluidasElem.dataset.concluidas, 10);
    const totalMetasLivres = parseInt(metasLivresConcluidasElem.dataset.total, 10);
    metasLivresConcluidasElem.style.color = calcularCorMetasConcluidas(metasLivresConcluidas, totalMetasLivres);
};

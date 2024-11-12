const runes = require('./runesReforged.json')

// Função para buscar a runa pelo ID e retornar o link da imagem
function getRuneImage(runeId) {
    for (const style of runes) {
        for (const slot of style.slots) {
            for (const rune of slot.runes) {
                if (rune.id === runeId) {
                    return `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`;
                }
            }
        }
    }

    // Caso a runa não seja encontrada
    return null;
}

module.exports = { getRuneImage };
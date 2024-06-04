test('Partida registrada com sucesso', () => {
    expect(registrarPartida('jogador1', 'id_partida')).toBe(true);
});

test('Partida já registrada', () => {
    expect(registrarPartida('jogador1', 'id_partida')).toBe(false);
});

test('Informações da partida adicionadas com sucesso', () => {
    expect(adicionarInformacoesPartida('jogador1', 'id_partida', 'informacoes')).toBe(true);
});

test('Informações da partida já adicionadas', () => {
    expect(adicionarInformacoesPartida('jogador1', 'id_partida', 'informacoes')).toBe(false);
});

test('vod da partida adicionado com sucesso', () => {
    expect(adicionarVodPartida('jogador1', 'id_partida', 'vod')).toBe(true);
});

test('vod da partida já adicionado', () => {
    expect(adicionarVodPartida('jogador1', 'id_partida', 'vod')).toBe(false);
});
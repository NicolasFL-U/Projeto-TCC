test('meta adicionada com sucesso', () => {
    expect(adicionarMeta('jogador1', 'meta')).toBe(true);
});

test('meta editada com sucesso', () => {
    expect(editarMeta('jogador1', 'meta', 'nova_meta')).toBe(true);
});

test('meta removida com sucesso', () => {
    expect(removerMeta('jogador1', 'meta')).toBe(true);
});
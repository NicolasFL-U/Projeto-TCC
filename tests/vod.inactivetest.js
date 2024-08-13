test('vod compartilhada com sucesso', () => {
    expect(compartilharVod('jogador1', 'id_vod', 'jogador2')).toBe(true);
});

test('vod já compartilhada', () => {
    expect(compartilharVod('jogador1', 'id_vod', 'jogador2')).toBe(false);
});

// comentários
test('comentario adicionado com sucesso', () => {
    expect(adicionarComentario('jogador1', 'id_vod', 'comentario', 'momento')).toBe(true);
});

test('comentario removido com sucesso', () => {
    expect(removerComentario('jogador1', 'id_vod', 'comentario')).toBe(true);
});

test('comentario editado com sucesso', () => {
    expect(editarComentario('jogador1', 'id_vod', 'comentario', 'novo_comentario')).toBe(true);
});

// tags
test('tag adicionada com sucesso', () => {
    expect(adicionarTag('jogador1', 'id_vod', 'tag')).toBe(true);
});

test('tag removida com sucesso', () => {
    expect(removerTag('jogador1', 'id_vod', 'tag')).toBe(true);
});

test('tag editada com sucesso', () => {
    expect(editarTag('jogador1', 'id_vod', 'tag', 'nova_tag')).toBe(true);
});
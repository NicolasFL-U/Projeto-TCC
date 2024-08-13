test('Jogador registrado com sucesso', () => {
    expect(registrarJogador('jogador1', 'senha1')).toBe(true);
});

test('Jogador já registrado', () => {
    expect(registrarJogador('jogador1', 'senha1')).toBe(false);
});

test('Login com sucesso', () => {
    expect(logarJogador('jogador1', 'senha1')).toBe(true);
});

test('Login com senha incorreta', () => {
    expect(logarJogador('jogador1', 'senha2')).toBe(false);
});
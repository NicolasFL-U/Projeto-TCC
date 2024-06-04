const db = require('../src/database');

describe('Conexão com o PostgreSQL', () => {
    afterAll(() => {
        db.pool.end();
    });

    it('conecta no banco de dados', async () => {
        expect.assertions(1);
        let client, done;
        try {
            ({ client, done } = await db.connect());
            expect(client).toBeTruthy();
        } catch (error) {
            console.error(error);
        } finally {
            if (done) done();
        }
    });
});
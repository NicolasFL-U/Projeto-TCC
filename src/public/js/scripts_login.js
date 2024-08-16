document.addEventListener('DOMContentLoaded', () => {
    const email = document.getElementById('email');
    const senha = document.getElementById('senha');
    const params = new URLSearchParams(window.location.search);

    const emailError = document.getElementById('emailError');
    const senhaError = document.getElementById('senhaError');

    // Message-Error
    /* E-MAIL */
    email.addEventListener('focus', () => {
        emailError.style.visibility = 'hidden';
    });

    email.addEventListener('blur', () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value)) {
            emailError.style.visibility = 'visible';
        } else {
            emailError.style.visibility = 'hidden';
        }
    });

    /* SENHA */
    senha.addEventListener('blur', () => {
        if (senha.value.length < 8) {
            senhaError.style.visibility = 'visible';
        } else {
            senhaError.style.visibility = 'hidden';
        }
    });

    // Modais
    if (params.has('erro')) {
        const mensagemErro = document.getElementById('mensagemErroLogin');
        const codigoErro = parseInt(params.get('erro'));

        let mensagem;
        switch (codigoErro) {
            case 1:
                mensagem = "O e-mail e/ou senha inseridos são inválidos.";
                break;
            case 2:
                mensagem = "Erro ao buscar os dados do usuário. Por favor, tente novamente.";
                break;
            default:
                mensagem = "Erro desconhecido.";
        }

        mensagemErro.textContent = mensagem;
        $('#loginErrorModal').modal('show');
    }

    const form = document.getElementById('form');

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const formData = new FormData(form);

        const email = formData.get('email');
        const senha = formData.get('senha');

        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

        // Validações
        if (!emailRegex.test(email) || senha.length < 8) {
            $('#errorModal').modal('show');
        } else {
            form.submit();
        }
    });
});

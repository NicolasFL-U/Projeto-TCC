document.addEventListener('DOMContentLoaded', () => {
    const senha = document.getElementById('senha');
    const senhaHelp = document.getElementById('senhaHelp');
    const senhaError = document.getElementById('senhaError');

    const nomeContaRiot = document.getElementById('nomeContaRiot');
    const tagContaRiot = document.getElementById('tagContaRiot');
    const contaError = document.getElementById('contaError');

    const email = document.getElementById('email');
    const emailError = document.getElementById('emailError');

    const confirmarSenha = document.getElementById('confirmarSenha');
    const confirmarSenhaError = document.getElementById('confirmarSenhaError');

    const params = new URLSearchParams(window.location.search);

    // Message-Help
    senha.addEventListener('focus', () => {
        senhaHelp.style.display = 'block';
    });

    senha.addEventListener('blur', () => {
        senhaHelp.style.display = 'none';
    });

    // Message-Error
    /* NOME E TAG DA CONTA */
    nomeContaRiot.addEventListener('focus', () => {
        contaError.style.visibility = 'hidden';
    });

    tagContaRiot.addEventListener('focus', () => {
        contaError.style.visibility = 'hidden';
    });

    nomeContaRiot.addEventListener('blur', () => {
        if (nomeContaRiot.value.length < 3 || tagContaRiot.value.length < 3) {
            contaError.style.visibility = 'visible';
        }
    });

    tagContaRiot.addEventListener('blur', () => {
        if (nomeContaRiot.value.length < 3 || tagContaRiot.value.length < 3) {
            contaError.style.visibility = 'visible';
        }
    });

    /* E-MAIL */
    email.addEventListener('focus', () => {
        emailError.style.visibility = 'hidden';
    });

    email.addEventListener('blur', () => {
        // regex para validar email
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

        if (!emailRegex.test(email.value)) {
            emailError.style.visibility = 'visible';
        }
    });

    /* SENHA */
    senha.addEventListener('focus', () => {
        senhaError.style.visibility = 'hidden';
        confirmarSenhaError.style.visibility = 'hidden';
    });

    senha.addEventListener('blur', () => {
        if (senha.value.length < 8) {
            senhaError.style.visibility = 'visible';
        }

        if (confirmarSenha.value !== senha.value) {
            confirmarSenhaError.style.visibility = 'visible';
        }
    });

    /* CONFIRMAR SENHA */
    confirmarSenha.addEventListener('focus', () => {
        confirmarSenhaError.style.visibility = 'hidden';
    });

    confirmarSenha.addEventListener('blur', () => {
        if (confirmarSenha.value !== senha.value) {
            confirmarSenhaError.style.visibility = 'visible';
        }
    });

    // Modais
    const contaRiotHelp = document.getElementById('contaRiotHelp');

    contaRiotHelp.addEventListener('click', () => {
        $('#riotHelpModal').modal('show');
    });

    if (params.has('erro')) {
        const mensagemErro = document.getElementById('mensagemErroCadastro');
        const codigosErro = params.get('erro').split(',');

        const mensagens = codigosErro.map(codigo => {
            switch (parseInt(codigo)) {
                case 1:
                    return "O nome da conta Riot deve ter entre 3 e 16 caracteres.";
                case 2:
                    return "A tag da conta Riot deve ter entre 3 e 5 caracteres.";
                case 3:
                    return "O e-mail não é válido.";
                case 4:
                    return "A senha deve ter entre 8 e 128 caracteres.";
                case 5:
                    return "As senhas não coincidem.";
                case 6:
                    return "Não foi possível validar a conta Riot. Verifique se o nome e a tag estão corretos.";
                case 7:
                    return "Não foi possível encontrar o PUUID da conta Riot. Isso provavelmente é um erro do servidor da Riot. Tente novamente mais tarde.";
                case 8:
                    return "Essa conta Riot já está cadastrada.";
                case 9:
                    return "Esse e-mail já está cadastrado.";
                case 10:
                    return "Erro ao cadastrar o usuário. Tente novamente mais tarde.";
                default:
                    return "Erro desconhecido.";
            }
        });

        mensagemErro.innerHTML = mensagens.join('<br>');
        $('#cadastroErrorModal').modal('show');
    }

    if (params.has('conta')){
        nomeContaRiot.value = params.get('conta').split('#')[0];
        tagContaRiot.value = params.get('conta').split('#')[1];
    }
    
    // Formulário
    const form = document.getElementById('form');

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const formData = new FormData(form);

        const nome = formData.get('nomeContaRiot');
        const tag = formData.get('tagContaRiot');
        const email = formData.get('email');
        const senha = formData.get('senha');
        const confirmarSenha = formData.get('confirmarSenha');

        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

        // Validações
        if (nome.length < 3 || tag.length < 3 || !emailRegex.test(email) || senha.length < 8 || confirmarSenha !== senha) {
            $('#errorModal').modal('show');
        } else {
            form.submit();
        }
    });
});
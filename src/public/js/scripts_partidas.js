document.addEventListener('DOMContentLoaded', function() {
    const btnAtualizar = document.getElementById('btnAtualizar');
    
    btnAtualizar.addEventListener('click', function() {
        // Mostrar o modal de atualização
        $('#atualizarModal').modal('show');
    });
});
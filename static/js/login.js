function mostrarLogin() {
    document.getElementById('telaInicial').classList.add('hidden');
    document.getElementById('telaLogin').classList.remove('hidden');
}

function mostrarCadastro() {
    document.getElementById('telaInicial').classList.add('hidden');
    document.getElementById('telaCadastro').classList.remove('hidden');
}

function voltarInicio() {
    document.getElementById('telaLogin').classList.add('hidden');
    document.getElementById('telaCadastro').classList.add('hidden');
    document.getElementById('telaInicial').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {

    // Alterna campos de restaurante
    const tipoConta = document.getElementById('tipoConta');
    if (tipoConta) {
        tipoConta.addEventListener('change', () => {
            const camposRest = document.getElementById('camposRestaurante');
            camposRest.classList.toggle('hidden', tipoConta.value !== 'restaurante');
        });
    }

    // -------- CADASTRO --------
    const cadastroForm = document.getElementById('cadastroForm');
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorMsg = document.getElementById('cadastroError');

            const perfil = document.getElementById('tipoConta').value;
            const nome = document.getElementById('cadastroNome').value;
            const email = document.getElementById('cadastroEmail').value.toLowerCase();
            const senha = document.getElementById('cadastroSenha').value;

            if (!perfil || !nome || !email || !senha) {
                errorMsg.textContent = 'Preencha todos os campos obrigatórios';
                errorMsg.style.color = '#b00';
                return;
            }

            const resposta = await fetch('/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({ nome, email, senha, perfil })
            });

            if (resposta.ok) {
                errorMsg.style.color = 'green';
                errorMsg.textContent = 'Conta criada com sucesso! Redirecionando...';
                setTimeout(() =>{}, 800);                
                window.location.href = '/'; 
            } else {
                errorMsg.style.color = '#b00';
                errorMsg.textContent = 'Este email já está cadastrado.';
            }
        });
    }

    // -------- LOGIN --------
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorMsg = document.getElementById('loginError');

            const email = document.getElementById('loginEmail').value.toLowerCase();
            const senha = document.getElementById('loginSenha').value;

            const resposta = await fetch('/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({ email, senha })
            });

            if (resposta.ok) {
                await new Promise(r => setTimeout(r, 120))
                window.location.href = '/'; 
            } else {
                errorMsg.style.color = '#b00';
                errorMsg.textContent = 'E-mail ou senha incorretos!';
            }
        });
    }
});

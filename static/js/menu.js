document.addEventListener('DOMContentLoaded', () => {
    const btnLogout = document.getElementById('btnLogout');

    // Ação de logout com Flask
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await fetch('/logout', { method: 'POST' });
            window.location.href = '/'; // volta pra tela de login
        });
    }

    // Efeitos visuais dos cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.classList.add('ativo');
        });
        card.addEventListener('mouseleave', () => {
            card.classList.remove('ativo');
        });
    });
});


function adjustMenuForUserType(tipo) {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        
        if (card.textContent.includes('Gerenciar Cardápio') && tipo !== 'restaurante') {
            card.style.display = 'none';
        }
        
        
        if ((card.textContent.includes('Ver Cardápio') && tipo === 'cliente') ||
            (card.textContent.includes('Gerenciar Cardápio') && tipo === 'restaurante')) {
            card.style.border = `2px solid var(--primary)`;
            card.style.background = 'var(--card)';
        }
    });
}


if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja sair?')) {
            try {
                await fetch('/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } finally {
                window.location.href = '/';
            }
        }
    });
}


function addIconsToCards() {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        const icon = document.createElement('div');
        icon.style.cssText = `
            font-size: 2.5rem;
            margin-bottom: 16px;
            opacity: 0.8;
        `;
        
        if (card.textContent.includes('Ver Cardápio')) {
            icon.textContent = '📋';
        } else if (card.textContent.includes('Gerenciar Cardápio')) {
            icon.textContent = '⚙️';
        } else if (card.textContent.includes('Pedidos')) {
            icon.textContent = '📦';
        }
        
        card.insertBefore(icon, card.firstChild);
    });
}

// checkAuth();
addIconsToCards();


const cards = document.querySelectorAll('.card');
cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-4px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

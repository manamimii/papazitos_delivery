// Variáveis globais
let carrinho = [];
let restauranteSelecionado = null;

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', async function() {
  // Verificar login
  const userName = document.getElementById('userName');
  if (userName) {
    userName.textContent = 'Usuário'; // Será atualizado pela sessão
  }

  // Botão de logout
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async function() {
      await fetch('/logout', { method: 'POST' });
      window.location.href = '/login';
    });
  }

  // Botão do carrinho
  const btnCarrinho = document.getElementById('btnCarrinho');
  if (btnCarrinho) {
    btnCarrinho.addEventListener('click', function() {
      mostrarCarrinho();
    });
  }

  // Carregar carrinho do localStorage
  carregarCarrinhoDoStorage();
  
  // Carregar restaurantes
  await carregarRestaurantes();
});

// Carregar carrinho do localStorage
function carregarCarrinhoDoStorage() {
  const carrinhoSalvo = localStorage.getItem('carrinho');
  if (carrinhoSalvo) {
    try {
      carrinho = JSON.parse(carrinhoSalvo);
    } catch (e) {
      carrinho = [];
    }
  }
  atualizarContadorCarrinho();
}

// Salvar carrinho no localStorage
function salvarCarrinhoNoStorage() {
  localStorage.setItem('carrinho', JSON.stringify(carrinho));
  atualizarContadorCarrinho();
}

// Atualizar contador do carrinho
function atualizarContadorCarrinho() {
  const qtdElement = document.getElementById('carrinhoQtd');
  if (qtdElement) {
    const total = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
    qtdElement.textContent = total;
  }
}

// Carregar lista de restaurantes
async function carregarRestaurantes() {
  try {
    const response = await fetch('/api/produtos');
    const produtos = await response.json();
    
    // Agrupar produtos por restaurante
    const restaurantesMap = {};
    produtos.forEach(produto => {
      if (!restaurantesMap[produto.restaurante_id]) {
        restaurantesMap[produto.restaurante_id] = {
          id: produto.restaurante_id,
          nome: produto.restaurante_nome,
          produtos: []
        };
      }
      restaurantesMap[produto.restaurante_id].produtos.push(produto);
    });

    const restaurantes = Object.values(restaurantesMap);
    mostrarRestaurantes(restaurantes);
  } catch (error) {
    console.error('Erro ao carregar restaurantes:', error);
    const lista = document.getElementById('listaRestaurantes');
    if (lista) {
      lista.innerHTML = '<p style="color: red;">Erro ao carregar restaurantes.</p>';
    }
  }
}

// Mostrar lista de restaurantes
function mostrarRestaurantes(restaurantes) {
  const lista = document.getElementById('listaRestaurantes');
  if (!lista) return;

  lista.innerHTML = '';

  if (restaurantes.length === 0) {
    lista.innerHTML = '<p>Nenhum restaurante disponível no momento.</p>';
    return;
  }

  restaurantes.forEach(rest => {
    const card = document.createElement('article');
    card.className = 'rest-card';
    card.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 15px;
      cursor: pointer;
      transition: transform 0.2s;
    `;
    
    card.innerHTML = `
      <div class="rest-info">
        <h3 style="color: #e85d3b; margin-bottom: 10px;">${rest.nome}</h3>
        <p style="color: #6b6b6b; margin-bottom: 15px;">
          ${rest.produtos.length} produtos disponíveis
        </p>
      </div>
      <button class="btn primary" onclick="verCardapio(${rest.id}, '${rest.nome}')">
        Ver Cardápio
      </button>
    `;
    
    lista.appendChild(card);
  });
}

// Ver cardápio de um restaurante
async function verCardapio(restauranteId, restauranteNome) {
  restauranteSelecionado = restauranteId;
  
  try {
    const response = await fetch(`/api/produtos/restaurante/${restauranteId}`);
    const produtos = await response.json();
    
    // Esconder lista de restaurantes
    document.getElementById('listaRestaurantes').style.display = 'none';
    
    // Mostrar seção de cardápio
    const secaoCardapio = document.getElementById('rest-cardapio');
    if (secaoCardapio) {
      secaoCardapio.classList.remove('hidden');
      secaoCardapio.style.display = 'block';
    }
    
    // Atualizar título
    const titulo = document.getElementById('restTitle');
    if (titulo) {
      titulo.textContent = `Cardápio - ${restauranteNome}`;
    }
    
    // Mostrar produtos
    mostrarProdutos(produtos);
    
    // Mostrar resumo do carrinho
    mostrarResumoCarrinho();
    
    // Botão voltar
    const btnVoltar = document.getElementById('voltarRest');
    if (btnVoltar) {
      btnVoltar.onclick = voltarParaRestaurantes;
    }
  } catch (error) {
    console.error('Erro ao carregar cardápio:', error);
    alert('Erro ao carregar cardápio do restaurante.');
  }
}

// Mostrar produtos do restaurante
function mostrarProdutos(produtos) {
  const lista = document.getElementById('produtosList');
  if (!lista) return;
  
  lista.innerHTML = '';
  
  if (produtos.length === 0) {
    lista.innerHTML = '<p>Nenhum produto disponível.</p>';
    return;
  }
  
  produtos.forEach(produto => {
    if (!produto.disponivel) return; // Pular produtos indisponíveis
    
    const div = document.createElement('div');
    div.className = 'produto-card';
    div.style.cssText = `
      background: white;
      padding: 15px;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    div.innerHTML = `
      <div>
        <h4 style="margin: 0 0 5px 0; color: #333;">${produto.nome}</h4>
        <p style="margin: 0 0 10px 0; color: #6b6b6b; font-size: 0.9rem;">
          ${produto.descricao || 'Sem descrição'}
        </p>
        <span style="font-weight: 600; color: #e85d3b; font-size: 1.1rem;">
          R$ ${Number(produto.preco).toFixed(2)}
        </span>
      </div>
      <button 
        class="btn primary" 
        onclick="adicionarAoCarrinho(${produto.id}, '${produto.nome}', ${produto.preco}, ${produto.restaurante_id})"
        style="white-space: nowrap; padding: 10px 20px;"
      >
        Adicionar
      </button>
    `;
    
    lista.appendChild(div);
  });
}

// Adicionar produto ao carrinho
function adicionarAoCarrinho(produtoId, produtoNome, produtoPreco, restauranteId) {
  // Verificar se já existe no carrinho
  const itemExistente = carrinho.find(item => item.id === produtoId);
  
  if (itemExistente) {
    itemExistente.quantidade += 1;
  } else {
    carrinho.push({
      id: produtoId,
      nome: produtoNome,
      preco: Number(produtoPreco),
      quantidade: 1,
      restaurante_id: restauranteId
    });
  }
  
  salvarCarrinhoNoStorage();
  mostrarResumoCarrinho();
  
  // Feedback visual
  alert(`${produtoNome} adicionado ao carrinho!`);
}

// Mostrar resumo do carrinho
function mostrarResumoCarrinho() {
  const resumo = document.getElementById('carrinhoResumo');
  if (!resumo) return;
  
  if (carrinho.length === 0) {
    resumo.innerHTML = '<p class="muted">Carrinho vazio.</p>';
    return;
  }
  
  let html = '<div style="background: #fff7ef; padding: 15px; border-radius: 10px;">';
  let total = 0;
  
  carrinho.forEach(item => {
    const subtotal = item.preco * item.quantidade;
    total += subtotal;
    
    html += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e0e0e0;">
        <div>
          <strong>${item.nome}</strong><br>
          <small>${item.quantidade}x R$ ${item.preco.toFixed(2)}</small>
        </div>
        <div style="text-align: right;">
          <strong>R$ ${subtotal.toFixed(2)}</strong><br>
          <button 
            onclick="removerDoCarrinho(${item.id})" 
            style="background: none; border: none; color: red; cursor: pointer; font-size: 0.8rem;"
          >
            Remover
          </button>
        </div>
      </div>
    `;
  });
  
  html += `
    <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e85d3b;">
      <strong style="font-size: 1.2rem;">Total: R$ ${total.toFixed(2)}</strong>
    </div>
  </div>`;
  
  resumo.innerHTML = html;
}

// Remover item do carrinho
function removerDoCarrinho(produtoId) {
  carrinho = carrinho.filter(item => item.id !== produtoId);
  salvarCarrinhoNoStorage();
  mostrarResumoCarrinho();
}

// Mostrar modal do carrinho
function mostrarCarrinho() {
  if (carrinho.length === 0) {
    alert('Seu carrinho está vazio!');
    return;
  }
  
  // Se estiver na tela de restaurantes, ir para finalizar
  window.location.href = '/finalizar-pedido';
}

// Finalizar pedido
function finalizarPedido() {
  if (carrinho.length === 0) {
    alert('Adicione produtos ao carrinho antes de finalizar!');
    return;
  }
  
  // Redirecionar para página de finalização
  window.location.href = '/finalizar-pedido';
}

// Voltar para lista de restaurantes
function voltarParaRestaurantes() {
  const secaoCardapio = document.getElementById('rest-cardapio');
  if (secaoCardapio) {
    secaoCardapio.classList.add('hidden');
    secaoCardapio.style.display = 'none';
  }
  
  const listaRest = document.getElementById('listaRestaurantes');
  if (listaRest) {
    listaRest.style.display = 'block';
  }
  
  restauranteSelecionado = null;
}
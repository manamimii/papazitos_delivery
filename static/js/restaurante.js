document.addEventListener('DOMContentLoaded', function(){
  const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
  if (!usuario) { window.location.href = 'index.html'; return; }
  document.getElementById('userName').textContent = usuario.nome;
  document.getElementById('btnLogout').addEventListener('click', function(){ localStorage.removeItem('usuarioLogado'); window.location.href='index.html'; });

  // Reuse carregarDadosIniciais from cardapio.js
  if (!localStorage.getItem('restaurantes')) {
    localStorage.setItem('restaurantes', JSON.stringify([]));
  }

  const restaurantes = JSON.parse(localStorage.getItem('restaurantes') || '[]');
  let meuRest = restaurantes.find(r => r.nome.toLowerCase().includes((usuario.nomeRestaurante || '').toLowerCase()));
  if (!meuRest && usuario.nomeRestaurante) {
    meuRest = { id: 'r'+Date.now(), nome: usuario.nomeRestaurante, descricao: '', pratos: [] };
    restaurantes.push(meuRest);
    localStorage.setItem('restaurantes', JSON.stringify(restaurantes));
  }

  if (usuario.tipo !== 'restaurante') {
    document.querySelector('main.container').innerHTML = '<p>Você não tem acesso a esta página (somente restaurantes).</p>';
    return;
  }

  const meusProdutos = document.getElementById('meusProdutos');
  function render() {
    const dados = JSON.parse(localStorage.getItem('restaurantes') || '[]');
    const r = dados.find(x => x.nome === meuRest.nome);
    meusProdutos.innerHTML = '';
    if (!r || !r.pratos.length) {
      meusProdutos.innerHTML = '<p class="muted">Nenhum produto cadastrado.</p>';
      return;
    }
    r.pratos.forEach(p => {
      const el = document.createElement('div');
      el.className = 'produto';
      el.innerHTML = `<div class="produto-info"><div class="produto-nome">${p.nome}</div><div class="produto-descricao muted">${p.descricao||''}</div></div>
                      <div><div class="produto-preco">R$ ${Number(p.preco).toFixed(2)}</div>
                      <button class="btn outline" onclick="excluirProduto('${p.id}')">Excluir</button></div>`;
      meusProdutos.appendChild(el);
    });
  }

  window.excluirProduto = function(prodId){
    const dados = JSON.parse(localStorage.getItem('restaurantes') || '[]');
    const r = dados.find(x => x.nome === meuRest.nome);
    if (!r) return;
    r.pratos = r.pratos.filter(p => p.id !== prodId);
    localStorage.setItem('restaurantes', JSON.stringify(dados));
    render();
  };

  document.getElementById('produtoForm').addEventListener('submit', function(e){
    e.preventDefault();
    const nome = document.getElementById('produtoNome').value.trim();
    const preco = parseFloat(document.getElementById('produtoPreco').value);
    const desc = document.getElementById('produtoDesc').value.trim();
    const disponivel = document.getElementById('produtoDisponivel').checked;
    const errorMsg = document.getElementById('formError');
    errorMsg.textContent = '';

    if (!nome || isNaN(preco)) {
      errorMsg.textContent = 'Preencha nome e preço.';
      return;
    }

    const dados = JSON.parse(localStorage.getItem('restaurantes') || '[]');
    const r = dados.find(x => x.nome === meuRest.nome);
    const novo = { id: 'p'+Date.now(), nome, descricao: desc, preco, disponivel };
    if (r) r.pratos.push(novo);
    else {
      const novoR = { id: 'r'+Date.now(), nome: meuRest.nome, descricao: '', pratos: [novo] };
      dados.push(novoR);
    }
    localStorage.setItem('restaurantes', JSON.stringify(dados));
    document.getElementById('produtoForm').reset();
    render();
  });

  render();
});

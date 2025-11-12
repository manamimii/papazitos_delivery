// Carregar carrinho do localStorage
let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
let freteCalculado = 0;

// Exibir resumo do pedido
function exibirResumo() {
  const itensDiv = document.getElementById("itensResumo");
  const subtotalEl = document.getElementById("subtotalProdutos");

  if (carrinho.length === 0) {
    itensDiv.innerHTML = '<p style="color: var(--muted)">Carrinho vazio</p>';
    subtotalEl.textContent = "R$ 0,00";
    return;
  }

  let html = "";
  let subtotal = 0;

  carrinho.forEach((item) => {
    const totalItem = item.preco * item.quantidade;
    subtotal += totalItem;
    html += `
      <div class="item-pedido">
        <span>${item.quantidade}x ${item.nome}</span>
        <span>R$ ${totalItem.toFixed(2)}</span>
      </div>
    `;
  });

  itensDiv.innerHTML = html;
  subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
  atualizarTotal();
}

function atualizarTotal() {
  const subtotal = carrinho.reduce(
    (sum, item) => sum + item.preco * item.quantidade,
    0
  );
  const total = subtotal + freteCalculado;
  document.getElementById("valorTotal").textContent = `R$ ${total.toFixed(2)}`;
}

// Máscara de CEP
document.getElementById("cep").addEventListener("input", function (e) {
  let value = e.target.value.replace(/\D/g, "");
  if (value.length > 5) {
    value = value.slice(0, 5) + "-" + value.slice(5, 8);
  }
  e.target.value = value;

  if (value.replace(/\D/g, "").length === 8) {
    buscarCEP(value);
  }
});

// Buscar CEP pelo backend Flask
async function buscarCEP(cep) {
  const cepLimpo = cep.replace(/\D/g, "");
  try {
    showAlert("Buscando endereço...", "info");

    const response = await fetch(`/api/cep/${cepLimpo}`);
    const data = await response.json();

    if (data.success) {
      document.getElementById("logradouro").value = data.logradouro || "";
      document.getElementById("bairro").value = data.bairro || "";
      document.getElementById("cidade").value = data.cidade || "";
      document.getElementById("estado").value = data.estado || "";

      document.getElementById("numero").focus();
      calcularFrete(cepLimpo);
      hideAlert();
    } else {
      showAlert("CEP não encontrado. Preencha manualmente.", "error");
    }
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    showAlert("Erro ao buscar CEP. Preencha manualmente.", "error");
  }
}

// Calcular frete
async function calcularFrete(cepDestino) {
  try {
    const response = await fetch("/api/calcular-frete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cep_destino: cepDestino }),
    });

    const data = await response.json();

    if (data.success) {
      freteCalculado = data.valor_frete;
      document.getElementById("valorFrete").innerHTML = `
        R$ ${data.valor_frete.toFixed(2)}<br>
        <small class="small-text">(~${data.distancia_km} km)</small>
      `;
      atualizarTotal();
    }
  } catch (error) {
    console.error("Erro ao calcular frete:", error);
    showAlert("Não foi possível calcular o frete", "error");
  }
}

// Finalizar pedido
document
  .getElementById("formEndereco")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    if (carrinho.length === 0) {
      showAlert("Seu carrinho está vazio!", "error");
      return;
    }

    if (freteCalculado === 0) {
      showAlert("Aguarde o cálculo do frete", "error");
      return;
    }

    const btnFinalizar = document.getElementById("btnFinalizar");
    btnFinalizar.disabled = true;
    btnFinalizar.innerHTML = '<span class="loading"></span> Finalizando...';

    const formData = new FormData(e.target);
    const endereco = Object.fromEntries(formData.entries());

    const subtotal = carrinho.reduce(
      (sum, item) => sum + item.preco * item.quantidade,
      0
    );
    const total = subtotal + freteCalculado;

    const pedidoData = {
      restaurante_id: carrinho[0].restaurante_id,
      itens: carrinho.map((item) => ({
        produto_id: item.id,
        quantidade: item.quantidade,
        preco: item.preco,
      })),
      endereco,
      valor_produtos: subtotal,
      valor_frete: freteCalculado,
      valor_total: total,
    };

    try {
      const response = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedidoData),
      });

      const result = await response.json();

      if (result.success) {
        localStorage.removeItem("carrinho");
        showAlert("✅ Pedido realizado com sucesso!", "success");
        setTimeout(() => {
          window.location.href = "/pedido";
        }, 2000);
      } else {
        throw new Error("Erro ao criar pedido");
      }
    } catch (error) {
      console.error("Erro:", error);
      showAlert("Erro ao finalizar pedido. Tente novamente.", "error");
      btnFinalizar.disabled = false;
      btnFinalizar.textContent = "Finalizar Pedido";
    }
  });

function showAlert(message, type) {
  const alertBox = document.getElementById("alertBox");
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type} show`;
}

function hideAlert() {
  const alertBox = document.getElementById("alertBox");
  alertBox.classList.remove("show");
}

function voltarCardapio() {
  window.location.href = "/cardapio";
}

// Inicializar
exibirResumo();

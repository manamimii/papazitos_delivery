document.addEventListener("DOMContentLoaded", async () => {
    const div = document.getElementById("pedidoStatus");

    async function carregarPedido() {
        const resp = await fetch("pedidos/recebidos", {
                method: 'GET',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include'
            });
        const pedido = await resp.json();

        if (!pedido || (Array.isArray(pedido) && pedido.length === 0) || (typeof pedido === 'object' && Object.keys(pedido).length === 0)) {
            div.innerHTML = "<p class='muted'>Você não tem pedidos em andamento.</p>";
            return;
        }

        const etapas = ["aguardando", "em_preparo", "pronto", "entregue"];
        const indice = etapas.indexOf(pedido.status);

        let progresso = etapas.map((etapa, i) => {
            return `<span class="step ${i <= indice ? 'done' : ''}">${etapa.replace('_',' ')}</span>`;
        }).join(" → ");

        console.log(pedido)
        let itensHTML = pedido.itens.map(i =>
            `<li>${i.quantidade}× ${i.nome} — R$ ${i.preco.toFixed(2)}</li>`
        ).join("");

        div.innerHTML = `
            <p><strong>Pedido #${pedido.id}</strong></p>
            <p>Status:</p>
            <p class="progress">${progresso}</p>
            <h4>Itens</h4>
            <ul>${itensHTML}</ul>
        `;
    }

    await carregarPedido(); 
});

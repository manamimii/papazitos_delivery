document.addEventListener("DOMContentLoaded", carregarPedidos);

async function carregarPedidos() {
    try {
        const resp = await fetch("/api/pedidos/recebidos");

        if (!resp.ok) {
            throw new Error("Erro ao carregar pedidos. Código: " + resp.status);
        }

        const pedidos = await resp.json();
        const lista = document.getElementById("listaPedidos");
        lista.innerHTML = "";

        if (pedidos.length === 0) {
            lista.innerHTML = "<p>Nenhum pedido recebido ainda.</p>";
            return;
        }

        pedidos.forEach(p => {
            const div = document.createElement("div");
            div.classList.add("pedido-linha");

            div.innerHTML = `
                <p><strong>Cliente:</strong> ${p.cliente || "Desconhecido"}</p>
                <p><strong>Status:</strong> ${p.status || "Indefinido"}</p>
                <div class="btn-group">
                    <button class="btn" onclick="mudarStatus(${p.id}, 'em_preparo')">Iniciar Preparo</button>
                    <button class="btn" onclick="mudarStatus(${p.id}, 'pronto')">Marcar Pronto</button>
                    <button class="btn success" onclick="mudarStatus(${p.id}, 'entregue')">Entregar</button>
                </div>
                <hr>
            `;
            lista.appendChild(div);
        });
    } catch (err) {
        console.error("Erro ao buscar pedidos:", err);
        const lista = document.getElementById("listaPedidos");
        lista.innerHTML = `<p style="color:red;">Erro ao carregar pedidos. Verifique o servidor.</p>`;
    }
}

async function mudarStatus(id, status) {
    try {
        const resp = await fetch(`/api/pedido/${id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        });

        if (!resp.ok) {
            throw new Error("Falha ao atualizar o status. Código: " + resp.status);
        }

        await carregarPedidos(); // atualiza a lista depois da alteração
    } catch (err) {
        console.error("Erro ao mudar status:", err);
        alert("Erro ao atualizar o status do pedido!");
    }
}

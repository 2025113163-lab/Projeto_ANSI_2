async function carregarPedidos() {
    try {
        const res = await fetch("http://localhost:3000/pedidos");

        // se backend devolver HTML ou erro
        if (!res.ok) {
            throw new Error("Erro HTTP: " + res.status);
        }

        const data = await res.json();

        const container = document.getElementById("listaPedidos");

        if (!data.ok) {
            container.innerHTML = "Erro ao carregar pedidos.";
            return;
        }

        if (data.pedidos.length === 0) {
            container.innerHTML = "<p>Nenhum pedido pendente.</p>";
            return;
        }

        container.innerHTML = data.pedidos.map(p => `
            <div class="pedido-card">
                <h3>${p.titulo}</h3>
                <p><strong>Autores:</strong> ${p.autores}</p>
                <p><strong>Ano:</strong> ${p.ano}</p>
                <p><strong>Secção:</strong> ${p.secao}</p>

                <button onclick="aprovar(${p.id})" class="login-btn">✔ Aprovar</button>
                <button onclick="recusar(${p.id})" class="login-btn" style="background:#ef4444;">❌ Recusar</button>
            </div>
        `).join('');

    } catch (err) {
        console.error(err);
        document.getElementById("listaPedidos").innerHTML =
            "<p style='color:red;'>Erro ao ligar ao servidor.</p>";
    }
}
async function aprovar(id) {
    await fetch(`http://localhost:3000/pedidos/${id}/aprovar`, { method: "PUT" });
    carregarPedidos();
}

async function recusar(id) {
    await fetch(`http://localhost:3000/pedidos/${id}`, { method: "DELETE" });
    carregarPedidos();
}

carregarPedidos();
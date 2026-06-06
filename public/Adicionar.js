document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("workForm");

    form.addEventListener("submit", (e) => {

        e.preventDefault();

        const utilizador =
            JSON.parse(localStorage.getItem("utilizadorLogado"));

        const pedido = {
            id: Date.now(),
            titulo: document.getElementById("titulo").value,
            autores: document.getElementById("autores").value,
            secao: document.getElementById("secao").value,
            ano: document.getElementById("ano").value,
            lingua: document.getElementById("lingua").value,
            link: document.getElementById("link").value,
            estado: "pendente",
            criadoPor: utilizador.username
        };

        let pendentes =
            JSON.parse(localStorage.getItem("pendentes")) || [];

        pendentes.push(pedido);

        await fetch("http://localhost:3000/pedidos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pedido)
        });

        alert("Pedido enviado para aprovação!");

        window.location.href = "index.html";
    });
});
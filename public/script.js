let dadosOriginais = [];

// ==============================
// UTILIZADOR LOGADO (SEGURANÇA)
// ==============================
const utilizadorLogado = JSON.parse(localStorage.getItem("utilizadorLogado"));

if (!utilizadorLogado) {
    window.location.href = "login.html";
}

// ==============================
// CARREGAR PUBLICAÇÕES (SQLITE)
// ==============================
async function carregarPublicacoes() {
    try {
        const response = await fetch('/publicacoes');
        const data = await response.json();

        if (data.ok) {
            dadosOriginais = data.publicacoes;

            preencherFiltros(dadosOriginais);
            renderizarTabela(dadosOriginais);

            $('#status').text(`${dadosOriginais.length} publicações carregadas da Base de Dados.`);
        }
    } catch (err) {
        console.log("Erro ao carregar publicações:", err);
    }
}

// ==============================
// FILTROS
// ==============================
function preencherFiltros(dados) {

    const secoes = [...new Set(dados.map(d => d.secao))].sort();

    const anos = [...new Set(dados.map(d => d.ano))]
        .filter(a => a)
        .sort((a, b) => b - a);

    const linguas = [...new Set(dados.map(d => d.lingua))]
        .filter(l => l)
        .sort();

    $('#filterSecao').html(
        '<option value="">Todas as Secções</option>' +
        secoes.map(s => `<option value="${s}">${s}</option>`).join('')
    );

    $('#filterAno').html(
        '<option value="">Todos os Anos</option>' +
        anos.map(a => `<option value="${a}">${a}</option>`).join('')
    );

    $('#filterLingua').html(
        '<option value="">Todas as Línguas</option>' +
        linguas.map(l => `<option value="${l}">${l}</option>`).join('')
    );
}

// ==============================
// TABELA
// ==============================
function renderizarTabela(dados) {

    const html = dados.map(pub => {
        return `
        <tr>
            <td>${pub.id}</td>

            <td>
                <span class="badge type-${(pub.secao || '').trim().replace(/\s/g,'')}">
                    ${pub.secao}
                </span>
            </td>

            <td>
                <strong>${pub.autores}</strong> (${pub.ano}). <br>
                <span style="color:#475569; font-style:italic;">
                    ${pub.titulo}
                </span>
            </td>

            <td>
                <span class="badge lang-${(pub.lingua || '').trim().toUpperCase()}">
                    ${pub.lingua}
                </span>
            </td>

            <td style="text-align:center;">
                ${pub.link
                    ? `<a href="${pub.link}" target="_blank" class="btn-link">Ver PDF 📄</a>`
                    : '<span style="color:#cbd5e1;">-</span>'}
            </td>
        </tr>
        `;
    }).join('');

    $('#corpoTabela').html(
        html || '<tr><td colspan="5">Nenhum resultado encontrado.</td></tr>'
    );
}

// ==============================
// FILTROS + PESQUISA
// ==============================
function aplicarFiltros() {

    const sec = $('#filterSecao').val();
    const ano = $('#filterAno').val();
    const lingua = $('#filterLingua').val();

    const pesquisa = $('#searchInput').val().toLowerCase();

    const filtrados = dadosOriginais.filter(d => {

        const matchSecao = sec === "" || d.secao === sec;
        const matchAno = ano === "" || d.ano === ano;
        const matchLingua = lingua === "" || d.lingua === lingua;

        const matchPesquisa =
            d.autores.toLowerCase().includes(pesquisa) ||
            d.titulo.toLowerCase().includes(pesquisa);

        return matchSecao && matchAno && matchLingua && matchPesquisa;
    });

    renderizarTabela(filtrados);
}

// ==============================
// BOTÃO SCRAPE
// ==============================
$('#btnScrape').on('click', async function () {

    const $btn = $(this);
    $btn.prop('disabled', true);
    $('#loadingMsg').show();

    try {
        const resp = await fetch('/scrape');
        const data = await resp.json();

        if (data.ok) {
            await carregarPublicacoes();
        }

    } catch (err) {
        alert("Erro ao processar dados.");
    } finally {
        $btn.prop('disabled', false);
        $('#loadingMsg').hide();
    }
});

// ==============================
// ORDENAR TABELA
// ==============================
let ordemAscendente = true;
let ultimaColuna = '';

function ordenarPor(coluna) {

    if (ultimaColuna === coluna) {
        ordemAscendente = !ordemAscendente;
    } else {
        ordemAscendente = true;
        ultimaColuna = coluna;
    }

    dadosOriginais.sort((a, b) => {

        let valorA = a[coluna] ?? '';
        let valorB = b[coluna] ?? '';

        if (coluna === 'id') {
            return ordemAscendente ? valorA - valorB : valorB - valorA;
        }

        valorA = valorA.toString().toLowerCase();
        valorB = valorB.toString().toLowerCase();

        if (valorA < valorB) return ordemAscendente ? -1 : 1;
        if (valorA > valorB) return ordemAscendente ? 1 : -1;

        return 0;
    });

    renderizarTabela(dadosOriginais);
}

// ==============================
// EVENTOS FILTROS
// ==============================
$('#filterSecao, #filterAno, #filterLingua').on('change', aplicarFiltros);
$('#searchInput').on('keyup', aplicarFiltros);

// ==============================
// UI + BOTÕES (ADD / PEDIDOS / LOGOUT)
// ==============================
$(document).ready(() => {

    carregarPublicacoes();

    const btnAddWork = document.getElementById("btnAddWork");
    const btnRequests = document.getElementById("btnRequests");
    const userName = document.getElementById("userName");
    const logoutBtn = document.getElementById("logoutBtn");

    // username
    if (userName) {
        userName.textContent = utilizadorLogado.username;
    }

    // adicionar trabalho
    if (btnAddWork) {
        btnAddWork.addEventListener("click", () => {
            window.location.href = "adicionar.html";
        });
    }

    // pedidos (apenas admin)
    if (btnRequests) {
        if (utilizadorLogado && utilizadorLogado.role === "admin") {
            btnRequests.style.display = "inline-block";
        }

        btnRequests.addEventListener("click", () => {
            window.location.href = "pedidos.html";
        });
    }

    // logout
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {

            const confirmar = confirm("Pretende terminar sessão?");
            if (!confirmar) return;

            localStorage.removeItem("utilizadorLogado");
            window.location.href = "login.html";
        });
    }
});
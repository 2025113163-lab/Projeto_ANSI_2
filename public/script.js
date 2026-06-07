let dadosOriginais = [];

// ==============================
// UTILIZADOR LOGADO (SEGURANÇA)
// ==============================
const utilizadorLogado = JSON.parse(localStorage.getItem("utilizadorLogado"));

if (!utilizadorLogado) {
    window.location.href = "login.html";
}

// ==============================
// REVIEWS (estado global)
// ==============================
let mediasReviews = {};   // { publicacao_id: { media, total } }
let minhasReviews = {};   // { publicacao_id: estrelas }

async function carregarReviews() {
    try {
        const uid = utilizadorLogado?.id || '';
        const res = await fetch(`/reviews?utilizador_id=${uid}`);
        const data = await res.json();

        if (data.ok) {
            mediasReviews = {};
            data.medias.forEach(r => {
                mediasReviews[r.publicacao_id] = { media: r.media, total: r.total };
            });

            minhasReviews = {};
            data.minhas.forEach(r => {
                minhasReviews[r.publicacao_id] = r.estrelas;
            });
        }
    } catch (err) {
        console.log("Erro ao carregar reviews:", err);
    }
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

            await carregarReviews();

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
// HELPER — ESTRELAS
// ==============================
function gerarEstrelas(pubId) {

    const review   = mediasReviews[pubId];
    const minha    = minhasReviews[pubId] || 0;
    const media    = review ? review.media : null;
    const total    = review ? review.total : 0;

    // 5 estrelas interativas
    const estrelas = [1, 2, 3, 4, 5].map(n => `
        <span
            class="estrela ${n <= minha ? 'selecionada' : ''}"
            data-pub="${pubId}"
            data-val="${n}"
            title="${n} estrela${n > 1 ? 's' : ''}"
        >★</span>
    `).join('');

    const mediaTexto = media !== null
        ? `<span class="review-media" title="${total} avaliação${total !== 1 ? 'ões' : ''}">${media} <small>(${total})</small></span>`
        : `<span class="review-sem-dados">Sem avaliações</span>`;

    return `
        <div class="estrelas-wrapper">
            <div class="estrelas-row">${estrelas}</div>
            ${mediaTexto}
        </div>
    `;
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

            <td style="text-align:center;">
                ${utilizadorLogado.role === "admin"
                    ? `<button onclick="eliminarPublicacao(${pub.id})"
                           style="background:#ef4444; padding:3px 8px; font-size:12px; border-radius:6px; cursor:pointer; border:none; color:white;">
                           🗑️
                       </button>`
                    : ""}
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

            <td>${gerarEstrelas(pub.id)}</td>
        </tr>
        `;
    }).join('');

    $('#corpoTabela').html(
        html || '<tr><td colspan="7">Nenhum resultado encontrado.</td></tr>'
    );

    // Ligar eventos às estrelas após renderizar
    bindEstrelas();
}

// ==============================
// EVENTOS DAS ESTRELAS
// ==============================
function bindEstrelas() {

    // Hover — ilumina estrelas até ao cursor
    $(document).on('mouseenter', '.estrela', function () {
        const val = parseInt($(this).data('val'));
        const pubId = $(this).data('pub');

        $(`.estrela[data-pub="${pubId}"]`).each(function () {
            $(this).toggleClass('hover', parseInt($(this).data('val')) <= val);
        });
    });

    $(document).on('mouseleave', '.estrelas-row', function () {
        $(this).find('.estrela').removeClass('hover');
    });

    // Click — submete review
    $(document).on('click', '.estrela', async function () {

        const pubId    = parseInt($(this).data('pub'));
        const estrelas = parseInt($(this).data('val'));
        const uid      = utilizadorLogado?.id;

        if (!uid) return alert("Precisas de estar autenticado para avaliar.");

        try {
            const res = await fetch('/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicacao_id: pubId, utilizador_id: uid, estrelas })
            });

            const data = await res.json();

            if (data.ok) {
                // Atualizar estado local sem recarregar tudo
                minhasReviews[pubId] = estrelas;

                // Recalcular média localmente de forma optimista
                const anterior = mediasReviews[pubId];
                if (anterior) {
                    const totalAnterior = anterior.total;
                    const jaVotou      = minhasReviews[pubId] !== undefined;
                    // Para uma atualização precisa, rebusca do servidor
                } 

                // Rebuscar só as reviews (leve, sem recarregar publicações)
                await carregarReviews();

                // Re-renderizar apenas a linha afetada
                const pub = dadosOriginais.find(p => p.id === pubId);
                if (pub) {
                    $(`tr`).each(function () {
                        const btnEl = $(this).find(`button[onclick="eliminarPublicacao(${pubId})"]`);
                        const idCell = $(this).find('td:first');
                        if (idCell.text().trim() == pubId || btnEl.length) {
                            $(this).find('td:last').html(gerarEstrelas(pubId));
                            bindEstrelas();
                        }
                    });
                }
            }
        } catch (err) {
            console.error("Erro ao submeter review:", err);
        }
    });
}

async function eliminarPublicacao(id) {
    const confirmar = confirm("Tens a certeza que queres eliminar esta publicação?");
    if (!confirmar) return;

    const res = await fetch(`/publicacoes/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (data.ok) {
        // remove da lista local sem recarregar tudo
        dadosOriginais = dadosOriginais.filter(p => p.id !== id);
        aplicarFiltros();
    } else {
        alert("Erro ao eliminar.");
    }
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
let dadosOriginais = [];



// PREENCHER FILTROS _______________________________________________________________________________________

// Preenche os filtros da interface (Secção, Ano e Língua) com valores únicos extraídos dos dados.
function preencherFiltros(dados) {

    // Obter lista única de secções ordenadas alfabeticamente
    const secoes = [...new Set(dados.map(d => d.secao))].sort();

    // Obter lista única de anos válidos ordenados decrescentemente
    const anos = [...new Set(dados.map(d => d.ano))]
        .filter(a => a)
        .sort((a,b) => b-a);

    // Obter lista única de línguas válidas ordenadas alfabeticamente
    const linguas = [...new Set(dados.map(d => d.lingua))]
    .filter(l => l)
    .sort();

    // Evento para preencher filtro de secções
    $('#filterSecao').html(
        '<option value="">Todas as Secções</option>' +
        secoes.map(s => `<option value="${s}">${s}</option>`).join('')
    );

    // Evento para preencher filtro de anos
    $('#filterAno').html(
        '<option value="">Todos os Anos</option>' +
        anos.map(a => `<option value="${a}">${a}</option>`).join('')
    );

    // Evento para preencher filtro de línguas
    $('#filterLingua').html(
        '<option value="">Todas as Línguas</option>' +
        linguas.map(l => `<option value="${l}">${l}</option>`).join('')
    );

}

// RENDERIZAR TABELA _______________________________________________________________________________________

// Renderiza as publicações na tabela HTML.
function renderizarTabela(dados) {
    
    // Construir HTML das linhas da tabela
    const html = dados.map(pub => {
        // Se houver link, criamos uma tag <a>, caso contrário apenas o texto
        const linkHTML = pub.link 
            ? `<a href="${pub.link}" target="_blank" style="color:#2563eb; text-decoration: none; font-weight: 500;">
                 ${pub.titulo} 🔗
               </a>`
            : pub.titulo;

        return `
            <tr>

                <!-- ID da publicação -->
                <td>${pub.id}</td>

                <!-- Secção -->
                <td>
                    <span class="badge type-${(pub.secao || '').trim().replace(/\s/g,'')}">
                        ${pub.secao}
                    </span>
                </td>

                <!-- Autores + Título -->
                <td>
                    <strong>${pub.autores}</strong> (${pub.ano}). <br>

                    <span style="color:#475569; font-style:italic;">
                        ${pub.titulo}
                    </span>
                </td>

                <!-- Língua -->
                <td>
                    <span class="badge lang-${(pub.lingua || '').trim().toUpperCase()}">
                        ${pub.lingua}
                    </span>
                </td>

                <!-- Link -->
                <td style="text-align:center;">
                ${pub.link 
                    ? `<a href="${pub.link}" target="_blank" class="btn-link">Ver PDF 📄</a>` 
                    : '<span style="color:#cbd5e1;">-</span>'}
                </td>

            </tr>
        `;
    }).join('');

    // Evento para atualizar conteúdo da tabela
    $('#corpoTabela').html(
        html || 
        '<tr><td colspan="5">Nenhum resultado encontrado.</td></tr>'
    );
}

// APLICAR FILTROS + PESQUISA _______________________________________________________________________________________

/**
 * Aplica filtros e pesquisa textual às publicações, seguindo os critérios:
 * 
 * Critérios:
 * - Secção
 * - Ano
 * - Língua
 * - Texto pesquisado (Autores ou Título)
 */
function aplicarFiltros() {

    // Valores selecionados nos filtros
    const sec = $('#filterSecao').val();
    const ano = $('#filterAno').val();
    const lingua = $('#filterLingua').val();

    // Texto de pesquisa normalizado
    const pesquisa = $('#searchInput')
        .val()
        .toLowerCase();
    
    // Filtrar publicações
    const filtrados = dadosOriginais.filter(d => {

        const matchSecao =
            sec === "" || d.secao === sec;

        const matchAno =
            ano === "" || d.ano === ano;

        const matchLingua =
            lingua === "" || d.lingua === lingua;

        const matchPesquisa =

            d.autores.toLowerCase().includes(pesquisa) ||

            d.titulo.toLowerCase().includes(pesquisa);

        return (
            matchSecao &&
            matchAno &&
            matchLingua &&
            matchPesquisa
        );
    });

    // Atualizar tabela
    renderizarTabela(filtrados);
}

// BOTÃO SCRAPE _______________________________________________________________________________________

/**
 * Evento responsável por:
 * 1. Executar o scrape no servidor
 * 2. Obter os dados atualizados
 * 3. Atualizar tabela e filtros
 */
$('#btnScrape').on('click', async function() {

    const $btn = $(this);

    // Desativar botão durante processamento
    $btn.prop('disabled', true);

    // Mostrar mensagem de loading
    $('#loadingMsg').show();

    try {

        // PASSO 1: Solicitar ao servidor o processo de scraping
        const respScrape = await fetch('/scrape');
        const dataScrape = await respScrape.json();

        if (dataScrape.ok) {

            // PASSO 2: Obter lista atualizada de publicações
            const respDados = await fetch('/publicacoes');
            const dataDados = await respDados.json();

            if (dataDados.ok) {

                // Atualizar dados globais
                dadosOriginais = dataDados.publicacoes;

                // Atualizar interface
                preencherFiltros(dadosOriginais);
                renderizarTabela(dadosOriginais);
                
                // Atualizar status
                $('#status').text(`${dadosOriginais.length} publicações carregadas da Base de Dados.`);
            }
        }
    } catch (e) {

        // Tratamento genérico de erro
        alert("Erro ao processar dados.");

    } finally {

        // Reativar botão e esconder loading
        $btn.prop('disabled', false);
        $('#loadingMsg').hide();

    }
});

// Evento que carrega automaticamente os dados quando a página é aberta.
$(document).ready(async function() {

    try {

        // Obter publicações existentes
        const response = await fetch('/publicacoes');
        const data = await response.json();

        // Validar resposta
        if (data.ok && data.publicacoes.length > 0) {

            // Guardar dados
            dadosOriginais = data.publicacoes;

            // Atualizar interface
            preencherFiltros(dadosOriginais);
            renderizarTabela(dadosOriginais);

            // Atualizar status
            $('#status').text(`${dadosOriginais.length} publicações carregadas da Base de Dados.`);
        }
    } catch (e) {

        // Base de dados vazia ou erro de ligação
        console.log("Base de dados ainda vazia.");
    }
});

// Variáveis globais utilizadas para controlo da ordenação.
let ordemAscendente = true;
let ultimaColuna = '';

// Ordena os dados da tabela pela coluna selecionada.
function ordenarPor(coluna) {

    // Se clicar novamente na mesma coluna, inverter ordem Ascendente/Descendente.
    if (ultimaColuna === coluna) {

        ordemAscendente = !ordemAscendente;

    } else {

        ordemAscendente = true;
        ultimaColuna = coluna;
    }

    // Ordenar array original
    dadosOriginais.sort((a, b) => {

        let valorA = a[coluna];
        let valorB = b[coluna];

        // Prevenir erros com valores nulos/undefined
        if (valorA === null || valorA === undefined) valorA = '';
        if (valorB === null || valorB === undefined) valorB = '';

        // Ordenação numérica
        if (coluna === 'id' || coluna === 'ogid') {
            return ordemAscendente 
                ? valorA - valorB 
                : valorB - valorA;
        }

        // Ordenação textual
        valorA = valorA.toString().toLowerCase();
        valorB = valorB.toString().toLowerCase();

        if (valorA < valorB) 
            return ordemAscendente 
                ? -1 
                : 1;

        if (valorA > valorB) 
            return ordemAscendente 
                ? 1 
                : -1;
    
        return 0;
    });

    // Re-renderizar tabela após ordenação
    renderizarTabela(dadosOriginais);
}

// EVENTOS _______________________________________________________________________________________

// Evento em que sempre que o utilizador altera um filtro, a tabela é atualizada automaticamente.
$('#filterSecao, #filterAno, #filterLingua').on('change', aplicarFiltros);

// Evento da pesquisa textual. Atualiza resultados enquanto o utilizador escreve.
$('#searchInput').on('keyup', aplicarFiltros);
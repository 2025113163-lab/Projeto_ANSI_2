/**
 * -------------------------------------------------------------
 * IMPORTAÇÃO DE DEPENDÊNCIAS
 * -------------------------------------------------------------
 */

const axios   = require("axios");
const cheerio = require("cheerio");
const iconv   = require("iconv-lite");


/**
 * -------------------------------------------------------------
 * DETEÇÃO DE LÍNGUA POR HEURÍSTICA
 * -------------------------------------------------------------
 *
 * O tinyld falha frequentemente em títulos académicos curtos.
 * Esta abordagem usa padrões e palavras típicas de cada língua,
 * sendo muito mais fiável para este tipo de conteúdo.
 */

// Padrões ortográficos e palavras-chave por língua.
const LINGUA_HEURISTICAS = [
    {
        codigo: "PT",
        // Caracteres exclusivos do português, ou palavras muito comuns.
        padroes: [/ção|ções|ã|õ|ê|ô|ú|á|é|í|ó|à/i],
        palavras: ["uma", "para", "com", "dos", "das", "em", "na", "no", "ao", "aos",
                   "de", "do", "da", "os", "as", "análise", "estudo", "avaliação",
                   "desenvolvimento", "sistema", "método", "aplicação"]
    },
    {
        codigo: "ES",
        padroes: [/ción|ciones|ñ|¿|¡/i],
        palavras: ["para", "con", "una", "los", "las", "del", "análisis", "estudio",
                   "desarrollo", "sistema", "método", "aplicación", "evaluación"]
    },
    {
        codigo: "FR",
        padroes: [/eau|eux|œ|è|ç(?!ã)/i],
        palavras: ["les", "des", "une", "dans", "pour", "avec", "sur", "analyse",
                   "étude", "développement", "système", "méthode", "évaluation"]
    },
    {
        codigo: "DE",
        padroes: [/sch|ung|keit|heit|lich|ß|ä|ö|ü/i],
        palavras: ["die", "der", "das", "und", "für", "mit", "von", "analyse",
                   "entwicklung", "system", "methode", "bewertung"]
    },
    {
        codigo: "IT",
        padroes: [/zione|zioni|ità|gli|ell[oa]/i],
        palavras: ["per", "con", "una", "dei", "delle", "nel", "analisi",
                   "studio", "sviluppo", "sistema", "metodo", "valutazione"]
    },
    {
        codigo: "EN",
        // Inglês como fallback — palavras muito comuns e ausência de acentos.
        padroes: [/^[a-zA-Z0-9\s\-:,.'()&]+$/],
        palavras: ["the", "of", "and", "for", "in", "a", "an", "with", "on", "at",
                   "analysis", "study", "development", "system", "method", "evaluation",
                   "approach", "based", "using", "learning", "network", "model",
                   "detection", "recognition", "classification", "performance"]
    }
];

function detectarLingua(texto) {

    if (!texto || texto.length < 4)
        return "PT"; // Omissão segura para este repositório.

    const t = texto.toLowerCase();
    const palavras = t.split(/\s+/);

    // Pontuar cada língua.
    const pontuacao = LINGUA_HEURISTICAS.map(({ codigo, padroes, palavras: kw }) => {

        let score = 0;

        // +3 por cada padrão ortográfico que faça match.
        for (const p of padroes)
            if (p.test(t)) score += 3;

        // +1 por cada palavra-chave encontrada no título.
        for (const w of kw)
            if (palavras.includes(w)) score += 1;

        return { codigo, score };
    });

    // Ordenar por pontuação descendente.
    pontuacao.sort((a, b) => b.score - a.score);

    // Se a melhor pontuação for 0, assume Português (contexto do repositório).
    if (pontuacao[0].score === 0)
        return "PT";

    return pontuacao[0].codigo;
}


/**
 * -------------------------------------------------------------
 * REPARAÇÃO DE CARACTERES ESPECIAIS
 * -------------------------------------------------------------
 */

function repararTextoMisto(texto) {

    if (!texto) return "";

    return texto
        .replace(/Ã¡/g, "á")
        .replace(/Ã¢/g, "â")
        .replace(/Ã£/g, "ã")
        .replace(/Ã©/g, "é")
        .replace(/Ãª/g, "ê")
        .replace(/Ã­/g, "í")
        .replace(/Ã³/g, "ó")
        .replace(/Ã´/g, "ô")
        .replace(/Ãµ/g, "õ")
        .replace(/Ãº/g, "ú")
        .replace(/Ã§/g, "ç")
        .replace(/Âº/g, "º")
        .replace(/Âª/g, "ª")
        .replace(/Ã(?![a-zA-Záàâãéèêíïóôõúüç])/g, "à")
        .replace(/\uFFFD/g, "");
}

function limparTexto(texto) {

    let limpo = texto
        .replace(/\s+/g, " ")
        .replace(/\[.*?\]/g, "")
        .trim();

    return repararTextoMisto(limpo);
}


/**
 * -------------------------------------------------------------
 * PARSE DAS REFERÊNCIAS
 * -------------------------------------------------------------
 */

function parsearReferencia(textoRaw) {

    const texto = limparTexto(textoRaw);
    const match = texto.match(/^(.+?)\((\d{4,5})\)[.,]?\s+(.+)/);

    if (!match)
        return {
            autores: "Autor(es) não formatado(s)",
            ano: "",
            titulo: texto
        };

    const autores = match[1].replace(/[.,;]\s*$/, "").trim();
    const ano     = match[2].substring(0, 4);
    let titulo    = match[3].trim();

    const corte = titulo.search(
        /\.\s+(?:[A-Z*]|[Rr]evista|[Jj]ournal|[Ii]n\s|[Vv]ol|ISSN|Procedia|Edições|[Cc]apítulo)/
    );
    if (corte > 5)
        titulo = titulo.substring(0, corte).trim();

    return { autores, ano, titulo };
}


/**
 * -------------------------------------------------------------
 * IDENTIFICAÇÃO DE SECÇÕES
 * -------------------------------------------------------------
 */

function identificarSecao(texto) {
    const t = texto.toLowerCase();

    if (t.includes("internacional") && (t.includes("revist") || t.includes("journal")))
        return "Revista Internacional";

    if (t.includes("nacional") && (t.includes("revist") || t.includes("journal")))
        return "Revista Nacional";

    if (t.includes("livros") || t.includes("books"))
        return "Livro";

    if (t.includes("capítulos") || t.includes("chapters"))
        return "Capítulo";

    if (t.includes("internacionais") && t.includes("conferênc"))
        return "Conferência Internacional";

    if (t.includes("nacionais") && t.includes("conferênc"))
        return "Conferência Nacional";

    if (t.includes("tese") || t.includes("dissertação") || t.includes("relatório"))
        return "Relatório Académico";

    if (t.includes("media") || t.includes("palestra") || t.includes("outros"))
        return "Outros";

    return null;
}


/**
 * -------------------------------------------------------------
 * SCRAPING PRINCIPAL
 * -------------------------------------------------------------
 */

module.exports = async function scrape(db) {
    return new Promise((resolve, reject) => {

        db.run("DELETE FROM publicacoes WHERE ogid IS NOT NULL", async () => {

            db.run("DELETE FROM sqlite_sequence WHERE name='publicacoes'");

            try {

                const { data } = await axios.get(
                    "https://homepage.ufp.pt/lmbg/lg_com2.htm",
                    {
                        responseType: "arraybuffer",
                        headers: { "User-Agent": "Mozilla/5.0" }
                    }
                );

                const html = iconv.decode(data, "windows-1252");
                const $    = cheerio.load(html, { decodeEntities: false });

                let secaoAtual = "Geral";
                const inserts  = [];

                $("table tr").each((_, tr) => {

                    const celulas = $(tr).find("td");

                    /**
                     * -------------------------------------------------
                     * VERIFICAR CABEÇALHOS DE SECÇÃO PRIMEIRO
                     *
                     * Linhas de cabeçalho podem ter apenas 1 célula
                     * (colspan) ou ter a coluna esquerda vazia.
                     * Verificamos ANTES de descartar por nº de colunas.
                     * -------------------------------------------------
                     */
                    const textoLinha = $(tr).text().trim();
                    const novaSecao  = identificarSecao(textoLinha);

                    if (novaSecao) {
                        secaoAtual = novaSecao;
                        return; // É um cabeçalho, não uma publicação.
                    }

                    // Agora sim descartamos linhas com colunas a menos.
                    if (celulas.length < 2) return;

                    const tdEsquerda = celulas.eq(0);
                    const tdDireita  = celulas.eq(1);
                    const colEsq     = tdEsquerda.text().trim();
                    const colDir     = tdDireita.text().trim();


                    // --- LINK ---
                    let link  = "";
                    const aTag = tdDireita.find("a").first();

                    if (aTag.length > 0) {
                        const href = aTag.attr("href");
                        if (href) {
                            link = href.startsWith("http")
                                ? href
                                : `https://homepage.ufp.pt/lmbg/${href}`;
                        }
                    }


                    // --- IDENTIFICADOR ---
                    const numStr = colEsq.replace(/\D/g, "");
                    if (!numStr) return;

                    const ogid = parseInt(numStr, 10);
                    if (isNaN(ogid) || ogid <= 0 || colDir.trim().length < 5) return;


                    // --- PARSE DA REFERÊNCIA ---
                    const { autores, ano, titulo } = parsearReferencia(colDir);
                    const lingua = detectarLingua(titulo);


                    // --- INSERÇÃO ---
                    inserts.push(
                        new Promise((resInsert) => {
                            db.run(
                                `INSERT INTO publicacoes (ogid, secao, autores, ano, titulo, lingua, link)
                                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [ogid, secaoAtual, autores, ano, titulo, lingua, link],
                                resInsert
                            );
                        })
                    );
                });

                await Promise.all(inserts);
                resolve();

            } catch (err) {
                console.error("Erro no scrape:", err.message);
                reject(err);
            }
        });
    });
};
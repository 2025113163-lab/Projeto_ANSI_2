/**
 * -------------------------------------------------------------
 * IMPORTAÇÃO DE DEPENDÊNCIAS
 * -------------------------------------------------------------
 */


// Biblioteca para realizar pedidos HTTP.
const axios = require('axios');
// Biblioteca, semelhante ao jQuery, para parsing/manipulação de HTML.
const cheerio = require('cheerio');
// Framework web para criação do servidor HTTP.
const express = require('express');
// Biblioteca para deteção automática de idioma.
const { detect } = require('tinyld');
// Biblioteca para conversão de encoding de texto.
const iconv = require('iconv-lite');
// Ligação à base de dados SQLite.
const db = require('./db');



/**
 * -------------------------------------------------------------
 * CONFIGURAÇÃO DO SERVIDOR
 * -------------------------------------------------------------
 */


// Inicialização da aplicação Express.
const app = express();

// Porta onde o servidor ficará disponível.
const PORT = 3000;

// Permite servir ficheiros estáticos da pasta "public" (html, js, css).
app.use(express.static('public'));



/**
 * -------------------------------------------------------------
 * CONFIGURAÇÃO DE IDIOMAS
 * -------------------------------------------------------------
 */


// Mapeamento dos códigos ISO de idioma para códigos simplificados do projeto.
const LINGUA_MAP = { pt: 'PT', en: 'EN', es: 'ES', fr: 'FR', de: 'DE', it: 'IT' };

// Função para detetar automaticamente a língua de um texto.
function detectarLingua(texto) {

    // Evita análise de textos demasiado pequenos.
    if (!texto || texto.length < 5) 
        return 'Desconhecido';
    
    // Deteta os idiomas com base na biblioteca do tinyld.
    const cod = detect(texto);

    // Converte para o formato padronizado.
    return LINGUA_MAP[cod] || (cod ? cod.toUpperCase() : 'Desconhecido');
}



/**
 * -------------------------------------------------------------
 * REPARAÇÃO DE CARACTERES ESPECIAIS
 * -------------------------------------------------------------
 */


// Função que corrige problemas comuns de encoding encontrados no HTML original.
function repararTextoMisto(texto) {

    if (!texto) return "";

    return texto

        // Vogais acentuadas.
        .replace(/Ã¡/g, 'á')
        .replace(/Ã¢/g, 'â')
        .replace(/Ã£/g, 'ã')
        .replace(/Ã©/g, 'é')
        .replace(/Ãª/g, 'ê')
        .replace(/Ã­/g, 'í')
        .replace(/Ã³/g, 'ó')
        .replace(/Ã´/g, 'ô')
        .replace(/Ãµ/g, 'õ')
        .replace(/Ãº/g, 'ú')

        // Cedilha.
        .replace(/Ã§/g, 'ç')

        // Símbolos especiais.
        .replace(/Âº/g, 'º')
        .replace(/Âª/g, 'ª')

        // Correção genérica.
        .replace(/Ã(?![a-zA-Záàâãéèêíïóôõúüç])/g, 'à')

        // Remove caracteres inválidos.
        .replace(/\uFFFD/g, '');
}

// Função de limpeza e normaliza texto extraído do HTML.
function limparTexto(texto) {

    // Remover espaços duplicados e referências entre []
    let limpo = texto
        .replace(/\s+/g, ' ')
        .replace(/\[.*?\]/g, '')
        .trim();

    // Corrigir encoding
    return repararTextoMisto(limpo);
}



/**
 * -------------------------------------------------------------
 * PARSE DAS REFERÊNCIAS 
 * -------------------------------------------------------------
 */


// Função que extrai a partir de uma referência bibliográfica, os autores, o ano e o título.
function parsearReferencia(textoRaw) {
    // Limpeza inicial
    const texto = limparTexto(textoRaw);

    // Usando o metodo o regex, procuramos e localizamos os autores, ano e o título.
    const match = texto.match(/^(.+?)\((\d{4,5})\)[.,]?\s+(.+)/);
    
    // Caso o formato não seja o esperado devolve:
    if (!match) 
        return { 
            autores: "Autor(es) não formatado(s)", 
            ano: "", 
            titulo: texto 
        };
    
    // Extrair os autores para uma variável.
    const autores = match[1].replace(/[.,;]\s*$/, '').trim();

    // Extrair apenas os 4 primeiros dígitos do ano para uma variável.
    const ano = match[2].substring(0, 4); 

    // Extrair o título para uma variável.
    let titulo = match[3].trim();
    
    // Remove partes posteriores ao título (Revista, Jornal, Vol, etc.).
    const corte = titulo.search(/\.\s+(?:[A-Z*]|[Rr]evista|[Jj]ournal|[Ii]n\s|[Vv]ol|ISSN|Procedia|Edições|[Cc]apítulo)/);
    if (corte > 5) 
        titulo = titulo.substring(0, corte).trim();
    
    return { 
        autores, 
        ano, 
        titulo 
    };
}



/**
 * -------------------------------------------------------------
 * IDENTIFICAÇÃO DE SECÇÕES
 * -------------------------------------------------------------
 */


// Identifica automaticamente a secção/publicação com base no texto encontrado.
function identificarSecao(texto) {
    const t = texto.toLowerCase();

    if (t.includes('internacional') && (t.includes('revist') || t.includes('journal'))) 
        return 'Revista Internacional';

    if (t.includes('nacional') && (t.includes('revist') || t.includes('journal'))) 
        return 'Revista Nacional';

    if (t.includes('livros') || t.includes('books'))
         return 'Livro';

    if (t.includes('capítulos') || t.includes('chapters')) 
        return 'Capítulo';

    if (t.includes('internacionais') && t.includes('conferênc')) 
        return 'Conferência Internacional';

    if (t.includes('nacionais') && t.includes('conferênc')) 
        return 'Conferência Nacional';

    if (t.includes('tese') || t.includes('dissertação') || t.includes('relatório')) 
        return 'Relatório Académico';

    if (t.includes('media') || t.includes('palestra') || t.includes('outros')) 
        return 'Outros';

    return null;
}



/**
 * -------------------------------------------------------------
 * SCRAPING PRINCIPAL
 * -------------------------------------------------------------
 */


/**
 * Função que executa o scraping do website, na seguinte ordem:
 * 
 * 1. Limpa tabela;
 * 2. Faz download do HTML;
 * 3. Processa conteúdo;
 * 4. Extrai publicações;
 * 5. Guarda na base de dados.
 * 
 */
async function scrape() {
    // Limpar tabela antes de inserir novos dados.
    db.run("DELETE FROM publicacoes");

    // Reiniciar contador AUTO_INCREMENT.
    db.run("DELETE FROM sqlite_sequence WHERE name='publicacoes'");

    try {

        // Fazer pedido HTTP ao website.
        const { data } = await axios.get('https://homepage.ufp.pt/lmbg/lg_com2.htm', {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        // Converter encoding do HTML.
        const html = iconv.decode(data, 'windows-1252');

        // Carregar HTML no Cheerio.
        const $ = cheerio.load(html, { decodeEntities: false });

        // Lista de resultados.
        const resultados = [];

        // Secção atual identificada no HTML.
        let secaoAtual = 'Geral';
        
        // Percorrer todas as linhas da tabela.
        $('table tr').each((_, tr) => {

            const celulas = $(tr).find('td');

            // Ignorar linhas inválidas.
            if (celulas.length < 2) 
                return;

            const tdEsquerda = celulas.eq(0);
            const tdDireita = celulas.eq(1);

            const colEsq = tdEsquerda.text().trim();
            const colDir = tdDireita.text().trim();



            /**
             * -------------------------------------------------------------
             * EXTRAÇÃO DO LINK
             * -------------------------------------------------------------
             */
            

            let link = "";

            // Procurar primeiro link da célula.
            const aTag = tdDireita.find('a').first();

            if (aTag.length > 0) {

                const href = aTag.attr('href');

                if (href) {
                    // Se o link for relativo (não começar por http), junta-se o URL base.
                    link = href.startsWith('http') ? href : `https://homepage.ufp.pt/lmbg/${href}`;
                }
            }

            // Verificar se existe nova secção.
            const novaSecao = identificarSecao(colEsq + ' ' + colDir);

            if (novaSecao) { 

                secaoAtual = novaSecao; 
                return; 
            }

            // Extrair número identificador.
            const numStr = colEsq.replace(/\D/g, '');

            if (!numStr) 
                return;

            const ogid = parseInt(numStr, 10);

            // Validar dados mínimos.
            if (isNaN(ogid) || ogid <= 0 || colDir.trim().length < 5) 
                return;

            // Parse da referência bibliográfica.
            const { autores, ano, titulo } = parsearReferencia(colDir);
            
            // Inserir publicação na base de dados.
            db.run(`
            INSERT INTO publicacoes (ogid, secao, autores, ano, titulo, lingua, link)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                ogid, 
                secaoAtual, 
                autores, 
                ano, 
                titulo, 
                detectarLingua(titulo) || 'PT',
                link
        ]);
        });
    
        // Devolver resultados ordenados.
        return resultados.sort((a, b) => b.id - a.id);
    } catch (error) {

        // Tratamento de erro do scraping.
        console.error("Erro no scrape:", error.message);
        return [];
    }
}



/**
 * -------------------------------------------------------------
 * ROTAS DA API
 * -------------------------------------------------------------
 */


// Página principal.
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

// Executa o scraping manualmente.
app.get('/scrape', async (req, res) => {

    try {

        await scrape(); 

        res.json({ 
            ok: true, 
            message: "Scrape concluído e dados guardados!" 
        });
    } catch (err) {

        res.status(500).json({ 
            ok: false, 
            error: err.message });
    }
});

// Endpoint para obter publicações da base de dados.
app.get('/publicacoes', (req, res) => {

    db.all("SELECT * FROM publicacoes ORDER BY id DESC", (err, rows) => {
        if (err) return res.status(500).json({ 
            error: 
            err.message 
        });
        res.json({ 
            ok: true, 
            publicacoes: rows 
        });
    });
});



/**
 * -------------------------------------------------------------
 * INICIALIZAÇÃO DO SERVIDOR
 * -------------------------------------------------------------
 */


// Arranca servidor HTTP.
app.listen(PORT, () => {
    
    console.log(`\n🚀 Servidor pronto: http://localhost:${PORT}\n`);
});
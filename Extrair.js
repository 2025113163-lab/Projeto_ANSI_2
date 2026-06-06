const axios = require("axios");
const cheerio = require("cheerio");
const iconv = require("iconv-lite");

module.exports = async function scrape(db) {

    return new Promise(async (resolve, reject) => {

        try {

            // ⚠️ CUIDADO: isto limpa só o scrape base
            db.run("DELETE FROM publicacoes WHERE ogid IS NOT NULL", async () => {

                const { data } = await axios.get(
                    "https://homepage.ufp.pt/lmbg/lg_com2.htm",
                    { responseType: "arraybuffer" }
                );

                const html = iconv.decode(data, "windows-1252");
                const $ = cheerio.load(html);

                let secaoAtual = "Geral";

                const inserts = [];

                $("table tr").each((_, tr) => {

                    const tds = $(tr).find("td");
                    if (tds.length < 2) return;

                    const colEsq = tds.eq(0).text().trim();
                    const colDir = tds.eq(1).text().trim();

                    const num = colEsq.replace(/\D/g, "");
                    if (!num) return;

                    const ogid = parseInt(num);

                    const linkTag = tds.eq(1).find("a").attr("href");
                    const link = linkTag
                        ? "https://homepage.ufp.pt/lmbg/" + linkTag
                        : "";

                    const match = colDir.match(/^(.+?)\((\d{4})\)\.?\s+(.+)/);

                    const autores = match ? match[1].trim() : "";
                    const ano = match ? match[2] : "";
                    const titulo = match ? match[3].trim() : colDir;

                    inserts.push(new Promise((resInsert) => {

                        db.run(`
                            INSERT INTO publicacoes
                            (ogid, secao, autores, ano, titulo, lingua, link)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `, [
                            ogid,
                            secaoAtual,
                            autores,
                            ano,
                            titulo,
                            "PT",
                            link
                        ], resInsert);

                    }));
                });

                await Promise.all(inserts);

                resolve();
            });

        } catch (err) {
            reject(err);
        }
    });
};
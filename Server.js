const express = require("express");
const cors = require("cors");
const db = require("./db");

// IMPORT DO TEU SCRAPER
const scrape = require("./Extrair");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* =========================================================
   SCRAPE → popula publicacoes
========================================================= */
app.get("/scrape", async (req, res) => {
    try {
        await scrape(db); // vamos adaptar abaixo
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});


/* =========================================================
   PUBLICAÇÕES (INDEX)
========================================================= */
app.get("/publicacoes", (req, res) => {

    db.all(
        "SELECT * FROM publicacoes ORDER BY id DESC",
        [],
        (err, rows) => {
            if (err) return res.json({ ok: false, error: err });

            res.json({ ok: true, publicacoes: rows });
        }
    );
});


/* =========================================================
   PEDIDOS (USER → ADMIN)
========================================================= */

// criar pedido
app.post("/pedidos", (req, res) => {

    const { secao, autores, ano, titulo, lingua, link } = req.body;

    db.run(`
        INSERT INTO pedidos (secao, autores, ano, titulo, lingua, link)
        VALUES (?, ?, ?, ?, ?, ?)
        `, [secao, autores, ano, titulo, lingua, link], function (err) {

        if (err) {
            return res.status(500).json({ ok: false, error: err.message });
        }

    res.json({ ok: true });
});
});


// listar pedidos
app.get("/pedidos", (req, res) => {

    db.all(
        "SELECT * FROM pedidos WHERE estado = 'pendente'",
        [],
        (err, rows) => {
            if (err) return res.json({ ok: false, error: err });

            res.json({ ok: true, pedidos: rows });
        }
    );
});


// aprovar pedido → move para publicacoes
app.put("/pedidos/:id/aprovar", (req, res) => {

    const id = req.params.id;

    db.get("SELECT * FROM pedidos WHERE id = ?", [id], (err, item) => {

        if (!item) return res.json({ ok: false });

        db.run(`
            INSERT INTO publicacoes (secao, autores, ano, titulo, lingua, link)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            item.secao,
            item.autores,
            item.ano,
            item.titulo,
            item.lingua,
            item.link
        ]);

        db.run("DELETE FROM pedidos WHERE id = ?", [id]);

        res.json({ ok: true });
    });
});


// recusar pedido
app.delete("/pedidos/:id", (req, res) => {

    db.run("DELETE FROM pedidos WHERE id = ?", [req.params.id]);

    res.json({ ok: true });
});


/* =========================================================
   START SERVER
========================================================= */
app.listen(PORT, () => {
    console.log(`🚀 Server running: http://localhost:${PORT}`);
});
const express = require("express");
const cors = require("cors");
const db = require("./db");

// Import do Scaper
const scrape = require("./Extrair");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* =========================================================
   SCRAPE
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
   PUBLICAÇÕES
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
   PEDIDOS
========================================================= */

// Regista um novo pedido
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


// Obtém os pedidos pendentes
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


// Aprova um pedido e adiciona-o às publicações
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


// Remove um pedido rejeitado
app.delete("/pedidos/:id", (req, res) => {

    db.run("DELETE FROM pedidos WHERE id = ?", [req.params.id]);

    res.json({ ok: true });
});

/* =========================================================
   REVIEWS (AVALIAÇÕES)
========================================================= */

// Cria ou atualiza uma avaliação
app.post("/reviews", (req, res) => {

    const { publicacao_id, utilizador_id, estrelas } = req.body;

    if (!publicacao_id || !utilizador_id || !estrelas) {
        return res.status(400).json({ ok: false, error: "Dados em falta." });
    }

    if (estrelas < 1 || estrelas > 5) {
        return res.status(400).json({ ok: false, error: "Estrelas inválidas." });
    }

    // Garante apenas uma avaliação por utilizador e publicação
    db.run(`
        INSERT INTO reviews (publicacao_id, utilizador_id, estrelas)
        VALUES (?, ?, ?)
        ON CONFLICT(publicacao_id, utilizador_id)
        DO UPDATE SET estrelas = excluded.estrelas, created_at = datetime('now')
    `, [publicacao_id, utilizador_id, estrelas], function (err) {
        if (err) return res.status(500).json({ ok: false, error: err.message });
        res.json({ ok: true });
    });
});

// Obtém as médias das avaliações e, opcionalmente, a avaliação do utilizador
app.get("/reviews", (req, res) => {

    const utilizador_id = req.query.utilizador_id || null;

    db.all(`
        SELECT
            publicacao_id,
            ROUND(AVG(estrelas), 1)  AS media,
            COUNT(*)                  AS total
        FROM reviews
        GROUP BY publicacao_id
    `, [], (err, medias) => {

        if (err) return res.status(500).json({ ok: false, error: err.message });

        if (!utilizador_id) {
            return res.json({ ok: true, medias, minhas: [] });
        }

        // Obtém a avaliação previamente atribuída pelo utilizador
        db.all(`
            SELECT publicacao_id, estrelas
            FROM reviews
            WHERE utilizador_id = ?
        `, [utilizador_id], (err2, minhas) => {
            if (err2) return res.status(500).json({ ok: false, error: err2.message });
            res.json({ ok: true, medias, minhas });
        });
    });
});

// Remover publicação
app.delete("/publicacoes/:id", (req, res) => {
    db.run("DELETE FROM publicacoes WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ ok: false, error: err.message });
        res.json({ ok: true });
    });
});

/* =========================================================
   Inicialização
========================================================= */
app.listen(PORT, () => {
    console.log(`🚀 Server running: http://localhost:${PORT}`);
});
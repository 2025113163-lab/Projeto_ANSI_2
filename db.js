const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./repositorio.db");

db.serialize(() => {

    // =========================
    // PUBLICAÇÕES (REPOSITÓRIO)
    // =========================
    db.run(`
        CREATE TABLE IF NOT EXISTS publicacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ogid INTEGER,
            secao TEXT,
            autores TEXT,
            ano TEXT,
            titulo TEXT,
            lingua TEXT,
            link TEXT
        )
    `);

    // =========================
    // UTILIZADORES (LOGIN)
    // =========================
    db.run(`
        CREATE TABLE IF NOT EXISTS utilizadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'user',
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // =========================
    // PEDIDOS (SUBMISSÕES)
    // =========================
    db.run(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            secao TEXT,
            autores TEXT,
            ano TEXT,
            titulo TEXT,
            lingua TEXT,
            link TEXT,
            estado TEXT DEFAULT 'pendente'
        )
    `);

    // =========================
    // REVIEWS (AVALIAÇÕES)
    // =========================
    db.run(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            publicacao_id INTEGER NOT NULL,
            utilizador_id TEXT NOT NULL,
            estrelas INTEGER NOT NULL CHECK(estrelas BETWEEN 1 AND 5),
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE,
            UNIQUE (publicacao_id, utilizador_id)
        )
    `);

});

module.exports = db;
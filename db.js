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

});

module.exports = db;
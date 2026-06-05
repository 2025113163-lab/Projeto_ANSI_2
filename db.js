// Importa a biblioteca SQLite3 em modo verbose.
const sqlite3 = require('sqlite3').verbose();

// Cria ligação à base de dados SQLite.
// Caso o ficheiro "publicacoes.db" não exista, será criado automaticamente.
const db = new sqlite3.Database('./publicacoes.db');

// Executa operações de base de dados em sequência, desta forma os comandos SQL são executados pela ordem definida.
db.serialize(() => {

    /**
     * Cria a tabela "publicacoes" caso ainda não exista.
     * 
     * Estrutura da tabela:
     * - id       : Identificador interno automático
     * - ogid     : ID original da publicação
     * - secao    : Categoria/Secção da publicação
     * - autores  : Nome(s) dos autores
     * - ano      : Ano da publicação
     * - titulo   : Título da publicação
     * - lingua   : Língua da publicação
     * - link     : URL da publicação
     */
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
});

// Exporta a ligação à base de dados, permitindo a reutilização em outros ficheiros do projeto.
module.exports = db;
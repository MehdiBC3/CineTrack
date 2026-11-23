const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool(config.db);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS watchlist (
  id           SERIAL PRIMARY KEY,
  tmdb_id      INTEGER      NOT NULL,
  media_type   VARCHAR(10)  NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title        VARCHAR(255) NOT NULL,
  poster_path  VARCHAR(255),
  release_year SMALLINT,
  overview     TEXT,
  status       VARCHAR(10)  NOT NULL DEFAULT 'to_watch'
               CHECK (status IN ('to_watch', 'watching', 'watched')),
  rating       SMALLINT CHECK (rating BETWEEN 1 AND 10),
  added_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (tmdb_id, media_type)
);
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// La base peut démarrer après l'API (docker-compose, Kubernetes) :
// on réessaie la connexion plusieurs fois avant d'abandonner.
async function migrate({ retries = 15, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query(SCHEMA);
      console.log('[db] schéma prêt');
      return;
    } catch (err) {
      console.warn(`[db] tentative ${attempt}/${retries} échouée : ${err.message}`);
      if (attempt === retries) throw err;
      await sleep(delayMs);
    }
  }
}

module.exports = { pool, migrate };

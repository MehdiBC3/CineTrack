const express = require('express');
const cors = require('cors');
const { pool } = require('./db');
const tmdb = require('./tmdb');

const STATUSES = ['to_watch', 'watching', 'watched'];

// Petite aide pour que les erreurs async arrivent au gestionnaire d'erreurs.
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // --- Santé (utilisé par les healthchecks Docker et les probes Kubernetes) ---
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/api/ready', wrap(async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ready' });
  }));

  // --- Catalogue (proxy vers TMDB, la clé ne quitte jamais le back) ---
  app.get('/api/search', wrap(async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Paramètre q obligatoire' });
    res.json(await tmdb.search(q));
  }));

  app.get('/api/trending', wrap(async (req, res) => {
    res.json(await tmdb.trending());
  }));

  // --- Watchlist ---
  app.get('/api/watchlist', wrap(async (req, res) => {
    const { status } = req.query;
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }
    const { rows } = status
      ? await pool.query('SELECT * FROM watchlist WHERE status = $1 ORDER BY updated_at DESC', [status])
      : await pool.query('SELECT * FROM watchlist ORDER BY updated_at DESC');
    res.json(rows);
  }));

  app.post('/api/watchlist', wrap(async (req, res) => {
    const { tmdb_id, media_type, title, poster_path, release_year, overview } = req.body || {};
    const status = req.body?.status || 'to_watch';
    if (!Number.isInteger(tmdb_id) || !['movie', 'tv'].includes(media_type) || !title) {
      return res.status(400).json({ error: 'tmdb_id, media_type (movie|tv) et title sont obligatoires' });
    }
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Statut invalide' });

    const { rows } = await pool.query(
      `INSERT INTO watchlist (tmdb_id, media_type, title, poster_path, release_year, overview, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tmdb_id, media_type) DO NOTHING
       RETURNING *`,
      [tmdb_id, media_type, title, poster_path || null, release_year || null, overview || null, status]
    );
    if (rows.length === 0) return res.status(409).json({ error: 'Déjà dans ta liste' });
    res.status(201).json(rows[0]);
  }));

  // Refuse les identifiants non numériques (/api/watchlist/abc) avec une 400.
  app.param('id', (req, res, next, value) => {
    if (!/^\d+$/.test(value)) return res.status(400).json({ error: 'Identifiant invalide' });
    req.id = parseInt(value, 10);
    next();
  });

  app.patch('/api/watchlist/:id', wrap(async (req, res) => {
    const { id } = req;
    const { status, rating } = req.body || {};
    if (status !== undefined && !STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }
    if (rating !== undefined && rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 10)) {
      return res.status(400).json({ error: 'La note doit être un entier entre 1 et 10' });
    }
    const { rows } = await pool.query(
      `UPDATE watchlist
          SET status = COALESCE($2, status),
              rating = CASE WHEN $3::boolean THEN $4::smallint ELSE rating END,
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [id, status ?? null, rating !== undefined, rating ?? null]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Introuvable' });
    res.json(rows[0]);
  }));

  app.delete('/api/watchlist/:id', wrap(async (req, res) => {
    const { rowCount } = await pool.query('DELETE FROM watchlist WHERE id = $1', [req.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Introuvable' });
    res.status(204).end();
  }));

  // --- Statistiques ---
  app.get('/api/stats', wrap(async (req, res) => {
    const { rows: byStatus } = await pool.query(
      'SELECT status, COUNT(*)::int AS count FROM watchlist GROUP BY status'
    );
    const { rows: byType } = await pool.query(
      'SELECT media_type, COUNT(*)::int AS count FROM watchlist GROUP BY media_type'
    );
    const { rows: [avg] } = await pool.query(
      'SELECT ROUND(AVG(rating)::numeric, 1)::float AS average_rating, COUNT(rating)::int AS rated FROM watchlist'
    );
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    byStatus.forEach((r) => { counts[r.status] = r.count; });
    const types = { movie: 0, tv: 0 };
    byType.forEach((r) => { types[r.media_type] = r.count; });
    res.json({
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      by_status: counts,
      by_type: types,
      average_rating: avg.average_rating,
      rated: avg.rated,
    });
  }));

  // --- Erreurs ---
  app.use('/api', (req, res) => res.status(404).json({ error: 'Route inconnue' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[api]', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Erreur interne' });
  });

  return app;
}

module.exports = { createApp };

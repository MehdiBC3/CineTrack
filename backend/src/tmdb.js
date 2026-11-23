const config = require('./config');

// Ne garde que les champs utiles au front, pour les films comme pour les séries.
function simplify(item, fallbackType) {
  const mediaType = item.media_type || fallbackType;
  const date = item.release_date || item.first_air_date || '';
  return {
    tmdb_id: item.id,
    media_type: mediaType,
    title: item.title || item.name,
    poster_path: item.poster_path || null,
    release_year: date ? parseInt(date.slice(0, 4), 10) : null,
    overview: item.overview || '',
    vote_average: item.vote_average ?? null,
  };
}

async function call(path, params = {}) {
  if (!config.tmdb.apiKey) {
    const err = new Error('TMDB_API_KEY manquante : ajoute-la dans le .env ou le Secret Kubernetes');
    err.status = 503;
    throw err;
  }
  const url = new URL(config.tmdb.baseUrl + path);
  url.search = new URLSearchParams({
    api_key: config.tmdb.apiKey,
    language: config.tmdb.language,
    ...params,
  }).toString();

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    const err = new Error(`TMDB a répondu ${res.status}`);
    err.status = 502;
    throw err;
  }
  return res.json();
}

async function search(query) {
  const data = await call('/search/multi', { query, include_adult: 'false' });
  return data.results
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r) => simplify(r));
}

async function trending() {
  const data = await call('/trending/all/week');
  return data.results
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r) => simplify(r));
}

module.exports = { search, trending, simplify };

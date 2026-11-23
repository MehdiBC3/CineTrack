const { test } = require('node:test');
const assert = require('node:assert');
const { simplify } = require('../src/tmdb');

test('simplify transforme un film TMDB', () => {
  const out = simplify({
    id: 27205, media_type: 'movie', title: 'Inception',
    release_date: '2010-07-15', poster_path: '/p.jpg', overview: 'Rêves', vote_average: 8.4,
  });
  assert.deepStrictEqual(out, {
    tmdb_id: 27205, media_type: 'movie', title: 'Inception', poster_path: '/p.jpg',
    release_year: 2010, overview: 'Rêves', vote_average: 8.4,
  });
});

test('simplify transforme une série TMDB (name / first_air_date)', () => {
  const out = simplify({ id: 1396, name: 'Breaking Bad', first_air_date: '2008-01-20' }, 'tv');
  assert.strictEqual(out.title, 'Breaking Bad');
  assert.strictEqual(out.media_type, 'tv');
  assert.strictEqual(out.release_year, 2008);
  assert.strictEqual(out.poster_path, null);
});

// Toute la configuration vient des variables d'environnement :
// - valeurs non sensibles : docker-compose `environment` / ConfigMap Kubernetes
// - valeurs sensibles (mots de passe, clé TMDB) : fichier .env / Secret Kubernetes
module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'cinetrack',
    user: process.env.DB_USER || 'cinetrack',
    password: process.env.DB_PASSWORD || '',
  },
  tmdb: {
    apiKey: process.env.TMDB_API_KEY || '',
    baseUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
    language: process.env.TMDB_LANGUAGE || 'fr-FR',
  },
};

const config = require('./config');
const { pool, migrate } = require('./db');
const { createApp } = require('./app');

async function main() {
  await migrate();
  const server = createApp().listen(config.port, () => {
    console.log(`[api] CinéTrack API sur le port ${config.port}`);
  });

  // Arrêt propre : Kubernetes envoie SIGTERM avant de supprimer un pod
  // (mise à jour progressive), on termine les requêtes en cours.
  const shutdown = (signal) => {
    console.log(`[api] ${signal} reçu, arrêt...`);
    server.close(() => pool.end().then(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('[api] démarrage impossible :', err.message);
  process.exit(1);
});

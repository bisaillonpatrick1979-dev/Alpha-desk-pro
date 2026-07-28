import express from 'express';
import path from 'path';
import { router, hasGeminiKey, geminiModel } from './server/api';

/**
 * Serveur local : sert l'API *et* l'application web.
 *
 * En production Vercel ce fichier n'est pas utilisé — c'est `api/index.ts` qui
 * expose les mêmes routes sous forme de fonction serverless, et Vercel sert le
 * dossier `dist` en statique.
 */
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '256kb' }));
app.use(router);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Import dynamique : en production le bundle CJS ne doit pas charger Vite.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // `import.meta.url` est vidé par esbuild dans un bundle CJS, ce qui faisait
    // planter le serveur au démarrage. `process.cwd()` est stable dans les deux
    // formats de sortie.
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ALPHA-DESK PRO — serveur actif sur http://localhost:${PORT}`);
    console.log(
      `Moteur de délibération : ${
        hasGeminiKey() ? `Gemini (${geminiModel()})` : 'moteur de règles (GEMINI_API_KEY absente)'
      }`
    );
  });
}

startServer().catch((err) => {
  console.error('Échec du démarrage du serveur :', err);
  process.exit(1);
});

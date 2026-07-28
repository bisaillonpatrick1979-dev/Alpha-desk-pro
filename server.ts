import express from 'express';
import path from 'path';
import { dispatch, hasGeminiKey, geminiModel } from './server/handlers';

/**
 * Serveur local : sert l'API *et* l'application web.
 *
 * Sur Vercel ce fichier n'est pas exécuté — c'est `api/[[...path]].ts` qui
 * expose les mêmes gestionnaires, et la plateforme sert `dist` en statique.
 * Les deux hôtes partagent `server/handlers.ts`, ce qui garantit un
 * comportement identique en local et en production.
 */
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '256kb' }));

app.all('/api/*', async (req, res) => {
  try {
    const result = await dispatch(req.method, req.path, req.body);
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[api] erreur non rattrapée :', err);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

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

import type { IncomingMessage, ServerResponse } from 'http';
import { dispatch } from '../server/handlers';

/**
 * Fonction serverless Vercel couvrant toutes les routes `/api/*`.
 *
 * Le nom de fichier catch-all `[[...path]]` fait parvenir l'URL d'origine à la
 * fonction : `/api/agents/analyze` arrive tel quel. Une simple règle de
 * réécriture vers `/api/index` aurait au contraire remplacé le chemin, et
 * aucune route n'aurait plus correspondu.
 *
 * Aucun framework n'est monté ici : sur une plateforme serverless, une
 * exception au chargement du module fait échouer l'invocation entière avant
 * d'atteindre le moindre gestionnaire.
 */

async function readJsonBody(req: IncomingMessage): Promise<any> {
  // Vercel peut avoir déjà analysé le corps ; sinon on le lit du flux.
  const parsed = (req as any).body;
  if (parsed !== undefined && parsed !== null) {
    if (typeof parsed === 'string') {
      try {
        return JSON.parse(parsed);
      } catch {
        return {};
      }
    }
    return parsed;
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 256 * 1024) throw new Error('Corps de requête trop volumineux');
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const body = req.method === 'GET' || req.method === 'HEAD' ? {} : await readJsonBody(req);
    const result = await dispatch(req.method || 'GET', url.pathname, body);

    res.statusCode = result.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(result.body));
  } catch (err: any) {
    console.error('[api] erreur non rattrapée :', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Erreur interne du serveur.' }));
  }
}

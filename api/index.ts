import { createApiApp } from '../server/api';

/**
 * Point d'entrée serverless Vercel.
 *
 * Vercel ne démarre pas `server.ts` : il construit le SPA et le sert en
 * statique. Sans cette fonction, tous les appels `/api/*` répondaient 404 en
 * production, et l'analyse des agents ne pouvait pas aboutir.
 *
 * Le runtime Node de Vercel accepte une application Express exportée par
 * défaut : elle reçoit directement (req, res).
 */
export default createApiApp();

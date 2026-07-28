# ALPHA-DESK PRO

Simulateur de trading multi-agents en dollars canadiens. L'application fait délibérer cinq
« moteurs » (quantitatif, sentiment, risque, investissement, exécution) sur un actif, propose un
ordre dimensionné selon des règles de gestion du risque, et suit un portefeuille de cinq positions
simultanées.

> **Il s'agit d'une simulation.** Aucun ordre n'est transmis à un courtier, aucun capital réel n'est
> engagé, et les séries de prix sont générées localement — ce ne sont pas des cotations de marché.

## Démarrage

```bash
npm install
npm run dev          # serveur de développement sur http://localhost:3000
```

Pour un déploiement :

```bash
npm run build        # bundle client (dist/assets) + serveur (dist/server.cjs)
NODE_ENV=production npm start
```

Autres scripts :

| Script         | Rôle                                                        |
| -------------- | ----------------------------------------------------------- |
| `npm run lint` | Vérification TypeScript (`tsc --noEmit`)                     |
| `npm test`     | Tests de non-régression sur la logique métier                |
| `npm run clean`| Suppression des artefacts de build                           |

## Configuration

Copiez `.env.example` vers `.env`. La seule variable réellement utile est `GEMINI_API_KEY`.

**Sans clé, l'application reste entièrement fonctionnelle** : un moteur de règles déterministe
produit les délibérations à partir des indicateurs techniques, et l'interface affiche clairement que
l'analyse ne provient pas d'un modèle de langage. Le même repli s'applique si un appel Gemini échoue
(quota, modèle inconnu, réseau).

## Architecture

```
server.ts              Express + Vite en middleware ; endpoints /api/*
src/lib/
  portfolio.ts         Comptabilité du capital, P&L directionnel, sorties stop/cible
  indicators.ts        RSI (Wilder), MACD, SMA, EMA — calculés sur les bougies
  marketData.ts        Génération déterministe des séries, mise à jour au tick
  backtest.ts          Rejeu d'une stratégie bougie par bougie
  time.ts              Lecture du temps ancrée sur America/Edmonton
  storage.ts           localStorage tolérant aux données corrompues
src/components/        Panneaux du tableau de bord, chacun sous ErrorBoundary
scripts/selftest.ts    Suite de tests exécutée par `npm test`
```

### Invariant comptable

Le module `src/lib/portfolio.ts` est la source unique de vérité :

```
totalCapitalCAD = bankReserveCAD + activeBudgetCAD + capital engagé dans les positions
```

Ouvrir une position débite `amountCAD` du budget actif ; la clôturer recrédite `amountCAD + pnlCAD`.
Le capital total ne varie donc que du P&L réalisé. Toute clôture — manuelle, stop, cible ou robot —
passe par le même chemin de règlement dans `App.tsx`, ce qui évite les doubles comptages.

### Positions LONG et SHORT

Le P&L et les seuils de sortie tiennent compte du sens : pour un SHORT, le stop est au-dessus du prix
d'entrée et la cible en dessous, et le gain se matérialise quand le prix baisse.

### Robot d'exécution

L'auto-pilote **ouvre** des positions en posant leurs niveaux de stop et de cible ; c'est le moteur de
règlement de l'application qui les **ferme**. Ses statistiques sont dérivées des transactions
réellement clôturées (`source === 'AUTOPILOT'`), et un coupe-circuit le désactive lorsque les pertes
réalisées sur 24 h dépassent la limite configurée.

## Limites connues

- Les prix, l'historique de bougies et les données du backtest sont **générés**, pas récupérés auprès
  d'un fournisseur de marché. Les clés API saisies dans l'interface sont stockées en clair dans le
  navigateur et ne servent à aucun appel réel.
- Le score de sentiment provient soit de Gemini lorsqu'une clé est configurée, soit d'un calcul
  technique local (RSI et momentum) ; l'interface indique laquelle des deux sources est active.
- Les résultats de backtest ne sont pas transférables au portefeuille : ils servent à comparer des
  jeux de paramètres, pas à créditer un gain.

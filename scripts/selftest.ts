/**
 * Tests de non-régression sur la logique métier — `npm test`.
 *
 * Ils couvrent les défauts qui rendaient l'application incorrecte : le P&L
 * ignorant le sens de la position, les sorties de stop/cible inversées pour les
 * SHORT, la comptabilité du capital, les indicateurs techniques et la lecture du
 * temps en heure d'Alberta. Aucune dépendance externe : `npx tsx scripts/selftest.ts`.
 */
import { mtDateISO, mtDayOfWeek, mtMinutesOfDay } from '../src/lib/time';
import { positionPnL, exitReason, stopAndTargetFor, applyOpen, applyClose } from '../src/lib/portfolio';
import { rsi, macd, sma } from '../src/lib/indicators';
import { calculateLiveMarketStatus, WORLD_MARKETS_SCHEDULE } from '../src/data/marketSchedule';

let pass = 0, fail = 0;
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

console.log('\n== Fuseau horaire (America/Edmonton) ==');
// 1er janvier 2026 à 03:00 UTC = 31 décembre 2025 à 20:00 MT.
const evening = new Date('2026-01-01T03:00:00Z');
check('date MT = veille en soirée (UTC dit déjà 2026-01-01)',
  mtDateISO(evening) === '2025-12-31', `-> ${mtDateISO(evening)}`);
check('minutes MT = 20:00 -> 1200', mtMinutesOfDay(evening) === 1200, `-> ${mtMinutesOfDay(evening)}`);
check('jour de semaine MT = mercredi (3)', mtDayOfWeek(evening) === 3, `-> ${mtDayOfWeek(evening)}`);

const us = WORLD_MARKETS_SCHEDULE.find(m => m.code === 'US')!;
// Le 1er janvier 2026 est férié aux USA. À 15:00 UTC on est le 1er janvier à 08:00 MT.
check('jour férié détecté le 1er janvier',
  calculateLiveMarketStatus(us, new Date('2026-01-01T15:00:00Z')) === 'JOUR_FÉRIÉ');
// Samedi 3 janvier 2026, 19:00 UTC = samedi 12:00 MT.
check('samedi -> marché fermé',
  calculateLiveMarketStatus(us, new Date('2026-01-03T19:00:00Z')) === 'FERMÉ',
  `-> ${calculateLiveMarketStatus(us, new Date('2026-01-03T19:00:00Z'))}`);
// Lundi 5 janvier 2026, 17:00 UTC = lundi 10:00 MT (séance régulière).
check('lundi 10:00 MT -> ouvert',
  calculateLiveMarketStatus(us, new Date('2026-01-05T17:00:00Z')) === 'OUVERT',
  `-> ${calculateLiveMarketStatus(us, new Date('2026-01-05T17:00:00Z'))}`);

console.log('\n== P&L directionnel ==');
const long = { type: 'LONG' as const, entryPriceCAD: 100, units: 10 };
const short = { type: 'SHORT' as const, entryPriceCAD: 100, units: 10 };
check('LONG gagne quand le prix monte', positionPnL(long, 110).pnlCAD === 100);
check('LONG perd quand le prix baisse', positionPnL(long, 90).pnlCAD === -100);
check('SHORT gagne quand le prix baisse', positionPnL(short, 90).pnlCAD === 100, JSON.stringify(positionPnL(short, 90)));
check('SHORT perd quand le prix monte', positionPnL(short, 110).pnlCAD === -100);

console.log('\n== Sorties stop / cible ==');
const l = stopAndTargetFor('LONG', 100, 3, 8);
const s = stopAndTargetFor('SHORT', 100, 3, 8);
check('LONG : stop 97 sous / cible 108 dessus', l.stopLossCAD === 97 && l.takeProfitCAD === 108, JSON.stringify(l));
check('SHORT : stop 103 dessus / cible 92 dessous', s.stopLossCAD === 103 && s.takeProfitCAD === 92, JSON.stringify(s));
const shortPos = { type: 'SHORT' as const, stopLossCAD: 103, takeProfitCAD: 92 };
check('SHORT ne se ferme PAS au prix d\'entrée', exitReason(shortPos, 100) === null, `-> ${exitReason(shortPos, 100)}`);
check('SHORT touche la cible en baisse', exitReason(shortPos, 91) === 'TAKE_PROFIT');
check('SHORT touche le stop en hausse', exitReason(shortPos, 104) === 'STOP_LOSS');

console.log('\n== Invariant comptable ==');
const base = { totalCapitalCAD: 10000, activeBudgetCAD: 1000, bankReserveCAD: 9000, targetGoalCAD: 20000, maxRiskPercentPerTrade: 2, scalingProfitThresholdPercent: 15, scalingTrancheAmountCAD: 1000 };
const opened = applyOpen(base, 250);
check('ouverture débite le budget actif', opened.activeBudgetCAD === 750);
check('ouverture ne touche pas au capital total', opened.totalCapitalCAD === 10000);
const closedWin = applyClose(opened, 250, 40);
check('clôture rend principal + gain', closedWin.activeBudgetCAD === 1040, `-> ${closedWin.activeBudgetCAD}`);
check('capital total ne bouge que du P&L', closedWin.totalCapitalCAD === 10040);
const roundTrip = applyClose(applyOpen(base, 250), 250, 0);
check('aller-retour à P&L nul est neutre',
  roundTrip.activeBudgetCAD === 1000 && roundTrip.totalCapitalCAD === 10000);

console.log('\n== Indicateurs ==');
const up = Array.from({ length: 60 }, (_, i) => 100 + i);
const down = Array.from({ length: 60 }, (_, i) => 100 - i);
const rUp = rsi(up)[59]!, rDown = rsi(down)[59]!;
check('RSI = 100 sur une hausse continue', Math.round(rUp) === 100, `-> ${rUp}`);
check('RSI = 0 sur une baisse continue', Math.round(rDown) === 0, `-> ${rDown}`);
check('RSI non défini avant 14 périodes', rsi(up)[10] === null);
check('SMA(5) exacte', sma([1,2,3,4,5], 5)[4] === 3);
const m = macd(up);
check('MACD > 0 en tendance haussière', (m.macdLine[59] ?? 0) > 0);
check('MACD ligne de signal définie', m.signalLine[59] !== null);
check('histogramme = macd - signal',
  Math.abs((m.histogram[59]! ) - (m.macdLine[59]! - m.signalLine[59]!)) < 1e-9);

console.log(`\n===> ${pass} réussis, ${fail} échoués`);
process.exit(fail === 0 ? 0 : 1);

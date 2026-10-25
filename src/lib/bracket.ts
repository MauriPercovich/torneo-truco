import type { Playoffs, PoResult, Row, Tables } from './tournament';
import { compareRows } from './tournament';

/** Un clasificado al playoff. */
export type Seed = {
  row: Row;
  /** Etiqueta corta: "1°" en todos contra todos, "A1" en grupos. */
  tag: string;
  group: string | null;
  /** Posición en el ranking general de clasificados (1 = mejor). */
  rank: number;
};

export type BracketMatch = {
  id: string;
  round: number;
  index: number;
  a: Seed | null;
  b: Seed | null;
  /** Etiquetas del partido que alimenta cada lado (para "Ganador Semi 1"). */
  feedA: string | null;
  feedB: string | null;
  result: PoResult | null;
  /** Primera ronda con un solo equipo: pasa directo. */
  bye: boolean;
  winner: Seed | null;
  label: string;
  short: string;
};

export type Bracket = {
  size: number;
  qualified: number;
  rounds: BracketMatch[][];
  roundNames: string[];
  champion: Seed | null;
  regDone: boolean;
  played: number;
  total: number;
};

const ROUND_NAMES = ['Final', 'Semifinales', 'Cuartos de final', 'Octavos de final', '16avos de final', '32avos de final'];
const ROUND_SHORT = ['Final', 'Semi', 'Cuartos', 'Octavos', '16avos', '32avos'];
/** Nombre corto de cada ronda para encabezados de columna. */
export const ROUND_COL = ['Final', 'Semis', 'Cuartos', 'Octavos', '16avos', '32avos'];

export const matchId = (round: number, index: number) => `r${round}m${index}`;

/** Orden estándar de cabezas de serie: 1v8, 4v5, 2v7, 3v6… */
function seedOrder(n: number): number[] {
  let order = [1, 2];
  while (order.length < n) {
    const len = order.length * 2;
    order = order.flatMap((s) => [s, len + 1 - s]);
  }
  return order;
}

/** Ordena a los clasificados: primero todos los 1° de grupo, luego los 2°, etc., y al final
 *  los "mejores" de la posición siguiente. Dentro de cada escalón, por PG · Dif · PF. */
export function rankQualified({ tables, best }: Tables): Seed[] {
  if (tables.length === 1 && tables[0].id === null) {
    const t = tables[0];
    return t.rows.slice(0, t.qual).map((row, i) => ({ row, tag: `${i + 1}°`, group: null, rank: i + 1 }));
  }
  const out: Seed[] = [];
  const maxQual = Math.max(0, ...tables.map((t) => t.qual));
  for (let p = 0; p < maxQual; p++) {
    const tier = tables
      .filter((t) => p < t.qual && t.rows[p])
      .map((t) => ({ row: t.rows[p], tag: `${t.letter}${p + 1}`, group: t.id }))
      .sort((x, y) => compareRows(x.row, y.row));
    tier.forEach((s) => out.push({ ...s, rank: out.length + 1 }));
  }
  best
    .filter((b) => b.qualified)
    .forEach((b) => {
      const pos = tables.find((t) => t.id === b.group)!.rows.indexOf(b.row) + 1;
      out.push({ row: b.row, tag: `${b.letter}${pos}`, group: b.group, rank: out.length + 1 });
    });
  return out;
}

export function buildBracket(
  tables: Tables,
  playoffs: Playoffs,
  progress: { played: number; total: number },
): Bracket {
  const seeds = rankQualified(tables);
  const q = seeds.length;
  const regDone = progress.total > 0 && progress.played === progress.total;
  if (q < 2) {
    return { size: 0, qualified: q, rounds: [], roundNames: [], champion: null, regDone, ...progress };
  }
  let size = 2;
  while (size < q) size *= 2;
  const nRounds = Math.log2(size);
  const order = seedOrder(size);

  // Primera ronda: cruces por cabeza de serie (los mejores quedan libres si sobran lugares).
  const pairs: [Seed | null, Seed | null][] = [];
  for (let m = 0; m < size / 2; m++) {
    pairs.push([seeds[order[2 * m] - 1] ?? null, seeds[order[2 * m + 1] - 1] ?? null]);
  }
  // En grupos, evitar que dos del mismo grupo se crucen en la primera ronda
  // (se intercambian rivales, primero con cruces cercanos para no desarmar la llave).
  const clash = (x: Seed | null, y: Seed | null) => !!x && !!y && x.group !== null && x.group === y.group;
  for (let m = 0; m < pairs.length; m++) {
    if (!clash(pairs[m][0], pairs[m][1])) continue;
    const others = pairs.map((_, k) => k).filter((k) => k !== m).sort((x, y) => Math.abs(x - m) - Math.abs(y - m));
    for (const k of others) {
      if (!pairs[k][1] || !pairs[m][1]) continue;
      if (!clash(pairs[m][0], pairs[k][1]) && !clash(pairs[k][0], pairs[m][1])) {
        [pairs[m][1], pairs[k][1]] = [pairs[k][1], pairs[m][1]];
        break;
      }
    }
  }

  const roundNames = Array.from({ length: nRounds }, (_, r) => ROUND_NAMES[nRounds - 1 - r] ?? `Ronda ${r + 1}`);
  const rounds: BracketMatch[][] = [];
  for (let r = 0; r < nRounds; r++) {
    const count = size / 2 ** (r + 1);
    const short = ROUND_SHORT[nRounds - 1 - r] ?? `Ronda ${r + 1}`;
    const isFinal = r === nRounds - 1;
    const list: BracketMatch[] = [];
    for (let i = 0; i < count; i++) {
      let a: Seed | null;
      let b: Seed | null;
      let feedA: string | null = null;
      let feedB: string | null = null;
      if (r === 0) {
        [a, b] = pairs[i];
      } else {
        const pa = rounds[r - 1][2 * i];
        const pb = rounds[r - 1][2 * i + 1];
        a = pa.winner;
        b = pb.winner;
        feedA = pa.short;
        feedB = pb.short;
      }
      const id = matchId(r, i);
      const bye = r === 0 && (!a || !b);
      const raw = playoffs[id];
      const result = !bye && a && b && raw ? raw : null;
      const winner = bye ? (a ?? b) : result ? (result.sa > result.sb ? a : b) : null;
      const shortLabel = count > 1 ? `${short} ${i + 1}` : short;
      const longName = short === 'Semi' ? 'Semifinal' : short;
      const base = count > 1 ? `${longName} ${i + 1}` : longName;
      let label = base;
      if (isFinal) label = 'Gran final';
      else if (bye) label = `${base} · pasa directo`;
      else if (r === 0 && a && b) label = `${base} · ${a.tag} vs ${b.tag}`;
      list.push({ id, round: r, index: i, a, b, feedA, feedB, result, bye, winner, label, short: shortLabel });
    }
    rounds.push(list);
  }
  const final = rounds[nRounds - 1][0];
  return {
    size,
    qualified: q,
    rounds,
    roundNames,
    champion: final.winner && final.result ? final.winner : null,
    regDone,
    ...progress,
  };
}

/** Borra los resultados de los partidos que dependen de `id` (hacia la final). */
export function dropDownstream(playoffs: Playoffs, id: string, nRounds: number): Playoffs {
  const next = { ...playoffs };
  let [r, i] = id.slice(1).split('m').map(Number);
  while (r + 1 < nRounds) {
    r += 1;
    i = Math.floor(i / 2);
    delete next[matchId(r, i)];
  }
  return next;
}

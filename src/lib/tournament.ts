export type Team = { id: string; name: string };
export type Match = {
  id: string;
  round: number;
  a: string;
  b: string;
  sa: number | null;
  sb: number | null;
};
export type PoKey = 's1' | 's2' | 'f';
export type PoResult = { sa: number; sb: number };
export type Playoffs = Partial<Record<PoKey, PoResult>>;
export type Saved = {
  teams: Team[];
  matches: Match[];
  playoffs: Playoffs;
  targetReg: number;
  targetPo: number;
};

export const STORAGE_KEY = 'truco-torneo-v1';
export const PO_KEYS: PoKey[] = ['s1', 's2', 'f'];
export const DEFAULT_TEAMS = [
  'Los Anchos',
  'Falta Envido',
  'Siete de Oro',
  'Retruco',
  'Las Flores',
  'Vale Cuatro',
];

export const isPoKey = (k: string | null): k is PoKey =>
  k === 's1' || k === 's2' || k === 'f';

export const uid = () => Math.random().toString(36).slice(2, 9);

export const clampScore = (v: unknown) => {
  const n = parseInt(String(v), 10);
  return isNaN(n) ? 0 : Math.max(0, Math.min(99, n));
};

/** Todos contra todos por el método del círculo. Con cantidad impar se agrega un "bye". */
export function roundRobin(ids: string[]): Match[] {
  const list: (string | null)[] = ids.slice();
  if (list.length % 2) list.push(null);
  const n = list.length;
  const out: Match[] = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a && b) {
        out.push({
          id: uid(),
          round: r + 1,
          a: r % 2 ? b : a,
          b: r % 2 ? a : b,
          sa: null,
          sb: null,
        });
      }
    }
    list.splice(1, 0, list.pop()!);
  }
  return out;
}

export function freshTournament(names = DEFAULT_TEAMS): Saved {
  const teams = names.map((name) => ({ id: uid(), name }));
  return {
    teams,
    matches: roundRobin(teams.map((t) => t.id)),
    playoffs: {},
    targetReg: 30,
    targetPo: 40,
  };
}

export function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Saved>) : null;
    if (saved && Array.isArray(saved.teams) && Array.isArray(saved.matches)) {
      return {
        teams: saved.teams,
        matches: saved.matches,
        playoffs: saved.playoffs ?? {},
        targetReg: saved.targetReg ?? 30,
        targetPo: saved.targetPo ?? 40,
      };
    }
  } catch {
    /* localStorage no disponible o JSON roto: arrancamos de cero */
  }
  return freshTournament();
}

export function persistSaved(s: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignorar */
  }
}

export const isPlayed = (m: Match): m is Match & { sa: number; sb: number } =>
  m.sa != null && m.sb != null;

export type Row = {
  id: string;
  name: string;
  pj: number;
  pg: number;
  pp: number;
  pf: number;
  pc: number;
  d: number;
  form: (0 | 1)[];
};

/** Tabla derivada. Orden: PG desc → Dif desc → PF desc → nombre asc. */
export function computeStandings(teams: Team[], matches: Match[]): Row[] {
  const stats: Record<string, Row> = {};
  teams.forEach((t) => {
    stats[t.id] = { id: t.id, name: t.name, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0, d: 0, form: [] };
  });
  matches.filter(isPlayed).forEach((m) => {
    const A = stats[m.a];
    const B = stats[m.b];
    if (!A || !B) return;
    A.pj++;
    B.pj++;
    A.pf += m.sa;
    A.pc += m.sb;
    B.pf += m.sb;
    B.pc += m.sa;
    if (m.sa > m.sb) {
      A.pg++;
      B.pp++;
      A.form.push(1);
      B.form.push(0);
    } else {
      B.pg++;
      A.pp++;
      B.form.push(1);
      A.form.push(0);
    }
  });
  return Object.values(stats)
    .map((s) => ({ ...s, d: s.pf - s.pc }))
    .sort((x, y) => y.pg - x.pg || y.d - x.d || y.pf - x.pf || x.name.localeCompare(y.name));
}

export type Bracket = {
  regDone: boolean;
  played: number;
  total: number;
  sideA: Record<PoKey, Row | null>;
  sideB: Record<PoKey, Row | null>;
  result: (k: PoKey) => PoResult | null;
  champion: Row | null;
};

export function computeBracket(rows: Row[], matches: Match[], playoffs: Playoffs): Bracket {
  const played = matches.filter(isPlayed).length;
  const total = matches.length;
  const regDone = total > 0 && played === total;
  const seeds = rows.slice(0, 4);
  const result = (k: PoKey) => {
    const r = playoffs[k];
    return r && r.sa != null ? r : null;
  };
  const sideA: Record<PoKey, Row | null> = { s1: seeds[0] ?? null, s2: seeds[1] ?? null, f: null };
  const sideB: Record<PoKey, Row | null> = { s1: seeds[3] ?? null, s2: seeds[2] ?? null, f: null };
  const winnerOf = (k: PoKey) => {
    const r = result(k);
    const a = sideA[k];
    const b = sideB[k];
    return r && a && b ? (r.sa > r.sb ? a : b) : null;
  };
  sideA.f = winnerOf('s1');
  sideB.f = winnerOf('s2');
  const champion = winnerOf('f');
  return { regDone, played, total, sideA, sideB, result, champion };
}

export const PO_LABELS: Record<PoKey, string> = {
  s1: 'Semifinal 1 · 1° vs 4°',
  s2: 'Semifinal 2 · 2° vs 3°',
  f: 'Gran final',
};

export type Format = 'liga' | 'grupos';
export type Team = { id: string; name: string };
export type Group = { id: string; teamIds: string[] };
export type Match = {
  id: string;
  round: number;
  a: string;
  b: string;
  sa: number | null;
  sb: number | null;
  /** Solo en formato grupos: id del grupo al que pertenece el partido. */
  group?: string;
};
export type PoResult = { sa: number; sb: number };
/** Resultados de playoff por id de partido (`r{ronda}m{índice}`). */
export type Playoffs = Record<string, PoResult>;
export type Saved = {
  format: Format;
  teams: Team[];
  groups: Group[];
  matches: Match[];
  playoffs: Playoffs;
  targetReg: number;
  targetPo: number;
  /** Clasificados a playoff en todos contra todos (total). */
  qualLiga: number;
  /** Clasificados a playoff por grupo. */
  qualPerGroup: number;
};

export const STORAGE_KEY = 'truco-torneo-v1';
export const MAX_PLAYOFF = 16;
export const DEFAULT_TEAMS = [
  'Los Anchos',
  'Falta Envido',
  'Siete de Oro',
  'Retruco',
  'Las Flores',
  'Vale Cuatro',
];

export const uid = () => Math.random().toString(36).slice(2, 9);
export const groupLetter = (i: number) => String.fromCharCode(65 + i);

export const clampScore = (v: unknown) => {
  const n = parseInt(String(v), 10);
  return isNaN(n) ? 0 : Math.max(0, Math.min(99, n));
};

/** Todos contra todos por el método del círculo. Con cantidad impar se agrega un "bye". */
export function roundRobin(ids: string[], group?: string): Match[] {
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
          ...(group ? { group } : {}),
        });
      }
    }
    list.splice(1, 0, list.pop()!);
  }
  return out;
}

/** Reparte equipos en n grupos de forma pareja (1→A, 2→B, …). */
export function autoGroups(teamIds: string[], n: number): Group[] {
  const groups: Group[] = Array.from({ length: n }, () => ({ id: uid(), teamIds: [] }));
  teamIds.forEach((id, i) => groups[i % n].teamIds.push(id));
  return groups;
}

export function buildMatches(format: Format, teams: Team[], groups: Group[]): Match[] {
  if (format === 'grupos') return groups.flatMap((g) => roundRobin(g.teamIds, g.id));
  return roundRobin(teams.map((t) => t.id));
}

/** Mantiene los grupos coherentes con la lista de equipos: saca los que ya no están,
 *  agrega los nuevos al grupo más chico y descarta grupos vacíos. */
export function reconcileGroups(groups: Group[], teams: Team[]): Group[] {
  const ids = new Set(teams.map((t) => t.id));
  let next = groups.map((g) => ({ ...g, teamIds: g.teamIds.filter((id) => ids.has(id)) }));
  const placed = new Set(next.flatMap((g) => g.teamIds));
  if (next.length === 0) next = autoGroups([], Math.min(2, Math.max(1, Math.floor(teams.length / 2))));
  for (const t of teams) {
    if (placed.has(t.id)) continue;
    const smallest = next.reduce((a, b) => (b.teamIds.length < a.teamIds.length ? b : a));
    smallest.teamIds.push(t.id);
  }
  next = next.filter((g) => g.teamIds.length > 0);
  return next;
}

export function freshTournament(names = DEFAULT_TEAMS): Saved {
  const teams = names.map((name) => ({ id: uid(), name }));
  return {
    format: 'liga',
    teams,
    groups: [],
    matches: roundRobin(teams.map((t) => t.id)),
    playoffs: {},
    targetReg: 30,
    targetPo: 40,
    qualLiga: 4,
    qualPerGroup: 2,
  };
}

const LEGACY_PO: Record<string, string> = { s1: 'r0m0', s2: 'r0m1', f: 'r1m0' };

export function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Saved>) : null;
    if (saved && Array.isArray(saved.teams) && Array.isArray(saved.matches)) {
      // Versiones anteriores guardaban los playoffs como s1 / s2 / f.
      const playoffs: Playoffs = {};
      for (const [k, v] of Object.entries(saved.playoffs ?? {})) {
        if (v && v.sa != null && v.sb != null) playoffs[LEGACY_PO[k] ?? k] = v;
      }
      const format: Format = saved.format === 'grupos' ? 'grupos' : 'liga';
      const groups = Array.isArray(saved.groups) ? saved.groups : [];
      return {
        format,
        teams: saved.teams,
        groups: format === 'grupos' ? reconcileGroups(groups, saved.teams) : groups,
        matches: saved.matches,
        playoffs,
        targetReg: saved.targetReg ?? 30,
        targetPo: saved.targetPo ?? 40,
        qualLiga: saved.qualLiga ?? 4,
        qualPerGroup: saved.qualPerGroup ?? 2,
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
    .sort(compareRows);
}

export const compareRows = (x: Row, y: Row) =>
  y.pg - x.pg || y.d - x.d || y.pf - x.pf || x.name.localeCompare(y.name);

export type Table = {
  /** id del grupo (null en todos contra todos). */
  id: string | null;
  label: string | null;
  letter: string;
  rows: Row[];
  /** Cuántos de esta tabla clasifican. */
  qual: number;
};

export function computeTables(s: Saved): Table[] {
  if (s.format === 'grupos') {
    return s.groups.map((g, i) => {
      const inGroup = new Set(g.teamIds);
      return {
        id: g.id,
        label: `Grupo ${groupLetter(i)}`,
        letter: groupLetter(i),
        rows: computeStandings(
          s.teams.filter((t) => inGroup.has(t.id)),
          s.matches.filter((m) => m.group === g.id),
        ),
        qual: Math.min(s.qualPerGroup, g.teamIds.length),
      };
    });
  }
  return [
    {
      id: null,
      label: null,
      letter: '',
      rows: computeStandings(s.teams, s.matches),
      qual: Math.min(s.qualLiga, s.teams.length),
    },
  ];
}

/** Total de clasificados a playoff según el formato. */
export function playoffSize(s: Saved): number {
  if (s.format === 'grupos') {
    return s.groups.reduce((n, g) => n + Math.min(s.qualPerGroup, g.teamIds.length), 0);
  }
  return Math.min(s.qualLiga, s.teams.length);
}

/** Nombre corto del formato de playoff según cuántos clasifican. */
export function playoffTitle(s: Saved): string {
  if (s.format === 'grupos') return 'Playoff';
  const q = playoffSize(s);
  if (q === 2) return 'Final';
  if (q === 4) return 'Semis y final';
  return 'Playoff';
}

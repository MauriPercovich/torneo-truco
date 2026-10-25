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
  /** Clasificados a playoff en todos contra todos. */
  qualLiga: number;
  /** Clasificados a playoff en formato grupos (total; se reparte solo). */
  qualTotal: number;
};

export const STORAGE_KEY = 'truco-torneo-v1';
export const MAX_PLAYOFF = 64;

/** Nombres de ejemplo para el torneo de muestra (32 parejas). */
export const SAMPLE_TEAMS = [
  'Los Anchos', 'Falta Envido', 'Siete de Oro', 'Retruco', 'Las Flores', 'Vale Cuatro',
  'Mano Brava', 'Ancho de Espada', 'La Muestra', 'Contraflor', 'Real Envido', 'Quiero Retruco',
  'Los Mazos', 'Cuatro de Copas', 'Siete Bravo', 'Las Pardas', 'Mano a Mano', 'Los Bastos',
  'La Viuda', 'El Pie', 'Truco Seco', 'Los Tanteros', 'Envido Va', 'Flor de Oro',
  'Siete de Espada', 'Ancho Falso', 'Las Copas', 'Los Oros', 'Mazo y Mano', 'La Primera',
  'El Tercero', 'Quiero Vale',
];

export const uid = () => Math.random().toString(36).slice(2, 9);
export const groupLetter = (i: number) =>
  i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26));

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
  const count = Math.max(1, Math.min(n, Math.floor(teamIds.length / 2) || 1));
  const groups: Group[] = Array.from({ length: count }, () => ({ id: uid(), teamIds: [] }));
  teamIds.forEach((id, i) => groups[i % count].teamIds.push(id));
  return groups;
}

/** Cantidad de grupos sugerida para que queden de a 4. */
export const suggestedGroups = (teams: number) => Math.max(1, Math.round(teams / 4));

export function buildMatches(format: Format, teams: Team[], groups: Group[]): Match[] {
  if (format === 'grupos') return groups.flatMap((g) => roundRobin(g.teamIds, g.id));
  return roundRobin(teams.map((t) => t.id));
}

/** Mantiene los grupos coherentes con la lista de equipos: saca los que ya no están,
 *  agrega los nuevos al grupo más chico y descarta grupos vacíos. */
export function reconcileGroups(groups: Group[], teams: Team[]): Group[] {
  const ids = new Set(teams.map((t) => t.id));
  let next = groups.map((g) => ({ ...g, teamIds: g.teamIds.filter((id) => ids.has(id)) }));
  if (next.length === 0) return autoGroups(teams.map((t) => t.id), suggestedGroups(teams.length));
  const placed = new Set(next.flatMap((g) => g.teamIds));
  for (const t of teams) {
    if (placed.has(t.id)) continue;
    const smallest = next.reduce((a, b) => (b.teamIds.length < a.teamIds.length ? b : a));
    smallest.teamIds.push(t.id);
  }
  next = next.filter((g) => g.teamIds.length > 0);
  return next;
}

/** Torneo de muestra: 32 parejas en 8 grupos de 4, clasifican 16. */
export function freshTournament(names = SAMPLE_TEAMS): Saved {
  const teams = names.map((name) => ({ id: uid(), name }));
  const groups = autoGroups(teams.map((t) => t.id), suggestedGroups(teams.length));
  return {
    format: 'grupos',
    teams,
    groups,
    matches: buildMatches('grupos', teams, groups),
    playoffs: {},
    targetReg: 30,
    targetPo: 30,
    qualLiga: 4,
    qualTotal: 16,
  };
}

const LEGACY_PO: Record<string, string> = { s1: 'r0m0', s2: 'r0m1', f: 'r1m0' };

export function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Saved> & { qualPerGroup?: number }) : null;
    if (saved && Array.isArray(saved.teams) && Array.isArray(saved.matches)) {
      // Versiones anteriores guardaban los playoffs como s1 / s2 / f.
      const playoffs: Playoffs = {};
      for (const [k, v] of Object.entries(saved.playoffs ?? {})) {
        if (v && v.sa != null && v.sb != null) playoffs[LEGACY_PO[k] ?? k] = v;
      }
      const format: Format = saved.format === 'grupos' ? 'grupos' : 'liga';
      const groups = Array.isArray(saved.groups) ? saved.groups : [];
      const fixedGroups = format === 'grupos' ? reconcileGroups(groups, saved.teams) : groups;
      // Antes se elegía "clasifican por grupo"; ahora se guarda el total.
      const qualTotal =
        saved.qualTotal ??
        fixedGroups.reduce((n, g) => n + Math.min(saved.qualPerGroup ?? 2, g.teamIds.length), 0);
      return {
        format,
        teams: saved.teams,
        groups: fixedGroups,
        matches: saved.matches,
        playoffs,
        targetReg: saved.targetReg ?? 30,
        targetPo: saved.targetPo ?? 40,
        qualLiga: saved.qualLiga ?? 4,
        qualTotal: qualTotal || 4,
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

/** Cómo se reparten los clasificados en formato grupos. */
export type QualPlan = {
  /** Clasifican directo los `per` primeros de cada grupo. */
  per: number;
  /** Posición (1-based) de la que se toman los "mejores": 3 = mejores terceros. 0 si no hay. */
  extraPos: number;
  /** Cuántos "mejores" de esa posición pasan. */
  extraCount: number;
  /** Total real de clasificados. */
  total: number;
  /** Total pedido (puede no alcanzarse si los grupos son chicos). */
  requested: number;
};

export function qualPlan(groups: Group[], requested: number): QualPlan {
  const teams = groups.reduce((n, g) => n + g.teamIds.length, 0);
  const G = groups.length;
  if (!G) return { per: 0, extraPos: 0, extraCount: 0, total: 0, requested };
  const want = Math.max(2, Math.min(requested, teams, MAX_PLAYOFF));
  const minSize = Math.min(...groups.map((g) => g.teamIds.length));
  const per = Math.min(Math.floor(want / G), minSize);
  const extra = want - per * G;
  // Los que faltan salen de los mejores de la posición siguiente (ej. mejores terceros).
  let extraPos = 0;
  let extraCount = 0;
  if (extra > 0) {
    extraPos = per + 1;
    const candidates = groups.filter((g) => g.teamIds.length >= extraPos).length;
    extraCount = Math.min(extra, candidates);
    if (!extraCount) extraPos = 0;
  }
  return { per, extraPos, extraCount, total: per * G + extraCount, requested };
}

export const ordinal = (n: number) => `${n}°`;
const ORD_WORDS = ['', 'primeros', 'segundos', 'terceros', 'cuartos', 'quintos', 'sextos', 'séptimos', 'octavos'];
export const ordWord = (n: number) => ORD_WORDS[n] ?? `${n}°`;

export function describePlan(p: QualPlan): string {
  if (p.total < 2) return 'Hacen falta al menos 2 clasificados.';
  const parts: string[] = [];
  if (p.per === 1) parts.push('el 1° de cada grupo');
  else if (p.per > 1) parts.push(`los ${p.per} primeros de cada grupo`);
  if (p.extraCount) {
    parts.push(
      p.extraCount === 1 ? `el mejor ${ordinal(p.extraPos)}` : `los ${p.extraCount} mejores ${ordWord(p.extraPos)}`,
    );
  }
  const txt = parts.join(' + ');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export type Table = {
  /** id del grupo (null en todos contra todos). */
  id: string | null;
  label: string | null;
  letter: string;
  rows: Row[];
  /** Cuántos de esta tabla clasifican directo. */
  qual: number;
};

export type Tables = {
  tables: Table[];
  plan: QualPlan | null;
  /** Ranking de la posición `extraPos` entre grupos (los "mejores terceros"). */
  best: { row: Row; letter: string; group: string; qualified: boolean }[];
};

export function computeTables(s: Saved): Tables {
  if (s.format === 'grupos') {
    const plan = qualPlan(s.groups, s.qualTotal);
    const tables = s.groups.map((g, i) => {
      const inGroup = new Set(g.teamIds);
      return {
        id: g.id,
        label: `Grupo ${groupLetter(i)}`,
        letter: groupLetter(i),
        rows: computeStandings(
          s.teams.filter((t) => inGroup.has(t.id)),
          s.matches.filter((m) => m.group === g.id),
        ),
        qual: Math.min(plan.per, g.teamIds.length),
      };
    });
    const best = plan.extraCount
      ? tables
          .filter((t) => t.rows[plan.extraPos - 1])
          .map((t) => ({ row: t.rows[plan.extraPos - 1], letter: t.letter, group: t.id! }))
          .sort((x, y) => compareRows(x.row, y.row))
          .map((b, i) => ({ ...b, qualified: i < plan.extraCount }))
      : [];
    return { tables, plan, best };
  }
  return {
    tables: [
      {
        id: null,
        label: null,
        letter: '',
        rows: computeStandings(s.teams, s.matches),
        qual: Math.min(s.qualLiga, s.teams.length),
      },
    ],
    plan: null,
    best: [],
  };
}

/** Total de clasificados a playoff según el formato. */
export function playoffSize(s: Saved): number {
  if (s.format === 'grupos') return qualPlan(s.groups, s.qualTotal).total;
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

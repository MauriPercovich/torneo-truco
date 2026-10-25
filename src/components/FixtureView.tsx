import { ExternalLink } from 'lucide-react';
import type { Group, Match, Team } from '../lib/tournament';
import { groupLetter, isPlayed } from '../lib/tournament';

type Props = {
  teams: Team[];
  matches: Match[];
  groups: Group[];
  target: number;
  filter: string | null;
  onFilter: (groupId: string | null) => void;
  onPick: (m: Match) => void;
  /** null si ya estamos en la ventana aparte. */
  onPopout: (() => void) | null;
};

/** Fixture completo de la fase de grupos, una tarjeta por grupo. */
export function FixtureView({ teams, matches, groups, target, filter, onFilter, onPick, onPopout }: Props) {
  const name = (id: string) => teams.find((t) => t.id === id)?.name ?? '—';
  const shown = filter ? groups.filter((g) => g.id === filter) : groups;
  const played = matches.filter(isPlayed).length;

  return (
    <main className="fixture-view">
      <div className="fixture-toolbar">
        <div className="filter-chips" role="tablist" aria-label="Filtrar por grupo">
          <button
            type="button"
            className={`fchip${!filter ? ' selected' : ''}`}
            onClick={() => onFilter(null)}
          >
            Todos
          </button>
          {groups.map((g, i) => {
            const gm = matches.filter((m) => m.group === g.id);
            const done = gm.length > 0 && gm.every(isPlayed);
            return (
              <button
                key={g.id}
                type="button"
                className={`fchip${filter === g.id ? ' selected' : ''}${done ? ' done' : ''}`}
                onClick={() => onFilter(g.id)}
                aria-label={`Grupo ${groupLetter(i)}`}
              >
                {groupLetter(i)}
              </button>
            );
          })}
        </div>
        <span className="aside">
          {played} de {matches.length} jugados · a {target} puntos · tocá un partido para cargarlo
        </span>
        {onPopout && (
          <button type="button" className="btn-outline popout" onClick={onPopout}>
            <ExternalLink size={18} strokeWidth={2.75} />
            Abrir en otra ventana
          </button>
        )}
      </div>

      <div className={`fixture-grid${shown.length === 1 ? ' single' : ''}`}>
        {shown.map((g) => {
          const gi = groups.indexOf(g);
          const gm = matches.filter((m) => m.group === g.id);
          const rounds = [...new Set(gm.map((m) => m.round))].sort((a, b) => a - b);
          const done = gm.filter(isPlayed).length;
          return (
            <section key={g.id} className="fx-card">
              <div className="gc-head">
                <span className="group-badge">{groupLetter(gi)}</span>
                <span className="gc-title">Grupo {groupLetter(gi)}</span>
                <span className="gc-meta">{done === gm.length ? 'Completo' : `${done} / ${gm.length}`}</span>
              </div>
              {rounds.map((r) => (
                <div key={r} className="fx-round">
                  <span className="round-group-label">Fecha {r}</span>
                  {gm
                    .filter((m) => m.round === r)
                    .map((m) => {
                      const p = isPlayed(m);
                      const aw = p && m.sa! > m.sb!;
                      const bw = p && m.sb! > m.sa!;
                      const cls = (win: boolean) => (p ? (win ? ' win' : ' lose') : '');
                      return (
                        <button key={m.id} type="button" className="match" onClick={() => onPick(m)}>
                          <span className={`team a${cls(aw)}`}>{name(m.a)}</span>
                          <span className={`score-pill${p ? ' played' : ''}`}>
                            <span className="s">{p ? m.sa : ''}</span>
                            <span className="sep">{p ? '–' : 'vs'}</span>
                            <span className="s">{p ? m.sb : ''}</span>
                          </span>
                          <span className={`team b${cls(bw)}`}>{name(m.b)}</span>
                        </button>
                      );
                    })}
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </main>
  );
}

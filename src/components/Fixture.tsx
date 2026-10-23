import { useEffect, useRef } from 'react';
import type { Group, Match, Team } from '../lib/tournament';
import { groupLetter, isPlayed } from '../lib/tournament';

type Props = {
  teams: Team[];
  matches: Match[];
  groups: Group[] | null;
  target: number;
  onPick: (m: Match) => void;
};

export function Fixture({ teams, matches, groups, target, onPick }: Props) {
  const name = (id: string) => teams.find((t) => t.id === id)?.name ?? '—';
  const roundNums = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const listRef = useRef<HTMLDivElement>(null);

  // Al abrir, el fixture arranca en la primera fecha con partidos pendientes.
  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[data-pending="true"]');
    if (list && current) list.scrollTo({ top: current.offsetTop - list.offsetTop, behavior: 'instant' });
  }, []);

  const renderMatch = (m: Match) => {
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
  };

  return (
    <section className="fixture">
      <div className="section-head">
        <h2>Fixture</h2>
        <span className="aside">A {target} puntos · tocá un partido</span>
      </div>
      <div className="fixture-list" ref={listRef}>
        {matches.length === 0 && (
          <div className="round empty">Todavía no hay partidos: armá los grupos desde Ajustes.</div>
        )}
        {roundNums.map((r) => {
          const ms = matches.filter((m) => m.round === r);
          const done = ms.filter(isPlayed).length;
          return (
            <div key={r} className="round" data-pending={done < ms.length}>
              <div className="round-head">
                <span className="kicker">Fecha {r}</span>
                <span className="round-status">
                  {done === ms.length ? 'Completa' : `${done} / ${ms.length}`}
                </span>
              </div>
              {groups
                ? groups.map((g, gi) => {
                    const gm = ms.filter((m) => m.group === g.id);
                    if (gm.length === 0) return null;
                    return (
                      <div key={g.id} className="round-group">
                        <span className="round-group-label">Grupo {groupLetter(gi)}</span>
                        {gm.map(renderMatch)}
                      </div>
                    );
                  })
                : ms.map(renderMatch)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

import type { Match, Team } from '../lib/tournament';
import { isPlayed } from '../lib/tournament';

type Props = {
  teams: Team[];
  matches: Match[];
  target: number;
  onPick: (m: Match) => void;
};

export function Fixture({ teams, matches, target, onPick }: Props) {
  const name = (id: string) => teams.find((t) => t.id === id)?.name ?? '—';
  const roundNums = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <section className="fixture">
      <div className="section-head">
        <h2>Fixture</h2>
        <span className="aside">A {target} puntos · tocá un partido</span>
      </div>
      <div className="fixture-list">
        {roundNums.map((r) => {
          const ms = matches.filter((m) => m.round === r);
          const done = ms.filter(isPlayed).length;
          return (
            <div key={r} className="round">
              <div className="round-head">
                <span className="kicker">Fecha {r}</span>
                <span className="round-status">
                  {done === ms.length ? 'Completa' : `${done} / ${ms.length}`}
                </span>
              </div>
              {ms.map((m) => {
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
          );
        })}
      </div>
    </section>
  );
}

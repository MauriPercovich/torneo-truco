import { Trophy } from 'lucide-react';
import type { Bracket, BracketMatch, Seed } from '../lib/bracket';

type Props = {
  bracket: Bracket;
  target: number;
  phaseName: string;
  onPick: (m: BracketMatch) => void;
};

export function Playoffs({ bracket, target, phaseName, onPick }: Props) {
  const { regDone, played, total, rounds, roundNames, champion, qualified } = bracket;

  if (rounds.length === 0) {
    return (
      <main className="playoffs">
        <span className="po-locked">
          Hacen falta al menos 2 clasificados para armar el playoff. Ajustalo desde la tuerquita.
        </span>
      </main>
    );
  }

  const card = (m: BracketMatch, isFinal: boolean, compact: boolean) => {
    const ok = regDone && !m.bye && !!m.a && !!m.b;
    const r = m.result;
    const teamRow = (t: Seed | null, score: number | undefined, win: boolean, placeholder: string) => {
      const state = !t ? ' placeholder' : win ? ' win' : r ? ' lose' : '';
      return (
        <div className={`po-team${state}`}>
          <span className="seed">{t ? t.tag : '?'}</span>
          <span className="name">{t ? t.row.name : placeholder}</span>
          <span className="score">{r ? score : ''}</span>
        </div>
      );
    };
    const cls = [
      'po-card',
      isFinal && 'final',
      compact && 'compact',
      m.bye && 'bye',
      !isFinal && ok && !r && 'ring',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <button key={m.id} type="button" className={cls} disabled={!ok} onClick={() => ok && onPick(m)}>
        <span className="kicker">{m.label}</span>
        {m.bye ? (
          <>
            {teamRow(m.a ?? m.b, undefined, true, '—')}
            <div className="po-team placeholder bye-row">
              <span className="name">Pasa directo a la siguiente ronda</span>
            </div>
          </>
        ) : (
          <>
            {teamRow(m.a, r?.sa, !!r && r.sa > r.sb, m.feedA ? `Ganador ${m.feedA}` : '—')}
            {teamRow(m.b, r?.sb, !!r && r.sb > r.sa, m.feedB ? `Ganador ${m.feedB}` : '—')}
          </>
        )}
      </button>
    );
  };

  const last = rounds.length - 1;
  return (
    <main className="playoffs">
      {champion && (
        <div className="champion">
          <Trophy size={32} strokeWidth={2.75} />
          <span className="label">Campeón</span>
          <span className="name">{champion.row.name}</span>
        </div>
      )}
      {!regDone && (
        <span className="po-locked">
          Cruces provisorios — se habilitan al terminar la {phaseName} ({played} de {total} partidos
          jugados).
        </span>
      )}
      <div className={`bracket rounds-${rounds.length}`}>
        {rounds.map((list, ri) => {
          const isFinal = ri === last;
          const compact = list.length >= 4;
          return (
            <div key={ri} className={`po-col${isFinal ? ' final' : ''}`}>
              <div className="section-head">
                <h2>{roundNames[ri]}</h2>
                {ri === 0 && (
                  <span className="aside">
                    {qualified} clasificados · a {target} puntos
                  </span>
                )}
              </div>
              <div className="po-col-cards">{list.map((m) => card(m, isFinal, compact))}</div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

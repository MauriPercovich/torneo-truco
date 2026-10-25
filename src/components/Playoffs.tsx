import { Trophy } from 'lucide-react';
import type { Bracket, BracketMatch, Seed } from '../lib/bracket';
import { ROUND_COL } from '../lib/bracket';

type Props = {
  bracket: Bracket;
  target: number;
  phaseName: string;
  onPick: (m: BracketMatch) => void;
};

/** Llave completa estilo Mundial: mitad izquierda y derecha que convergen en la final. */
export function Playoffs({ bracket, target, phaseName, onPick }: Props) {
  const { regDone, played, total, rounds, champion, qualified } = bracket;

  if (rounds.length === 0) {
    return (
      <main className="playoffs">
        <span className="po-locked">
          Hacen falta al menos 2 clasificados para armar el playoff. Ajustalo desde la tuerquita.
        </span>
      </main>
    );
  }

  const R = rounds.length;
  const colName = (r: number) => ROUND_COL[R - 1 - r] ?? `Ronda ${r + 1}`;
  const final = rounds[R - 1][0];
  // Cantidad de cruces por lado en la primera ronda: define el alto de cada tarjeta.
  const slots = Math.max(1, rounds[0].length / 2);

  const matchCard = (m: BracketMatch, extra = '') => {
    const ok = regDone && !m.bye && !!m.a && !!m.b;
    const r = m.result;
    const row = (t: Seed | null, score: number | undefined, win: boolean, ph: string) => {
      const state = !t ? ' ph' : win ? ' win' : r ? ' lose' : '';
      return (
        <span className={`bk-team${state}`}>
          <span className="bk-seed">{t ? t.tag : '–'}</span>
          <span className="bk-name">{t ? t.row.name : ph}</span>
          <span className="bk-score">{r ? score : ''}</span>
        </span>
      );
    };
    const cls = ['bk-m', extra, m.bye && 'bye', ok && !r && 'ready', r && 'done'].filter(Boolean).join(' ');
    return (
      <button
        key={m.id}
        type="button"
        className={cls}
        disabled={!ok}
        onClick={() => ok && onPick(m)}
        title={m.label}
      >
        {m.bye ? (
          <>
            {row(m.a ?? m.b, undefined, true, '—')}
            <span className="bk-team ph bye-note">
              <span className="bk-name">Pasa directo</span>
            </span>
          </>
        ) : (
          <>
            {row(m.a, r?.sa, !!r && r.sa > r.sb, m.feedA ? `Gan. ${m.feedA}` : '—')}
            {row(m.b, r?.sb, !!r && r.sb > r.sa, m.feedB ? `Gan. ${m.feedB}` : '—')}
          </>
        )}
      </button>
    );
  };

  /** Columna de una ronda para un lado; los partidos van de a pares para dibujar la llave. */
  const column = (r: number, side: 'left' | 'right') => {
    const list = rounds[r];
    const half = list.length / 2;
    const mine = side === 'left' ? list.slice(0, half) : list.slice(half);
    const pairs: BracketMatch[][] = [];
    for (let i = 0; i < mine.length; i += 2) pairs.push(mine.slice(i, i + 2));
    return (
      <div key={`${side}${r}`} className={`bk-col${r === 0 ? ' first' : ''}`}>
        <div className="bk-head">{colName(r)}</div>
        <div className="bk-body">
          {pairs.map((p, i) => (
            <div key={i} className={`bk-pair${p.length === 2 ? ' two' : ''}`}>
              {p.map((m) => matchCard(m))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const sideRounds = Array.from({ length: R - 1 }, (_, r) => r);

  return (
    <main className="playoffs bk-view">
      <div className="groups-view-head">
        {!regDone ? (
          <span className="po-locked">
            Cruces provisorios — se habilitan al terminar la {phaseName} ({played} de {total} partidos jugados).
          </span>
        ) : (
          <span className="qualify-note">
            <span className="dot lg gold" />
            Tocá un cruce para cargar el resultado
          </span>
        )}
        <span className="aside">
          {qualified} clasificados · a {target} puntos
        </span>
      </div>
      <div className="bk-scroll">
        <div className={`bk rounds-${R}`} style={{ '--slots': slots, '--cols': 2 * R - 1 } as React.CSSProperties}>
          {R > 1 && <div className="bk-side left">{sideRounds.map((r) => column(r, 'left'))}</div>}
          <div className="bk-center">
            <div className="bk-head gold">Final</div>
            <div className="bk-body">
              <div className="bk-final-wrap">
                {champion && (
                  <div className="champion bk-champion">
                    <Trophy size={28} strokeWidth={2.75} />
                    <span className="label">Campeón</span>
                    <span className="name">{champion.row.name}</span>
                  </div>
                )}
                {matchCard(final, 'final')}
              </div>
            </div>
          </div>
          {R > 1 && <div className="bk-side right">{[...sideRounds].reverse().map((r) => column(r, 'right'))}</div>}
        </div>
      </div>
    </main>
  );
}

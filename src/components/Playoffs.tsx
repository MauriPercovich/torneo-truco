import { Trophy } from 'lucide-react';
import type { Bracket, PoKey, Row } from '../lib/tournament';
import { PO_LABELS } from '../lib/tournament';

type Props = {
  rows: Row[];
  bracket: Bracket;
  target: number;
  onPick: (k: PoKey) => void;
};

const PLACEHOLDERS: Partial<Record<PoKey, [string, string]>> = {
  f: ['Ganador Semi 1', 'Ganador Semi 2'],
};

export function Playoffs({ rows, bracket, target, onPick }: Props) {
  const { regDone, played, total, sideA, sideB, result, champion } = bracket;
  const seedOf = (t: Row | null) => (t ? `${rows.indexOf(t) + 1}°` : '?');

  const card = (k: PoKey) => {
    const a = sideA[k];
    const b = sideB[k];
    const r = result(k);
    const ok = regDone && !!a && !!b;
    const ph = PLACEHOLDERS[k] ?? ['—', '—'];
    const isFinal = k === 'f';

    const teamRow = (t: Row | null, score: number | undefined, win: boolean, placeholder: string) => {
      const state = !t ? ' placeholder' : win ? ' win' : r ? ' lose' : '';
      return (
        <div className={`po-team${state}`}>
          <span className="seed">{seedOf(t)}</span>
          <span className="name">{t ? t.name : placeholder}</span>
          <span className="score">{r ? score : ''}</span>
        </div>
      );
    };

    return (
      <button
        key={k}
        type="button"
        className={`po-card${isFinal ? ' final' : ''}${!isFinal && ok && !r ? ' ring' : ''}`}
        disabled={!ok}
        onClick={() => ok && onPick(k)}
      >
        <span className="kicker">{PO_LABELS[k]}</span>
        {teamRow(a, r?.sa, !!r && r.sa > r.sb, ph[0])}
        {teamRow(b, r?.sb, !!r && r.sb > r.sa, ph[1])}
      </button>
    );
  };

  return (
    <main className="playoffs">
      {champion && (
        <div className="champion">
          <Trophy size={32} strokeWidth={2.75} />
          <span className="label">Campeón</span>
          <span className="name">{champion.name}</span>
        </div>
      )}
      {!regDone && (
        <span className="po-locked">
          Cruces provisorios — se habilitan al terminar la fase regular ({played} de {total}{' '}
          partidos jugados).
        </span>
      )}
      <div className="bracket">
        <div className="po-col semis">
          <div className="section-head">
            <h2>Semifinales</h2>
            <span className="aside">A {target} puntos</span>
          </div>
          {card('s1')}
          {card('s2')}
        </div>
        <div className="po-col final">
          <h2>Final</h2>
          {card('f')}
        </div>
      </div>
    </main>
  );
}

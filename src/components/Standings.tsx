import { Fragment } from 'react';
import type { Row } from '../lib/tournament';

export function Standings({ rows }: { rows: Row[] }) {
  return (
    <section className="standings">
      <div className="section-head">
        <h2>Tabla de posiciones</h2>
        <span className="qualify-note">
          <span className="dot lg gold" />
          Los 4 primeros van a semis
        </span>
      </div>

      <div className="st-grid st-head">
        <span>#</span>
        <span>Equipo</span>
        <span className="c">PJ</span>
        <span className="c pg">PG</span>
        <span className="c">PP</span>
        <span className="c hide-sm">PF</span>
        <span className="c hide-sm">PC</span>
        <span className="c">Dif</span>
      </div>

      <div className="st-rows">
        {rows.map((r, i) => {
          const q = i < 4;
          const difColor =
            r.d > 0 ? 'var(--win)' : r.d < 0 ? 'var(--dif-neg)' : 'var(--num-dim)';
          return (
            <Fragment key={r.id}>
              <div className={`st-grid st-row${q ? ' q' : ''}`}>
                <div className="pos">{i + 1}</div>
                <div className="st-team">
                  <span className="st-name">{r.name}</span>
                  <div className="form">
                    {r.form.slice(-5).map((w, j) => (
                      <span key={j} className={`dot ${w ? 'win' : 'loss'}`} />
                    ))}
                  </div>
                </div>
                <span className="c n">{r.pj}</span>
                <span className="c pg">{r.pg}</span>
                <span className="c n">{r.pp}</span>
                <span className="c n dim hide-sm">{r.pf}</span>
                <span className="c n dim hide-sm">{r.pc}</span>
                <span className="c dif" style={{ color: difColor }}>
                  {r.d > 0 ? `+${r.d}` : r.d}
                </span>
              </div>
              {i === 3 && rows.length > 4 && (
                <div className="cut">
                  <span className="line" />
                  <span className="kicker">Zona de semis</span>
                  <span className="line" />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      <div className="legend">
        <span className="hide-sm">PF / PC: puntos a favor y en contra</span>
        <span>Desempate: PG · Dif · PF</span>
        <span>
          <span className="dot win" />
          Ganó
        </span>
        <span>
          <span className="dot loss" />
          Perdió
        </span>
      </div>
    </section>
  );
}

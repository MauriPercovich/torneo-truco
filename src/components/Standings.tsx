import { Fragment, useLayoutEffect, useRef } from 'react';
import type { Format, Row, Table } from '../lib/tournament';

type Props = { tables: Table[]; format: Format; total: number };

function qualifyNote(format: Format, tables: Table[], total: number) {
  if (format === 'grupos') {
    const per = Math.max(0, ...tables.map((t) => t.qual));
    return per === 1
      ? 'El primero de cada grupo va a playoff'
      : `Los ${per} primeros de cada grupo van a playoff`;
  }
  if (total === 2) return 'Los 2 primeros van a la final';
  if (total === 4) return 'Los 4 primeros van a semis';
  return `Los ${total} primeros van a playoff`;
}

/** En pantalla ancha (TV/PC) achica las filas lo justo para que la tabla entre entera. */
function useFitRows(deps: unknown) {
  const panelRef = useRef<HTMLElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const list = rowsRef.current;
    const container = panel?.parentElement;
    if (!panel || !list || !container) return;
    const wide = window.matchMedia('(min-width: 1100px) and (min-height: 560px)');
    const measure = () => {
      const rows = [...list.querySelectorAll<HTMLElement>('.st-row')];
      if (!rows.length) return 0;
      const rowsH = rows.reduce((h, r) => h + r.offsetHeight, 0);
      // Todo lo que no es fila (encabezados de grupo, separadores, espacios) queda fijo.
      const fixed = list.scrollHeight - rowsH;
      const chrome = panel.offsetHeight - list.offsetHeight;
      return Math.floor((container.clientHeight - chrome - fixed - 2) / rows.length);
    };
    const fit = () => {
      panel.style.removeProperty('--row-h');
      delete panel.dataset.tight;
      if (!wide.matches) return;
      let h = measure();
      if (!h) return;
      // Si no entra ni con filas mínimas, se esconde la leyenda y se afinan los separadores.
      if (h < 30) {
        panel.dataset.tight = 'true';
        h = measure();
      }
      panel.style.setProperty('--row-h', `${Math.max(28, Math.min(64, h))}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    wide.addEventListener('change', fit);
    return () => {
      ro.disconnect();
      wide.removeEventListener('change', fit);
    };
  }, [deps]);
  return { panelRef, rowsRef };
}

export function Standings({ tables, format, total }: Props) {
  const { panelRef, rowsRef } = useFitRows(tables);
  const cutLabel = format === 'liga' && total === 4 ? 'Zona de semis' : 'Zona de playoff';
  return (
    <section className="standings" ref={panelRef}>
      <div className="section-head">
        <h2>{format === 'grupos' ? 'Posiciones por grupo' : 'Tabla de posiciones'}</h2>
        <span className="qualify-note">
          <span className="dot lg gold" />
          {qualifyNote(format, tables, total)}
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

      <div className="st-rows" ref={rowsRef}>
        {tables.map((t) => {
          const body = t.rows.map((r, i) => (
            <Fragment key={r.id}>
              <StandingRow row={r} pos={i + 1} qualified={i < t.qual} />
              {i === t.qual - 1 && t.rows.length > t.qual && (
                <div className="cut">
                  <span className="line" />
                  <span className="kicker">{cutLabel}</span>
                  <span className="line" />
                </div>
              )}
            </Fragment>
          ));
          if (!t.label) return <Fragment key="liga">{body}</Fragment>;
          return (
            <div key={t.id} className="group-block">
              <div className="group-head">
                <span className="group-badge">{t.letter}</span>
                <span className="group-title">{t.label}</span>
                <span className="group-meta">
                  {t.qual === 1 ? 'Clasifica 1' : `Clasifican ${t.qual}`}
                </span>
              </div>
              <div className="group-rows">{body}</div>
            </div>
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

function StandingRow({ row: r, pos, qualified }: { row: Row; pos: number; qualified: boolean }) {
  const difColor = r.d > 0 ? 'var(--win)' : r.d < 0 ? 'var(--dif-neg)' : 'var(--num-dim)';
  return (
    <div className={`st-grid st-row${qualified ? ' q' : ''}`}>
      <div className="pos">{pos}</div>
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
  );
}

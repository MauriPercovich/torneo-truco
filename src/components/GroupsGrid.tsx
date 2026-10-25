import { useLayoutEffect, useRef, useState } from 'react';
import type { QualPlan, Row, Table, Tables } from '../lib/tournament';
import { describePlan, ordWord } from '../lib/tournament';

type Props = {
  data: Tables;
  played: number;
  total: number;
  onOpenGroup: (groupId: string) => void;
};

const GAP = 18;
const MIN_CARD_W = 250;
const CARD_CHROME = 92; // encabezado + títulos de columnas + padding

/** Elige cuántas columnas usar para que todos los grupos entren en la pantalla con filas lo más altas posible. */
/** `shape` = tamaños de los grupos separados por coma + "|" + filas de la tabla de mejores. */
function useGridFit(shape: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ cols: number; rowH: number; bestH: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wide = window.matchMedia('(min-width: 1100px) and (min-height: 560px)');
    const [sizes, bestPart] = shape.split('|');
    const cards = sizes.split(',').map(Number);
    const bestRows = Number(bestPart) || 0;
    const calc = () => {
      if (!wide.matches) return setFit(null);
      const W = el.clientWidth;
      const H = el.clientHeight;
      const n = cards.length;
      let best: { cols: number; rowH: number } | null = null;
      for (let c = 1; c <= n; c++) {
        const cardW = (W - GAP * (c - 1)) / c;
        if (cardW < MIN_CARD_W && c > 1) break;
        const rows = Math.ceil(n / c);
        const cardH = (H - GAP * (rows - 1)) / rows;
        // La fila de grilla más exigente manda: la tarjeta con más equipos de esa fila.
        let rowH = Infinity;
        for (let r = 0; r < rows; r++) {
          const most = Math.max(...cards.slice(r * c, r * c + c));
          rowH = Math.min(rowH, (cardH - CARD_CHROME - 8) / Math.max(1, most));
        }
        const capped = Math.min(rowH, 46);
        if (!best || capped > best.rowH + 0.5) best = { cols: c, rowH: capped };
      }
      const bestH = bestRows ? Math.max(20, Math.min(40, Math.floor((H - CARD_CHROME - 8) / bestRows))) : 0;
      setFit(best && { cols: best.cols, rowH: Math.max(22, Math.floor(best.rowH)), bestH });
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    wide.addEventListener('change', calc);
    return () => {
      ro.disconnect();
      wide.removeEventListener('change', calc);
    };
  }, [shape]);
  return { ref, fit };
}

export function GroupsGrid({ data, played, total, onOpenGroup }: Props) {
  const { tables, plan, best } = data;
  const bestIds = new Set(best.filter((b) => b.qualified).map((b) => b.row.id));
  const cards = tables.map((t) => t.rows.length);
  const { ref, fit } = useGridFit(`${cards.join(',')}|${best.length}`);

  const style = fit
    ? ({ gridTemplateColumns: `repeat(${fit.cols}, minmax(0, 1fr))`, '--grow-h': `${fit.rowH}px` } as React.CSSProperties)
    : undefined;

  return (
    <main className="groups-view">
      <div className="groups-view-head">
        <span className="qualify-note">
          <span className="dot lg gold" />
          {plan ? `${describePlan(plan)} · ${plan.total} a playoff` : ''}
        </span>
        <span className="aside">
          {played} de {total} partidos jugados · tocá un grupo para ver su fixture
        </span>
      </div>
      <div className={`groups-layout${best.length ? ' with-best' : ''}`}>
        <div className={`groups-grid${fit ? ' fit' : ''}`} ref={ref} style={style}>
          {tables.map((t) => (
            <GroupCard key={t.id} table={t} plan={plan} bestIds={bestIds} onOpen={() => onOpenGroup(t.id!)} />
          ))}
        </div>
        {best.length > 0 && plan && (
          <BestCard
            best={best}
            plan={plan}
            style={fit ? ({ '--grow-h': `${fit.bestH}px` } as React.CSSProperties) : undefined}
          />
        )}
      </div>
    </main>
  );
}

function Cols() {
  return (
    <div className="gc-grid gc-cols">
      <span>#</span>
      <span>Equipo</span>
      <span className="c">PJ</span>
      <span className="c pg">PG</span>
      <span className="c pp">PP</span>
      <span className="c">Dif</span>
    </div>
  );
}

function GroupCard({
  table: t,
  plan,
  bestIds,
  onOpen,
}: {
  table: Table;
  plan: QualPlan | null;
  bestIds: Set<string>;
  onOpen: () => void;
}) {
  const extraPos = plan?.extraPos ?? 0;
  return (
    <button type="button" className="group-card" onClick={onOpen}>
      <div className="gc-head">
        <span className="group-badge">{t.letter}</span>
        <span className="gc-title">{t.label}</span>
      </div>
      <Cols />
      <div className="gc-rows">
        {t.rows.map((r, i) => {
          const state =
            i < t.qual ? 'q' : bestIds.has(r.id) ? 'best' : extraPos && i === extraPos - 1 ? 'cand' : '';
          return (
            <div key={r.id} className={`gc-row-wrap${i === t.qual - 1 && i < t.rows.length - 1 ? ' cut-after' : ''}`}>
              <GroupRow row={r} pos={i + 1} state={state} />
            </div>
          );
        })}
      </div>
    </button>
  );
}

function GroupRow({ row: r, pos, state, tag }: { row: Row; pos: number; state: string; tag?: string }) {
  const difColor = r.d > 0 ? 'var(--win)' : r.d < 0 ? 'var(--dif-neg)' : 'var(--num-dim)';
  return (
    <div className={`gc-grid gc-row ${state}`}>
      <span className="gc-pos">{pos}</span>
      <span className="gc-name">
        <span className="txt">{r.name}</span>
        {tag && <span className="gc-tag">{tag}</span>}
      </span>
      <span className="c n">{r.pj}</span>
      <span className="c pg">{r.pg}</span>
      <span className="c n pp">{r.pp}</span>
      <span className="c dif" style={{ color: difColor }}>
        {r.d > 0 ? `+${r.d}` : r.d}
      </span>
    </div>
  );
}

function BestCard({
  best,
  plan,
  style,
}: {
  best: Tables['best'];
  plan: QualPlan;
  style?: React.CSSProperties;
}) {
  return (
    <div className="group-card best-card" style={style}>
      <div className="gc-head">
        <span className="group-badge alt">{plan.extraPos}°</span>
        <span className="gc-title">Mejores {ordWord(plan.extraPos)}</span>
        <span className="gc-meta">Pasan {plan.extraCount}</span>
      </div>
      <Cols />
      <div className="gc-rows">
        {best.map((b, i) => (
          <div key={b.row.id} className={`gc-row-wrap${i === plan.extraCount - 1 && i < best.length - 1 ? ' cut-after' : ''}`}>
            <GroupRow row={b.row} pos={i + 1} state={b.qualified ? 'best' : ''} tag={b.letter} />
          </div>
        ))}
      </div>
    </div>
  );
}

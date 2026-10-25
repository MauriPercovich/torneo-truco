import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { CloseButton, Modal } from './Modal';
import { selectAll } from '../lib/dom';
import type { Format, Group } from '../lib/tournament';
import { MAX_PLAYOFF, describePlan, qualPlan } from '../lib/tournament';

type TargetKey = 'targetReg' | 'targetPo';

type Props = {
  format: Format;
  groups: Group[];
  teamCount: number;
  targetReg: number;
  targetPo: number;
  qualLiga: number;
  qualTotal: number;
  onTarget: (k: TargetKey, v: number) => void;
  onQualLiga: (v: number) => void;
  onQualTotal: (v: number) => void;
  onFormat: (f: Format) => void;
  onGroupCount: (n: number) => void;
  onOpenGroups: () => void;
  onNewTournament: () => void;
  onClose: () => void;
};

const POINT_CHIPS = [15, 20, 30, 40];
const ROUND_BY_SIZE: Record<number, string> = {
  2: 'la final',
  4: 'semifinales',
  8: 'cuartos de final',
  16: 'octavos de final',
  32: '16avos de final',
  64: '32avos de final',
};

function bracketHint(q: number) {
  if (q < 2) return '';
  let size = 2;
  while (size < q) size *= 2;
  const byes = size - q;
  const pase = byes === 1 ? '1 pasa directo' : `${byes} pasan directo`;
  return `Arranca en ${ROUND_BY_SIZE[size]}${byes ? ` (${pase} a la ronda siguiente)` : ''}.`;
}

function groupSizes(groups: Group[]) {
  const counts = new Map<number, number>();
  groups.forEach((g) => counts.set(g.teamIds.length, (counts.get(g.teamIds.length) ?? 0) + 1));
  const parts = [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([size, n]) => `${n} ${n === 1 ? 'grupo' : 'grupos'} de ${size}`);
  return parts.join(' y ');
}

export function SettingsModal(p: Props) {
  const isGroups = p.format === 'grupos';
  const plan = qualPlan(p.groups, p.qualTotal);
  const ligaQ = Math.min(p.qualLiga, p.teamCount);
  const maxQ = Math.min(MAX_PLAYOFF, p.teamCount);
  const maxGroups = Math.max(1, Math.floor(p.teamCount / 2));

  return (
    <Modal width={640} onClose={p.onClose} label="Ajustes">
      <div className="modal-head">
        <span className="modal-title">Ajustes</span>
        <CloseButton onClick={p.onClose} />
      </div>

      <div className="settings-scroll">
        <div className="setting">
          <span className="kicker">Formato</span>
          <div className="setting-row">
            <button
              type="button"
              className={`chip wide${!isGroups ? ' selected' : ''}`}
              onClick={() => p.onFormat('liga')}
            >
              Todos contra todos
            </button>
            <button
              type="button"
              className={`chip wide${isGroups ? ' selected' : ''}`}
              onClick={() => p.onFormat('grupos')}
            >
              Grupos
            </button>
          </div>
        </div>

        {isGroups && (
          <div className="setting">
            <span className="kicker">Cantidad de grupos</span>
            <div className="setting-row">
              {[2, 4, 6, 8, 12]
                .filter((n) => n <= maxGroups)
                .map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`chip${n === p.groups.length ? ' selected' : ''}`}
                    onClick={() => p.onGroupCount(n)}
                  >
                    {n}
                  </button>
                ))}
              <NumberInput
                value={p.groups.length}
                min={1}
                max={maxGroups}
                label="Cantidad de grupos"
                onCommit={p.onGroupCount}
              />
              <span className="unit">grupos</span>
            </div>
            <div className="groups-summary">
              <span>
                {p.teamCount} equipos · {groupSizes(p.groups)}
              </span>
              <button type="button" className="btn-reach" onClick={p.onOpenGroups}>
                Armar grupos a mano
              </button>
            </div>
          </div>
        )}

        <div className="setting">
          <span className="kicker">Clasifican a playoff</span>
          <div className="setting-row">
            {(isGroups ? [4, 8, 16, 32] : [2, 4, 8, 16]).map((n) => (
              <button
                key={n}
                type="button"
                disabled={n > maxQ}
                className={`chip${n === (isGroups ? plan.total : ligaQ) ? ' selected' : ''}`}
                onClick={() => (isGroups ? p.onQualTotal(n) : p.onQualLiga(n))}
              >
                {n}
              </button>
            ))}
            <NumberInput
              value={isGroups ? p.qualTotal : p.qualLiga}
              min={2}
              max={maxQ}
              label="Cantidad de clasificados"
              onCommit={isGroups ? p.onQualTotal : p.onQualLiga}
            />
            <span className="unit">equipos</span>
          </div>
          {isGroups ? (
            <span className="setting-hint">
              <strong>{describePlan(plan)}</strong>
              {plan.total !== plan.requested && plan.total >= 2 && ` (${plan.total} en total: con estos grupos no da para ${plan.requested}).`}
              {plan.total >= 2 && plan.total === plan.requested && '. '}
              {bracketHint(plan.total)}
            </span>
          ) : (
            <span className="setting-hint">{bracketHint(ligaQ)}</span>
          )}
        </div>

        {(
          [
            [isGroups ? 'Puntos · fase de grupos' : 'Puntos · fase regular', 'targetReg', p.targetReg],
            ['Puntos · playoff', 'targetPo', p.targetPo],
          ] as [string, TargetKey, number][]
        ).map(([label, k, v]) => (
          <div key={k} className="setting">
            <span className="kicker">{label}</span>
            <div className="setting-row">
              {POINT_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip${c === v ? ' selected' : ''}`}
                  onClick={() => p.onTarget(k, c)}
                >
                  {c}
                </button>
              ))}
              <NumberInput value={v} min={1} max={99} label={label} onCommit={(n) => p.onTarget(k, n)} />
              <span className="unit">puntos</span>
            </div>
          </div>
        ))}
      </div>

      <div className="actions">
        <button type="button" className="btn-ghost-danger" onClick={p.onNewTournament}>
          <RotateCcw size={16} strokeWidth={2.75} style={{ marginRight: 8, verticalAlign: -2 }} />
          Nuevo torneo
        </button>
        <button type="button" className="btn-primary" onClick={p.onClose}>
          Listo
        </button>
      </div>
    </Modal>
  );
}

/** Input libre. Guarda al salir del campo o con Enter (para no rearmar con cada tecla). */
function NumberInput({
  value,
  min,
  max,
  label,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setText(String(value));
  }
  const commit = () => {
    const n = parseInt(text, 10);
    if (n >= min && n <= max) {
      if (n !== value) onCommit(n);
    } else setText(String(value));
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      className="num-input"
      min={min}
      max={max}
      value={text}
      aria-label={label}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.stopPropagation();
          commit();
        }
      }}
      onFocus={selectAll}
      onClick={selectAll}
    />
  );
}

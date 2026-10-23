import { useState } from 'react';
import { CloseButton, Modal } from './Modal';
import { selectAll } from '../lib/dom';
import type { Format, Group } from '../lib/tournament';
import { MAX_PLAYOFF, groupLetter } from '../lib/tournament';

type TargetKey = 'targetReg' | 'targetPo';
type QualKey = 'qualLiga' | 'qualPerGroup';

type Props = {
  format: Format;
  groups: Group[];
  teamCount: number;
  targetReg: number;
  targetPo: number;
  qualLiga: number;
  qualPerGroup: number;
  onTarget: (k: TargetKey, v: number) => void;
  onQual: (k: QualKey, v: number) => void;
  onFormat: (f: Format) => void;
  onOpenGroups: () => void;
  onClose: () => void;
};

const POINT_CHIPS = [15, 20, 30, 40];
const ROUND_BY_SIZE: Record<number, string> = {
  2: 'final',
  4: 'semifinales',
  8: 'cuartos de final',
  16: 'octavos de final',
};

function playoffSummary(q: number) {
  if (q < 2) return 'Hacen falta al menos 2 clasificados.';
  let size = 2;
  while (size < q) size *= 2;
  const byes = size - q;
  const start = ROUND_BY_SIZE[size];
  const pase = byes === 1 ? '1 pasa directo' : `${byes} pasan directo`;
  return `${q} equipos en playoff · arranca en ${start}${byes ? ` (${pase})` : ''}`;
}

export function SettingsModal(p: Props) {
  const isGroups = p.format === 'grupos';
  const qualTotal = isGroups
    ? p.groups.reduce((n, g) => n + Math.min(p.qualPerGroup, g.teamIds.length), 0)
    : Math.min(p.qualLiga, p.teamCount);
  const maxGroup = Math.max(0, ...p.groups.map((g) => g.teamIds.length));
  const perGroupTotal = (n: number) => p.groups.reduce((s, g) => s + Math.min(n, g.teamIds.length), 0);

  return (
    <Modal width={600} onClose={p.onClose} label="Ajustes">
      <div className="modal-head">
        <span className="modal-title">Ajustes</span>
        <CloseButton onClick={p.onClose} />
      </div>

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
        {isGroups && (
          <div className="groups-summary">
            <span>
              {p.groups.length} grupos ·{' '}
              {p.groups.map((g, i) => `${groupLetter(i)}: ${g.teamIds.length}`).join(' · ')}
            </span>
            <button type="button" className="btn-reach" onClick={p.onOpenGroups}>
              Armar grupos
            </button>
          </div>
        )}
      </div>

      <div className="setting">
        <span className="kicker">{isGroups ? 'Clasifican por grupo' : 'Clasifican a playoff'}</span>
        <div className="setting-row">
          {isGroups
            ? [1, 2, 3, 4].map((n) => {
                const tot = perGroupTotal(n);
                const disabled = n > maxGroup || tot < 2 || tot > MAX_PLAYOFF;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    className={`chip${n === p.qualPerGroup ? ' selected' : ''}`}
                    onClick={() => p.onQual('qualPerGroup', n)}
                  >
                    {n}
                  </button>
                );
              })
            : [2, 4, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={n > p.teamCount}
                  className={`chip${n === p.qualLiga ? ' selected' : ''}`}
                  onClick={() => p.onQual('qualLiga', n)}
                >
                  {n}
                </button>
              ))}
          {!isGroups && (
            <>
              <NumberInput
                value={p.qualLiga}
                min={2}
                max={Math.min(MAX_PLAYOFF, p.teamCount)}
                label="Cantidad de clasificados"
                onCommit={(n) => p.onQual('qualLiga', n)}
              />
              <span className="unit">equipos</span>
            </>
          )}
        </div>
        <span className="setting-hint">{playoffSummary(qualTotal)}</span>
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
            <NumberInput
              value={v}
              min={1}
              max={99}
              label={label}
              onCommit={(n) => p.onTarget(k, n)}
            />
            <span className="unit">puntos</span>
          </div>
        </div>
      ))}
    </Modal>
  );
}

/** Input libre. Guarda al instante cuando el valor está en rango. */
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
  // Si el valor cambia desde afuera (un chip), el input lo refleja.
  if (synced !== value) {
    setSynced(value);
    setText(String(value));
  }
  return (
    <input
      type="number"
      inputMode="numeric"
      className="num-input"
      min={min}
      max={max}
      value={text}
      aria-label={label}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseInt(e.target.value, 10);
        if (n >= min && n <= max) onCommit(n);
      }}
      onBlur={() => setText(String(value))}
      onFocus={selectAll}
      onClick={selectAll}
    />
  );
}

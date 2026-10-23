import { useState } from 'react';
import { CloseButton, Modal } from './Modal';
import { selectAll } from '../lib/dom';

type Key = 'targetReg' | 'targetPo';
type Props = {
  targetReg: number;
  targetPo: number;
  onChange: (k: Key, v: number) => void;
  onClose: () => void;
};

const CHIPS = [15, 20, 30, 40];

export function SettingsModal({ targetReg, targetPo, onChange, onClose }: Props) {
  const rows: [string, Key, number][] = [
    ['Fase regular', 'targetReg', targetReg],
    ['Semis y final', 'targetPo', targetPo],
  ];
  return (
    <Modal width={520} onClose={onClose} label="Ajustes">
      <div className="modal-head">
        <span className="modal-title">Ajustes</span>
        <CloseButton onClick={onClose} />
      </div>
      {rows.map(([label, k, v]) => (
        <div key={k} className="setting">
          <span className="kicker">{label}</span>
          <div className="setting-row">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip${c === v ? ' selected' : ''}`}
                onClick={() => onChange(k, c)}
              >
                {c}
              </button>
            ))}
            <TargetInput
              value={v}
              label={`Puntos para ${label.toLowerCase()}`}
              onCommit={(n) => onChange(k, n)}
            />
            <span className="unit">puntos</span>
          </div>
        </div>
      ))}
    </Modal>
  );
}

/** Input libre (1–99). Guarda al instante cuando el valor es válido. */
function TargetInput({
  value,
  label,
  onCommit,
}: {
  value: number;
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
      min={1}
      max={99}
      value={text}
      aria-label={label}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseInt(e.target.value, 10);
        if (n > 0 && n < 100) onCommit(n);
      }}
      onBlur={() => setText(String(value))}
      onFocus={selectAll}
      onClick={selectAll}
    />
  );
}

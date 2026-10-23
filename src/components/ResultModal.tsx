import { useEffect, useState } from 'react';
import { clampScore } from '../lib/tournament';
import { CloseButton, Modal } from './Modal';
import { selectAll } from '../lib/dom';

type Props = {
  label: string;
  aName: string;
  bName: string;
  initial: { sa: number; sb: number };
  target: number;
  hasResult: boolean;
  onSave: (sa: number, sb: number) => void;
  onClear: () => void;
  onClose: () => void;
};

export function ResultModal({
  label,
  aName,
  bName,
  initial,
  target,
  hasResult,
  onSave,
  onClear,
  onClose,
}: Props) {
  const [sa, setSa] = useState(initial.sa);
  const [sb, setSb] = useState(initial.sb);
  const tie = sa === sb;

  // Enter guarda (si no hay empate).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && sa !== sb) {
        e.preventDefault();
        onSave(sa, sb);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sa, sb, onSave]);

  const reachA = () => {
    setSa(target);
    if (sb >= target) setSb(target - 1);
  };
  const reachB = () => {
    setSb(target);
    if (sa >= target) setSa(target - 1);
  };

  const side = (
    name: string,
    value: number,
    set: (n: number) => void,
    reach: () => void,
  ) => (
    <div className="result-side">
      <span className="name">{name}</span>
      <div className="stepper">
        <button
          type="button"
          className="step-btn"
          onClick={() => set(clampScore(value - 1))}
          aria-label={`Restar un punto a ${name}`}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          className="score-input"
          value={value}
          min={0}
          max={99}
          aria-label={`Puntos de ${name}`}
          onChange={(e) => {
            const n = clampScore(e.target.value);
            // Evita que quede "05" o "120" visible: el input siempre refleja el valor real.
            if (e.target.value !== String(n)) e.target.value = String(n);
            set(n);
          }}
          onFocus={selectAll}
          onClick={selectAll}
        />
        <button
          type="button"
          className="step-btn"
          onClick={() => set(clampScore(value + 1))}
          aria-label={`Sumar un punto a ${name}`}
        >
          +
        </button>
      </div>
      <button type="button" className="btn-reach" onClick={reach}>
        Llegó a {target}
      </button>
    </div>
  );

  return (
    <Modal width={620} onClose={onClose} label={`${label} · Resultado`}>
      <div className="modal-head">
        <span className="kicker">{label} · Resultado</span>
        <CloseButton onClick={onClose} />
      </div>

      <div className="result-grid">
        {side(aName, sa, setSa, reachA)}
        <span className="result-vs">vs</span>
        {side(bName, sb, setSb, reachB)}
      </div>

      {tie && (
        <span className="tie-warning">En el truco no hay empate — ajustá el resultado.</span>
      )}

      <div className="actions">
        {hasResult && (
          <button type="button" className="btn-ghost-danger" onClick={onClear}>
            Borrar resultado
          </button>
        )}
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={tie}
          onClick={() => onSave(sa, sb)}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
}

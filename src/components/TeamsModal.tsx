import { useState } from 'react';
import { ClipboardList, Plus, X } from 'lucide-react';
import type { Team } from '../lib/tournament';
import { uid } from '../lib/tournament';
import { Modal } from './Modal';
import { selectAll } from '../lib/dom';

type Props = {
  teams: Team[];
  isGroups: boolean;
  onSave: (teams: Team[]) => void;
  onResetResults: () => void;
  onClose: () => void;
};

/** Edita un borrador; solo se aplica al Guardar. */
export function TeamsModal({ teams, isGroups, onSave, onResetResults, onClose }: Props) {
  const [draft, setDraft] = useState<Team[]>(() => teams.map((t) => ({ ...t })));
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [countText, setCountText] = useState(String(teams.length));

  const save = () => {
    const clean = draft.map((t, i) => ({ id: t.id, name: t.name.trim() || `Equipo ${i + 1}` }));
    if (clean.length < 2) return;
    onSave(clean);
  };

  /** Ajusta la cantidad: agrega "Equipo N" al final o saca los últimos. */
  const setCount = (n: number) => {
    if (!(n >= 2 && n <= 128)) return setCountText(String(draft.length));
    setDraft((d) =>
      n <= d.length
        ? d.slice(0, n)
        : [...d, ...Array.from({ length: n - d.length }, (_, i) => ({ id: uid(), name: `Equipo ${d.length + i + 1}` }))],
    );
    setCountText(String(n));
  };

  /** Pega una lista (un nombre por renglón): reemplaza los nombres en orden y ajusta la cantidad. */
  const applyPaste = () => {
    const names = pasteText
      .split(/\r?\n/)
      .map((s) => s.replace(/^\s*\d+[).:-]?\s*/, '').trim())
      .filter(Boolean);
    if (names.length < 2) return;
    setDraft((d) => names.map((name, i) => ({ id: d[i]?.id ?? uid(), name })));
    setCountText(String(names.length));
    setPasting(false);
    setPasteText('');
  };

  return (
    <Modal width={620} gap={18} onClose={onClose} label="Equipos">
      <div className="teams-intro">
        <span className="modal-title">Equipos</span>
        <p>
          Cambiar nombres conserva los resultados. Agregar o quitar equipos rearma el fixture
          desde cero{isGroups ? ' y después te deja revisar los grupos' : ''}.
        </p>
      </div>

      <div className="teams-tools">
        <label className="count-field">
          <span>Cantidad</span>
          <input
            type="number"
            inputMode="numeric"
            className="num-input"
            min={2}
            max={128}
            value={countText}
            aria-label="Cantidad de equipos"
            onChange={(e) => setCountText(e.target.value)}
            onBlur={() => setCount(parseInt(countText, 10))}
            onKeyDown={(e) => e.key === 'Enter' && setCount(parseInt(countText, 10))}
            onFocus={selectAll}
          />
        </label>
        <button type="button" className="btn-reach" onClick={() => setPasting((v) => !v)}>
          <ClipboardList size={16} strokeWidth={2.75} style={{ marginRight: 6, verticalAlign: -3 }} />
          Pegar lista de nombres
        </button>
      </div>

      {pasting && (
        <div className="paste-box">
          <textarea
            className="paste-input"
            autoFocus
            rows={8}
            placeholder={'Un equipo por renglón, por ejemplo:\nLos Anchos\nFalta Envido\nSiete de Oro'}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <div className="actions">
            <button type="button" className="btn-secondary" onClick={() => setPasting(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={applyPaste}>
              Usar estos {pasteText.split(/\r?\n/).filter((s) => s.trim()).length} nombres
            </button>
          </div>
        </div>
      )}

      <div className="teams-list">
        {draft.map((t, i) => (
          <div key={t.id} className="team-edit">
            <span className="n">{i + 1}</span>
            <input
              className="text-input"
              value={t.name}
              placeholder="Nombre del equipo"
              aria-label={`Nombre del equipo ${i + 1}`}
              onChange={(e) => {
                const v = e.target.value;
                setDraft((d) => d.map((x) => (x.id === t.id ? { ...x, name: v } : x)));
              }}
            />
            <button
              type="button"
              className="btn-remove"
              aria-label={`Quitar ${t.name || `equipo ${i + 1}`}`}
              onClick={() => {
                setDraft((d) => d.filter((x) => x.id !== t.id));
                setCountText(String(draft.length - 1));
              }}
            >
              <X size={18} strokeWidth={2.75} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn-add"
        onClick={() => {
          setDraft((d) => [...d, { id: uid(), name: '' }]);
          setCountText(String(draft.length + 1));
        }}
      >
        <Plus size={18} strokeWidth={2.75} />
        Agregar equipo
      </button>

      <div className="actions">
        <button type="button" className="btn-ghost-danger" onClick={onResetResults}>
          Borrar todos los resultados
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn-primary" onClick={save}>
          Guardar
        </button>
      </div>
    </Modal>
  );
}

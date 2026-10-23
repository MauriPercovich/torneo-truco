import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Team } from '../lib/tournament';
import { uid } from '../lib/tournament';
import { Modal } from './Modal';

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

  const save = () => {
    const clean = draft.map((t, i) => ({ id: t.id, name: t.name.trim() || `Equipo ${i + 1}` }));
    if (clean.length < 2) return;
    onSave(clean);
  };

  return (
    <Modal width={560} gap={20} onClose={onClose} label="Equipos">
      <div className="teams-intro">
        <span className="modal-title">Equipos</span>
        <p>
          Cambiar nombres conserva los resultados. Agregar o quitar equipos rearma el fixture
          desde cero{isGroups ? ' y después te deja ubicar a los nuevos en su grupo' : ''}.
        </p>
      </div>

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
              onClick={() => setDraft((d) => d.filter((x) => x.id !== t.id))}
            >
              <X size={18} strokeWidth={2.75} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn-add"
        onClick={() => setDraft((d) => [...d, { id: uid(), name: '' }])}
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

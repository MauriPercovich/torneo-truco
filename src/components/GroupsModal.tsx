import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { GripVertical, Plus, Shuffle, X } from 'lucide-react';
import type { Group, Team } from '../lib/tournament';
import { autoGroups, groupLetter, uid } from '../lib/tournament';
import { CloseButton, Modal } from './Modal';

type Props = {
  teams: Team[];
  groups: Group[];
  hasResults: boolean;
  onSave: (groups: Group[]) => void;
  onClose: () => void;
};

/** Editor de grupos: se arrastran los equipos de un grupo a otro. Edita un borrador. */
export function GroupsModal({ teams, groups, hasResults, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Group[]>(() =>
    groups.length ? groups.map((g) => ({ ...g, teamIds: [...g.teamIds] })) : autoGroups(teams.map((t) => t.id), 2),
  );
  const [dragging, setDragging] = useState<string | null>(null);
  // Alternativa sin arrastrar: tocar un equipo y después el grupo de destino.
  const [picked, setPicked] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const name = (id: string) => teams.find((t) => t.id === id)?.name ?? '—';

  const moveTo = (teamId: string, groupId: string) => {
    setDraft((d) => {
      const from = d.find((g) => g.teamIds.includes(teamId));
      if (!from || from.id === groupId) return d;
      return d.map((g) =>
        g.id === groupId
          ? { ...g, teamIds: [...g.teamIds, teamId] }
          : g.id === from.id
            ? { ...g, teamIds: g.teamIds.filter((x) => x !== teamId) }
            : g,
      );
    });
  };

  const onDragStart = (e: DragStartEvent) => {
    setDragging(String(e.active.id));
    setPicked(null);
  };
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    if (e.over) moveTo(String(e.active.id), String(e.over.id));
  };

  const addGroup = () => setDraft((d) => [...d, { id: uid(), teamIds: [] }]);
  const removeGroup = (id: string) =>
    setDraft((d) => {
      const gone = d.find((g) => g.id === id);
      const rest = d.filter((g) => g.id !== id).map((g) => ({ ...g, teamIds: [...g.teamIds] }));
      // Sus equipos pasan a los grupos más chicos.
      gone?.teamIds.forEach((t) => {
        rest.reduce((a, b) => (b.teamIds.length < a.teamIds.length ? b : a)).teamIds.push(t);
      });
      return rest;
    });
  const shuffle = () => {
    const ids = teams.map((t) => t.id).sort(() => Math.random() - 0.5);
    setDraft((d) => {
      const fresh = autoGroups(ids, d.length);
      return d.map((g, i) => ({ ...g, teamIds: fresh[i].teamIds }));
    });
  };

  const small = draft.filter((g) => g.teamIds.length < 2);
  const valid = draft.length >= 1 && small.length === 0;

  const save = () => {
    if (!valid) return;
    const changed =
      draft.length !== groups.length ||
      draft.some((g, i) => g.id !== groups[i]?.id || g.teamIds.join() !== groups[i].teamIds.join());
    if (!changed) return onClose();
    if (hasResults && !window.confirm('Cambiar los grupos rearma el fixture y borra los resultados. ¿Seguir?')) return;
    onSave(draft);
  };

  return (
    <Modal width={980} gap={20} onClose={onClose} label="Armar grupos">
      <div className="modal-head">
        <div className="teams-intro">
          <span className="modal-title">Armar grupos</span>
          <p>
            Arrastrá cada equipo al grupo que corresponda (o tocalo y después tocá el grupo). Cada grupo
            juega todos contra todos.
          </p>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="groups-board">
          {draft.map((g, i) => (
            <GroupColumn
              key={g.id}
              group={g}
              letter={groupLetter(i)}
              canRemove={draft.length > 1}
              onRemove={() => removeGroup(g.id)}
              picked={picked}
              onDropPicked={() => {
                if (picked) moveTo(picked, g.id);
                setPicked(null);
              }}
            >
              {g.teamIds.map((id) => (
                <TeamChip
                  key={id}
                  id={id}
                  name={name(id)}
                  hidden={dragging === id}
                  picked={picked === id}
                  onPick={() => {
                    // Con un equipo elegido de otro grupo, tocar cualquier equipo de este grupo lo mueve acá.
                    if (picked && picked !== id && !g.teamIds.includes(picked)) {
                      moveTo(picked, g.id);
                      setPicked(null);
                    } else {
                      setPicked((p) => (p === id ? null : id));
                    }
                  }}
                />
              ))}
            </GroupColumn>
          ))}
          <button type="button" className="group-add" onClick={addGroup}>
            <Plus size={20} strokeWidth={2.75} />
            Agregar grupo
          </button>
        </div>
        <DragOverlay dropAnimation={null}>
          {dragging ? (
            <div className="team-chip overlay">
              <GripVertical size={16} strokeWidth={2.75} />
              <span>{name(dragging)}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {small.length > 0 && (
        <span className="tie-warning">
          Cada grupo necesita al menos 2 equipos (
          {small.map((g) => `Grupo ${groupLetter(draft.indexOf(g))}`).join(', ')}).
        </span>
      )}

      <div className="actions">
        <button type="button" className="btn-ghost-neutral" onClick={shuffle}>
          <Shuffle size={18} strokeWidth={2.75} />
          Sortear
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn-primary" disabled={!valid} onClick={save}>
          Guardar
        </button>
      </div>
    </Modal>
  );
}

function GroupColumn({
  group,
  letter,
  canRemove,
  onRemove,
  picked,
  onDropPicked,
  children,
}: {
  group: Group;
  letter: string;
  canRemove: boolean;
  onRemove: () => void;
  picked: string | null;
  onDropPicked: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id });
  const target = !!picked && !group.teamIds.includes(picked);
  return (
    <div
      ref={setNodeRef}
      className={`group-col${isOver ? ' over' : ''}${target ? ' target' : ''}`}
      onClick={target ? onDropPicked : undefined}
    >
      <div className="group-col-head">
        <span className="kicker">Grupo {letter}</span>
        <span className="group-count">{group.teamIds.length}</span>
        {canRemove && (
          <button
            type="button"
            className="btn-remove sm"
            aria-label={`Quitar grupo ${letter}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X size={16} strokeWidth={2.75} />
          </button>
        )}
      </div>
      <div className="group-col-list">
        {children}
        {group.teamIds.length === 0 && <span className="group-empty">Soltá equipos acá</span>}
        {target && <span className="group-empty">Tocá para mover acá</span>}
      </div>
    </div>
  );
}

function TeamChip({
  id,
  name,
  hidden,
  picked,
  onPick,
}: {
  id: string;
  name: string;
  hidden: boolean;
  picked: boolean;
  onPick: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`team-chip${hidden ? ' ghost' : ''}${picked ? ' picked' : ''}`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
    >
      <GripVertical size={16} strokeWidth={2.75} />
      <span>{name}</span>
    </button>
  );
}

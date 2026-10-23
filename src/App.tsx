import { useEffect, useMemo, useState } from 'react';
import { Settings, Users } from 'lucide-react';
import { Standings } from './components/Standings';
import { Fixture } from './components/Fixture';
import { Playoffs } from './components/Playoffs';
import { ResultModal } from './components/ResultModal';
import { SettingsModal } from './components/SettingsModal';
import { TeamsModal } from './components/TeamsModal';
import { GroupsModal } from './components/GroupsModal';
import type { Format, Group, Saved, Team } from './lib/tournament';
import {
  autoGroups,
  buildMatches,
  computeTables,
  isPlayed,
  loadSaved,
  persistSaved,
  playoffSize,
  playoffTitle,
  reconcileGroups,
} from './lib/tournament';
import { buildBracket, dropDownstream } from './lib/bracket';

type View = 'regular' | 'playoffs';
type Editing = { kind: 'match' | 'po'; id: string } | null;

export default function App() {
  const [data, setData] = useState<Saved>(loadSaved);
  const [view, setView] = useState<View>('regular');
  const [editing, setEditing] = useState<Editing>(null);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);

  const { format, teams, groups, matches, playoffs, targetReg, targetPo } = data;
  const isGroups = format === 'grupos';

  const update = (patch: Partial<Saved>) => setData((d) => ({ ...d, ...patch }));

  useEffect(() => persistSaved(data), [data]);

  // Esc cierra cualquier modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditing(null);
        setTeamsOpen(false);
        setSettingsOpen(false);
        setGroupsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tables = useMemo(() => computeTables(data), [data]);
  const played = matches.filter(isPlayed).length;
  const bracket = useMemo(
    () => buildBracket(tables, playoffs, { played, total: matches.length }),
    [tables, playoffs, played, matches.length],
  );
  const hasResults = played > 0 || Object.keys(playoffs).length > 0;
  const nRounds = bracket.rounds.length;

  // ── Modal de resultado ──
  const modal = (() => {
    if (!editing) return null;
    if (editing.kind === 'po') {
      const m = bracket.rounds.flat().find((x) => x.id === editing.id);
      if (!m || !m.a || !m.b) return null;
      return {
        label: m.label,
        aName: m.a.row.name,
        bName: m.b.row.name,
        initial: m.result ? { sa: m.result.sa, sb: m.result.sb } : { sa: 0, sb: 0 },
        target: targetPo,
        hasResult: !!m.result,
      };
    }
    const m = matches.find((x) => x.id === editing.id);
    if (!m) return null;
    const name = (id: string) => teams.find((t) => t.id === id)?.name ?? '—';
    const gi = groups.findIndex((g) => g.id === m.group);
    return {
      label: isGroups && gi >= 0 ? `Grupo ${String.fromCharCode(65 + gi)} · Fecha ${m.round}` : `Fecha ${m.round}`,
      aName: name(m.a),
      bName: name(m.b),
      initial: { sa: m.sa ?? 0, sb: m.sb ?? 0 },
      target: targetReg,
      hasResult: isPlayed(m),
    };
  })();

  const saveResult = (sa: number, sb: number) => {
    if (!editing || sa === sb) return;
    if (editing.kind === 'po') {
      const id = editing.id;
      let next = { ...playoffs, [id]: { sa, sb } };
      const prev = playoffs[id];
      // Si cambia el ganador, los cruces siguientes quedan sin efecto.
      if (prev && prev.sa > prev.sb !== sa > sb) next = dropDownstream(next, id, nRounds);
      update({ playoffs: next });
    } else {
      update({ matches: matches.map((m) => (m.id === editing.id ? { ...m, sa, sb } : m)) });
    }
    setEditing(null);
  };

  const clearResult = () => {
    if (!editing) return;
    if (editing.kind === 'po') {
      const next = dropDownstream(playoffs, editing.id, nRounds);
      delete next[editing.id];
      update({ playoffs: next });
    } else {
      update({
        matches: matches.map((m) => (m.id === editing.id ? { ...m, sa: null, sb: null } : m)),
      });
    }
    setEditing(null);
  };

  // ── Formato y clasificados ──
  const setFormat = (f: Format) => {
    if (f === format) return;
    if (hasResults && !window.confirm('Cambiar el formato rearma el fixture y borra todos los resultados. ¿Seguir?'))
      return;
    if (f === 'grupos') {
      const base = groups.length ? groups : autoGroups(teams.map((t) => t.id), teams.length >= 4 ? 2 : 1);
      const g = reconcileGroups(base, teams);
      update({ format: f, groups: g, matches: buildMatches(f, teams, g), playoffs: {} });
      setSettingsOpen(false);
      setGroupsOpen(true);
    } else {
      update({ format: f, matches: buildMatches(f, teams, groups), playoffs: {} });
    }
    setView('regular');
  };

  const setQual = (k: 'qualLiga' | 'qualPerGroup', n: number) => {
    if (data[k] === n) return;
    if (
      Object.keys(playoffs).length > 0 &&
      !window.confirm('Cambiar los clasificados rearma el playoff y borra sus resultados. ¿Seguir?')
    )
      return;
    update({ [k]: n, playoffs: {} });
  };

  const saveGroups = (g: Group[]) => {
    update({ groups: g, matches: buildMatches('grupos', teams, g), playoffs: {} });
    setGroupsOpen(false);
    setView('regular');
  };

  // ── Equipos ──
  const saveTeams = (clean: Team[]) => {
    const sameSet =
      clean.length === teams.length && clean.every((t) => teams.some((o) => o.id === t.id));
    setTeamsOpen(false);
    if (sameSet) {
      update({ teams: clean });
      return;
    }
    if (isGroups) {
      const g = reconcileGroups(groups, clean);
      update({ teams: clean, groups: g, matches: buildMatches('grupos', clean, g), playoffs: {} });
      // Con equipos nuevos conviene revisar en qué grupo quedaron.
      setGroupsOpen(true);
    } else {
      update({ teams: clean, matches: buildMatches('liga', clean, groups), playoffs: {} });
    }
    setView('regular');
  };

  const resetResults = () => {
    if (!window.confirm('¿Borrar todos los resultados?')) return;
    update({ matches: matches.map((m) => ({ ...m, sa: null, sb: null })), playoffs: {} });
    setTeamsOpen(false);
    setView('regular');
  };

  const isPo = view === 'playoffs';
  const phaseName = isGroups ? 'fase de grupos' : 'fase regular';

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <img src="/escudo-real-merengual.png" alt="Escudo Real Merengual" />
          <h1>Torneo de Truco</h1>
        </div>
        <div className="header-actions">
          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={!isPo}
              className={`tab${!isPo ? ' active' : ''}`}
              onClick={() => setView('regular')}
            >
              {isGroups ? 'Fase de grupos' : 'Fase regular'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isPo}
              className={`tab${isPo ? ' active' : ''}`}
              onClick={() => setView('playoffs')}
            >
              {playoffTitle(data)}
            </button>
          </div>
          <button
            type="button"
            className="btn-outline icon"
            aria-label="Ajustes"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings size={20} strokeWidth={2.75} />
          </button>
          <button type="button" className="btn-outline" onClick={() => setTeamsOpen(true)}>
            <Users size={18} strokeWidth={2.75} />
            Equipos
          </button>
        </div>
      </header>

      <div className="views">
        <div className={`view${isPo ? ' active' : ''}`} aria-hidden={!isPo}>
          <Playoffs
            bracket={bracket}
            target={targetPo}
            phaseName={phaseName}
            onPick={(m) => setEditing({ kind: 'po', id: m.id })}
          />
        </div>
        <div className={`view${!isPo ? ' active' : ''}`} aria-hidden={isPo}>
          <main className="regular">
            <Standings tables={tables} format={format} total={playoffSize(data)} />
            <Fixture
              key={`${format}-${matches.length}-${groups.map((g) => g.id).join()}`}
              teams={teams}
              matches={matches}
              groups={isGroups ? groups : null}
              target={targetReg}
              onPick={(m) => setEditing({ kind: 'match', id: m.id })}
            />
          </main>
        </div>
      </div>

      {modal && editing && (
        <ResultModal
          key={editing.id}
          {...modal}
          onSave={saveResult}
          onClear={clearResult}
          onClose={() => setEditing(null)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          format={format}
          groups={groups}
          teamCount={teams.length}
          targetReg={targetReg}
          targetPo={targetPo}
          qualLiga={data.qualLiga}
          qualPerGroup={data.qualPerGroup}
          onTarget={(k, v) => update({ [k]: v })}
          onQual={setQual}
          onFormat={setFormat}
          onOpenGroups={() => {
            setSettingsOpen(false);
            setGroupsOpen(true);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {groupsOpen && (
        <GroupsModal
          teams={teams}
          groups={groups}
          hasResults={hasResults}
          onSave={saveGroups}
          onClose={() => setGroupsOpen(false)}
        />
      )}

      {teamsOpen && (
        <TeamsModal
          teams={teams}
          isGroups={isGroups}
          onSave={saveTeams}
          onResetResults={resetResults}
          onClose={() => setTeamsOpen(false)}
        />
      )}
    </div>
  );
}

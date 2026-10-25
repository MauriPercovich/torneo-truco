import { useEffect, useMemo, useState } from 'react';
import { Settings, Users } from 'lucide-react';
import { Standings } from './components/Standings';
import { Fixture } from './components/Fixture';
import { Playoffs } from './components/Playoffs';
import { GroupsGrid } from './components/GroupsGrid';
import { FixtureView } from './components/FixtureView';
import { ResultModal } from './components/ResultModal';
import { SettingsModal } from './components/SettingsModal';
import { TeamsModal } from './components/TeamsModal';
import { GroupsModal } from './components/GroupsModal';
import type { Format, Group, Saved, Team } from './lib/tournament';
import {
  STORAGE_KEY,
  autoGroups,
  buildMatches,
  computeTables,
  freshTournament,
  groupLetter,
  isPlayed,
  loadSaved,
  persistSaved,
  playoffSize,
  playoffTitle,
  reconcileGroups,
  suggestedGroups,
} from './lib/tournament';
import { buildBracket, dropDownstream } from './lib/bracket';

/** main = grupos (o tabla + fixture en todos contra todos) */
type View = 'main' | 'fixture' | 'playoffs';
type Editing = { kind: 'match' | 'po'; id: string } | null;

const params = new URLSearchParams(window.location.search);
const initialView: View =
  params.get('vista') === 'fixture' ? 'fixture' : params.get('vista') === 'playoff' ? 'playoffs' : 'main';
/** Ventana aparte abierta desde "Abrir en otra ventana". */
const isPopout = params.get('vista') === 'fixture';

export default function App() {
  const [data, setData] = useState<Saved>(loadSaved);
  const [view, setView] = useState<View>(initialView);
  const [editing, setEditing] = useState<Editing>(null);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [fixtureFilter, setFixtureFilter] = useState<string | null>(null);

  const { format, teams, groups, matches, playoffs, targetReg, targetPo } = data;
  const isGroups = format === 'grupos';
  const currentView: View = !isGroups && view === 'fixture' ? 'main' : view;

  const update = (patch: Partial<Saved>) => setData((d) => ({ ...d, ...patch }));

  useEffect(() => persistSaved(data), [data]);

  // Si el torneo se edita en otra ventana (ej. el fixture abierto aparte), esta se actualiza sola.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) setData(loadSaved());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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

  const tbl = useMemo(() => computeTables(data), [data]);
  const played = matches.filter(isPlayed).length;
  const bracket = useMemo(
    () => buildBracket(tbl, playoffs, { played, total: matches.length }),
    [tbl, playoffs, played, matches.length],
  );
  const hasResults = played > 0 || Object.keys(playoffs).length > 0;
  const nRounds = bracket.rounds.length;
  const confirmReset = (msg: string) => !hasResults || window.confirm(msg);

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
      label: isGroups && gi >= 0 ? `Grupo ${groupLetter(gi)} · Fecha ${m.round}` : `Fecha ${m.round}`,
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

  // ── Formato, grupos y clasificados ──
  const setFormat = (f: Format) => {
    if (f === format) return;
    if (!confirmReset('Cambiar el formato rearma el fixture y borra todos los resultados. ¿Seguir?')) return;
    if (f === 'grupos') {
      const base = groups.length ? groups : autoGroups(teams.map((t) => t.id), suggestedGroups(teams.length));
      const g = reconcileGroups(base, teams);
      update({ format: f, groups: g, matches: buildMatches(f, teams, g), playoffs: {} });
    } else {
      update({ format: f, matches: buildMatches(f, teams, groups), playoffs: {} });
    }
    setFixtureFilter(null);
    setView('main');
  };

  const setGroupCount = (n: number) => {
    if (n === groups.length) return;
    if (!confirmReset('Cambiar la cantidad de grupos los rearma y borra los resultados. ¿Seguir?')) return;
    const g = autoGroups(teams.map((t) => t.id), n);
    update({ groups: g, matches: buildMatches('grupos', teams, g), playoffs: {} });
    setFixtureFilter(null);
  };

  const setQual = (patch: Partial<Saved>) => {
    if (
      Object.keys(playoffs).length > 0 &&
      !window.confirm('Cambiar los clasificados rearma el playoff y borra sus resultados. ¿Seguir?')
    )
      return;
    update({ ...patch, playoffs: {} });
  };

  const saveGroups = (g: Group[]) => {
    update({ groups: g, matches: buildMatches('grupos', teams, g), playoffs: {} });
    setGroupsOpen(false);
    setFixtureFilter(null);
    setView('main');
  };

  const newTournament = () => {
    if (!window.confirm('¿Empezar un torneo nuevo? Se borran equipos, grupos y resultados actuales.')) return;
    setData(freshTournament());
    setSettingsOpen(false);
    setFixtureFilter(null);
    setView('main');
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
      // Si cambió mucho la cantidad, se rearman los grupos de a 4; si no, se suman al más chico.
      const big = Math.abs(clean.length - teams.length) > groups.length;
      const g = big
        ? autoGroups(clean.map((t) => t.id), suggestedGroups(clean.length))
        : reconcileGroups(groups, clean);
      update({ teams: clean, groups: g, matches: buildMatches('grupos', clean, g), playoffs: {} });
      setGroupsOpen(true);
    } else {
      update({ teams: clean, matches: buildMatches('liga', clean, groups), playoffs: {} });
    }
    setFixtureFilter(null);
    setView('main');
  };

  const resetResults = () => {
    if (!window.confirm('¿Borrar todos los resultados?')) return;
    update({ matches: matches.map((m) => ({ ...m, sa: null, sb: null })), playoffs: {} });
    setTeamsOpen(false);
    setView('main');
  };

  const openPopout = () => {
    const url = `${window.location.pathname}?vista=fixture`;
    window.open(url, 'torneo-truco-fixture', 'width=1200,height=900');
  };

  const phaseName = isGroups ? 'fase de grupos' : 'fase regular';
  const tabs: [View, string][] = isGroups
    ? [
        ['main', 'Grupos'],
        ['fixture', 'Fixture'],
        ['playoffs', playoffTitle(data)],
      ]
    : [
        ['main', 'Fase regular'],
        ['playoffs', playoffTitle(data)],
      ];

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <img src="/escudo-real-merengual.png" alt="Escudo Real Merengual" />
          <h1>Torneo de Truco</h1>
        </div>
        <div className="header-actions">
          <div className="tabs" role="tablist">
            {tabs.map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={currentView === v}
                className={`tab${currentView === v ? ' active' : ''}`}
                onClick={() => setView(v)}
              >
                {label}
              </button>
            ))}
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
        <div className={`view${currentView === 'playoffs' ? ' active' : ''}`} aria-hidden={currentView !== 'playoffs'}>
          <Playoffs
            bracket={bracket}
            target={targetPo}
            phaseName={phaseName}
            onPick={(m) => setEditing({ kind: 'po', id: m.id })}
          />
        </div>
        {isGroups && (
          <div className={`view${currentView === 'fixture' ? ' active' : ''}`} aria-hidden={currentView !== 'fixture'}>
            <FixtureView
              teams={teams}
              matches={matches}
              groups={groups}
              target={targetReg}
              filter={groups.some((g) => g.id === fixtureFilter) ? fixtureFilter : null}
              onFilter={setFixtureFilter}
              onPick={(m) => setEditing({ kind: 'match', id: m.id })}
              onPopout={isPopout ? null : openPopout}
            />
          </div>
        )}
        <div className={`view${currentView === 'main' ? ' active' : ''}`} aria-hidden={currentView !== 'main'}>
          {isGroups ? (
            <GroupsGrid
              data={tbl}
              played={played}
              total={matches.length}
              onOpenGroup={(id) => {
                setFixtureFilter(id);
                setView('fixture');
              }}
            />
          ) : (
            <main className="regular">
              <Standings tables={tbl.tables} format={format} total={playoffSize(data)} />
              <Fixture
                key={`${format}-${matches.length}`}
                teams={teams}
                matches={matches}
                groups={null}
                target={targetReg}
                onPick={(m) => setEditing({ kind: 'match', id: m.id })}
              />
            </main>
          )}
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
          qualTotal={data.qualTotal}
          onTarget={(k, v) => update({ [k]: v })}
          onQualLiga={(v) => setQual({ qualLiga: v })}
          onQualTotal={(v) => setQual({ qualTotal: v })}
          onFormat={setFormat}
          onGroupCount={setGroupCount}
          onOpenGroups={() => {
            setSettingsOpen(false);
            setGroupsOpen(true);
          }}
          onNewTournament={newTournament}
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

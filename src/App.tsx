import { useEffect, useMemo, useState } from 'react';
import { Settings, Users } from 'lucide-react';
import { Standings } from './components/Standings';
import { Fixture } from './components/Fixture';
import { Playoffs } from './components/Playoffs';
import { ResultModal } from './components/ResultModal';
import { SettingsModal } from './components/SettingsModal';
import { TeamsModal } from './components/TeamsModal';
import type { Saved, Team } from './lib/tournament';
import {
  PO_LABELS,
  computeBracket,
  computeStandings,
  isPlayed,
  isPoKey,
  loadSaved,
  persistSaved,
  roundRobin,
} from './lib/tournament';

type View = 'regular' | 'playoffs';

export default function App() {
  const [data, setData] = useState<Saved>(loadSaved);
  const [view, setView] = useState<View>('regular');
  const [editId, setEditId] = useState<string | null>(null);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { teams, matches, playoffs, targetReg, targetPo } = data;

  const update = (patch: Partial<Saved>) => setData((d) => ({ ...d, ...patch }));

  useEffect(() => persistSaved(data), [data]);

  // Esc cierra cualquier modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditId(null);
        setTeamsOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rows = useMemo(() => computeStandings(teams, matches), [teams, matches]);
  const bracket = useMemo(
    () => computeBracket(rows, matches, playoffs),
    [rows, matches, playoffs],
  );

  // ── Modal de resultado ──
  const editing = (() => {
    if (!editId) return null;
    if (isPoKey(editId)) {
      const r = bracket.result(editId);
      return {
        label: PO_LABELS[editId],
        aName: bracket.sideA[editId]?.name ?? '—',
        bName: bracket.sideB[editId]?.name ?? '—',
        initial: r ? { sa: r.sa, sb: r.sb } : { sa: 0, sb: 0 },
        target: targetPo,
        hasResult: !!r,
      };
    }
    const m = matches.find((x) => x.id === editId);
    if (!m) return null;
    const name = (id: string) => teams.find((t) => t.id === id)?.name ?? '—';
    return {
      label: `Fecha ${m.round}`,
      aName: name(m.a),
      bName: name(m.b),
      initial: { sa: m.sa ?? 0, sb: m.sb ?? 0 },
      target: targetReg,
      hasResult: isPlayed(m),
    };
  })();

  const saveResult = (sa: number, sb: number) => {
    if (!editId || sa === sb) return;
    if (isPoKey(editId)) {
      const next = { ...playoffs, [editId]: { sa, sb } };
      const prev = playoffs[editId];
      // Si cambia el ganador de una semi, la final queda sin efecto.
      if (editId !== 'f' && prev && prev.sa > prev.sb !== sa > sb) delete next.f;
      update({ playoffs: next });
    } else {
      update({ matches: matches.map((m) => (m.id === editId ? { ...m, sa, sb } : m)) });
    }
    setEditId(null);
  };

  const clearResult = () => {
    if (!editId) return;
    if (isPoKey(editId)) {
      const next = { ...playoffs };
      delete next[editId];
      if (editId !== 'f') delete next.f;
      update({ playoffs: next });
    } else {
      update({
        matches: matches.map((m) => (m.id === editId ? { ...m, sa: null, sb: null } : m)),
      });
    }
    setEditId(null);
  };

  // ── Equipos ──
  const saveTeams = (clean: Team[]) => {
    const sameSet =
      clean.length === teams.length && clean.every((t) => teams.some((o) => o.id === t.id));
    if (sameSet) {
      update({ teams: clean });
    } else {
      update({ teams: clean, matches: roundRobin(clean.map((t) => t.id)), playoffs: {} });
      setView('regular');
    }
    setTeamsOpen(false);
  };

  const resetResults = () => {
    if (!window.confirm('¿Borrar todos los resultados?')) return;
    update({ matches: matches.map((m) => ({ ...m, sa: null, sb: null })), playoffs: {} });
    setTeamsOpen(false);
    setView('regular');
  };

  const isPo = view === 'playoffs';

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
              Fase regular
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isPo}
              className={`tab${isPo ? ' active' : ''}`}
              onClick={() => setView('playoffs')}
            >
              Semis y final
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
            rows={rows}
            bracket={bracket}
            target={targetPo}
            onPick={(k) => setEditId(k)}
          />
        </div>
        <div className={`view${!isPo ? ' active' : ''}`} aria-hidden={isPo}>
          <main className="regular">
            <Standings rows={rows} />
            <Fixture
              teams={teams}
              matches={matches}
              target={targetReg}
              onPick={(m) => setEditId(m.id)}
            />
          </main>
        </div>
      </div>

      {editing && (
        <ResultModal
          key={editId}
          {...editing}
          onSave={saveResult}
          onClear={clearResult}
          onClose={() => setEditId(null)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          targetReg={targetReg}
          targetPo={targetPo}
          onChange={(k, v) => update({ [k]: v })}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {teamsOpen && (
        <TeamsModal
          teams={teams}
          onSave={saveTeams}
          onResetResults={resetResults}
          onClose={() => setTeamsOpen(false)}
        />
      )}
    </div>
  );
}

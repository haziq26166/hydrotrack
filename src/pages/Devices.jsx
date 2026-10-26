import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FaDroplet, FaCirclePlus, FaPencil, FaTrashCan, FaCircleCheck,
  FaMagnifyingGlass, FaWifi, FaBarsStaggered, FaPlugCircleXmark,
} from 'react-icons/fa6';
import { database, ref, set, update, onValue } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { useDevices } from '@/hooks/useDevices';
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EditDeviceModal } from '@/components/devices/EditDeviceModal';

/* ============================================================
   STALENESS THRESHOLD — matches useDeviceStatus on the Dashboard
   ============================================================ */
const STALE_THRESHOLD_MS = 60_000;

export default function Devices() {
  const { user } = useAuth();
  const { openAddDevice } = useOutletContext();
  const { devices, loading } = useDevices(user.uid);

  const [liveMap, setLiveMap]           = useState({});
  const [defaultId, setDefaultId]       = useState(null);
  const [editorMode, setEditorMode]     = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch]             = useState('');
  const [sortBy, setSortBy]             = useState('name');

  /* ---- Single shared clock — one tick drives all cards ---- */
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  /* ---- Live data subscriptions ---- */
  useEffect(() => {
    const unsubs = [];
    Object.keys(devices).forEach((id) => {
      const unsub = onValue(ref(database, `devices/${id}/live_data`), (snap) => {
        setLiveMap((prev) => ({ ...prev, [id]: snap.val() || {} }));
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((u) => u());
  }, [devices]);

  /* ---- Default device preference ---- */
  useEffect(() => {
    const unsub = onValue(
      ref(database, `users/${user.uid}/default_device_id`),
      (snap) => setDefaultId(snap.val() || null)
    );
    return unsub;
  }, [user.uid]);

  /* ---- Filter + sort ---- */
  const list = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = Object.values(devices).filter(
      (d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)
    );
    return filtered.sort((a, b) => {
      const la = liveMap[a.id] || {}, lb = liveMap[b.id] || {};
      switch (sortBy) {
        case 'status': return String(lb.leak_status || '').localeCompare(String(la.leak_status || ''));
        case 'flow':   return Number(lb.current_flow || 0) - Number(la.current_flow || 0);
        case 'volume': return Number(lb.todays_usage || 0) - Number(la.todays_usage || 0);
        case 'date':   return (b.linkedAt || 0) - (a.linkedAt || 0);
        default:       return a.name.localeCompare(b.name);
      }
    });
  }, [devices, liveMap, search, sortBy]);

  async function setAsDefault(id) {
    await set(ref(database, `users/${user.uid}/default_device_id`), id);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;

    await update(ref(database), {
      [`users/${user.uid}/user_devices/${id}`]: null,
      [`devices/${id}/claimed_by`]:             null,
    });

    setDeleteTarget(null);
  }

  return (
    <>
      <TopBar title="Devices" icon={FaDroplet} />

      {/* ============================================================
          TOOLBAR
          ============================================================ */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <FaMagnifyingGlass
            size={15}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by device name or ID…"
            className="hydro-input !pl-10"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="hydro-input w-auto cursor-pointer !pl-4"
        >
          <option value="name">Sort: Name (A–Z)</option>
          <option value="status">Sort: Status</option>
          <option value="flow">Sort: Flow (High → Low)</option>
          <option value="volume">Sort: Volume (High → Low)</option>
          <option value="date">Sort: Newest</option>
        </select>

        <div className="ml-auto flex items-center gap-3">
          <GlassButton
            leftIcon={<FaCirclePlus size={16} />}
            onClick={openAddDevice}
          >
            Add Device
          </GlassButton>

          <GlassButton
            variant="ghost"
            onClick={() => setEditorMode((m) => !m)}
            className={editorMode ? 'ring-2 ring-hydro/30' : ''}
          >
            {editorMode ? 'Done' : 'Manage'}
          </GlassButton>
        </div>
      </div>

      {/* ============================================================
          CONTENT
          ============================================================ */}
      {loading ? (
        <GlassCard className="py-16 text-center text-slate-500">
          Loading devices…
        </GlassCard>
      ) : list.length === 0 ? (
        <EmptyState onAdd={openAddDevice} hasDevices={Object.keys(devices).length > 0} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d) => (
            <DeviceCard
              key={d.id}
              device={d}
              live={liveMap[d.id] || {}}
              isDefault={d.id === defaultId}
              editorMode={editorMode}
              now={now}
              onSetDefault={() => setAsDefault(d.id)}
              onEdit={() => setEditTarget({ id: d.id, name: d.name })}
              onDelete={() => setDeleteTarget({ id: d.id, name: d.name })}
            />
          ))}
        </div>
      )}

      <EditDeviceModal
        open={Boolean(editTarget)}
        device={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => setEditTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Unlink device"
        message={`Unlink "${deleteTarget?.name}" from your account? The device's history and alerts will be preserved on the server.`}
        confirmLabel="Unlink Device"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

/* ============================================================
   DEVICE CARD — extracted so status logic stays isolated
   ============================================================ */

function DeviceCard({
  device,
  live,
  isDefault,
  editorMode,
  now,
  onSetDefault,
  onEdit,
  onDelete,
}) {
  const ts = Number(live?.timestamp || 0);
  const isOnline = ts > 0 && (now - ts) < STALE_THRESHOLD_MS;
  const secondsAgo = ts > 0 ? Math.floor((now - ts) / 1000) : null;

  /* Raw values from RTDB */
  const rawFlow = Number(live.current_flow || 0);
  const usage   = Number(live.todays_usage || 0);

  /* When offline, force flow to zero — the stale value is misleading.
     Usage is cumulative, so we keep it (it's still meaningful). */
  const flow = isOnline ? rawFlow : 0;

  const isAlert = isOnline && (live.leak_status === 'LEAK' || live.leak_status === 'ALERT');
  const isActive = isOnline && (flow > 0 || live.leak_status === 'ACTIVE');

  /* ---- Derived visual state ---- */
  const state = !isOnline ? 'offline' : isAlert ? 'alert' : isActive ? 'active' : 'idle';

  /* ---- Icon badge tint ---- */
  const iconCls = {
    offline: 'bg-slate-300',
    idle:    'bg-slate-300',
    active:  'bg-mint-500',
    alert:   'bg-red-500 animate-pulse',
  }[state];

  /* ---- Status label ---- */
  const statusLabel = {
    offline: 'Offline',
    idle:    'Idle',
    active:  'Active',
    alert:   'Leak',
  }[state];

  /* ---- Status dot tint ---- */
  const dotCls = {
    offline: 'bg-slate-300',
    idle:    'bg-slate-300',
    active:  'bg-mint-500',
    alert:   'bg-red-500',
  }[state];

  return (
    <GlassCard padded={false} className="overflow-hidden">

      {/* ============================================================
          HEADER
          ============================================================ */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-800">
            {device.name}
          </h3>
          <code className="mt-0.5 block font-mono text-[11px] text-slate-500">
            {device.id}
          </code>
        </div>

        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow-sm ${iconCls}`}
          title={statusLabel}
        >
          {state === 'offline'
            ? <FaPlugCircleXmark size={14} />
            : <FaWifi size={14} />}
        </span>
      </div>

      {/* ============================================================
          BODY — live metrics
          ============================================================ */}
      <div className="grid grid-cols-2 gap-3 px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Flow
          </p>
          <p className="mt-1 flex items-baseline gap-1">
            <span
              className={[
                'text-lg font-bold transition-colors',
                isOnline ? 'text-slate-800' : 'text-slate-400',
              ].join(' ')}
            >
              {flow.toFixed(1)}
            </span>
            <span
              className={[
                'text-xs font-semibold',
                isOnline ? 'text-hydro-600' : 'text-slate-400',
              ].join(' ')}
            >
              LPM
            </span>
          </p>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Today
          </p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-bold text-slate-800">
              {usage.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-hydro-600">L</span>
          </p>
        </div>
      </div>

      {/* ============================================================
          OFFLINE SUBTITLE (only when offline)
          ============================================================ */}
      {!isOnline && (
        <div className="-mt-2 px-5 pb-3 text-[11px] text-slate-400">
          {secondsAgo !== null
            ? `Last seen ${formatAgo(secondsAgo)}`
            : 'Never connected'}
        </div>
      )}

      {/* ============================================================
          FOOTER — status + actions
          ============================================================ */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotCls}`} />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isDefault ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-hydro-100 px-2 py-1 text-[10px] font-bold uppercase text-hydro-700">
              <FaCircleCheck size={10} /> Default
            </span>
          ) : (
            <button
              onClick={onSetDefault}
              className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-slate-500 transition hover:bg-hydro-50 hover:text-hydro-700"
              title="Set as default device"
            >
              Set Default
            </button>
          )}

          {editorMode && (
            <>
              <button
                onClick={onEdit}
                className="grid h-7 w-7 place-items-center rounded-lg bg-white text-slate-500 transition hover:bg-hydro-50 hover:text-hydro-700"
                title="Edit"
              >
                <FaPencil size={11} />
              </button>
              <button
                onClick={onDelete}
                className="grid h-7 w-7 place-items-center rounded-lg bg-white text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                title="Unlink"
              >
                <FaTrashCan size={11} />
              </button>
            </>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */

function formatAgo(seconds) {
  if (seconds < 60)    return `${seconds}s ago`;
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/* ============================================================
   EMPTY STATES
   ============================================================ */

function EmptyState({ onAdd, hasDevices }) {
  if (hasDevices) {
    return (
      <GlassCard className="py-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <FaMagnifyingGlass size={22} />
        </span>
        <h3 className="mt-4 text-base font-bold text-slate-800">No matching devices</h3>
        <p className="mt-1 text-sm text-slate-500">
          Try a different search term.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="py-16 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-hydro/10 text-hydro">
        <FaBarsStaggered size={26} />
      </span>
      <h3 className="mt-5 text-lg font-bold text-slate-800">
        No devices linked yet
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
        Link your HydroTrack hardware to start receiving live flow readings and alerts.
      </p>
      <div className="mt-6 flex justify-center">
        <GlassButton
          leftIcon={<FaCirclePlus size={16} />}
          onClick={onAdd}
        >
          Add Your First Device
        </GlassButton>
      </div>
    </GlassCard>
  );
}
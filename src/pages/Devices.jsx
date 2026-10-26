// File: src/pages/Devices.jsx
import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FaDroplet, FaPlus, FaPencil, FaTrashCan,
  FaMagnifyingGlass, FaBarsStaggered, FaChevronDown,
} from 'react-icons/fa6';
import { database, ref, set, update, onValue } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { useDeviceFleet, statusRank } from '@/hooks/useDeviceFleet';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';
import { EditDeviceModal } from '@/components/devices/EditDeviceModal';
import {
  DeviceCollection, ViewToggle, MANY_DEVICES,
} from '@/components/dashboard/DeviceCollection';
import { plural } from '@/lib/format';

export default function Devices() {
  const { user } = useAuth();
  const { openAddDevice } = useOutletContext();
  const { list, loading } = useDeviceFleet(user.uid);

  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [defaultId, setDefaultId]       = useState(null);
  const [editorMode, setEditorMode]     = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [search, setSearch]             = useState('');
  const [sortBy, setSortBy]             = useState('name');
  const [view, setView]                 = useState('cards');
  const [viewTouched, setViewTouched]   = useState(false);
  const [toast, setToast]               = useState(null);

  /* ---- Default device preference ---- */
  useEffect(() => {
    const unsub = onValue(
      ref(database, `users/${user.uid}/default_device_id`),
      (snap) => setDefaultId(snap.val() || null),
    );
    return unsub;
  }, [user.uid]);

  /* ---- Filter + sort ---- */
  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = list.filter(
      (d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q),
    );

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'status': return statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name);
        case 'flow':   return b.flow - a.flow;
        case 'volume': return b.usage - a.usage;
        case 'date':   return (b.linkedAt || 0) - (a.linkedAt || 0);
        default:       return a.name.localeCompare(b.name);
      }
    });
  }, [list, search, sortBy]);

  /* From 6 devices up the list is the default, unless the user chose a view. */
  const many = list.length >= MANY_DEVICES;
  const effectiveView = !many ? 'cards' : !isDesktop ? 'list' : viewTouched ? view : 'list';

  async function setAsDefault(id) {
    try {
      await set(ref(database, `users/${user.uid}/default_device_id`), id);
    } catch (err) {
      setToast({ type: 'error', message: 'Could not set the default device.' });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleting(true);

    try {
      await update(ref(database), {
        [`users/${user.uid}/user_devices/${id}`]: null,
        [`devices/${id}/claimed_by`]:             null,
      });
      setToast({ type: 'success', message: `“${name}” was unlinked.` });
      setDeleteTarget(null);
    } catch (err) {
      setToast({ type: 'error', message: 'Could not unlink the device. Please try again.' });
    } finally {
      setDeleting(false);
    }
  }

  /* Per-device actions: default tag/button, plus edit + unlink in Manage mode */
  const renderActions = (d) => (
    <>
      {d.id !== defaultId && (
        <button
          type="button"
          onClick={() => setAsDefault(d.id)}
          title="Set as default device"
          className="rounded-xl bg-white/70 px-2.5 py-1.5 text-[11px] font-bold text-ink-500 transition-colors hover:bg-white hover:text-hydro-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/30"
        >
          Set default
        </button>
      )}

      {editorMode && (
        <>
          <button
            type="button"
            onClick={() => setEditTarget({ id: d.id, name: d.name })}
            aria-label={`Edit ${d.name}`}
            title="Edit"
            className="grid h-8 w-8 place-items-center rounded-xl bg-white/70 text-ink-500 transition-colors hover:bg-white hover:text-hydro-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/30"
          >
            <FaPencil size={11} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget({ id: d.id, name: d.name })}
            aria-label={`Unlink ${d.name}`}
            title="Unlink"
            className="grid h-8 w-8 place-items-center rounded-xl bg-white/70 text-ink-500 transition-colors hover:bg-coral-50 hover:text-coral-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/30"
          >
            <FaTrashCan size={11} />
          </button>
        </>
      )}
    </>
  );

  return (
    <>
      <TopBar
        title="Devices"
        icon={FaDroplet}
        subtitle={loading ? 'Loading devices…' : `${plural(list.length, 'device')} linked`}
      />

      {/* ============================================================
          TOOLBAR
          ============================================================ */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <FaMagnifyingGlass size={14} className="hydro-input-icon" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by device name or ID…"
            aria-label="Search devices"
            className="hydro-input !pl-10"
          />
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort devices"
            className="hydro-input w-auto cursor-pointer appearance-none !pr-10"
          >
            <option value="name">Sort: Name (A–Z)</option>
            <option value="status">Sort: Needs attention</option>
            <option value="flow">Sort: Flow (High → Low)</option>
            <option value="volume">Sort: Volume (High → Low)</option>
            <option value="date">Sort: Newest</option>
          </select>
          <FaChevronDown
            size={11}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-400"
          />
        </div>

        {many && (
          <ViewToggle
            value={effectiveView}
            onChange={(v) => { setView(v); setViewTouched(true); }}
            className="hidden md:flex"
          />
        )}

        <div className="ml-auto flex items-center gap-3">
          <GlassButton leftIcon={<FaPlus size={12} />} onClick={openAddDevice}>
            Add Device
          </GlassButton>

          <GlassButton
            variant="ghost"
            aria-pressed={editorMode}
            onClick={() => setEditorMode((m) => !m)}
            className={editorMode ? '!border-hydro/40 !bg-hydro-50 !text-hydro-700' : ''}
          >
            {editorMode ? 'Done' : 'Manage'}
          </GlassButton>
        </div>
      </div>

      {/* ============================================================
          CONTENT
          ============================================================ */}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-56 !rounded-3xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState onAdd={openAddDevice} hasDevices={list.length > 0} />
      ) : (
        <DeviceCollection
          devices={visible}
          view={effectiveView}
          defaultId={defaultId}
          renderActions={renderActions}
        />
      )}

      <EditDeviceModal
        open={Boolean(editTarget)}
        device={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null);
          setToast({ type: 'success', message: 'Device name updated.' });
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Unlink device"
        message={`Unlink “${deleteTarget?.name}” from your account? The device's history and alerts will be preserved on the server.`}
        confirmLabel="Unlink device"
        danger
        loading={deleting}
        onCancel={() => !deleting && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

/* ============================================================
   EMPTY STATES
   ============================================================ */

function EmptyState({ onAdd, hasDevices }) {
  if (hasDevices) {
    return (
      <GlassCard className="py-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink-50 text-ink-400">
          <FaMagnifyingGlass size={20} />
        </span>
        <h3 className="mt-4 text-base font-bold text-ink-900">No matching devices</h3>
        <p className="mt-1 text-sm text-ink-500">Try a different search term.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="strong" padded="lg" className="py-16 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-hydro-gradient text-white shadow-brand">
        <FaBarsStaggered size={24} />
      </span>
      <h3 className="mt-5 text-xl font-extrabold tracking-tight text-ink-900">No devices linked yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
        Link your HydroTrack hardware to start receiving live flow readings and alerts.
      </p>
      <div className="mt-6 flex justify-center">
        <GlassButton leftIcon={<FaPlus size={12} />} onClick={onAdd}>
          Add your first device
        </GlassButton>
      </div>
    </GlassCard>
  );
}
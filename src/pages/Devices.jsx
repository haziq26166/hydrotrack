import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FaDroplet, FaPlus, FaPencil, FaTrashCan,
  FaMagnifyingGlass, FaBarsStaggered, FaChevronLeft, FaChevronRight,
} from 'react-icons/fa6';
import { database, ref, set, update } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { useDeviceFleet, statusRank } from '@/hooks/useDeviceFleet';
import { useDefaultDevice } from '@/hooks/useDefaultDevice';
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';
import { EditDeviceModal } from '@/components/devices/EditDeviceModal';
import { DeviceTable } from '@/components/devices/DeviceTable';
import { plural } from '@/lib/format';

const PAGE_SIZES = [10, 25, 50, 100];

export default function Devices() {
  const { user } = useAuth();
  const { openAddDevice } = useOutletContext();
  const { list, loading } = useDeviceFleet(user.uid);
  const { defaultId } = useDefaultDevice(user.uid);

  const [editorMode, setEditorMode]     = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(25);
  const [toast, setToast]               = useState(null);

  /* ---- Filter. Fixed order: problem devices first, then A–Z. ---- */
  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return list
      .filter((d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q))
      .sort((a, b) => statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name));
  }, [list, search]);

  /* ---- Pagination ---- */
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage  = Math.min(page, pageCount);
  const start     = (safePage - 1) * pageSize;
  const pageRows  = visible.slice(start, start + pageSize);

  useEffect(() => { setPage(1); }, [search, pageSize]);

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
      const updates = {
        [`users/${user.uid}/user_devices/${id}`]: null,
        [`devices/${id}/claimed_by`]:             null,
      };
      /* Don't leave a dangling default-device pointer behind. */
      if (id === defaultId) updates[`users/${user.uid}/default_device_id`] = null;

      await update(ref(database), updates);
      setToast({ type: 'success', message: `“${name}” was unlinked.` });
      setDeleteTarget(null);
    } catch (err) {
      setToast({ type: 'error', message: 'Could not unlink the device. Please try again.' });
    } finally {
      setDeleting(false);
    }
  }

  /* Per-row actions: "Set default", plus edit + unlink in Manage mode */
  const renderActions = (d) => (
    <>
      {d.id !== defaultId && (
        <button
          type="button"
          onClick={() => setAsDefault(d.id)}
          title="Set as default device"
          className="h-7 rounded px-2 text-xs font-semibold text-ink-600 transition-colors hover:bg-hydro-50 hover:text-hydro-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hydro/40"
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
            className="grid h-7 w-7 place-items-center rounded text-ink-500 transition-colors hover:bg-ink-100 hover:text-hydro-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hydro/40"
          >
            <FaPencil size={11} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget({ id: d.id, name: d.name })}
            aria-label={`Unlink ${d.name}`}
            title="Unlink"
            className="grid h-7 w-7 place-items-center rounded text-ink-500 transition-colors hover:bg-coral-50 hover:text-coral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hydro/40"
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
          TOOLBAR — search on top, actions one level below
          ============================================================ */}
      <div className="mb-3 space-y-2">
        <div className="relative">
          <FaMagnifyingGlass size={13} className="hydro-input-icon" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by device name or ID…"
            aria-label="Search devices"
            className="hydro-input !pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <GlassButton leftIcon={<FaPlus size={11} />} onClick={openAddDevice}>
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
          TABLE
          ============================================================ */}
      {loading ? (
        <GlassCard padded={false} className="space-y-px overflow-hidden" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-11 !rounded-none" />)}
        </GlassCard>
      ) : visible.length === 0 ? (
        <EmptyState onAdd={openAddDevice} hasDevices={list.length > 0} />
      ) : (
        <GlassCard padded={false} className="overflow-hidden">
          <DeviceTable devices={pageRows} defaultId={defaultId} renderActions={renderActions} />

          {/* ---- Pagination footer ---- */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-500">
            <p>
              Showing{' '}
              <span className="font-semibold text-ink-800">
                {start + 1}–{Math.min(start + pageSize, visible.length)}
              </span>{' '}
              of <span className="font-semibold text-ink-800">{visible.length}</span>
            </p>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5">
                Rows
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  aria-label="Rows per page"
                  className="h-7 rounded border border-ink-200 bg-white px-1.5 text-xs font-semibold text-ink-700 focus:outline-none focus:ring-2 focus:ring-hydro/20"
                >
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>

              <div className="flex items-center gap-1">
                <GlassButton
                  variant="ghost"
                  size="icon"
                  className="!h-7 !w-7"
                  aria-label="Previous page"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  <FaChevronLeft size={10} />
                </GlassButton>
                <span className="min-w-[4.5rem] text-center font-semibold tabular-nums text-ink-700">
                  {safePage} / {pageCount}
                </span>
                <GlassButton
                  variant="ghost"
                  size="icon"
                  className="!h-7 !w-7"
                  aria-label="Next page"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage(safePage + 1)}
                >
                  <FaChevronRight size={10} />
                </GlassButton>
              </div>
            </div>
          </div>
        </GlassCard>
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
      <GlassCard className="py-12 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink-50 text-ink-400">
          <FaMagnifyingGlass size={16} />
        </span>
        <h3 className="mt-3 text-sm font-semibold text-ink-900">No matching devices</h3>
        <p className="mt-1 text-xs text-ink-500">Try a different search term.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard padded="lg" className="py-14 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-hydro text-white">
        <FaBarsStaggered size={18} />
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink-900">No devices linked yet</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-500">
        Link your HydroTrack hardware to start receiving live flow readings and alerts.
      </p>
      <div className="mt-5 flex justify-center">
        <GlassButton leftIcon={<FaPlus size={11} />} onClick={onAdd}>
          Add your first device
        </GlassButton>
      </div>
    </GlassCard>
  );
}
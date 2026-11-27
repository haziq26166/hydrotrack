import { useEffect, useState } from 'react';
import {
  FaGear, FaFloppyDisk, FaBell, FaMicrochip,
  FaMoon, FaSliders, FaPencil, FaUsers,
} from 'react-icons/fa6';
import { database, ref, onValue, update, get } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { useDevices } from '@/hooks/useDevices';
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { Notice } from '@/components/ui/Notice';
import { SwitchRow } from '@/components/ui/Switch';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { DeviceCombobox } from '@/components/devices/DeviceCombobox';
import { Toast } from '@/components/ui/Toast';
import { DEFAULT_DEVICE_SETTINGS } from '@/lib/deviceDefaults';
import {
  computeThresholds, clampHousehold,
  DEFAULT_HOUSEHOLD_SIZE, HOUSEHOLD_MIN, HOUSEHOLD_MAX,
} from '@/lib/thresholds';

const D = DEFAULT_DEVICE_SETTINGS;

const DEFAULT_FORM = {
  alerts_enabled:           D.alerts_enabled,
  off_hours_alerts_enabled: D.off_hours_alerts_enabled,
  off_hours_start:          D.off_hours_start,
  off_hours_end:            D.off_hours_end,
  household_size:           DEFAULT_HOUSEHOLD_SIZE,
};

/* Returns an error message, or null when every value is acceptable. */
function validateSettings(f) {
  if (!f.off_hours_start || !f.off_hours_end) {
    return 'Please choose both a start and an end time for off-hours.';
  }
  if (f.off_hours_start === f.off_hours_end) {
    return 'Off-hours start and end must differ.';
  }
  if (!Number.isInteger(f.household_size)
      || f.household_size < HOUSEHOLD_MIN
      || f.household_size > HOUSEHOLD_MAX) {
    return `Household size must be between ${HOUSEHOLD_MIN} and ${HOUSEHOLD_MAX}.`;
  }
  return null;
}

/* Reads a device's saved settings into the form shape. */
async function readDeviceSettings(id) {
  const snap = await get(ref(database, `devices/${id}/settings`));
  const s = snap.val() || {};
  return {
    alerts_enabled:           s.alerts_enabled           !== false,
    off_hours_alerts_enabled: s.off_hours_alerts_enabled !== false,
    off_hours_start:          s.off_hours_start          ?? D.off_hours_start,
    off_hours_end:            s.off_hours_end            ?? D.off_hours_end,
    household_size:           clampHousehold(s.household_size ?? DEFAULT_HOUSEHOLD_SIZE),
  };
}

export default function Settings() {
  const { user } = useAuth();
  const { devices } = useDevices(user.uid);

  const [deviceId, setDeviceId]     = useState(null);
  const [emailNotif, setEmailNotif] = useState(true);
  const [toast, setToast]           = useState(null);

  const [form, setForm]         = useState(DEFAULT_FORM);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving]     = useState(false);

  /* Pick the first device, or a new one if the selected device was unlinked. */
  useEffect(() => {
    const ids = Object.keys(devices);
    if (ids.length && (!deviceId || !devices[deviceId])) setDeviceId(ids[0]);
  }, [devices, deviceId]);

  useEffect(() => {
    const unsub = onValue(
      ref(database, `users/${user.uid}/settings/email_notifications`),
      (snap) => setEmailNotif(snap.val() !== false)
    );
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    if (!deviceId) return undefined;
    let cancelled = false;

    setEditMode(false);
    readDeviceSettings(deviceId)
      .then((loaded) => { if (!cancelled) setForm(loaded); })
      .catch(() => {
        if (!cancelled) setToast({ type: 'error', message: 'Could not load device settings.' });
      });

    return () => { cancelled = true; };
  }, [deviceId]);

  const setField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function toggleEmail(v) {
    const previous = emailNotif;
    setEmailNotif(v);
    try {
      await update(ref(database, `users/${user.uid}/settings`), {
        email_notifications: v,
      });
      setToast({
        type: 'success',
        message: `Email notifications ${v ? 'enabled' : 'disabled'}.`,
      });
    } catch (err) {
      setEmailNotif(previous);
      setToast({ type: 'error', message: 'Could not update notification preference.' });
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!deviceId || !editMode) return;

    const problem = validateSettings(form);
    if (problem) return setToast({ type: 'error', message: problem });

    setSaving(true);
    try {
      /* The user's choices + every alert limit calculated by the system from
         the household size. Bumping updated_at makes the device re-download. */
      await update(ref(database, `devices/${deviceId}/settings`), {
        alerts_enabled:           form.alerts_enabled,
        off_hours_alerts_enabled: form.off_hours_alerts_enabled,
        off_hours_start:          form.off_hours_start,
        off_hours_end:            form.off_hours_end,
        ...computeThresholds(form.household_size),
        updated_at:               Date.now(),
      });
      setToast({
        type: 'success',
        message: `Settings saved for ${devices[deviceId]?.name || deviceId}.`,
      });
      setEditMode(false);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function cancelEdit() {
    if (deviceId) {
      try { setForm(await readDeviceSettings(deviceId)); } catch { /* keep current form */ }
    }
    setEditMode(false);
  }

  const hasDevices = Object.keys(devices).length > 0;

  return (
    <>
      <TopBar title="Settings" icon={FaGear} subtitle="Notifications and off-hours" />

      <div className="space-y-5">

        {/* 1. GLOBAL NOTIFICATIONS */}
        <GlassCard>
          <SectionHeader
            icon={FaBell}
            title="Global notification preferences"
            subtitle="Manage how HydroTrack sends real-time system alerts to your account."
          />
          <div className="mt-5 rounded-2xl border border-white/70 bg-white/40 p-4">
            <SwitchRow
              title="Receive email notifications"
              description="Send email when continuous leaks or high flow spikes are detected."
              checked={emailNotif}
              onChange={toggleEmail}
            />
          </div>
        </GlassCard>

        {/* 2. DEVICE SETTINGS */}
        <GlassCard>
          <SectionHeader
            icon={FaMicrochip}
            title="Device settings"
            subtitle="Alerts, off-hours and household size for each device."
            action={
              hasDevices && !editMode && (
                <GlassButton
                  variant="ghost"
                  size="sm"
                  leftIcon={<FaPencil size={11} />}
                  onClick={() => setEditMode(true)}
                >
                  Edit
                </GlassButton>
              )
            }
          />

          {!hasDevices ? (
            <div className="mt-6 rounded-2xl border border-dashed border-ink-200 bg-white/30 p-10 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-ink-300 shadow-glass-sm">
                <FaMicrochip size={20} />
              </span>
              <p className="mt-4 text-sm font-bold text-ink-800">No devices registered</p>
              <p className="mt-1 text-xs text-ink-500">
                Link a device first to manage its alert settings.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <div className="mt-5">
                <label className="kpi-label mb-2 block">Select device</label>
                <DeviceCombobox devices={devices} value={deviceId} onChange={setDeviceId} />
              </div>

              {/* ---- Master Control ---- */}
              <FormSection>
                <SubSectionHeader icon={FaSliders} title="Master control" />
                <SwitchRow
                  title="Enable system alerts for device"
                  description="Temporarily pause alert monitoring during maintenance or testing."
                  checked={form.alerts_enabled}
                  onChange={setField('alerts_enabled')}
                  disabled={!editMode}
                />
                {!form.alerts_enabled && (
                  <Notice tone="warning" className="mt-3 !text-xs">
                    Alert monitoring is currently disabled. The device will keep recording flow
                    data, but no alerts will be triggered until you re-enable this.
                  </Notice>
                )}
              </FormSection>

              {/* ---- Household ---- */}
              <FormSection>
                <SubSectionHeader icon={FaUsers} title="Household" />
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${editMode ? 'text-ink-800' : 'text-ink-500'}`}>
                      People in this household
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                      Number of people who use water at this location.
                    </p>
                  </div>
                  <NumberStepper
                    compact
                    value={form.household_size}
                    onChange={setField('household_size')}
                    min={HOUSEHOLD_MIN}
                    max={HOUSEHOLD_MAX}
                    disabled={!editMode}
                    aria-label="number of people"
                  />
                </div>
              </FormSection>

              {/* ---- Off-Hours ---- */}
              <FormSection>
                <SubSectionHeader icon={FaMoon} title="Off-hours flow alerts" />
                <SwitchRow
                  title="Enable off-hours detection"
                  description="Alert when water flows during a quiet window (e.g., overnight)."
                  checked={form.off_hours_alerts_enabled}
                  onChange={setField('off_hours_alerts_enabled')}
                  disabled={!editMode}
                />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TimeField
                    id="setting-off-hours-start"
                    label="Off-hours start"
                    hint="Beginning of the no-flow period."
                    value={form.off_hours_start}
                    onChange={setField('off_hours_start')}
                    disabled={!editMode}
                  />
                  <TimeField
                    id="setting-off-hours-end"
                    label="Off-hours end"
                    hint="May cross midnight (22:00 → 06:00)."
                    value={form.off_hours_end}
                    onChange={setField('off_hours_end')}
                    disabled={!editMode}
                  />
                </div>
              </FormSection>

              {/* ---- Actions ---- */}
              {editMode && (
                <div className="mt-6 flex justify-end gap-3 border-t border-white/70 pt-5">
                  <GlassButton variant="ghost" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </GlassButton>
                  <GlassButton
                    type="submit"
                    loading={saving}
                    leftIcon={<FaFloppyDisk size={13} />}
                  >
                    {saving ? 'Saving…' : 'Save settings'}
                  </GlassButton>
                </div>
              )}
            </form>
          )}
        </GlassCard>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

/* ============================================================
   LAYOUT HELPERS
   ============================================================ */

function SectionHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hydro-50 text-hydro">
          <Icon size={15} />
        </span>
        <div className="min-w-0">
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function SubSectionHeader({ icon: Icon, title }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon size={12} className="text-hydro" />
      <h4 className="kpi-label">{title}</h4>
    </div>
  );
}

function FormSection({ children }) {
  return <div className="mt-6 border-t border-white/70 pt-6">{children}</div>;
}

function TimeField({ id, label, hint, value, onChange, disabled }) {
  return (
    <div>
      <FloatingInput
        id={id}
        label={label}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      {hint && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
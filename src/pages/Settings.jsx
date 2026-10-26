import { useEffect, useState } from 'react';
import {
  FaGear, FaFloppyDisk, FaBell, FaMicrochip,
  FaBolt, FaMoon, FaTriangleExclamation, FaSliders,
  FaPencil, FaWater,
} from 'react-icons/fa6';
import { database, ref, onValue, update, get } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { useDevices } from '@/hooks/useDevices';
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { DeviceSelect } from '@/components/devices/DeviceSelect';
import { Toast } from '@/components/ui/Toast';

const DEFAULT_FORM = {
  alerts_enabled: true,
  calibration_factor: 98.0,
  max_flow_threshold: 35.0,
  max_continuous_minutes: 30,
  off_hours_alerts_enabled: true,
  off_hours_start: '00:00',
  off_hours_end: '06:00',
  off_hours_min_duration_seconds: 60,
  hammer_alerts_enabled: true,
  hammer_threshold_lpm: 60.0,
  hammer_cooldown_seconds: 30,
};

export default function Settings() {
  const { user } = useAuth();
  const { devices } = useDevices(user.uid);

  const [deviceId, setDeviceId]     = useState(null);
  const [emailNotif, setEmailNotif] = useState(true);
  const [toast, setToast]           = useState(null);

  const [form, setForm]         = useState(DEFAULT_FORM);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    const ids = Object.keys(devices);
    if (!deviceId && ids.length) setDeviceId(ids[0]);
  }, [devices, deviceId]);

  useEffect(() => {
    const unsub = onValue(
      ref(database, `users/${user.uid}/settings/email_notifications`),
      (snap) => setEmailNotif(snap.val() !== false)
    );
    return unsub;
  }, [user.uid]);

  async function loadDeviceSettings(id) {
    if (!id) return;
    const snap = await get(ref(database, `devices/${id}/settings`));
    const s = snap.val() || {};
    setForm({
      alerts_enabled:                 s.alerts_enabled                 !== false,
      calibration_factor:             s.calibration_factor             ?? 98.0,
      max_flow_threshold:             s.max_flow_threshold             ?? 35.0,
      max_continuous_minutes:         s.max_continuous_minutes         ?? 30,
      off_hours_alerts_enabled:       s.off_hours_alerts_enabled       !== false,
      off_hours_start:                s.off_hours_start                ?? '00:00',
      off_hours_end:                  s.off_hours_end                  ?? '06:00',
      off_hours_min_duration_seconds: s.off_hours_min_duration_seconds ?? 60,
      hammer_alerts_enabled:          s.hammer_alerts_enabled          !== false,
      hammer_threshold_lpm:           s.hammer_threshold_lpm           ?? 60.0,
      hammer_cooldown_seconds:        s.hammer_cooldown_seconds        ?? 30,
    });
  }

  useEffect(() => {
    if (!deviceId) return;
    setEditMode(false);
    loadDeviceSettings(deviceId);
  }, [deviceId]);

  const setField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave(e) {
    e.preventDefault();
    if (!deviceId) return;

    if (form.off_hours_start === form.off_hours_end) {
      return setToast({ type: 'error', message: 'Quiet window start and end must differ.' });
    }

    setSaving(true);
    try {
      await update(ref(database, `devices/${deviceId}/settings`), {
        alerts_enabled:                 form.alerts_enabled,
        calibration_factor:             parseFloat(form.calibration_factor),
        max_flow_threshold:             parseFloat(form.max_flow_threshold),
        max_continuous_minutes:         parseInt(form.max_continuous_minutes, 10),
        off_hours_alerts_enabled:       form.off_hours_alerts_enabled,
        off_hours_start:                form.off_hours_start,
        off_hours_end:                  form.off_hours_end,
        off_hours_min_duration_seconds: parseInt(form.off_hours_min_duration_seconds, 10),
        hammer_alerts_enabled:          form.hammer_alerts_enabled,
        hammer_threshold_lpm:           parseFloat(form.hammer_threshold_lpm),
        hammer_cooldown_seconds:        parseInt(form.hammer_cooldown_seconds, 10),
        updated_at:                     Date.now(),
      });
      setToast({ type: 'success', message: `Settings saved for ${deviceId}.` });
      setEditMode(false);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function cancelEdit() {
    if (deviceId) await loadDeviceSettings(deviceId);
    setEditMode(false);
  }

  const hasDevices = Object.keys(devices).length > 0;

  return (
    <>
      <TopBar title="Settings" icon={FaGear} />

      <div className="space-y-5">

        {/* 1. GLOBAL NOTIFICATIONS */}
        <GlassCard>
          <SectionHeader
            icon={FaBell}
            title="Global Notification Preferences"
            subtitle="Manage how HydroTrack sends real-time system alerts to your account."
          />
          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <ToggleRow
              title="Receive Email Notifications"
              description="Send email when continuous leaks or high flow spikes are detected."
              checked={emailNotif}
              onChange={async (v) => {
                setEmailNotif(v);
                await update(ref(database, `users/${user.uid}/settings`), {
                  email_notifications: v,
                });
                setToast({
                  type: 'success',
                  message: `Email notifications ${v ? 'enabled' : 'disabled'}.`,
                });
              }}
            />
          </div>
        </GlassCard>

        {/* 2. DEVICE CONFIGURATION */}
        <GlassCard>
          <SectionHeader
            icon={FaMicrochip}
            title="Device Calibration & Alert Triggers"
            subtitle="Configure pulse sensors and leak thresholds per hardware unit."
            action={
              hasDevices && !editMode && (
                <GlassButton
                  variant="ghost"
                  size="sm"
                  leftIcon={<FaPencil size={12} />}
                  onClick={() => setEditMode(true)}
                >
                  Edit
                </GlassButton>
              )
            }
          />

          {!hasDevices ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-300 shadow-sm">
                <FaMicrochip size={22} />
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-700">No devices registered</p>
              <p className="mt-1 text-xs text-slate-500">
                Link a device first to configure its calibration and alert rules.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <div className="mt-5">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Select Device
                </label>
                <DeviceSelect devices={devices} value={deviceId} onChange={setDeviceId} allLabel={null} />
              </div>

              {/* ---- Master Control ---- */}
              <FormSection>
                <SubSectionHeader icon={FaSliders} title="Master Control" />
                <ToggleRow
                  title="Enable System Alerts for Device"
                  description="Temporarily pause alert monitoring during maintenance or testing."
                  checked={form.alerts_enabled}
                  onChange={setField('alerts_enabled')}
                  disabled={!editMode}
                />
                {!form.alerts_enabled && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                    <FaTriangleExclamation className="mt-0.5 shrink-0" size={12} />
                    <span>
                      Alert monitoring is currently disabled. The device will keep recording flow
                      data, but no alerts will be triggered until you re-enable this.
                    </span>
                  </div>
                )}
              </FormSection>

              {/* ---- Alert Triggers ---- */}
              <FormSection>
                <SubSectionHeader icon={FaBolt} title="Alert Triggers" />
                <div className="grid gap-4 md:grid-cols-2">
                  <NumberField
                    id="setting-calibration"
                    label="Calibration Factor (Hz/LPM)"
                    hint="YF-S401 default = 98.0"
                    step="0.1" min="1"
                    value={form.calibration_factor}
                    onChange={setField('calibration_factor')}
                    disabled={!editMode}
                  />
                  <NumberField
                    id="setting-max-flow"
                    label="High Flow Threshold (LPM)"
                    hint="Alert when instant flow exceeds this"
                    step="0.5" min="0"
                    value={form.max_flow_threshold}
                    onChange={setField('max_flow_threshold')}
                    disabled={!editMode}
                  />
                </div>
                <div className="mt-4">
                  <NumberField
                    id="setting-max-continuous"
                    label="Max Continuous Flow (minutes)"
                    hint="Alert if water runs continuously longer than this duration."
                    step="1" min="1"
                    value={form.max_continuous_minutes}
                    onChange={setField('max_continuous_minutes')}
                    disabled={!editMode}
                  />
                </div>
              </FormSection>

              {/* ---- Off-Hours ---- */}
              <FormSection>
                <SubSectionHeader icon={FaMoon} title="Off-Hours Flow Alerts" />
                <ToggleRow
                  title="Enable Off-Hours Detection"
                  description="Alert when water flows during a configurable quiet window (e.g., overnight)."
                  checked={form.off_hours_alerts_enabled}
                  onChange={setField('off_hours_alerts_enabled')}
                  disabled={!editMode}
                />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TimeField
                    id="setting-off-hours-start"
                    label="Quiet Window Start"
                    hint="Beginning of the no-flow period."
                    value={form.off_hours_start}
                    onChange={setField('off_hours_start')}
                    disabled={!editMode}
                  />
                  <TimeField
                    id="setting-off-hours-end"
                    label="Quiet Window End"
                    hint="May cross midnight (22:00 → 06:00)."
                    value={form.off_hours_end}
                    onChange={setField('off_hours_end')}
                    disabled={!editMode}
                  />
                </div>
                <div className="mt-4">
                  <NumberField
                    id="setting-grace"
                    label="Minimum Flow Duration (seconds)"
                    hint="Ignore brief off-hours usage (a single flush). Alert only after this many seconds of sustained flow."
                    step="1" min="5"
                    value={form.off_hours_min_duration_seconds}
                    onChange={setField('off_hours_min_duration_seconds')}
                    disabled={!editMode}
                  />
                </div>
              </FormSection>

              {/* ---- Water Hammer ---- */}
              <FormSection>
                <SubSectionHeader icon={FaWater} title="Water Hammer Detection" />
                <ToggleRow
                  title="Enable Water Hammer Detection"
                  description="Alert when a sharp, brief flow spike is detected — typically caused by a valve closing too quickly."
                  checked={form.hammer_alerts_enabled}
                  onChange={setField('hammer_alerts_enabled')}
                  disabled={!editMode}
                />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <NumberField
                    id="setting-hammer-threshold"
                    label="Spike Threshold (LPM)"
                    hint="Raw flow must exceed this for 1–3 seconds. Default 60.0."
                    step="1" min="10"
                    value={form.hammer_threshold_lpm}
                    onChange={setField('hammer_threshold_lpm')}
                    disabled={!editMode}
                  />
                  <NumberField
                    id="setting-hammer-cooldown"
                    label="Alert Cooldown (seconds)"
                    hint="Minimum gap between hammer alerts to avoid burst notifications."
                    step="1" min="5"
                    value={form.hammer_cooldown_seconds}
                    onChange={setField('hammer_cooldown_seconds')}
                    disabled={!editMode}
                  />
                </div>
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/70 px-3.5 py-2.5 text-xs text-sky-800">
                  <FaWater className="mt-0.5 shrink-0" size={12} />
                  <span>
                    Water hammer is a brief pressure surge when a valve closes suddenly. If
                    you hear a bang or knock in your pipes, this rule catches the spike even
                    if the leak detector does not trigger.
                  </span>
                </div>
              </FormSection>

              {/* ---- Actions ---- */}
              {editMode && (
                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:text-hydro disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <GlassButton
                    type="submit"
                    loading={saving}
                    leftIcon={<FaFloppyDisk size={14} />}
                  >
                    {saving ? 'Saving…' : 'Save Settings'}
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
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hydro/10 text-hydro">
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
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
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
        {title}
      </h4>
    </div>
  );
}

function FormSection({ children }) {
  return <div className="mt-6 border-t border-slate-100 pt-6">{children}</div>;
}

function ToggleRow({ title, description, checked, onChange, disabled = false }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className={`text-sm font-medium ${disabled ? 'text-slate-500' : 'text-slate-700'}`}>
          {title}
        </p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full',
        'transition-colors duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-hydro/50',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        checked ? 'bg-hydro' : 'bg-slate-300',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 left-0.5',
          'h-5 w-5 rounded-full bg-white shadow-md',
          'transition-transform duration-200 ease-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}

function NumberField({ id, label, hint, value, onChange, disabled, ...rest }) {
  return (
    <div>
      <FloatingInput
        id={id}
        label={label}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        {...rest}
      />
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
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
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
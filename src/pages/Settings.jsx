// File: src/pages/Settings.jsx
import { useEffect, useState } from 'react';
import {
  FaGear, FaFloppyDisk, FaBell, FaMicrochip,
  FaBolt, FaMoon, FaSliders, FaPencil, FaWater,
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
      <TopBar title="Settings" icon={FaGear} subtitle="Notifications, calibration and alert rules" />

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

        {/* 2. DEVICE CONFIGURATION */}
        <GlassCard>
          <SectionHeader
            icon={FaMicrochip}
            title="Device calibration & alert triggers"
            subtitle="Configure pulse sensors and leak thresholds per hardware unit."
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
                Link a device first to configure its calibration and alert rules.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <div className="mt-5">
                <label className="kpi-label mb-2 block">Select device</label>
                <DeviceSelect devices={devices} value={deviceId} onChange={setDeviceId} allLabel={null} />
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

              {/* ---- Alert Triggers ---- */}
              <FormSection>
                <SubSectionHeader icon={FaBolt} title="Alert triggers" />
                <div className="grid gap-4 md:grid-cols-2">
                  <NumberField
                    id="setting-calibration"
                    label="Calibration factor (Hz/LPM)"
                    hint="YF-S401 default = 98.0"
                    step="0.1" min="1"
                    value={form.calibration_factor}
                    onChange={setField('calibration_factor')}
                    disabled={!editMode}
                  />
                  <NumberField
                    id="setting-max-flow"
                    label="High flow threshold (LPM)"
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
                    label="Max continuous flow (minutes)"
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
                <SubSectionHeader icon={FaMoon} title="Off-hours flow alerts" />
                <SwitchRow
                  title="Enable off-hours detection"
                  description="Alert when water flows during a configurable quiet window (e.g., overnight)."
                  checked={form.off_hours_alerts_enabled}
                  onChange={setField('off_hours_alerts_enabled')}
                  disabled={!editMode}
                />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TimeField
                    id="setting-off-hours-start"
                    label="Quiet window start"
                    hint="Beginning of the no-flow period."
                    value={form.off_hours_start}
                    onChange={setField('off_hours_start')}
                    disabled={!editMode}
                  />
                  <TimeField
                    id="setting-off-hours-end"
                    label="Quiet window end"
                    hint="May cross midnight (22:00 → 06:00)."
                    value={form.off_hours_end}
                    onChange={setField('off_hours_end')}
                    disabled={!editMode}
                  />
                </div>
                <div className="mt-4">
                  <NumberField
                    id="setting-grace"
                    label="Minimum flow duration (seconds)"
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
                <SubSectionHeader icon={FaWater} title="Water hammer detection" />
                <SwitchRow
                  title="Enable water hammer detection"
                  description="Alert when a sharp, brief flow spike is detected — typically caused by a valve closing too quickly."
                  checked={form.hammer_alerts_enabled}
                  onChange={setField('hammer_alerts_enabled')}
                  disabled={!editMode}
                />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <NumberField
                    id="setting-hammer-threshold"
                    label="Spike threshold (LPM)"
                    hint="Raw flow must exceed this for 1–3 seconds. Default 60.0."
                    step="1" min="10"
                    value={form.hammer_threshold_lpm}
                    onChange={setField('hammer_threshold_lpm')}
                    disabled={!editMode}
                  />
                  <NumberField
                    id="setting-hammer-cooldown"
                    label="Alert cooldown (seconds)"
                    hint="Minimum gap between hammer alerts to avoid burst notifications."
                    step="1" min="5"
                    value={form.hammer_cooldown_seconds}
                    onChange={setField('hammer_cooldown_seconds')}
                    disabled={!editMode}
                  />
                </div>
                <Notice tone="info" className="mt-4 !text-xs">
                  Water hammer is a brief pressure surge when a valve closes suddenly. If
                  you hear a bang or knock in your pipes, this rule catches the spike even
                  if the leak detector does not trigger.
                </Notice>
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
      {hint && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
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
      {hint && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
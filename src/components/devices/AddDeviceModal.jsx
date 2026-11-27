import { useEffect, useState } from 'react';
import { FaLink, FaHashtag, FaTag, FaArrowRight, FaArrowLeft } from 'react-icons/fa6';
import {
  database, ref, update, get, child,
} from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { GlassButton } from '@/components/ui/GlassButton';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { StepProgress } from '@/components/ui/StepProgress';
import { buildInitialDeviceSettings } from '@/lib/deviceDefaults';
import {
  DEFAULT_HOUSEHOLD_SIZE, HOUSEHOLD_MIN, HOUSEHOLD_MAX,
} from '@/lib/thresholds';

const DEVICE_ID_RE = /^WFS-[A-Z0-9]{4}$/;

const STEP_LABELS = ['Device ID', 'Device name', 'Household'];
const STEP_DESCRIPTIONS = [
  'Enter the Device ID printed on your hardware.',
  "Give this device a name you'll recognise.",
  'Tell us how many people live here so HydroTrack can set the alert limits for you.',
];

export function AddDeviceModal({ open, onClose }) {
  const { user } = useAuth();

  const [step, setStep]             = useState(0);
  const [deviceId, setDeviceId]     = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [household, setHousehold]   = useState(DEFAULT_HOUSEHOLD_SIZE);
  const [error, setError]           = useState('');
  const [busy, setBusy]             = useState(false);

  /* Fresh wizard every time the dialog opens */
  useEffect(() => {
    if (open) {
      setStep(0);
      setDeviceId('');
      setDeviceName('');
      setHousehold(DEFAULT_HOUSEHOLD_SIZE);
      setError('');
      setBusy(false);
    }
  }, [open]);

  /* Returns an error message, or null when the device can be linked. */
  async function checkDevice(id) {
    const snap = await get(child(ref(database), `devices/${id}`));
    if (!snap.exists()) return 'Device ID not found. Please check your Device ID.';

    const data = snap.val();
    if (data.claimed_by && data.claimed_by !== user.uid) {
      return 'This device is already linked to another account.';
    }
    if (data.claimed_by === user.uid) return 'You have already linked this device.';
    return null;
  }

  function friendlyError(err) {
    return err.code === 'PERMISSION_DENIED'
      ? 'This device is already linked to another account.'
      : (err.message || 'Something went wrong.').replace('Firebase: ', '');
  }

  /* ---- Step 1 → 2: the Device ID must exist and be free ---- */
  async function submitDeviceStep() {
    const id = deviceId.trim().toUpperCase();
    if (!DEVICE_ID_RE.test(id)) return setError('Device ID must look like WFS-A1B2.');

    setBusy(true);
    try {
      const problem = await checkDevice(id);
      if (problem) return setError(problem);
      setDeviceId(id);
      setStep(1);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  /* ---- Step 2 → 3: the name must be valid ---- */
  function submitNameStep() {
    if (deviceName.trim().length < 2) {
      return setError('Device name must be at least 2 characters.');
    }
    setStep(2);
  }

  /* ---- Step 3: household size is required — link the device ---- */
  async function submitHouseholdStep() {
    const id   = deviceId.trim().toUpperCase();
    const name = deviceName.trim();

    setBusy(true);
    try {
      /* Re-check right before writing, in case someone else claimed it meanwhile. */
      const problem = await checkDevice(id);
      if (problem) return setError(problem);

      /* One atomic write: every path succeeds together or none does.
         The settings node is built from the household size, so the system
         (not the user) decides every alert limit. The firmware downloads it
         because the node (and its updated_at) is new. */
      await update(ref(database), {
        [`users/${user.uid}/user_devices/${id}`]: { name, linked_at: Date.now() },
        [`devices/${id}/claimed_by`]:             user.uid,
        [`devices/${id}/settings`]:               buildInitialDeviceSettings(household),
      });

      onClose?.();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (busy) return;

    if (step === 0) submitDeviceStep();
    else if (step === 1) submitNameStep();
    else submitHouseholdStep();
  }

  function goBack() {
    setError('');
    setStep((s) => Math.max(0, s - 1));
  }

  const isFirst = step === 0;
  const isLast  = step === STEP_LABELS.length - 1;

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Link HydroTrack device"
      description={STEP_DESCRIPTIONS[step]}
      size="md"
    >
      <div className="mb-6">
        <StepProgress steps={STEP_LABELS} current={step} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-coral-200 bg-coral-50/80 px-4 py-3 text-sm font-medium text-coral-700"
          >
            {error}
          </div>
        )}

        {/* ---------------- STEP 1 — DEVICE ID ---------------- */}
        {step === 0 && (
          <div>
            <FloatingInput
              id="add-device-id"
              label="Device ID"
              icon={FaHashtag}
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
              maxLength={8}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
              required
            />
            <p className="mt-2 text-xs text-ink-500">
              Format:{' '}
              <code className="rounded-md bg-hydro-50 px-1.5 py-0.5 font-mono text-hydro-700">WFS-XXXX</code>
            </p>
          </div>
        )}

        {/* ---------------- STEP 2 — DEVICE NAME ---------------- */}
        {step === 1 && (
          <FloatingInput
            id="add-device-name"
            label="Device name"
            icon={FaTag}
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            minLength={2}
            maxLength={40}
            autoComplete="off"
            autoFocus
            required
          />
        )}

        {/* ---------------- STEP 3 — HOUSEHOLD ---------------- */}
        {step === 2 && (
          <div className="rounded-2xl border border-white/70 bg-white/40 px-4 py-6">
            <p className="mb-4 text-center text-sm font-semibold text-ink-800">
              How many people live in this home?
            </p>
            <div className="flex justify-center">
              <NumberStepper
                value={household}
                onChange={setHousehold}
                min={HOUSEHOLD_MIN}
                max={HOUSEHOLD_MAX}
                unit={household === 1 ? 'person' : 'people'}
                aria-label="number of people"
                autoFocus
              />
            </div>
            <p className="mt-4 text-center text-xs text-ink-500">
              You can change this later in Settings.
            </p>
          </div>
        )}

        {/* ---------------- ACTIONS ---------------- */}
        <div className="flex gap-3 pt-2">
          <GlassButton
            variant="ghost"
            className="flex-1"
            onClick={isFirst ? onClose : goBack}
            disabled={busy}
            leftIcon={isFirst ? undefined : <FaArrowLeft size={12} />}
          >
            {isFirst ? 'Cancel' : 'Back'}
          </GlassButton>

          <GlassButton
            type="submit"
            loading={busy}
            className="flex-1"
            leftIcon={isLast ? <FaLink size={13} /> : undefined}
            rightIcon={isLast ? undefined : <FaArrowRight size={12} />}
          >
            {isLast ? (busy ? 'Linking…' : 'Link device') : (busy ? 'Checking…' : 'Next')}
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
}
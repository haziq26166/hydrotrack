import { useState } from 'react';
import { FaUser, FaPencil, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '@/context/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { StatusChip } from '@/components/ui/StatusChip';
import { Toast } from '@/components/ui/Toast';
import { EditNameModal } from '@/components/profile/EditNameModal';
import { ChangePasswordModal } from '@/components/profile/ChangePasswordModal';

/** One label / value / action line of the account card. */
function Row({ label, hint, action, children }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="w-36 shrink-0">
        <p className="text-[13px] font-semibold text-ink-800">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-ink-400">{hint}</p>}
      </div>
      <div className="min-w-0 flex-1 text-[13px] text-ink-700">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();

  const [nameOpen, setNameOpen] = useState(false);
  const [pwOpen, setPwOpen]     = useState(false);
  const [toast, setToast]       = useState(null);

  const isGoogle  = user?.providerData?.some((p) => p.providerId === 'google.com');
  const shownName = user?.displayName || 'HydroTrack User';

  return (
    <>
      <TopBar title="Profile" icon={FaUser} subtitle="Your account and security" />

      {/* ============================================================
          IDENTITY
          ============================================================ */}
      <GlassCard padded="md">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-hydro text-xl font-bold text-white">
            {shownName.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-ink-900">{shownName}</h2>
            <p className="truncate text-[13px] text-ink-500">{user?.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <StatusChip status="ok" label="Active" pulse />
              {isGoogle && (
                <span className="chip chip-info">
                  <FcGoogle size={11} /> Google account
                </span>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ============================================================
          ACCOUNT DETAILS — each editable item opens its own modal
          ============================================================ */}
      <GlassCard padded={false} className="mt-3 overflow-hidden">
        <div className="border-b border-ink-200 bg-ink-50 px-4 py-2.5">
          <h3 className="section-title">Account details</h3>
        </div>

        <div className="divide-y divide-ink-100">
          <Row
            label="Name"
            action={
              <GlassButton
                variant="ghost"
                size="sm"
                leftIcon={<FaPencil size={10} />}
                onClick={() => setNameOpen(true)}
              >
                Edit
              </GlassButton>
            }
          >
            <span className="font-medium">{shownName}</span>
          </Row>

          <Row label="Email" hint="Cannot be changed here">
            <span className="break-all">{user?.email}</span>
          </Row>

          <Row
            label="Password"
            action={
              isGoogle ? (
                <a
                  href="https://myaccount.google.com/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glass !h-7 !px-2.5 text-xs"
                >
                  Manage <FaArrowUpRightFromSquare size={9} />
                </a>
              ) : (
                <GlassButton
                  variant="ghost"
                  size="sm"
                  leftIcon={<FaPencil size={10} />}
                  onClick={() => setPwOpen(true)}
                >
                  Edit
                </GlassButton>
              )
            }
          >
            {isGoogle ? (
              <span className="text-ink-500">Managed by your Google account</span>
            ) : (
              <span className="tracking-widest">••••••••••</span>
            )}
          </Row>

          <Row label="Sign-in method">
            {isGoogle ? (
              <span className="inline-flex items-center gap-1.5">
                <FcGoogle size={14} /> Google
              </span>
            ) : (
              'Email and password'
            )}
          </Row>
        </div>
      </GlassCard>

      {/* ============================================================
          MODALS
          ============================================================ */}
      <EditNameModal
        open={nameOpen}
        onClose={() => setNameOpen(false)}
        onSaved={() => setToast({ type: 'success', message: 'Name updated.' })}
      />

      {!isGoogle && (
        <ChangePasswordModal
          open={pwOpen}
          onClose={() => setPwOpen(false)}
          onSaved={() => setToast({ type: 'success', message: 'Password changed successfully.' })}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
// File: src/pages/Welcome.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaChartLine, FaBell, FaChartColumn,
  FaArrowRight, FaCircleCheck, FaGaugeHigh,
} from 'react-icons/fa6';
import { useAuth } from '@/context/AuthContext';
import { DeviceCard } from '@/components/dashboard/DeviceCard';

const FEATURES = [
  {
    Icon: FaGaugeHigh,
    title: 'Real-Time Monitoring',
    desc: 'Live flow readings every second from your in-line sensor — no polling, no refresh button.',
  },
  {
    Icon: FaBell,
    title: 'Instant Leak Alerts',
    desc: 'High flow, continuous leaks, and off-hours usage trigger email alerts the moment they happen.',
  },
  {
    Icon: FaChartColumn,
    title: 'Usage Analytics',
    desc: 'Daily and monthly charts turn raw numbers into insights you can act on.',
  },
];

const STEPS = [
  { n: 1, title: 'Install the sensor',      desc: 'A YF-S401 in-line flow meter connects to an ESP32 microcontroller.' },
  { n: 2, title: 'Connect to Wi-Fi',        desc: 'Enter your credentials once via the captive portal — it reconnects automatically.' },
  { n: 3, title: 'Link it to your account', desc: 'Enter the device ID in the dashboard and give it a friendly name.' },
  { n: 4, title: 'Watch and relax',         desc: 'Live metrics, usage history, and email alerts — all from one place.' },
];

/* ---------- Hero preview: two illustrative devices (not real data) ---------- */
const reducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useDemoFlow() {
  const [flow, setFlow] = useState(4.2);

  useEffect(() => {
    if (reducedMotion()) return undefined;
    const id = setInterval(() => {
      setFlow(Number((3.4 + Math.random() * 3.6).toFixed(1)));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return flow;
}

const demo = (over) => ({
  loading: false, isOnline: true, secondsAgo: 1, peak: 9.1, ...over,
});

function HeroPreview() {
  const flow = useDemoFlow();

  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-aqua-mint opacity-30 blur-3xl" />

      <div className="relative space-y-4">
        <DeviceCard
          device={demo({ id: 'WFS-A1B2', name: 'Kitchen line', status: 'ok', flow, usage: 128.4 })}
        />
        <div className="ml-6 sm:ml-10">
          <DeviceCard
            device={demo({ id: 'WFS-C3D4', name: 'Garden tap', status: 'leak', flow: 11.8, usage: 342.7, peak: 12.4 })}
          />
        </div>
      </div>
    </div>
  );
}

export default function Welcome() {
  const { user } = useAuth();
  const primaryTo = user ? '/dashboard' : '/register';
  const primaryLabel = user ? 'Open dashboard' : 'Get started';

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

          <div className="text-center lg:text-left animate-fade-in-up">
            <span className="chip chip-info mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-aqua-500" />
              Real-time IoT water monitoring
            </span>

            <h1 className="text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">
              Know every drop.
              <span className="block bg-gradient-to-r from-hydro-500 to-aqua-500 bg-clip-text text-transparent">
                Catch every leak.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-600 lg:mx-0">
              HydroTrack watches every drop flowing through your home — detecting
              leaks, tracking daily usage, and alerting you the moment something
              goes wrong.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link to={primaryTo} className="btn-hydro !px-6 !py-3.5">
                {primaryLabel} <FaArrowRight size={13} />
              </Link>
              {!user && (
                <Link to="/login" className="btn-glass !px-6 !py-3.5">
                  Sign In
                </Link>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-ink-500 lg:justify-start">
              {['No credit card', 'Free to use', 'Setup in 2 minutes'].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <FaCircleCheck className="text-sea-500" size={13} />
                  {t}
                </span>
              ))}
            </div>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            Everything you need to stay dry
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-500">
            Three core capabilities. Zero complexity.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="glass-strong rounded-3xl p-7 transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-glass-lg"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-hydro-50 text-hydro">
                <Icon size={20} />
              </span>
              <h3 className="mt-5 text-lg font-bold tracking-tight text-ink-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="glass-strong rounded-4xl p-8 sm:p-12">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-900">How it works</h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-500">
              Four steps from unboxing to full visibility.
            </p>
          </div>

          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ n, title, desc }) => (
              <li key={n}>
                <span className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-hydro-gradient text-lg font-extrabold text-white shadow-brand">
                  {n}
                </span>
                <h3 className="text-base font-bold text-ink-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="relative overflow-hidden rounded-4xl bg-hydro-gradient p-10 text-center text-white shadow-brand-lg sm:p-16">
          <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-10">
            <defs>
              <pattern id="cta-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cta-grid)" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-aqua/30 blur-3xl" />

          <div className="relative">
            <FaChartLine className="mx-auto mb-4 opacity-90" size={30} />
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ready to take control of your water usage?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">
              Create a free account and link your first device in under two minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={primaryTo}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-hydro-700 shadow-glass transition-all duration-200 hover:-translate-y-px hover:bg-white/95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                {primaryLabel} <FaArrowRight size={13} />
              </Link>
              {!user && (
                <Link to="/login" className="btn-hydro-outline !px-6 !py-3.5 text-sm">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
import { Link } from 'react-router-dom';
import {
  FaDroplet, FaChartLine, FaBell, FaChartColumn,
  FaArrowRight, FaCircleCheck, FaGaugeHigh,
} from 'react-icons/fa6';

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

export default function Welcome() {
  return (
    <>
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 lg:px-8 lg:pt-28">

          {/* Decorative blobs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-hydro-200/40 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-hydro-300/30 blur-3xl"
          />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-hydro text-white shadow-hydro-lg">
              <FaDroplet size={28} />
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Know every drop.
              <span className="block text-hydro">Catch every leak.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              HydroTrack is a real-time water monitoring system that watches
              every drop flowing through your home — detecting leaks,
              tracking daily usage, and alerting you the moment something
              goes wrong.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link to="/register" className="btn-hydro !px-6 !py-3.5">
                Get Started <FaArrowRight size={14} />
              </Link>
              <Link to="/login" className="btn-glass !px-6 !py-3.5">
                Sign In
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
              {['No credit card', 'Free to use', 'Setup in 2 minutes'].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <FaCircleCheck className="text-hydro-500" size={13} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to stay dry
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            Three core capabilities. Zero complexity.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ Icon, title, desc }) => (
            <div key={title} className="glass-strong rounded-2xl p-7 transition-transform hover:-translate-y-1">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-hydro/10 text-hydro">
                <Icon size={22} />
              </span>
              <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="glass-strong rounded-3xl p-8 sm:p-12">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              How it works
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-600">
              Four steps from unboxing to full visibility.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="relative">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-hydro text-lg font-bold text-white shadow-hydro">
                  {n}
                </div>
                <h4 className="text-base font-bold text-slate-900">{title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-hydro-gradient p-10 text-center text-white shadow-hydro-lg sm:p-16">
          {/* Grid pattern overlay */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full opacity-10"
          >
            <defs>
              <pattern id="cta-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cta-grid)" />
          </svg>

          <div className="relative">
            <FaChartLine className="mx-auto mb-4 opacity-90" size={32} />
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ready to take control of your water usage?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">
              Create a free account and link your first device in under two minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-hydro transition hover:bg-white/90 active:scale-[0.98]"
              >
                Get Started <FaArrowRight size={14} />
              </Link>
              <Link to="/login" className="btn-hydro-outline !px-6 !py-3.5">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
export function Spinner({ fullscreen = false }) {
  const ring = (
    <div className="relative h-12 w-12">
      <div className="absolute inset-0 rounded-full border-4 border-water-200/60" />
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-water-500 animate-spin" />
    </div>
  );

  if (!fullscreen) return ring;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-gradient-to-br from-water-50 to-water-100">
      {ring}
    </div>
  );
}
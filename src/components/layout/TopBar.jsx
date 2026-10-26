export function TopBar({ title, icon: Icon }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      {Icon && (
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-hydro/10 text-hydro">
          <Icon size={20} />
        </span>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-slate-800">
        {title}
      </h1>
    </div>
  );
}
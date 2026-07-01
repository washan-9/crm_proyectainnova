export function Topbar() {
  return (
    <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-[#c4c5d5] bg-[#f8f9ff] px-8">
      <div className="flex flex-1 items-center">
        <div className="relative w-96 rounded-lg focus-within:ring-2 focus-within:ring-[#00288e]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#757684]">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar leads, negocios o contactos..."
            className="w-full rounded-lg border-none bg-[#eff4ff] py-2 pl-10 text-sm outline-none focus:ring-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="mr-4 flex items-center gap-2">
          <button className="rounded-full p-2 text-[#444653] transition-colors hover:text-[#00288e]">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="rounded-full p-2 text-[#444653] transition-colors hover:text-[#00288e]">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button className="rounded-full p-2 text-[#444653] transition-colors hover:text-[#00288e]">
            <span className="material-symbols-outlined">help</span>
          </button>
        </div>
        <button className="rounded-lg px-4 py-2 text-sm font-semibold text-[#00288e] transition-colors hover:bg-[#dde1ff]">
          Soporte
        </button>
        <button className="rounded-lg bg-[#00288e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95">
          Nuevo Lead
        </button>
      </div>
    </header>
  );
}

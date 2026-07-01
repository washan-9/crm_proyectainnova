const metrics = [
  {
    label: "Ingresos Totales",
    value: "$428,500",
    change: "+12%",
    icon: "payments",
    iconBg: "bg-[#00288e]/10 text-[#00288e]",
  },
  {
    label: "Leads Activos",
    value: "1,240",
    change: "+5%",
    icon: "person_add",
    iconBg: "bg-[#006a61]/10 text-[#006a61]",
  },
  {
    label: "Reuniones Hoy",
    value: "8",
    change: "Próxima: 2 PM",
    icon: "event_available",
    iconBg: "bg-[#e0e3e5] text-[#323537]",
  },
];

const tasks = [
  {
    title: "Finalizar contrato de Acme Corp",
    meta: "Atrasada",
    metaIcon: "schedule",
    metaClass: "text-[#ba1a1a]",
    tag: "Contrato",
    done: false,
  },
  {
    title: "Dar seguimiento al lead de TechSolutions",
    meta: "Hoy, 3:00 PM",
    metaIcon: "schedule",
    metaClass: "text-[#757684]",
    tag: "Llamada",
    done: false,
  },
  {
    title: "Redactar pronóstico de ventas semanal",
    meta: "Completada 10:45 AM",
    metaIcon: "check_circle",
    metaClass: "text-[#757684]",
    tag: null,
    done: true,
  },
];

export default function DashboardHomePage() {
  return (
    <>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-[#0b1c30]">
            Desempeño de Ventas
          </h2>
          <p className="text-base text-[#757684]">
            Resumen de tu pipeline actual y la eficiencia del equipo.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center rounded-lg border border-[#c4c5d5] bg-white p-1">
            <button className="rounded-md bg-[#dde1ff] px-3 py-1.5 text-xs font-semibold text-[#00288e]">
              Últimos 7 días
            </button>
            <button className="px-3 py-1.5 text-xs font-semibold text-[#757684] hover:text-[#0b1c30]">
              30 días
            </button>
            <button className="px-3 py-1.5 text-xs font-semibold text-[#757684] hover:text-[#0b1c30]">
              Trimestre
            </button>
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-[#c4c5d5] bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-[#eff4ff]">
            <span className="material-symbols-outlined text-[18px]">
              download
            </span>
            Exportar
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-[#c4c5d5] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 flex items-start justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${metric.iconBg}`}
              >
                <span className="material-symbols-outlined">
                  {metric.icon}
                </span>
              </div>
              <span className="flex items-center gap-1 rounded bg-[#86f2e4]/30 px-2 py-1 text-xs font-semibold text-[#006f66]">
                {metric.change}
              </span>
            </div>
            <p className="text-sm font-semibold text-[#757684]">
              {metric.label}
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-[#0b1c30]">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-[#c4c5d5] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#c4c5d5] px-6 py-4">
          <h3 className="text-xl font-semibold text-[#0b1c30]">
            Próximas Tareas
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#757684]">
              4 pendientes hoy
            </span>
            <button className="rounded bg-[#dce9ff] p-1">
              <span className="material-symbols-outlined text-[18px]">
                add
              </span>
            </button>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {tasks.map((task) => (
            <div
              key={task.title}
              className={`flex items-center gap-4 rounded-lg border border-transparent bg-[#f8f9ff] p-4 transition-shadow hover:border-[#c4c5d5]/30 hover:shadow-sm ${
                task.done ? "opacity-60" : ""
              }`}
            >
              <input
                type="checkbox"
                defaultChecked={task.done}
                className="h-5 w-5 rounded border-[#757684] text-[#00288e] focus:ring-[#00288e]"
              />
              <div className="flex-1">
                <p
                  className={`text-sm font-semibold text-[#0b1c30] ${
                    task.done ? "line-through" : ""
                  }`}
                >
                  {task.title}
                </p>
                <div className="mt-1 flex items-center gap-4">
                  <span
                    className={`flex items-center gap-1 text-xs font-semibold ${task.metaClass}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {task.metaIcon}
                    </span>
                    {task.meta}
                  </span>
                  {task.tag && (
                    <span className="rounded bg-[#dde1ff] px-2 py-0.5 text-[10px] font-bold uppercase text-[#00288e]">
                      {task.tag}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button className="group fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#00288e] text-white shadow-lg transition-all hover:scale-110 active:scale-95">
        <span className="material-symbols-outlined text-[32px]">add</span>
        <span className="pointer-events-none absolute right-full mr-4 whitespace-nowrap rounded-lg bg-[#213145] px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
          Crear Lead
        </span>
      </button>
    </>
  );
}

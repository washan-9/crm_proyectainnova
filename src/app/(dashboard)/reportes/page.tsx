const teamPerformance = [
  {
    name: "Jane Doe",
    initials: "JD",
    deals: 42,
    performance: 92,
    avatarBg: "bg-[#86f2e4]",
    avatarText: "text-[#006f66]",
    barColor: "bg-[#006a61]",
  },
  {
    name: "Mark Smith",
    initials: "MS",
    deals: 38,
    performance: 78,
    avatarBg: "bg-[#1e40af]",
    avatarText: "text-[#a8b8ff]",
    barColor: "bg-[#00288e]",
  },
  {
    name: "Alex Lee",
    initials: "AL",
    deals: 31,
    performance: 65,
    avatarBg: "bg-[#484c4e]",
    avatarText: "text-[#e0e3e5]",
    barColor: "bg-[#00288e]",
  },
  {
    name: "Kim Brown",
    initials: "KB",
    deals: 29,
    performance: 58,
    avatarBg: "bg-[#d3e4fe]",
    avatarText: "text-[#0b1c30]",
    barColor: "bg-[#00288e]",
  },
];

const dealHistory = [
  {
    title: "Arquitectura Cloud Scale",
    closedBy: "Jane Doe",
    time: "Hace 2 horas",
    result: "GANADO" as const,
  },
  {
    title: "Integración Retail Global",
    closedBy: "Mark Smith",
    time: "Hace 5 horas",
    result: "PERDIDO" as const,
  },
  {
    title: "Licencia CRM Pro",
    closedBy: "Alex Lee",
    time: "Ayer",
    result: "GANADO" as const,
  },
];

const months = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

export default function ReportesPage() {
  return (
    <>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-[#0b1c30]">
            Reportes y Analítica
          </h2>
          <p className="text-base text-[#757684]">
            Métricas de desempeño en tiempo real y resumen de datos de ventas.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-[#757684] px-4 py-2 text-sm font-semibold transition-colors hover:bg-[#e5eeff]">
            <span className="material-symbols-outlined">calendar_today</span>
            Últimos 30 Días
          </button>
          <div className="flex">
            <button className="flex items-center gap-2 rounded-l-lg bg-[#006a61] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              <span className="material-symbols-outlined text-[20px]">
                download
              </span>
              Exportar PDF
            </button>
            <button className="rounded-r-lg border-l border-[#006f66]/20 bg-[#86f2e4]/40 px-4 py-2 text-sm font-semibold text-[#006f66] transition-opacity hover:opacity-90">
              CSV
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Pronóstico de Ingresos */}
        <div className="col-span-12 rounded-xl border border-[#c4c5d5] bg-white p-6 shadow-sm">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[#0b1c30]">
                Pronóstico de Ingresos
              </h3>
              <p className="text-sm text-[#757684]">
                Ingresos proyectados vs desempeño real
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-3 bg-[#00288e]" />
                <span className="text-xs font-semibold">Real</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-3 border-t border-dashed border-[#757684]" />
                <span className="text-xs font-semibold">Meta</span>
              </div>
            </div>
          </div>
          <div className="relative h-64 w-full overflow-hidden">
            <svg
              className="h-full w-full"
              preserveAspectRatio="none"
              viewBox="0 0 1000 200"
            >
              <defs>
                <linearGradient
                  id="chartGradient"
                  x1="0%"
                  x2="0%"
                  y1="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#1e40af" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,180 Q100,160 200,170 T400,120 T600,140 T800,80 T1000,60"
                fill="transparent"
                stroke="#00288e"
                strokeWidth="3"
              />
              <path
                d="M0,180 Q100,160 200,170 T400,120 T600,140 T800,80 T1000,60 L1000,200 L0,200 Z"
                fill="url(#chartGradient)"
              />
              <path
                d="M0,160 L200,150 L400,140 L600,130 L800,120 L1000,110"
                fill="transparent"
                stroke="#757684"
                strokeDasharray="4,4"
                strokeWidth="1"
              />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between border-t border-[#c4c5d5] px-2 pt-4 text-[10px] font-bold text-[#757684]">
              {months.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Desempeño del Equipo */}
        <div className="col-span-12 overflow-hidden rounded-xl border border-[#c4c5d5] bg-white shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#c4c5d5] p-6">
            <h3 className="text-xl font-semibold text-[#0b1c30]">
              Desempeño del Equipo
            </h3>
            <button className="text-sm font-semibold text-[#00288e] hover:underline">
              Ver Todos
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#eff4ff] text-[#757684]">
                  <th className="px-6 py-3 text-xs font-semibold">
                    Agente de Ventas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold">
                    Negocios
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold">
                    Desempeño
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm text-[#0b1c30]">
                {teamPerformance.map((agent, i) => (
                  <tr
                    key={agent.name}
                    className={i % 2 === 1 ? "bg-[#f8f9ff]" : ""}
                  >
                    <td className="flex items-center gap-3 px-6 py-4">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${agent.avatarBg} ${agent.avatarText}`}
                      >
                        {agent.initials}
                      </div>
                      <span>{agent.name}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      {agent.deals}
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#c4c5d5]">
                        <div
                          className={`h-full ${agent.barColor}`}
                          style={{ width: `${agent.performance}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historial de Negocios */}
        <div className="col-span-12 rounded-xl border border-[#c4c5d5] bg-white p-6 shadow-sm lg:col-span-5">
          <h3 className="mb-6 text-xl font-semibold text-[#0b1c30]">
            Historial Reciente de Negocios
          </h3>
          <div className="space-y-6">
            {dealHistory.map((deal, i) => (
              <div
                key={deal.title}
                className={`flex items-start gap-4 ${
                  i < dealHistory.length - 1
                    ? "border-b border-[#c4c5d5] pb-4"
                    : ""
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    deal.result === "GANADO"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {deal.result === "GANADO" ? "check_circle" : "cancel"}
                  </span>
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-semibold text-[#0b1c30]">
                    {deal.title}
                  </p>
                  <p className="text-sm text-[#757684]">
                    Cerrado por {deal.closedBy} • {deal.time}
                  </p>
                  <span
                    className={`mt-2 inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${
                      deal.result === "GANADO"
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {deal.result}
                  </span>
                </div>
              </div>
            ))}
            <button className="w-full rounded-lg bg-[#eff4ff] py-2 text-sm font-semibold text-[#00288e] transition-colors hover:bg-[#e5eeff]">
              Ver Historial Completo
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

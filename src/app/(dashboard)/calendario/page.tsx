"use client";

import { useMemo, useState } from "react";

type CalendarEvent = {
  time: string;
  title: string;
  barClass: string;
  textClass: string;
  bgClass: string;
};

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const weekDays = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

const eventsByDay: Record<number, CalendarEvent[]> = {
  3: [
    {
      time: "9:00 AM",
      title: "Llamada de Descubrimiento",
      barClass: "border-[#006a61]",
      textClass: "text-[#006f66]",
      bgClass: "bg-[#86f2e4]/30",
    },
  ],
  5: [
    {
      time: "2:30 PM",
      title: "Sincronización de Equipo",
      barClass: "border-[#00288e]",
      textClass: "text-[#00288e]",
      bgClass: "bg-[#1e40af]/20",
    },
  ],
  10: [
    {
      time: "11:00 AM",
      title: "Revisión con Cliente",
      barClass: "border-[#00288e]",
      textClass: "text-[#00288e]",
      bgClass: "bg-[#1e40af]/20",
    },
    {
      time: "3:00 PM",
      title: "Urgente: Demo",
      barClass: "border-[#ba1a1a]",
      textClass: "text-[#93000a]",
      bgClass: "bg-[#ffdad6]/40",
    },
  ],
  12: [
    {
      time: "Todo el día",
      title: "Salida de Marketing",
      barClass: "border-[#323537]",
      textClass: "text-[#191c1e]",
      bgClass: "bg-[#444749]/20",
    },
  ],
};

type DayCell = {
  day: number;
  currentMonth: boolean;
};

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const startWeekday = (firstDay.getDay() + 6) % 7; // lunes = 0

  const cells: DayCell[] = [];
  for (let i = startWeekday; i > 0; i--) {
    cells.push({ day: prevMonthLastDay - i + 1, currentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay++, currentMonth: false });
  }
  return cells;
}

export default function CalendarioPage() {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  function changeMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1));
  }

  return (
    <>
      <div className="grid grid-cols-12 gap-8">
        {/* Calendario */}
        <div className="col-span-12 flex flex-col lg:col-span-9">
          <div className="flex flex-col overflow-hidden rounded-xl border border-[#c4c5d5] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#c4c5d5] p-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-[#0b1c30]">
                  {monthNames[month]} {year}
                </h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="rounded p-1 transition-colors hover:bg-[#e5eeff]"
                  >
                    <span className="material-symbols-outlined">
                      chevron_left
                    </span>
                  </button>
                  <button
                    onClick={() => changeMonth(1)}
                    className="rounded p-1 transition-colors hover:bg-[#e5eeff]"
                  >
                    <span className="material-symbols-outlined">
                      chevron_right
                    </span>
                  </button>
                </div>
                <button
                  onClick={() => setViewDate(new Date())}
                  className="rounded-lg border border-[#c4c5d5] px-4 py-1.5 text-xs font-semibold transition-colors hover:bg-[#e5eeff]"
                >
                  Hoy
                </button>
              </div>
              <div className="flex items-center rounded-lg border border-[#c4c5d5] bg-[#eff4ff] p-1">
                <button className="rounded-md px-4 py-1.5 text-xs font-semibold transition-colors hover:bg-white">
                  Día
                </button>
                <button className="rounded-md px-4 py-1.5 text-xs font-semibold transition-colors hover:bg-white">
                  Semana
                </button>
                <button className="rounded-md bg-white px-4 py-1.5 text-xs font-bold text-[#00288e] shadow-sm">
                  Mes
                </button>
                <button className="rounded-md px-4 py-1.5 text-xs font-semibold transition-colors hover:bg-white">
                  Lista
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-[#c4c5d5] bg-[#eff4ff]">
              {weekDays.map((d) => (
                <div
                  key={d}
                  className="py-3 text-center text-xs font-semibold text-[#757684]"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                const isToday =
                  cell.currentMonth &&
                  cell.day === today.getDate() &&
                  month === today.getMonth() &&
                  year === today.getFullYear();
                const dayEvents = cell.currentMonth
                  ? eventsByDay[cell.day]
                  : undefined;

                return (
                  <div
                    key={i}
                    className={`min-h-[120px] border-b border-r border-[#c4c5d5] p-2 transition-colors last:border-r-0 ${
                      cell.currentMonth
                        ? "hover:bg-[#eff4ff]"
                        : "bg-[#eff4ff] opacity-40"
                    } ${isToday ? "bg-[#00288e]/5 ring-1 ring-[#00288e]/20" : ""}`}
                  >
                    {isToday ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00288e] text-xs font-bold text-white">
                        {cell.day}
                      </span>
                    ) : (
                      <span className="p-1 text-xs font-semibold">
                        {cell.day}
                      </span>
                    )}
                    {dayEvents && (
                      <div className="mt-2 flex flex-col gap-1">
                        {dayEvents.map((event, idx) => (
                          <div
                            key={idx}
                            className={`truncate rounded-sm border-l-4 px-2 py-1 text-[11px] font-semibold ${event.barClass} ${event.textClass} ${event.bgClass}`}
                          >
                            {event.time} {event.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="col-span-12 flex flex-col gap-6 lg:col-span-3">
          <button
            onClick={() => setModalOpen(true)}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#00288e] text-lg font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Agendar Reunión
          </button>

          <div className="rounded-xl border border-[#c4c5d5] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0b1c30]">
                Agenda de Hoy
              </h3>
              <span className="rounded-full bg-[#1e40af] px-2 py-0.5 text-[10px] text-white">
                2 EVENTOS
              </span>
            </div>
            <div className="space-y-4">
              <div className="cursor-pointer">
                <p className="mb-1 text-xs font-medium text-[#757684]">
                  11:00 AM - 12:00 PM
                </p>
                <div className="rounded-lg border-l-4 border-[#00288e] bg-[#eff4ff] p-3 transition-colors hover:bg-[#e5eeff]">
                  <h4 className="mb-1 text-sm font-semibold text-[#0b1c30]">
                    Revisión Estrategia Q4
                  </h4>
                  <span className="text-xs text-[#757684]">
                    con Sara y Marcos
                  </span>
                </div>
              </div>
              <div className="cursor-pointer">
                <p className="mb-1 text-xs font-medium text-[#757684]">
                  01:30 PM - 02:00 PM
                </p>
                <div className="rounded-lg border-l-4 border-[#006a61] bg-[#eff4ff] p-3 transition-colors hover:bg-[#e5eeff]">
                  <h4 className="mb-1 text-sm font-semibold text-[#0b1c30]">
                    Seguimiento: Apex Corp
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-[#444653]">
                    <span className="material-symbols-outlined text-[14px]">
                      videocam
                    </span>
                    <span>Reunión por Zoom</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#c4c5d5] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#0b1c30]">
              Disponibilidad del Equipo
            </h3>
            <div className="space-y-3">
              {[
                { name: "Elena Rodríguez", online: true, checked: true },
                { name: "David Parra", online: false, checked: true },
                { name: "Sami Wilson", online: true, checked: false },
              ].map((member) => (
                <label
                  key={member.name}
                  className="flex cursor-pointer items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#c4c5d5] bg-[#e5eeff] text-xs font-bold text-[#00288e]">
                      {member.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                          member.online ? "bg-green-500" : "bg-orange-400"
                        }`}
                      />
                    </div>
                    <span className="text-sm font-medium text-[#0b1c30]">
                      {member.name}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={member.checked}
                    className="rounded border-[#c4c5d5] text-[#00288e] focus:ring-[#00288e]"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6]/10 p-6">
            <div className="mb-3 flex items-center gap-2 text-[#ba1a1a]">
              <span className="material-symbols-outlined text-[20px]">
                warning
              </span>
              <h3 className="text-xs font-semibold uppercase tracking-wider">
                Atrasado
              </h3>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined mt-0.5 text-[18px] text-[#ba1a1a]">
                priority_high
              </span>
              <div>
                <p className="text-sm font-semibold text-[#93000a]">
                  Aprobación Factura #4402
                </p>
                <p className="text-[11px] text-[#ba1a1a]">
                  Vencida hace 2 días
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Agendar Reunión */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1c30]/40 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#c4c5d5] p-6">
              <h2 className="text-xl font-semibold text-[#0b1c30]">
                Agendar Reunión
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-full p-2 transition-colors hover:bg-[#eff4ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form
              className="space-y-6 p-8"
              onSubmit={(e) => {
                e.preventDefault();
                setModalOpen(false);
              }}
            >
              <div>
                <label className="mb-2 block text-xs font-semibold text-[#757684]">
                  Título de la Reunión
                </label>
                <input
                  type="text"
                  placeholder="ej. Kickoff de Proyecto"
                  className="h-10 w-full rounded-lg border border-[#c4c5d5] px-4 outline-none focus:ring-2 focus:ring-[#00288e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#757684]">
                    Fecha
                  </label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-lg border border-[#c4c5d5] px-4 outline-none focus:ring-2 focus:ring-[#00288e]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#757684]">
                    Hora
                  </label>
                  <input
                    type="time"
                    className="h-10 w-full rounded-lg border border-[#c4c5d5] px-4 outline-none focus:ring-2 focus:ring-[#00288e]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[#757684]">
                  Invitados
                </label>
                <div className="flex min-h-[40px] flex-wrap items-center gap-2 rounded-lg border border-[#c4c5d5] p-2">
                  <span className="flex items-center gap-2 rounded-full bg-[#00288e]/10 px-3 py-1 text-xs font-semibold text-[#00288e]">
                    Elena Rodríguez
                    <button type="button" className="material-symbols-outlined text-[14px]">
                      close
                    </button>
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar miembros del equipo..."
                    className="h-8 flex-1 border-none text-sm outline-none focus:ring-0"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[#757684]">
                  Tipo de Reunión
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: "videocam", label: "Virtual" },
                    { icon: "location_on", label: "Presencial" },
                    { icon: "call", label: "Teléfono" },
                  ].map((type) => (
                    <label key={type.label} className="cursor-pointer">
                      <input
                        type="radio"
                        name="mtype"
                        className="peer hidden"
                      />
                      <div className="flex flex-col items-center gap-2 rounded-xl border border-[#c4c5d5] p-3 transition-all peer-checked:border-[#00288e] peer-checked:bg-[#00288e]/5">
                        <span className="material-symbols-outlined">
                          {type.icon}
                        </span>
                        <span className="text-xs">{type.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-[#c4c5d5] px-6 py-2 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#00288e] px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#00288e]/90 active:scale-95"
                >
                  Crear Reunión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

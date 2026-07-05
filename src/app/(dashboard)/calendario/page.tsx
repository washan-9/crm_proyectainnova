"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DbEvent = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  color: string | null;
};

type TeamMember = {
  id: string;
  full_name: string;
  status: "activo" | "ausente";
};

type OverdueTask = {
  id: string;
  title: string;
  due_at: string;
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

const eventPalette: Record<
  string,
  { bar: string; text: string; bg: string }
> = {
  azul: {
    bar: "border-[#00288e]",
    text: "text-[#00288e]",
    bg: "bg-[#1e40af]/20",
  },
  verde: {
    bar: "border-[#006a61]",
    text: "text-[#006f66]",
    bg: "bg-[#86f2e4]/30",
  },
  rojo: {
    bar: "border-[#ba1a1a]",
    text: "text-[#93000a]",
    bg: "bg-[#ffdad6]/40",
  },
  gris: {
    bar: "border-[#323537]",
    text: "text-[#191c1e]",
    bg: "bg-[#444749]/20",
  },
};

function colorFor(event: DbEvent) {
  if (event.color && eventPalette[event.color]) {
    return eventPalette[event.color];
  }
  return eventPalette.azul;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [overdue, setOverdue] = useState<OverdueTask[]>([]);
  const [version, setVersion] = useState(0);

  // Campos del modal
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [color, setColor] = useState("azul");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  useEffect(() => {
    const supabase = createClient();
    const monthStart = new Date(year, month, 1).toISOString();
    const monthEnd = new Date(year, month + 1, 1).toISOString();

    supabase
      .from("events")
      .select("id, title, description, starts_at, ends_at, all_day, color")
      .gte("starts_at", monthStart)
      .lt("starts_at", monthEnd)
      .order("starts_at")
      .then(({ data }) => setEvents(data ?? []));
  }, [year, month, version]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name, status")
      .order("full_name")
      .then(({ data }) => setTeam((data ?? []) as TeamMember[]));

    supabase
      .from("tasks")
      .select("id, title, due_at")
      .is("completed_at", null)
      .lt("due_at", new Date().toISOString())
      .order("due_at")
      .limit(3)
      .then(({ data }) => setOverdue((data ?? []) as OverdueTask[]));
  }, []);

  const eventsByDay = useMemo(() => {
    const map: Record<number, DbEvent[]> = {};
    for (const event of events) {
      const day = new Date(event.starts_at).getDate();
      map[day] = map[day] ?? [];
      map[day].push(event);
    }
    return map;
  }, [events]);

  const todaysEvents = useMemo(
    () =>
      events.filter(
        (e) => new Date(e.starts_at).toDateString() === today.toDateString(),
      ),
    [events, today],
  );

  function changeMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1));
  }

  function openModal() {
    setTitle("");
    setDate(new Date().toISOString().slice(0, 10));
    setTime("09:00");
    setColor("azul");
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const startsAt = new Date(`${date}T${time}`);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000); // 1 hora

    const { error } = await supabase.from("events").insert({
      title,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      all_day: false,
      color,
      owner_id: user?.id ?? null,
    });

    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setModalOpen(false);
    setVersion((v) => v + 1);
  }

  function formatOverdueDate(iso: string) {
    const days = Math.floor(
      (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000),
    );
    if (days === 0) return "Vencida hoy";
    return `Vencida hace ${days} día${days === 1 ? "" : "s"}`;
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
                        {dayEvents.map((event) => {
                          const palette = colorFor(event);
                          return (
                            <div
                              key={event.id}
                              title={event.title}
                              className={`truncate rounded-sm border-l-4 px-2 py-1 text-[11px] font-semibold ${palette.bar} ${palette.text} ${palette.bg}`}
                            >
                              {event.all_day
                                ? "Todo el día"
                                : formatTime(event.starts_at)}{" "}
                              {event.title}
                            </div>
                          );
                        })}
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
            onClick={openModal}
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
                {todaysEvents.length}{" "}
                {todaysEvents.length === 1 ? "EVENTO" : "EVENTOS"}
              </span>
            </div>
            <div className="space-y-4">
              {todaysEvents.length === 0 && (
                <p className="text-sm text-[#757684]">
                  No hay eventos para hoy.
                </p>
              )}
              {todaysEvents.map((event) => {
                const palette = colorFor(event);
                return (
                  <div key={event.id} className="cursor-pointer">
                    <p className="mb-1 text-xs font-medium text-[#757684]">
                      {event.all_day
                        ? "Todo el día"
                        : `${formatTime(event.starts_at)}${
                            event.ends_at
                              ? ` - ${formatTime(event.ends_at)}`
                              : ""
                          }`}
                    </p>
                    <div
                      className={`rounded-lg border-l-4 bg-[#eff4ff] p-3 transition-colors hover:bg-[#e5eeff] ${palette.bar}`}
                    >
                      <h4 className="mb-1 text-sm font-semibold text-[#0b1c30]">
                        {event.title}
                      </h4>
                      {event.description && (
                        <span className="text-xs text-[#757684]">
                          {event.description}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[#c4c5d5] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#0b1c30]">
              Disponibilidad del Equipo
            </h3>
            <div className="space-y-3">
              {team.length === 0 && (
                <p className="text-sm text-[#757684]">Sin miembros aún.</p>
              )}
              {team.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#c4c5d5] bg-[#e5eeff] text-xs font-bold text-[#00288e]">
                      {member.full_name
                        .split(" ")
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                          member.status === "activo"
                            ? "bg-green-500"
                            : "bg-orange-400"
                        }`}
                      />
                    </div>
                    <span className="text-sm font-medium text-[#0b1c30]">
                      {member.full_name}
                    </span>
                  </div>
                  <span className="text-xs text-[#757684]">
                    {member.status === "activo" ? "Activo" : "Ausente"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {overdue.length > 0 && (
            <div className="rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6]/10 p-6">
              <div className="mb-3 flex items-center gap-2 text-[#ba1a1a]">
                <span className="material-symbols-outlined text-[20px]">
                  warning
                </span>
                <h3 className="text-xs font-semibold uppercase tracking-wider">
                  Atrasado
                </h3>
              </div>
              <div className="space-y-3">
                {overdue.map((task) => (
                  <div key={task.id} className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-[#ba1a1a]">
                      priority_high
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#93000a]">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-[#ba1a1a]">
                        {formatOverdueDate(task.due_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

            <form className="space-y-6 p-8" onSubmit={handleCreateEvent}>
              <div>
                <label className="mb-2 block text-xs font-semibold text-[#757684]">
                  Título de la Reunión
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#c4c5d5] px-4 outline-none focus:ring-2 focus:ring-[#00288e]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#757684]">
                    Hora
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#c4c5d5] px-4 outline-none focus:ring-2 focus:ring-[#00288e]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[#757684]">
                  Color
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {(
                    [
                      { key: "azul", label: "Azul" },
                      { key: "verde", label: "Verde" },
                      { key: "rojo", label: "Urgente" },
                      { key: "gris", label: "Otro" },
                    ] as const
                  ).map((option) => (
                    <label key={option.key} className="cursor-pointer">
                      <input
                        type="radio"
                        name="color"
                        checked={color === option.key}
                        onChange={() => setColor(option.key)}
                        className="peer hidden"
                      />
                      <div
                        className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-all peer-checked:border-[#00288e] peer-checked:bg-[#00288e]/5 ${eventPalette[option.key].bg} border-[#c4c5d5]`}
                      >
                        <span className="text-xs font-semibold">
                          {option.label}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {saveError && (
                <p className="rounded-lg bg-[#ba1a1a]/10 px-4 py-2 text-sm font-medium text-[#ba1a1a]">
                  Error al guardar: {saveError}
                </p>
              )}

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
                  disabled={saving}
                  className="rounded-lg bg-[#00288e] px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#00288e]/90 active:scale-95 disabled:opacity-70"
                >
                  {saving ? "Guardando..." : "Crear Reunión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

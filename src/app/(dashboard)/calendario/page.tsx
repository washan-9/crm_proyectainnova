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
  meeting_notes: string | null;
  contact_id: string | null;
  owner: { full_name: string } | null;
  contact: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
};

type TeamMember = {
  id: string;
  full_name: string;
  status: "activo" | "ausente" | "inhabilitado";
};

type ContactOption = { id: string; full_name: string; company: string | null };

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
  const [detailEvent, setDetailEvent] = useState<DbEvent | null>(null);
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [overdue, setOverdue] = useState<OverdueTask[]>([]);
  const [version, setVersion] = useState(0);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
      .select(
        `id, title, description, starts_at, ends_at, all_day, color,
         meeting_notes, contact_id,
         owner:profiles(full_name),
         contact:contacts(id, full_name, email, phone)`,
      )
      .gte("starts_at", monthStart)
      .lt("starts_at", monthEnd)
      .order("starts_at")
      .then(({ data }) => setEvents((data ?? []) as unknown as DbEvent[]));
  }, [year, month, version]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name, status")
      .order("full_name")
      .then(({ data }) => setTeam((data ?? []) as TeamMember[]));

    supabase
      .from("contacts")
      .select("id, full_name, company")
      .order("full_name")
      .then(({ data }) => setContacts((data ?? []) as ContactOption[]));

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

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  }

  function openModal() {
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleCreateEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const startsAt = new Date(`${form.get("date")}T${form.get("time")}`);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000); // 1 hora

    const { error } = await supabase.from("events").insert({
      title: (form.get("title") as string).trim(),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      all_day: false,
      color: form.get("color") as string,
      owner_id: (form.get("owner_id") as string) || user?.id || null,
      contact_id: (form.get("contact_id") as string) || null,
    });

    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setModalOpen(false);
    setVersion((v) => v + 1);
  }

  // Guarda la minuta de la reunión: confirma/actualiza datos del contacto,
  // registra los puntos tocados y los añade al historial de actividades.
  async function handleSaveMeeting(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!detailEvent) return;
    setDetailSaving(true);
    setDetailError(null);

    const form = new FormData(e.currentTarget);
    const notes = ((form.get("meeting_notes") as string) ?? "").trim();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: eventError } = await supabase
      .from("events")
      .update({ meeting_notes: notes || null })
      .eq("id", detailEvent.id);

    if (eventError) {
      setDetailSaving(false);
      setDetailError(eventError.message);
      return;
    }

    if (detailEvent.contact) {
      const { error: contactError } = await supabase
        .from("contacts")
        .update({
          email: (form.get("contact_email") as string) || null,
          phone: (form.get("contact_phone") as string) || null,
        })
        .eq("id", detailEvent.contact.id);

      if (contactError) {
        setDetailSaving(false);
        setDetailError(contactError.message);
        return;
      }

      // Historial: solo cuando se registran puntos nuevos
      if (notes && notes !== (detailEvent.meeting_notes ?? "").trim()) {
        await supabase.from("activities").insert({
          type: "reunion",
          description: `${detailEvent.title}: ${notes}`,
          contact_id: detailEvent.contact.id,
          user_id: user?.id ?? null,
        });
      }
    }

    setDetailSaving(false);
    setDetailEvent(null);
    setVersion((v) => v + 1);
    showToast("Reunión actualizada correctamente.");
  }

  function formatOverdueDate(iso: string) {
    const days = Math.floor(
      (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000),
    );
    if (days === 0) return "Vencida hoy";
    return `Vencida hace ${days} día${days === 1 ? "" : "s"}`;
  }

  const inputClass =
    "h-10 w-full rounded-lg border border-[#c4c5d5] px-4 outline-none focus:ring-2 focus:ring-[#00288e]";

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
                              onClick={() => {
                                setDetailError(null);
                                setDetailEvent(event);
                              }}
                              className={`cursor-pointer truncate rounded-sm border-l-4 px-2 py-1 text-[11px] font-semibold ${palette.bar} ${palette.text} ${palette.bg}`}
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
                  <div
                    key={event.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setDetailError(null);
                      setDetailEvent(event);
                    }}
                  >
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
                      <div className="flex flex-col gap-0.5 text-xs text-[#757684]">
                        {event.owner && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">
                              support_agent
                            </span>
                            Atiende: {event.owner.full_name}
                          </span>
                        )}
                        {event.contact && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">
                              person
                            </span>
                            Contacto: {event.contact.full_name}
                          </span>
                        )}
                        {event.meeting_notes && (
                          <span className="flex items-center gap-1 text-[#006a61]">
                            <span className="material-symbols-outlined text-[14px]">
                              task_alt
                            </span>
                            Con minuta registrada
                          </span>
                        )}
                      </div>
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
                            : member.status === "ausente"
                              ? "bg-orange-400"
                              : "bg-gray-400"
                        }`}
                      />
                    </div>
                    <span className="text-sm font-medium text-[#0b1c30]">
                      {member.full_name}
                    </span>
                  </div>
                  <span className="text-xs text-[#757684]">
                    {member.status === "activo"
                      ? "Activo"
                      : member.status === "ausente"
                        ? "Ausente"
                        : "Inhabilitado"}
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
          onMouseDown={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
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
                  name="title"
                  required
                  autoFocus
                  placeholder="ej. Kickoff de Proyecto"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#757684]">
                    Fecha
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#757684]">
                    Hora
                  </label>
                  <input
                    type="time"
                    name="time"
                    required
                    defaultValue="09:00"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#757684]">
                    ¿Quién atiende la reunión?
                  </label>
                  <select name="owner_id" defaultValue="" className={inputClass}>
                    <option value="">Yo (usuario actual)</option>
                    {team
                      .filter((m) => m.status !== "inhabilitado")
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#757684]">
                    Contacto
                  </label>
                  <select
                    name="contact_id"
                    defaultValue=""
                    className={inputClass}
                  >
                    <option value="">Sin contacto</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                        {c.company ? ` — ${c.company}` : ""}
                      </option>
                    ))}
                  </select>
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
                        value={option.key}
                        defaultChecked={option.key === "azul"}
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

      {/* Modal: Detalle de reunión (confirmar datos + puntos tocados) */}
      {detailEvent && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1c30]/40 p-4 backdrop-blur-sm"
          onMouseDown={() => setDetailEvent(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#c4c5d5] p-6">
              <div>
                <h2 className="text-xl font-semibold text-[#0b1c30]">
                  {detailEvent.title}
                </h2>
                <p className="text-xs text-[#757684]">
                  {new Date(detailEvent.starts_at).toLocaleDateString(
                    "es-ES",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                  {!detailEvent.all_day &&
                    ` • ${formatTime(detailEvent.starts_at)}`}
                  {detailEvent.owner &&
                    ` • Atiende: ${detailEvent.owner.full_name}`}
                </p>
              </div>
              <button
                onClick={() => setDetailEvent(null)}
                className="rounded-full p-2 transition-colors hover:bg-[#eff4ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="space-y-6 p-8" onSubmit={handleSaveMeeting}>
              {detailEvent.contact ? (
                <div className="rounded-xl border border-[#c4c5d5] bg-[#f8f9ff] p-5">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#00288e]">
                    Confirmar datos del contacto
                  </h3>
                  <p className="mb-3 text-sm font-semibold text-[#0b1c30]">
                    {detailEvent.contact.full_name}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#757684]">
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        name="contact_email"
                        defaultValue={detailEvent.contact.email ?? ""}
                        placeholder="Sin correo"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#757684]">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        name="contact_phone"
                        defaultValue={detailEvent.contact.phone ?? ""}
                        placeholder="Sin teléfono"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-[#757684]">
                    Verifica estos datos con el contacto durante la reunión y
                    corrígelos si es necesario.
                  </p>
                </div>
              ) : (
                <p className="rounded-lg bg-[#eff4ff] px-4 py-3 text-sm text-[#757684]">
                  Esta reunión no tiene un contacto vinculado.
                </p>
              )}

              <div>
                <label className="mb-2 block text-xs font-semibold text-[#757684]">
                  Puntos tocados en la reunión (historial)
                </label>
                <textarea
                  name="meeting_notes"
                  rows={5}
                  defaultValue={detailEvent.meeting_notes ?? ""}
                  placeholder="ej. Se presentó la propuesta comercial, el cliente pidió ajustar el presupuesto..."
                  className="w-full rounded-lg border border-[#c4c5d5] p-4 text-sm outline-none focus:ring-2 focus:ring-[#00288e]"
                />
                {detailEvent.contact && (
                  <p className="mt-1 text-[11px] text-[#757684]">
                    Al guardar, los puntos se registran también en el historial
                    de actividades del contacto.
                  </p>
                )}
              </div>

              {detailError && (
                <p className="rounded-lg bg-[#ba1a1a]/10 px-4 py-2 text-sm font-medium text-[#ba1a1a]">
                  Error al guardar: {detailError}
                </p>
              )}

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setDetailEvent(null)}
                  className="rounded-lg border border-[#c4c5d5] px-6 py-2 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={detailSaving}
                  className="rounded-lg bg-[#006a61] px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-70"
                >
                  {detailSaving ? "Guardando..." : "Guardar Minuta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 right-8 z-[100] flex items-center gap-3 rounded-lg bg-[#213145] px-6 py-4 text-sm text-white shadow-lg">
          <span className="material-symbols-outlined text-[#6bd8cb]">
            check_circle
          </span>
          {toast}
        </div>
      )}
    </>
  );
}

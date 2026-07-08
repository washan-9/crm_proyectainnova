"use client";

const monthNames = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sab", "Dom"];

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

type CalendarEvent = {
  id: string;
  purpose: string;
  scheduled_at: string;
  prospect: { id: string; full_name: string } | null;
};

type Prospect = {
  id: string;
  full_name: string;
};

type Props = {
  events: CalendarEvent[];
  contacts: Record<string, Prospect>;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
};

export default function CalendarView({
  events,
  contacts,
  currentMonth,
  onMonthChange,
  onEventClick,
  onDateClick,
}: Props) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Llenar días previos para alinear el calendario
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - monthStart.getDay());
  const calendarDays = [];
  for (let i = 0; i < 42; i++) {
    calendarDays.push(new Date(startDate));
    startDate.setDate(startDate.getDate() + 1);
  }

  const getDayEvents = (date: Date) => {
    return events.filter((e) =>
      isSameDay(new Date(e.scheduled_at), date)
    );
  };

  const prevMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Encabezado del mes */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
          >
            ← Anterior
          </button>
          <button
            onClick={nextMonth}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* Encabezados de días */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center font-bold text-gray-600 text-sm py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Celdas del calendario */}
      <div className="grid grid-cols-7 gap-1 bg-gray-50 p-2 rounded-lg">
        {calendarDays.map((date, idx) => {
          const isCurrentMonth =
            date.getMonth() === currentMonth.getMonth() &&
            date.getFullYear() === currentMonth.getFullYear();
          const dayEvents = getDayEvents(date);
          const isToday = isSameDay(date, new Date());

          return (
            <div
              key={idx}
              onClick={() => onDateClick(date)}
              className={`min-h-24 p-2 rounded-lg cursor-pointer transition-all ${
                isCurrentMonth
                  ? isToday
                    ? "bg-blue-100 border-2 border-blue-400"
                    : "bg-white hover:bg-gray-100"
                  : "bg-gray-100 text-gray-400"
              } border-2 ${!isCurrentMonth ? "border-transparent" : "border-gray-200"}`}
            >
              <div className={`text-sm font-semibold mb-1 ${isToday ? "text-blue-700" : "text-gray-700"}`}>
                {date.getDate()}
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className="text-xs bg-blue-500 text-white p-1 rounded truncate hover:bg-blue-600"
                    title={event.purpose}
                  >
                    {event.prospect?.full_name || "Sin prospecto"} - {event.purpose}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-500 px-1">
                    +{dayEvents.length - 2} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

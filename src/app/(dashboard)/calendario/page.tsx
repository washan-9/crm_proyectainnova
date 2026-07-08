"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ViewTopbar } from "@/components/view-topbar";
import CalendarView from "./calendar-view-component";
import EventModal from "./event-modal-meetings";

type CalendarEvent = {
  id: string;
  purpose: string;
  scheduled_at: string;
  modality: "virtual" | "presencial";
  location: string | null;
  status: "programada" | "realizada" | "no_asistio" | "cancelada";
  result_notes: string | null;
  commitment: string | null;
  commitment_due: string | null;
  prospect: { id: string; full_name: string } | null;
  created_by: string;
};

type Contact = {
  id: string;
  full_name: string;
};

export default function CalendarioPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [contacts, setContacts] = useState<Record<string, Contact>>({});
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();

      // Obtener usuario actual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Cargar reuniones del vendedor
      const { data: eventsData } = await supabase
        .from("meetings")
        .select("*, prospect:prospects(id, full_name)")
        .eq("created_by", user.id)
        .order("scheduled_at");

      if (eventsData) {
        setEvents(eventsData as CalendarEvent[]);

        // Cargar prospectos relacionados
        const prospectIds = new Set(
          eventsData
            .filter((e: any) => e.prospect_id)
            .map((e: any) => e.prospect_id)
        );

        if (prospectIds.size > 0) {
          const { data: prospectData } = await supabase
            .from("prospects")
            .select("id, full_name")
            .in("id", Array.from(prospectIds));

          if (prospectData) {
            const contactMap = Object.fromEntries(
              prospectData.map((p) => [p.id, { id: p.id, full_name: p.full_name }])
            );
            setContacts(contactMap);
          }
        }
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleCreateEvent = (date: Date) => {
    const newEvent: CalendarEvent = {
      id: "",
      purpose: "",
      scheduled_at: date.toISOString(),
      modality: "virtual",
      location: null,
      status: "programada",
      result_notes: null,
      commitment: null,
      commitment_due: null,
      prospect: null,
      created_by: userId,
    };
    setSelectedEvent(newEvent);
    setShowModal(true);
  };

  const handleEventSaved = (newEvent: CalendarEvent) => {
    if (newEvent.id) {
      setEvents(events.map((e) => (e.id === newEvent.id ? newEvent : e)));
    } else {
      setEvents([...events, newEvent]);
    }
    setShowModal(false);
    setSelectedEvent(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <ViewTopbar
          breadcrumb="Continuidad Comercial"
          title="Calendario"
        />
        <div className="mt-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ViewTopbar
        breadcrumb="Continuidad Comercial"
        title="Calendario"
      />

      <div className="mt-8">
        <CalendarView
          events={events}
          contacts={contacts}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          onEventClick={handleEventClick}
          onDateClick={handleCreateEvent}
        />
      </div>

      {showModal && selectedEvent && (
        <EventModal
          event={selectedEvent}
          contacts={contacts}
          onSave={handleEventSaved}
          onClose={() => {
            setShowModal(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

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

type Prospect = {
  id: string;
  full_name: string;
};

type Props = {
  event: CalendarEvent;
  contacts: Record<string, Prospect>;
  onSave: (event: CalendarEvent) => void;
  onClose: () => void;
};

export default function EventModal({ event, contacts, onSave, onClose }: Props) {
  const [purpose, setPurpose] = useState(event.purpose);
  const [modality, setModality] = useState<"virtual" | "presencial">(event.modality);
  const [location, setLocation] = useState(event.location || "");
  const [prospectId, setProspectId] = useState(event.prospect?.id || "");
  const [prospectList, setProspectList] = useState<Prospect[]>([]);
  const [scheduledAt, setScheduledAt] = useState(
    new Date(event.scheduled_at).toISOString().slice(0, 16)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProspects = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("prospects")
        .select("id, full_name")
        .neq("state", "congelado")
        .order("full_name");
      if (data) setProspectList(data as Prospect[]);
    };
    loadProspects();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    if (!purpose.trim()) {
      setError("El motivo de la reunión es obligatorio");
      setSaving(false);
      return;
    }

    if (!prospectId) {
      setError("Debes seleccionar un prospecto");
      setSaving(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const updatedEvent = {
        purpose: purpose.trim(),
        modality,
        location: location.trim() || null,
        prospect_id: prospectId,
        scheduled_at: new Date(scheduledAt).toISOString(),
      };

      if (event.id) {
        // Editar reunión existente
        const { error: updateError } = await supabase
          .from("meetings")
          .update(updatedEvent)
          .eq("id", event.id);

        if (updateError) throw updateError;

        await logAudit("Reunión actualizada", `Reunión con ${event.prospect?.full_name} actualizada`);
      } else {
        // Crear nueva reunión
        const { data, error: insertError } = await supabase
          .from("meetings")
          .insert([{ ...updatedEvent, created_by: user?.id }])
          .select("*, prospect:prospects(id, full_name)")
          .single();

        if (insertError) throw insertError;

        await logAudit("Reunión creada", `Nueva reunión con prospecto programada`);
        onSave(data as CalendarEvent);
        setSaving(false);
        onClose();
        return;
      }

      onSave({
        ...event,
        ...updatedEvent,
      } as CalendarEvent);
      setSaving(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event.id || !confirm("¿Eliminar esta reunión?")) return;

    setSaving(true);
    try {
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from("meetings")
        .delete()
        .eq("id", event.id);

      if (deleteError) throw deleteError;

      await logAudit("Reunión eliminada", `Reunión eliminada`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {event.id ? "Editar Reunión" : "Nueva Reunión"}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Prospecto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prospecto *
            </label>
            <select
              value={prospectId}
              onChange={(e) => setProspectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccionar prospecto --</option>
              {prospectList.map((prospect) => (
                <option key={prospect.id} value={prospect.id}>
                  {prospect.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo de la Reunión *
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="ej: Seguimiento comercial"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fecha y Hora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha y Hora *
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Modalidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modalidad
            </label>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value as "virtual" | "presencial")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="virtual">Virtual</option>
              <option value="presencial">Presencial</option>
            </select>
          </div>

          {/* Ubicación */}
          {modality === "presencial" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ubicación (opcional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="ej: Oficina Huacho"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-300 text-gray-700 font-medium hover:bg-gray-400"
            disabled={saving}
          >
            Cancelar
          </button>
          {event.id && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600"
              disabled={saving}
            >
              Eliminar
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNewLead } from "@/components/new-lead-modal";

type LeadStatus = "nuevo" | "contactado" | "calificado" | "perdido";

type Lead = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: LeadStatus;
  last_contact_at: string | null;
  converted_contact_id: string | null;
};

type Vendedor = { id: string; full_name: string };

const statusLabels: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  calificado: "Prospecto",
  perdido: "Perdido",
};

const statusStyles: Record<LeadStatus, string> = {
  nuevo: "bg-[#00288e]/10 text-[#00288e]",
  contactado: "bg-[#006a61]/10 text-[#006a61]",
  calificado: "bg-[#6bd8cb]/30 text-[#00201d]",
  perdido: "bg-[#ba1a1a]/10 text-[#ba1a1a]",
};

const avatarPalette = [
  { bg: "bg-[#b8c4ff]", text: "text-[#001453]" },
  { bg: "bg-[#dde1ff]", text: "text-[#00288e]" },
  { bg: "bg-[#6bd8cb]", text: "text-[#00201d]" },
  { bg: "bg-[#e0e3e5]", text: "text-[#323537]" },
  { bg: "bg-[#1e40af]", text: "text-[#a8b8ff]" },
];

function avatarFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return avatarPalette[hash % avatarPalette.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "Todos">(
    "Todos",
  );
  const [search, setSearch] = useState("");
  const { version } = useNewLead();

  const [localVersion, setLocalVersion] = useState(0);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const [callLead, setCallLead] = useState<Lead | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("leads")
      .select(
        "id, full_name, email, phone, company, status, last_contact_at, converted_contact_id",
      )
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message);
        } else {
          setLeads(data ?? []);
        }
        setLoading(false);
      });
  }, [version, localVersion]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "vendedor")
      .order("full_name")
      .then(({ data }) => setVendedores((data ?? []) as Vendedor[]));
  }, []);

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  }

  // Registrar resultado de llamada: queda en el historial de actividades
  // y el trigger de BD actualiza el "último contacto" del lead
  async function handleRegisterCall(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!callLead) return;
    setBusy(true);
    setModalError(null);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("activities").insert({
      type: "llamada",
      description: (form.get("result") as string).trim(),
      lead_id: callLead.id,
      user_id: user?.id ?? null,
    });

    const newStatus = form.get("new_status") as string;
    if (!error && newStatus && newStatus !== callLead.status) {
      await supabase
        .from("leads")
        .update({ status: newStatus })
        .eq("id", callLead.id);
    }

    setBusy(false);
    if (error) {
      setModalError(error.message);
      return;
    }
    setCallLead(null);
    setLocalVersion((v) => v + 1);
    showToast("Llamada registrada correctamente.");
  }

  // Convertir a prospecto: crea el contacto asignado a un vendedor
  // y marca el lead como convertido (estado Prospecto)
  async function handleConvert(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!convertLead) return;
    setBusy(true);
    setModalError(null);

    const form = new FormData(e.currentTarget);
    const vendedorId = form.get("vendedor") as string;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        full_name: convertLead.full_name,
        email: convertLead.email,
        phone: convertLead.phone,
        company: convertLead.company,
        tag: "cliente",
        assigned_to: vendedorId,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (contactError || !contact) {
      setBusy(false);
      setModalError(contactError?.message ?? "No se pudo crear el contacto.");
      return;
    }

    const { error: leadError } = await supabase
      .from("leads")
      .update({
        status: "calificado",
        converted_contact_id: contact.id,
      })
      .eq("id", convertLead.id);

    setBusy(false);
    if (leadError) {
      setModalError(leadError.message);
      return;
    }
    setConvertLead(null);
    setLocalVersion((v) => v + 1);
    showToast(
      "Lead convertido a prospecto y asignado al vendedor seleccionado.",
    );
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === "Todos" || lead.status === statusFilter;
      const term = search.toLowerCase();
      const matchesSearch =
        term === "" ||
        lead.full_name.toLowerCase().includes(term) ||
        (lead.company ?? "").toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [leads, statusFilter, search]);

  return (
    <>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-[#0b1c30]">Leads</h2>
          <p className="text-sm text-[#757684]">
            Gestiona y da seguimiento a tus oportunidades de clientes
            potenciales.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-[#c4c5d5] bg-[#d3e4fe] px-4 py-2 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#c4c5d5]">
          <span className="material-symbols-outlined">download</span>
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-6 rounded-xl border border-[#c4c5d5] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#757684]">
            Estado:
          </span>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as LeadStatus | "Todos")
            }
            className="rounded-lg border border-[#c4c5d5] bg-[#e5eeff] px-4 py-1.5 text-sm focus:border-[#00288e] focus:ring-[#00288e]"
          >
            <option value="Todos">Todos los estados</option>
            <option value="nuevo">Nuevo</option>
            <option value="contactado">Contactado</option>
            <option value="calificado">Prospecto</option>
            <option value="perdido">Perdido</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#757684]">
            Rango de fechas:
          </span>
          <div className="flex items-center rounded-lg border border-[#c4c5d5] bg-[#e5eeff] px-4 py-1.5">
            <span className="material-symbols-outlined mr-1 text-[16px]">
              calendar_today
            </span>
            <span className="text-sm">Últimos 30 días</span>
          </div>
        </div>

        <div className="min-w-[200px] flex-1">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#757684]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por nombre o empresa..."
              className="w-full rounded-lg border border-[#c4c5d5] bg-[#e5eeff] py-1.5 pl-10 pr-4 text-sm focus:border-[#00288e] focus:ring-[#00288e]"
            />
          </div>
        </div>

        <button className="flex items-center gap-1 text-sm font-semibold text-[#00288e] hover:underline">
          <span className="material-symbols-outlined text-[18px]">
            filter_alt
          </span>
          Más filtros
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-white shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#c4c5d5] bg-[#eff4ff]">
              <th className="p-6 text-sm font-semibold text-[#757684]">
                Lead
              </th>
              <th className="p-6 text-sm font-semibold text-[#757684]">
                Empresa
              </th>
              <th className="p-6 text-sm font-semibold text-[#757684]">
                Estado
              </th>
              <th className="p-6 text-sm font-semibold text-[#757684]">
                Último Contacto
              </th>
              <th className="p-6 text-right text-sm font-semibold text-[#757684]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c4c5d5]">
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-sm text-[#757684]"
                >
                  Cargando leads...
                </td>
              </tr>
            )}
            {loadError && (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-sm text-[#ba1a1a]"
                >
                  Error al cargar leads: {loadError}
                </td>
              </tr>
            )}
            {!loading &&
              filteredLeads.map((lead) => {
                const avatar = avatarFor(lead.full_name);
                return (
                  <tr
                    key={lead.id}
                    className="cursor-pointer transition-colors hover:bg-[#eff4ff]"
                  >
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${avatar.bg} ${avatar.text}`}
                        >
                          {initials(lead.full_name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0b1c30]">
                            {lead.full_name}
                          </p>
                          <p className="text-xs text-[#757684]">
                            {lead.email ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-sm text-[#0b1c30]">
                      {lead.company ?? "—"}
                    </td>
                    <td className="p-6">
                      <span
                        className={`rounded-full px-4 py-1 text-xs font-semibold ${statusStyles[lead.status]}`}
                      >
                        {statusLabels[lead.status]}
                      </span>
                      {lead.converted_contact_id && (
                        <span className="ml-2 rounded-full bg-[#006a61]/10 px-2 py-1 text-[10px] font-bold text-[#006a61]">
                          CONVERTIDO
                        </span>
                      )}
                    </td>
                    <td className="p-6 text-sm text-[#757684]">
                      {formatDate(lead.last_contact_at)}
                    </td>
                    <td className="p-6 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setActionsFor((prev) =>
                              prev === lead.id ? null : lead.id,
                            )
                          }
                          className="material-symbols-outlined text-[#757684] hover:text-[#00288e]"
                        >
                          more_vert
                        </button>
                        {actionsFor === lead.id && (
                          <div className="absolute right-0 top-8 z-20 w-60 overflow-hidden rounded-xl border border-[#c4c5d5] bg-white text-left shadow-2xl">
                            <button
                              onClick={() => {
                                setActionsFor(null);
                                setModalError(null);
                                setCallLead(lead);
                              }}
                              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]"
                            >
                              <span className="material-symbols-outlined text-[20px] text-[#00288e]">
                                call
                              </span>
                              Registrar llamada
                            </button>
                            {!lead.converted_contact_id && (
                              <button
                                onClick={() => {
                                  setActionsFor(null);
                                  setModalError(null);
                                  setConvertLead(lead);
                                }}
                                className="flex w-full items-center gap-3 border-t border-[#c4c5d5]/40 px-4 py-3 text-sm font-semibold text-[#006a61] transition-colors hover:bg-[#eff4ff]"
                              >
                                <span className="material-symbols-outlined text-[20px]">
                                  switch_account
                                </span>
                                Convertir a prospecto
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            {!loading && !loadError && filteredLeads.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-sm text-[#757684]"
                >
                  {leads.length === 0
                    ? "Aún no hay leads registrados."
                    : "No se encontraron leads con esos filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-[#c4c5d5] bg-[#eff4ff] p-6">
          <p className="text-sm text-[#757684]">
            Mostrando {filteredLeads.length} de {leads.length} leads
          </p>
        </div>
      </div>

      {/* Modal: Registrar llamada */}
      {callLead && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1c30]/50 p-4"
          onMouseDown={() => setCallLead(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#c4c5d5] bg-[#eff4ff] px-6 py-4">
              <h3 className="text-xl font-semibold text-[#0b1c30]">
                Registrar Llamada
              </h3>
              <button
                onClick={() => setCallLead(null)}
                className="material-symbols-outlined text-[#757684] transition-colors hover:text-[#ba1a1a]"
              >
                close
              </button>
            </div>
            <form onSubmit={handleRegisterCall} className="space-y-4 p-6">
              <p className="text-sm text-[#757684]">
                Lead: <strong>{callLead.full_name}</strong>
                {callLead.phone ? ` • ${callLead.phone}` : ""}
              </p>
              <div className="space-y-1">
                <label className="ml-1 text-xs font-medium text-[#444653]">
                  Resultado de la llamada *
                </label>
                <textarea
                  name="result"
                  required
                  rows={4}
                  autoFocus
                  placeholder="ej. Contestó, interesado en el proyecto Torre Norte. Pidió que lo llamen la próxima semana."
                  className="w-full rounded-lg border border-[#c4c5d5] p-4 text-sm outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20"
                />
              </div>
              <div className="space-y-1">
                <label className="ml-1 text-xs font-medium text-[#444653]">
                  Actualizar estado del lead
                </label>
                <select
                  name="new_status"
                  defaultValue={callLead.status}
                  className="h-10 w-full rounded-lg border border-[#c4c5d5] bg-white px-4 text-sm outline-none focus:border-[#00288e]"
                >
                  <option value="nuevo">Nuevo</option>
                  <option value="contactado">Contactado</option>
                  <option value="perdido">Perdido</option>
                </select>
              </div>
              {modalError && (
                <p className="rounded-lg bg-[#ba1a1a]/10 px-4 py-2 text-sm font-medium text-[#ba1a1a]">
                  {modalError}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCallLead(null)}
                  className="rounded-lg border border-[#c4c5d5] px-6 py-2 text-sm font-semibold text-[#444653] transition-colors hover:bg-[#eff4ff]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-[#00288e] px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#00288e]/90 active:scale-[0.98] disabled:opacity-70"
                >
                  {busy ? "Guardando..." : "Guardar Llamada"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Convertir a prospecto */}
      {convertLead && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1c30]/50 p-4"
          onMouseDown={() => setConvertLead(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#c4c5d5] bg-[#eff4ff] px-6 py-4">
              <h3 className="text-xl font-semibold text-[#0b1c30]">
                Convertir a Prospecto
              </h3>
              <button
                onClick={() => setConvertLead(null)}
                className="material-symbols-outlined text-[#757684] transition-colors hover:text-[#ba1a1a]"
              >
                close
              </button>
            </div>
            <form onSubmit={handleConvert} className="space-y-4 p-6">
              <p className="text-sm text-[#757684]">
                Se creará el prospecto <strong>{convertLead.full_name}</strong>{" "}
                en Contactos y quedará asignado al vendedor que elijas. El lead
                pasará a estado <strong>Prospecto</strong>.
              </p>
              <div className="space-y-1">
                <label className="ml-1 text-xs font-medium text-[#444653]">
                  Vendedor asignado *
                </label>
                <select
                  name="vendedor"
                  required
                  defaultValue=""
                  className="h-10 w-full rounded-lg border border-[#c4c5d5] bg-white px-4 text-sm outline-none focus:border-[#00288e]"
                >
                  <option value="" disabled>
                    Selecciona un vendedor...
                  </option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.full_name}
                    </option>
                  ))}
                </select>
                {vendedores.length === 0 && (
                  <p className="ml-1 text-xs text-[#ba1a1a]">
                    No hay vendedores registrados. Pide al administrador que
                    cree uno en Empleados / Usuarios.
                  </p>
                )}
              </div>
              {modalError && (
                <p className="rounded-lg bg-[#ba1a1a]/10 px-4 py-2 text-sm font-medium text-[#ba1a1a]">
                  {modalError}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConvertLead(null)}
                  className="rounded-lg border border-[#c4c5d5] px-6 py-2 text-sm font-semibold text-[#444653] transition-colors hover:bg-[#eff4ff]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy || vendedores.length === 0}
                  className="rounded-lg bg-[#006a61] px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-70"
                >
                  {busy ? "Convirtiendo..." : "Convertir y Asignar"}
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

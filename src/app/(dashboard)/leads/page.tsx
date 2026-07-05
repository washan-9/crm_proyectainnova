"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNewLead } from "@/components/new-lead-modal";

type LeadStatus = "nuevo" | "contactado" | "calificado" | "perdido";

type Lead = {
  id: string;
  full_name: string;
  email: string | null;
  company: string | null;
  status: LeadStatus;
  last_contact_at: string | null;
};

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

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("leads")
      .select("id, full_name, email, company, status, last_contact_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message);
        } else {
          setLeads(data ?? []);
        }
        setLoading(false);
      });
  }, [version]);

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
                    </td>
                    <td className="p-6 text-sm text-[#757684]">
                      {formatDate(lead.last_contact_at)}
                    </td>
                    <td className="p-6 text-right">
                      <button className="material-symbols-outlined text-[#757684] hover:text-[#00288e]">
                        more_vert
                      </button>
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

    </>
  );
}

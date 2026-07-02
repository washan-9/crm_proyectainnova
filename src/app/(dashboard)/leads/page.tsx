"use client";

import { useMemo, useState } from "react";

type LeadStatus = "Nuevo" | "Contactado" | "Calificado" | "Perdido";

type Lead = {
  id: string;
  name: string;
  email: string;
  company: string;
  status: LeadStatus;
  lastContact: string;
  avatarBg: string;
  avatarText: string;
};

const leads: Lead[] = [
  {
    id: "1",
    name: "Jordan Davenport",
    email: "jordan@davenport.io",
    company: "Davenport Tech Solutions",
    status: "Nuevo",
    lastContact: "24 oct 2025",
    avatarBg: "bg-[#b8c4ff]",
    avatarText: "text-[#001453]",
  },
  {
    id: "2",
    name: "Elena Rodriguez",
    email: "e.rodriguez@nexustech.com",
    company: "Nexus Tech",
    status: "Contactado",
    lastContact: "23 oct 2025",
    avatarBg: "bg-[#dde1ff]",
    avatarText: "text-[#00288e]",
  },
  {
    id: "3",
    name: "Marcus Bennett",
    email: "mbennett@vertex.co",
    company: "Vertex Industries",
    status: "Calificado",
    lastContact: "21 oct 2025",
    avatarBg: "bg-[#6bd8cb]",
    avatarText: "text-[#00201d]",
  },
  {
    id: "4",
    name: "Simon Thorne",
    email: "sthorne@ironclad.io",
    company: "Ironclad Logistics",
    status: "Perdido",
    lastContact: "18 oct 2025",
    avatarBg: "bg-[#e0e3e5]",
    avatarText: "text-[#323537]",
  },
  {
    id: "5",
    name: "Alicia Low",
    email: "a.low@cloudforge.com",
    company: "CloudForge",
    status: "Nuevo",
    lastContact: "25 oct 2025",
    avatarBg: "bg-[#1e40af]",
    avatarText: "text-[#a8b8ff]",
  },
];

const statusStyles: Record<LeadStatus, string> = {
  Nuevo: "bg-[#00288e]/10 text-[#00288e]",
  Contactado: "bg-[#006a61]/10 text-[#006a61]",
  Calificado: "bg-[#6bd8cb]/30 text-[#00201d]",
  Perdido: "bg-[#ba1a1a]/10 text-[#ba1a1a]",
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "Todos">(
    "Todos",
  );
  const [search, setSearch] = useState("");

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === "Todos" || lead.status === statusFilter;
      const term = search.toLowerCase();
      const matchesSearch =
        term === "" ||
        lead.name.toLowerCase().includes(term) ||
        lead.company.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [statusFilter, search]);

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
            <option value="Nuevo">Nuevo</option>
            <option value="Contactado">Contactado</option>
            <option value="Calificado">Calificado</option>
            <option value="Perdido">Perdido</option>
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
            {filteredLeads.map((lead) => (
              <tr
                key={lead.id}
                className="cursor-pointer transition-colors hover:bg-[#eff4ff]"
              >
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${lead.avatarBg} ${lead.avatarText}`}
                    >
                      {initials(lead.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0b1c30]">
                        {lead.name}
                      </p>
                      <p className="text-xs text-[#757684]">{lead.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-6 text-sm text-[#0b1c30]">{lead.company}</td>
                <td className="p-6">
                  <span
                    className={`rounded-full px-4 py-1 text-xs font-semibold ${statusStyles[lead.status]}`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="p-6 text-sm text-[#757684]">
                  {lead.lastContact}
                </td>
                <td className="p-6 text-right">
                  <button className="material-symbols-outlined text-[#757684] hover:text-[#00288e]">
                    more_vert
                  </button>
                </td>
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-sm text-[#757684]"
                >
                  No se encontraron leads con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-[#c4c5d5] bg-[#eff4ff] p-6">
          <p className="text-sm text-[#757684]">
            Mostrando {filteredLeads.length} de {leads.length} leads
          </p>
          <div className="flex gap-2">
            <button
              disabled
              className="rounded-lg border border-[#c4c5d5] p-1 text-[#757684] disabled:opacity-50"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="rounded-lg bg-[#00288e] px-4 py-1 text-sm font-semibold text-white">
              1
            </button>
            <button className="rounded-lg border border-[#c4c5d5] px-4 py-1 text-sm font-semibold text-[#0b1c30] hover:bg-white">
              2
            </button>
            <button className="rounded-lg border border-[#c4c5d5] px-4 py-1 text-sm font-semibold text-[#0b1c30] hover:bg-white">
              3
            </button>
            <button className="rounded-lg border border-[#c4c5d5] p-1 text-[#757684] hover:bg-white">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <button className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#00288e] text-white shadow-lg transition-all hover:scale-110 active:scale-95">
        <span className="material-symbols-outlined">add</span>
      </button>
    </>
  );
}

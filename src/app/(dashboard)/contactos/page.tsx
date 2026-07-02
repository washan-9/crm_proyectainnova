"use client";

import { useState } from "react";

type Tag = "Cliente" | "Socio" | "Proveedor";

type Note = {
  text: string;
  meta: string;
};

type Contact = {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  lastInteraction: string;
  location: string;
  tag: Tag;
  avatarBg: string;
  avatarText: string;
  notes: Note[];
};

const contacts: Contact[] = [
  {
    id: "1",
    name: "Elena Rodriguez",
    role: "CTO",
    company: "InnovaSoft Tech",
    email: "elena.r@innovasoft.com",
    phone: "+34 912 345 678",
    lastInteraction: "Hace 2 horas",
    location: "Madrid, España",
    tag: "Socio",
    avatarBg: "bg-[#6bd8cb]",
    avatarText: "text-[#00201d]",
    notes: [
      {
        text: "Discutimos los planes de expansión de Q4. Elena está interesada en nuestra nueva suite de automatización.",
        meta: "24 oct 2025 • Por Alex R.",
      },
      {
        text: "Se envió seguimiento sobre el documento de integración de API.",
        meta: "15 oct 2025 • Por Sistema",
      },
    ],
  },
  {
    id: "2",
    name: "Julian Dupont",
    role: "Lead Designer",
    company: "Aesthetic Dynamics",
    email: "julian@aesthetix.co",
    phone: "+33 1 23 45 67 89",
    lastInteraction: "Ayer",
    location: "París, Francia",
    tag: "Cliente",
    avatarBg: "bg-[#1e40af]",
    avatarText: "text-white",
    notes: [
      {
        text: "Aprobó el nuevo diseño de la landing page.",
        meta: "20 oct 2025 • Por Alex R.",
      },
    ],
  },
  {
    id: "3",
    name: "Marcus Thorne",
    role: "Gerente de Compras",
    company: "Global Logistics Inc.",
    email: "m.thorne@global-log.com",
    phone: "+44 20 7946 0123",
    lastInteraction: "Hace 3 días",
    location: "Londres, Reino Unido",
    tag: "Proveedor",
    avatarBg: "bg-[#e0e3e5]",
    avatarText: "text-[#323537]",
    notes: [
      {
        text: "Renegociación de tarifas de envío pendiente para el próximo trimestre.",
        meta: "18 oct 2025 • Por Sistema",
      },
    ],
  },
  {
    id: "4",
    name: "Sarah Jenkins",
    role: "Directora de Marketing",
    company: "Pioneer Brands",
    email: "sjenkins@pioneer.com",
    phone: "+1 212 555 0198",
    lastInteraction: "12 oct 2025",
    location: "Nueva York, EE. UU.",
    tag: "Cliente",
    avatarBg: "bg-[#dde1ff]",
    avatarText: "text-[#00288e]",
    notes: [
      {
        text: "Interesada en el paquete de campaña anual.",
        meta: "12 oct 2025 • Por Alex R.",
      },
    ],
  },
];

const tagStyles: Record<Tag, string> = {
  Cliente: "bg-[#00288e]/10 text-[#00288e]",
  Socio: "bg-[#006a61]/10 text-[#006a61]",
  Proveedor: "bg-[#323537]/10 text-[#323537]",
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function ContactosPage() {
  const [selectedId, setSelectedId] = useState<string | null>(contacts[0].id);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  return (
    <>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-[#0b1c30]">
            Directorio de Contactos
          </h2>
          <p className="text-base text-[#757684]">
            Gestiona tus relaciones corporativas e historial de comunicación.
          </p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 rounded-lg border border-[#757684] bg-white px-6 py-2 text-sm font-semibold text-[#444653] transition-colors hover:bg-[#eff4ff]">
            <span className="material-symbols-outlined text-[20px]">
              filter_alt
            </span>
            Filtros
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-[#006a61] px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95">
            <span className="material-symbols-outlined text-[20px]">
              person_add
            </span>
            Agregar Contacto
          </button>
        </div>
      </div>

      <div className="flex items-start gap-6">
        {/* Tabla */}
        <div className="flex flex-grow flex-col overflow-hidden rounded-xl border border-[#c4c5d5] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-[#c4c5d5] bg-[#eff4ff]">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#757684]">
                    Contacto
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#757684]">
                    Empresa
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#757684]">
                    Email
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#757684]">
                    Teléfono
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#757684]">
                    Última Interacción
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#757684]">
                    Etiqueta
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4c5d5]">
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => {
                      setSelectedId(contact.id);
                      setDrawerOpen(true);
                    }}
                    className={`cursor-pointer transition-colors hover:bg-[#eff4ff] ${
                      selectedId === contact.id ? "bg-[#e5eeff]" : "bg-white"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${contact.avatarBg} ${contact.avatarText}`}
                        >
                          {initials(contact.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0b1c30]">
                            {contact.name}
                          </p>
                          <p className="text-xs text-[#757684]">
                            {contact.role}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#757684]">
                      {contact.company}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#757684]">
                      {contact.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#757684]">
                      {contact.phone}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#757684]">
                      {contact.lastInteraction}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${tagStyles[contact.tag]}`}
                      >
                        {contact.tag}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#c4c5d5] bg-white p-6">
            <p className="text-sm text-[#757684]">
              Mostrando {contacts.length} de 258 contactos
            </p>
            <div className="flex gap-2">
              <button
                disabled
                className="rounded-lg border border-[#c4c5d5] p-2 text-[#757684] disabled:opacity-50"
              >
                <span className="material-symbols-outlined">
                  chevron_left
                </span>
              </button>
              <button className="h-10 w-10 rounded-lg bg-[#00288e] text-sm font-semibold text-white">
                1
              </button>
              <button className="h-10 w-10 rounded-lg border border-[#c4c5d5] text-sm font-semibold text-[#757684] hover:bg-[#eff4ff]">
                2
              </button>
              <button className="h-10 w-10 rounded-lg border border-[#c4c5d5] text-sm font-semibold text-[#757684] hover:bg-[#eff4ff]">
                3
              </button>
              <button className="rounded-lg border border-[#c4c5d5] p-2 text-[#757684] hover:bg-[#eff4ff]">
                <span className="material-symbols-outlined">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Panel de detalle */}
        {drawerOpen && selected && (
          <div className="sticky top-24 flex w-96 shrink-0 flex-col overflow-hidden rounded-xl border border-[#c4c5d5] bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-[#c4c5d5] bg-[#eff4ff] p-6">
              <h3 className="text-xl font-semibold text-[#0b1c30]">
                Detalle de Contacto
              </h3>
              <button
                onClick={() => setDrawerOpen(false)}
                className="material-symbols-outlined text-[#757684] transition-colors hover:text-[#ba1a1a]"
              >
                close
              </button>
            </div>

            <div className="flex-grow space-y-8 overflow-y-auto p-6">
              <div className="text-center">
                <div
                  className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#e5eeff] text-2xl font-bold shadow-md ${selected.avatarBg} ${selected.avatarText}`}
                >
                  {initials(selected.name)}
                </div>
                <h4 className="text-xl font-bold text-[#0b1c30]">
                  {selected.name}
                </h4>
                <p className="text-[#757684]">
                  {selected.role} en {selected.company}
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <button className="rounded-full bg-[#00288e] p-2 text-white transition-all hover:shadow-md active:scale-90">
                    <span className="material-symbols-outlined">call</span>
                  </button>
                  <button className="rounded-full bg-[#006a61] p-2 text-white transition-all hover:shadow-md active:scale-90">
                    <span className="material-symbols-outlined">mail</span>
                  </button>
                  <button className="rounded-full bg-[#e5eeff] p-2 text-[#00288e] transition-all hover:shadow-md active:scale-90">
                    <span className="material-symbols-outlined">
                      videocam
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="border-b border-[#00288e]/20 pb-1 text-xs font-semibold uppercase text-[#00288e]">
                  Información
                </h5>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-xs text-[#757684]">
                      Correo electrónico
                    </p>
                    <p className="text-sm font-medium text-[#0b1c30]">
                      {selected.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#757684]">Teléfono</p>
                    <p className="text-sm font-medium text-[#0b1c30]">
                      {selected.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#757684]">Ubicación</p>
                    <p className="text-sm font-medium text-[#0b1c30]">
                      {selected.location}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-semibold uppercase text-[#00288e]">
                    Notas Recientes
                  </h5>
                  <button className="text-xs font-bold text-[#00288e] hover:underline">
                    + Agregar Nota
                  </button>
                </div>
                <div className="space-y-2">
                  {selected.notes.map((note, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-[#c4c5d5]/30 bg-[#eff4ff] p-4"
                    >
                      <p className="mb-1 text-sm text-[#0b1c30]">
                        {note.text}
                      </p>
                      <p className="text-xs italic text-[#757684]">
                        {note.meta}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="mb-4 border-b border-[#00288e]/20 pb-1 text-xs font-semibold uppercase text-[#00288e]">
                  Cuentas Conectadas
                </h5>
                <div className="flex gap-4">
                  <span className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#c4c5d5] bg-[#e5eeff] transition-all hover:bg-[#1e40af] hover:text-white">
                    <span className="material-symbols-outlined text-[18px]">
                      share
                    </span>
                  </span>
                  <span className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#c4c5d5] bg-[#e5eeff] transition-all hover:bg-[#1e40af] hover:text-white">
                    <span className="material-symbols-outlined text-[18px]">
                      public
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

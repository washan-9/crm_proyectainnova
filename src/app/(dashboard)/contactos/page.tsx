"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tag = "cliente" | "socio" | "proveedor";

type Note = {
  id: string;
  body: string;
  created_at: string;
  author: { full_name: string } | null;
};

type Contact = {
  id: string;
  full_name: string;
  job_title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  tag: Tag;
  last_interaction_at: string | null;
  contact_notes: Note[];
};

const tagLabels: Record<Tag, string> = {
  cliente: "Cliente",
  socio: "Socio",
  proveedor: "Proveedor",
};

const tagStyles: Record<Tag, string> = {
  cliente: "bg-[#00288e]/10 text-[#00288e]",
  socio: "bg-[#006a61]/10 text-[#006a61]",
  proveedor: "bg-[#323537]/10 text-[#323537]",
};

const avatarPalette = [
  { bg: "bg-[#6bd8cb]", text: "text-[#00201d]" },
  { bg: "bg-[#1e40af]", text: "text-white" },
  { bg: "bg-[#e0e3e5]", text: "text-[#323537]" },
  { bg: "bg-[#dde1ff]", text: "text-[#00288e]" },
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

export default function ContactosPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("contacts")
      .select(
        `id, full_name, job_title, company, email, phone, location, tag,
         last_interaction_at,
         contact_notes(id, body, created_at, author:profiles(full_name))`,
      )
      .order("created_at", { ascending: false })
      .order("created_at", {
        referencedTable: "contact_notes",
        ascending: false,
      })
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message);
        } else {
          const rows = (data ?? []) as unknown as Contact[];
          setContacts(rows);
          if (rows.length > 0) setSelectedId(rows[0].id);
        }
        setLoading(false);
      });
  }, []);

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
                {loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-center text-sm text-[#757684]"
                    >
                      Cargando contactos...
                    </td>
                  </tr>
                )}
                {loadError && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-center text-sm text-[#ba1a1a]"
                    >
                      Error al cargar contactos: {loadError}
                    </td>
                  </tr>
                )}
                {!loading && !loadError && contacts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-center text-sm text-[#757684]"
                    >
                      Aún no hay contactos registrados.
                    </td>
                  </tr>
                )}
                {contacts.map((contact) => {
                  const avatar = avatarFor(contact.full_name);
                  return (
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
                            className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${avatar.bg} ${avatar.text}`}
                          >
                            {initials(contact.full_name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0b1c30]">
                              {contact.full_name}
                            </p>
                            <p className="text-xs text-[#757684]">
                              {contact.job_title ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#757684]">
                        {contact.company ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#757684]">
                        {contact.email ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#757684]">
                        {contact.phone ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#757684]">
                        {formatDate(contact.last_interaction_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${tagStyles[contact.tag]}`}
                        >
                          {tagLabels[contact.tag]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#c4c5d5] bg-white p-6">
            <p className="text-sm text-[#757684]">
              Mostrando {contacts.length} contactos
            </p>
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
                  className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#e5eeff] text-2xl font-bold shadow-md ${avatarFor(selected.full_name).bg} ${avatarFor(selected.full_name).text}`}
                >
                  {initials(selected.full_name)}
                </div>
                <h4 className="text-xl font-bold text-[#0b1c30]">
                  {selected.full_name}
                </h4>
                <p className="text-[#757684]">
                  {selected.job_title ?? "—"}
                  {selected.company ? ` en ${selected.company}` : ""}
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
                      {selected.email ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#757684]">Teléfono</p>
                    <p className="text-sm font-medium text-[#0b1c30]">
                      {selected.phone ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#757684]">Ubicación</p>
                    <p className="text-sm font-medium text-[#0b1c30]">
                      {selected.location ?? "—"}
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
                  {selected.contact_notes.length === 0 && (
                    <p className="text-sm text-[#757684]">
                      Sin notas todavía.
                    </p>
                  )}
                  {selected.contact_notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-lg border border-[#c4c5d5]/30 bg-[#eff4ff] p-4"
                    >
                      <p className="mb-1 text-sm text-[#0b1c30]">
                        {note.body}
                      </p>
                      <p className="text-xs italic text-[#757684]">
                        {formatDate(note.created_at)} • Por{" "}
                        {note.author?.full_name ?? "Sistema"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

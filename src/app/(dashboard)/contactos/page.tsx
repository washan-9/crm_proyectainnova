"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/components/current-user-provider";

type Tag = "cliente" | "socio" | "proveedor";

type Note = {
  id: string;
  body: string;
  created_at: string;
  author: { full_name: string } | null;
};

type Activity = {
  id: string;
  type: string;
  description: string | null;
  occurred_at: string;
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
  assigned_to: string | null;
  assignee: { full_name: string } | null;
  contact_notes: Note[];
};

const activityIcons: Record<string, string> = {
  llamada: "call",
  email: "mail",
  reunion: "groups",
  nota: "sticky_note_2",
  otro: "more_horiz",
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
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<Tag | "todas">("todas");
  const { currentUser, loading: userLoading } = useCurrentUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  const isVendedor = currentUser?.role === "vendedor";

  useEffect(() => {
    if (userLoading || !currentUser) return;
    const supabase = createClient();

    let query = supabase
      .from("contacts")
      .select(
        `id, full_name, job_title, company, email, phone, location, tag,
         last_interaction_at, assigned_to,
         assignee:profiles!assigned_to(full_name),
         contact_notes(id, body, created_at, author:profiles(full_name))`,
      );

    // Restricción: el vendedor solo ve los prospectos asignados a él
    if (currentUser.role === "vendedor") {
      query = query.eq("assigned_to", currentUser.id);
    }

    query
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
  }, [currentUser, userLoading]);

  // Historial de interacciones del contacto seleccionado
  useEffect(() => {
    if (!selectedId) {
      setActivities([]);
      return;
    }
    const supabase = createClient();
    supabase
      .from("activities")
      .select(
        "id, type, description, occurred_at, author:profiles(full_name)",
      )
      .eq("contact_id", selectedId)
      .order("occurred_at", { ascending: false })
      .limit(10)
      .then(({ data }) =>
        setActivities((data ?? []) as unknown as Activity[]),
      );
  }, [selectedId]);

  async function handleAddNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId) return;
    setNoteSaving(true);

    const formEl = e.currentTarget;
    const body = (new FormData(formEl).get("body") as string).trim();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("contact_notes")
      .insert({ contact_id: selectedId, body, created_by: user?.id ?? null })
      .select("id, body, created_at, author:profiles(full_name)")
      .single();

    setNoteSaving(false);
    if (error || !data) return;

    const newNote = data as unknown as Note;
    setContacts((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? { ...c, contact_notes: [newNote, ...c.contact_notes] }
          : c,
      ),
    );
    setNoteOpen(false);
  }

  async function updateTag(contactId: string, tag: Tag) {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, tag } : c)),
    );
    const supabase = createClient();
    await supabase.from("contacts").update({ tag }).eq("id", contactId);
  }

  const filteredContacts = contacts.filter((contact) => {
    const matchesTag = tagFilter === "todas" || contact.tag === tagFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      term === "" ||
      contact.full_name.toLowerCase().includes(term) ||
      (contact.company ?? "").toLowerCase().includes(term) ||
      (contact.email ?? "").toLowerCase().includes(term);
    return matchesTag && matchesSearch;
  });

  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  return (
    <>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-[#0b1c30]">
            Directorio de Contactos
          </h2>
          <p className="text-base text-[#757684]">
            {isVendedor
              ? "Gestiona los prospectos asignados a ti y su historial."
              : "Gestiona tus relaciones corporativas e historial de comunicación."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#757684]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, empresa o email..."
              className="w-full rounded-lg border border-[#c4c5d5] bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20"
            />
          </div>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value as Tag | "todas")}
            className="rounded-lg border border-[#c4c5d5] bg-white px-4 py-2 text-sm font-semibold text-[#444653] outline-none focus:border-[#00288e]"
          >
            <option value="todas">Todas las etiquetas</option>
            <option value="cliente">Cliente</option>
            <option value="socio">Socio</option>
            <option value="proveedor">Proveedor</option>
          </select>
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
                {!loading && !loadError && filteredContacts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-center text-sm text-[#757684]"
                    >
                      {contacts.length === 0
                        ? "Aún no hay contactos registrados."
                        : "No se encontraron contactos con esos filtros."}
                    </td>
                  </tr>
                )}
                {filteredContacts.map((contact) => {
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
              Mostrando {filteredContacts.length} de {contacts.length}{" "}
              contactos
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
                  <div>
                    <p className="text-xs text-[#757684]">Vendedor asignado</p>
                    <p className="text-sm font-medium text-[#0b1c30]">
                      {selected.assignee?.full_name ?? "Sin asignar"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-[#757684]">
                      Estado del prospecto
                    </p>
                    <select
                      value={selected.tag}
                      onChange={(e) =>
                        updateTag(selected.id, e.target.value as Tag)
                      }
                      className="h-9 w-full rounded-lg border border-[#c4c5d5] bg-white px-3 text-sm font-semibold outline-none focus:border-[#00288e]"
                    >
                      <option value="cliente">Cliente</option>
                      <option value="socio">Socio</option>
                      <option value="proveedor">Proveedor</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-semibold uppercase text-[#00288e]">
                    Notas Recientes
                  </h5>
                  <button
                    onClick={() => setNoteOpen((v) => !v)}
                    className="text-xs font-bold text-[#00288e] hover:underline"
                  >
                    {noteOpen ? "Cancelar" : "+ Agregar Nota"}
                  </button>
                </div>
                {noteOpen && (
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <textarea
                      name="body"
                      required
                      rows={3}
                      autoFocus
                      placeholder="Observaciones, intereses del prospecto..."
                      className="w-full rounded-lg border border-[#c4c5d5] p-3 text-sm outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20"
                    />
                    <button
                      type="submit"
                      disabled={noteSaving}
                      className="w-full rounded-lg bg-[#00288e] py-2 text-xs font-semibold text-white transition-all hover:bg-[#00288e]/90 disabled:opacity-70"
                    >
                      {noteSaving ? "Guardando..." : "Guardar Nota"}
                    </button>
                  </form>
                )}
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

              <div className="space-y-3">
                <h5 className="text-xs font-semibold uppercase text-[#00288e]">
                  Historial de Interacciones
                </h5>
                <div className="space-y-2">
                  {activities.length === 0 && (
                    <p className="text-sm text-[#757684]">
                      Sin interacciones registradas.
                    </p>
                  )}
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 rounded-lg border border-[#c4c5d5]/30 bg-white p-3"
                    >
                      <span className="material-symbols-outlined mt-0.5 rounded-full bg-[#dde1ff] p-1.5 text-[16px] text-[#00288e]">
                        {activityIcons[activity.type] ?? "history"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-[#0b1c30]">
                          {activity.description ?? activity.type}
                        </p>
                        <p className="text-xs italic text-[#757684]">
                          {formatDate(activity.occurred_at)} •{" "}
                          {activity.author?.full_name ?? "Sistema"}
                        </p>
                      </div>
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

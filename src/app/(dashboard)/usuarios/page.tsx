"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type HierarchyRole = "administrador" | "gerente" | "colaborador";
type Status = "activo" | "ausente";

type Permission = { code: string; title: string; icon: string | null };

type Employee = {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  role: HierarchyRole;
  status: Status;
  profile_permissions: { permission: Permission }[];
};

const roleLabels: Record<HierarchyRole, string> = {
  administrador: "Administrador",
  gerente: "Gerente",
  colaborador: "Colaborador",
};

const statusLabels: Record<Status, string> = {
  activo: "Activo",
  ausente: "Ausente",
};

const roleOptions = Object.keys(roleLabels) as HierarchyRole[];

const avatarPalette = [
  { bg: "bg-[#dde1ff]", text: "text-[#00288e]" },
  { bg: "bg-[#89f5e7]", text: "text-[#006a61]" },
  { bg: "bg-[#e0e3e5]", text: "text-[#323537]" },
  { bg: "bg-[#c4c7c9]", text: "text-[#191c1e]" },
];

function avatarFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return avatarPalette[hash % avatarPalette.length];
}

export default function UsuariosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<HierarchyRole | "todos">(
    "todos",
  );
  const [statusFilter, setStatusFilter] = useState<Status | "todos">("todos");
  const [toast, setToast] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select(
        `id, full_name, email, job_title, role, status,
         profile_permissions(permission:permissions(code, title, icon))`,
      )
      .order("full_name")
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message);
        } else {
          setEmployees((data ?? []) as unknown as Employee[]);
        }
        setLoading(false);
      });
  }, []);

  function showToast(text: string, error = false) {
    setToast({ text, error });
    setTimeout(() => setToast(null), 3000);
  }

  async function updateRole(id: string, role: HierarchyRole) {
    const previous = employees;
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, role } : e)),
    );

    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id)
      .select("id");

    if (error || !data || data.length === 0) {
      setEmployees(previous);
      showToast(
        error
          ? `No se pudo actualizar: ${error.message}`
          : "No tienes permiso para cambiar roles (solo administradores).",
        true,
      );
      return;
    }
    showToast("Rol actualizado correctamente.");
  }

  const filtered = useMemo(
    () =>
      employees.filter(
        (e) =>
          (roleFilter === "todos" || e.role === roleFilter) &&
          (statusFilter === "todos" || e.status === statusFilter),
      ),
    [employees, roleFilter, statusFilter],
  );

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-[#0b1c30]">
            Gestión de Equipo
          </h2>
          <p className="mt-1 text-lg text-[#757684]">
            Administra el acceso y colabora con toda la organización.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 rounded-xl bg-[#d3e4fe] px-6 py-3 text-sm font-semibold text-[#00288e] transition-colors hover:bg-[#c4c5d5]">
            <span className="material-symbols-outlined text-[20px]">
              file_download
            </span>
            Exportar Lista
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-[#006a61] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl">
            <span className="material-symbols-outlined text-[20px]">
              person_add
            </span>
            Agregar Empleado
          </button>
        </div>
      </div>

      {/* Directorio */}
      <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#c4c5d5] px-8 py-6">
          <h3 className="text-xl font-semibold text-[#0b1c30]">
            Directorio de Empleados
          </h3>
          <div className="flex gap-4">
            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as HierarchyRole | "todos")
              }
              className="rounded-lg border border-[#c4c5d5] bg-[#eff4ff] px-4 py-2 text-xs font-semibold outline-none focus:border-[#00288e]"
            >
              <option value="todos">Todos los Roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as Status | "todos")
              }
              className="rounded-lg border border-[#c4c5d5] bg-[#eff4ff] px-4 py-2 text-xs font-semibold outline-none focus:border-[#00288e]"
            >
              <option value="todos">Todos los Estados</option>
              <option value="activo">Activo</option>
              <option value="ausente">Ausente</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#eff4ff]">
                <th className="px-8 py-4 text-xs font-semibold text-[#757684]">
                  Empleado
                </th>
                <th className="px-8 py-4 text-xs font-semibold text-[#757684]">
                  Rol Jerárquico
                </th>
                <th className="px-8 py-4 text-xs font-semibold text-[#757684]">
                  Estado
                </th>
                <th className="px-8 py-4 text-xs font-semibold text-[#757684]">
                  Permisos
                </th>
                <th className="px-8 py-4 text-right text-xs font-semibold text-[#757684]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4c5d5]">
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-4 text-center text-sm text-[#757684]"
                  >
                    Cargando empleados...
                  </td>
                </tr>
              )}
              {loadError && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-4 text-center text-sm text-[#ba1a1a]"
                  >
                    Error al cargar empleados: {loadError}
                  </td>
                </tr>
              )}
              {!loading && !loadError && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-4 text-center text-sm text-[#757684]"
                  >
                    No hay empleados que coincidan con los filtros.
                  </td>
                </tr>
              )}
              {filtered.map((employee) => {
                const avatar = avatarFor(employee.full_name);
                return (
                  <tr
                    key={employee.id}
                    className="transition-colors hover:bg-[#eff4ff]/50"
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${avatar.bg} ${avatar.text}`}
                        >
                          {employee.full_name
                            .split(" ")
                            .slice(0, 2)
                            .map((p) => p[0])
                            .join("")}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0b1c30]">
                            {employee.full_name}
                          </p>
                          <p className="text-xs text-[#757684]">
                            {employee.job_title ?? "—"}
                          </p>
                          <p className="text-xs text-[#757684]">
                            {employee.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <select
                        value={employee.role}
                        onChange={(e) =>
                          updateRole(
                            employee.id,
                            e.target.value as HierarchyRole,
                          )
                        }
                        className="rounded-lg border border-[#c4c5d5] bg-white px-3 py-1.5 text-sm font-semibold text-[#0b1c30] outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-8 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          employee.status === "activo"
                            ? "bg-[#86f2e4]/40 text-[#006f66]"
                            : "bg-[#e5eeff] text-[#444653]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            employee.status === "activo"
                              ? "bg-[#006a61]"
                              : "bg-[#757684]"
                          }`}
                        />
                        {statusLabels[employee.status]}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex gap-1">
                        {employee.profile_permissions.length === 0 && (
                          <span className="text-xs text-[#757684]">—</span>
                        )}
                        {employee.profile_permissions.map(({ permission }) => (
                          <span
                            key={permission.code}
                            title={permission.title}
                            className="material-symbols-outlined cursor-pointer rounded-full bg-[#eff4ff] p-1 text-[18px] text-[#757684] transition-colors hover:text-[#00288e]"
                          >
                            {permission.icon ?? "key"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button className="p-2 text-[#757684] transition-colors hover:text-[#00288e]">
                        <span className="material-symbols-outlined">
                          more_vert
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#c4c5d5] bg-[#eff4ff] px-8 py-4">
          <p className="text-xs text-[#757684]">
            Mostrando {filtered.length} de {employees.length} empleados
          </p>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.error ? "bg-[#ba1a1a]" : "bg-[#006a61]"
          }`}
        >
          {toast.text}
        </div>
      )}
    </>
  );
}

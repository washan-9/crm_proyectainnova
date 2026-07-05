"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createEmployee,
  setEmployeeAccess,
  type EmployeeRole,
} from "./actions";

type Status = "activo" | "ausente" | "inhabilitado";

type Permission = { code: string; title: string; icon: string | null };

type Employee = {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  role: EmployeeRole;
  status: Status;
  profile_permissions: { permission: Permission }[];
};

const roleLabels: Record<EmployeeRole, string> = {
  administrador: "Administrador",
  teleoperador: "Teleoperador",
  vendedor: "Vendedor",
};

const statusLabels: Record<Status, string> = {
  activo: "Activo",
  ausente: "Ausente",
  inhabilitado: "Inhabilitado",
};

const roleOptions = Object.keys(roleLabels) as EmployeeRole[];

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
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | "todos">(
    "todos",
  );
  const [statusFilter, setStatusFilter] = useState<Status | "todos">("todos");
  const [toast, setToast] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const loadEmployees = useCallback(() => {
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
          setLoadError(null);
          setEmployees((data ?? []) as unknown as Employee[]);
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsFor(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function showToast(text: string, error = false) {
    setToast({ text, error });
    setTimeout(() => setToast(null), 3000);
  }

  async function updateRole(id: string, role: EmployeeRole) {
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

  async function handleAddEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setModalError(null);

    const form = new FormData(e.currentTarget);
    const result = await createEmployee({
      full_name: (form.get("full_name") as string).trim(),
      email: (form.get("email") as string).trim(),
      password: form.get("password") as string,
      job_title: ((form.get("job_title") as string) || "").trim() || null,
      role: form.get("role") as EmployeeRole,
    });

    setBusy(false);
    if (!result.ok) {
      setModalError(result.error);
      return;
    }
    setAddModalOpen(false);
    showToast("Empleado creado correctamente.");
    loadEmployees();
  }

  async function handleEditEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editEmployee) return;
    setBusy(true);
    setModalError(null);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: (form.get("full_name") as string).trim(),
        job_title: ((form.get("job_title") as string) || "").trim() || null,
        role: form.get("role") as EmployeeRole,
        status: form.get("status") as Status,
      })
      .eq("id", editEmployee.id)
      .select("id");

    setBusy(false);
    if (error || !data || data.length === 0) {
      setModalError(
        error?.message ??
          "No tienes permiso para modificar empleados (solo administradores).",
      );
      return;
    }
    setEditEmployee(null);
    showToast("Datos actualizados correctamente.");
    loadEmployees();
  }

  async function toggleAccess(employee: Employee) {
    setActionsFor(null);
    const enable = employee.status === "inhabilitado";
    const result = await setEmployeeAccess(employee.id, enable);
    if (!result.ok) {
      showToast(result.error, true);
      return;
    }
    showToast(
      enable
        ? `${employee.full_name} fue habilitado nuevamente.`
        : `${employee.full_name} fue inhabilitado (ya no puede iniciar sesión).`,
    );
    loadEmployees();
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

  const inputClass =
    "h-10 w-full rounded-lg border border-[#c4c5d5] bg-white px-4 text-sm outline-none transition-all focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20";

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
          <button
            onClick={() => {
              setModalError(null);
              setAddModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-[#006a61] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl"
          >
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
                setRoleFilter(e.target.value as EmployeeRole | "todos")
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
              <option value="inhabilitado">Inhabilitado</option>
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
                const disabled = employee.status === "inhabilitado";
                return (
                  <tr
                    key={employee.id}
                    className={`transition-colors hover:bg-[#eff4ff]/50 ${
                      disabled ? "opacity-60" : ""
                    }`}
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
                            e.target.value as EmployeeRole,
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
                            : employee.status === "ausente"
                              ? "bg-[#e5eeff] text-[#444653]"
                              : "bg-[#ba1a1a]/10 text-[#ba1a1a]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            employee.status === "activo"
                              ? "bg-[#006a61]"
                              : employee.status === "ausente"
                                ? "bg-[#757684]"
                                : "bg-[#ba1a1a]"
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
                      <div
                        className="relative inline-block"
                        ref={actionsFor === employee.id ? actionsRef : null}
                      >
                        <button
                          onClick={() =>
                            setActionsFor((prev) =>
                              prev === employee.id ? null : employee.id,
                            )
                          }
                          className="p-2 text-[#757684] transition-colors hover:text-[#00288e]"
                        >
                          <span className="material-symbols-outlined">
                            more_vert
                          </span>
                        </button>
                        {actionsFor === employee.id && (
                          <div className="absolute right-0 top-10 z-20 w-56 overflow-hidden rounded-xl border border-[#c4c5d5] bg-white text-left shadow-2xl">
                            <button
                              onClick={() => {
                                setActionsFor(null);
                                setModalError(null);
                                setEditEmployee(employee);
                              }}
                              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]"
                            >
                              <span className="material-symbols-outlined text-[20px] text-[#00288e]">
                                edit
                              </span>
                              Modificar datos
                            </button>
                            <button
                              onClick={() => toggleAccess(employee)}
                              className={`flex w-full items-center gap-3 border-t border-[#c4c5d5]/40 px-4 py-3 text-sm font-semibold transition-colors hover:bg-[#eff4ff] ${
                                disabled ? "text-[#006a61]" : "text-[#ba1a1a]"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {disabled ? "how_to_reg" : "person_off"}
                              </span>
                              {disabled
                                ? "Habilitar usuario"
                                : "Inhabilitar usuario"}
                            </button>
                          </div>
                        )}
                      </div>
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

      {/* Modal: Agregar Empleado */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1c30]/50 p-4"
          onMouseDown={() => setAddModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#c4c5d5] bg-[#eff4ff] px-6 py-4">
              <h3 className="text-xl font-semibold text-[#0b1c30]">
                Agregar Empleado
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="material-symbols-outlined text-[#757684] transition-colors hover:text-[#ba1a1a]"
              >
                close
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4 p-6">
              <div className="space-y-1">
                <label className="ml-1 text-xs font-medium text-[#444653]">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  autoFocus
                  placeholder="Nombre del empleado"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="ml-1 text-xs font-medium text-[#444653]">
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="nombre@empresa.com"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="ml-1 text-xs font-medium text-[#444653]">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="ml-1 text-xs font-medium text-[#444653]">
                    Cargo
                  </label>
                  <input
                    type="text"
                    name="job_title"
                    placeholder="ej. Ejecutivo de Ventas"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="ml-1 text-xs font-medium text-[#444653]">
                    Rol
                  </label>
                  <select
                    name="role"
                    defaultValue="vendedor"
                    className={inputClass}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {modalError && (
                <p className="rounded-lg bg-[#ba1a1a]/10 px-4 py-2 text-sm font-medium text-[#ba1a1a]">
                  {modalError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-lg border border-[#c4c5d5] px-6 py-2 text-sm font-semibold text-[#444653] transition-colors hover:bg-[#eff4ff]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-[#006a61] px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-70"
                >
                  {busy ? "Creando..." : "Crear Empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Modificar datos */}
      {editEmployee && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1c30]/50 p-4"
          onMouseDown={() => setEditEmployee(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#c4c5d5] bg-[#eff4ff] px-6 py-4">
              <h3 className="text-xl font-semibold text-[#0b1c30]">
                Modificar Datos
              </h3>
              <button
                onClick={() => setEditEmployee(null)}
                className="material-symbols-outlined text-[#757684] transition-colors hover:text-[#ba1a1a]"
              >
                close
              </button>
            </div>

            <form onSubmit={handleEditEmployee} className="space-y-4 p-6">
              <p className="text-xs text-[#757684]">
                {editEmployee.email} (el correo no se puede cambiar)
              </p>
              <div className="space-y-1">
                <label className="ml-1 text-xs font-medium text-[#444653]">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  defaultValue={editEmployee.full_name}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="ml-1 text-xs font-medium text-[#444653]">
                    Cargo
                  </label>
                  <input
                    type="text"
                    name="job_title"
                    defaultValue={editEmployee.job_title ?? ""}
                    placeholder="ej. Ejecutivo de Ventas"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="ml-1 text-xs font-medium text-[#444653]">
                    Rol
                  </label>
                  <select
                    name="role"
                    defaultValue={editEmployee.role}
                    className={inputClass}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="ml-1 text-xs font-medium text-[#444653]">
                  Estado
                </label>
                <select
                  name="status"
                  defaultValue={editEmployee.status}
                  className={inputClass}
                >
                  <option value="activo">Activo</option>
                  <option value="ausente">Ausente</option>
                  <option value="inhabilitado">Inhabilitado</option>
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
                  onClick={() => setEditEmployee(null)}
                  className="rounded-lg border border-[#c4c5d5] px-6 py-2 text-sm font-semibold text-[#444653] transition-colors hover:bg-[#eff4ff]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-[#00288e] px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#00288e]/90 active:scale-[0.98] disabled:opacity-70"
                >
                  {busy ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-8 left-1/2 z-[100] -translate-x-1/2 rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.error ? "bg-[#ba1a1a]" : "bg-[#006a61]"
          }`}
        >
          {toast.text}
        </div>
      )}
    </>
  );
}

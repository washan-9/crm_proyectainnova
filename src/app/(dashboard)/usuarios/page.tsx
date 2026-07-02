"use client";

import { useState } from "react";

type HierarchyRole = "Administrador" | "Gerente" | "Colaborador";
type Status = "Activo" | "Ausente";

type Employee = {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  role: HierarchyRole;
  status: Status;
  avatarBg: string;
  avatarText: string;
  permissions: { icon: string; title: string }[];
};

const initialEmployees: Employee[] = [
  {
    id: "1",
    name: "Jane Doe",
    email: "jane.d@proyectainnova.tr",
    jobTitle: "Ejecutiva Senior de Ventas",
    role: "Gerente",
    status: "Activo",
    avatarBg: "bg-[#dde1ff]",
    avatarText: "text-[#00288e]",
    permissions: [
      { icon: "database", title: "Acceso a base de datos" },
      { icon: "visibility", title: "Vista de clientes" },
      { icon: "payments", title: "Acceso financiero" },
    ],
  },
  {
    id: "2",
    name: "Marco Beltrán",
    email: "m.beltran@proyectainnova.tr",
    jobTitle: "Gerente de Operaciones",
    role: "Gerente",
    status: "Ausente",
    avatarBg: "bg-[#89f5e7]",
    avatarText: "text-[#006a61]",
    permissions: [
      { icon: "database", title: "Acceso a base de datos" },
      { icon: "admin_panel_settings", title: "Acceso a configuración" },
    ],
  },
  {
    id: "3",
    name: "Sofia Chen",
    email: "s.chen@proyectainnova.tr",
    jobTitle: "Líder de Marketing",
    role: "Colaborador",
    status: "Activo",
    avatarBg: "bg-[#e0e3e5]",
    avatarText: "text-[#323537]",
    permissions: [
      { icon: "campaign", title: "Control de campañas" },
      { icon: "visibility", title: "Vista de clientes" },
    ],
  },
  {
    id: "4",
    name: "Robert King",
    email: "r.king@proyectainnova.tr",
    jobTitle: "Analista de Datos",
    role: "Colaborador",
    status: "Activo",
    avatarBg: "bg-[#c4c7c9]",
    avatarText: "text-[#191c1e]",
    permissions: [{ icon: "database", title: "Acceso a base de datos" }],
  },
];

const roleOptions: HierarchyRole[] = ["Administrador", "Gerente", "Colaborador"];

export default function UsuariosPage() {
  const [employees, setEmployees] = useState(initialEmployees);

  function updateRole(id: string, role: HierarchyRole) {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, role } : e)),
    );
  }

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
            <select className="rounded-lg border border-[#c4c5d5] bg-[#eff4ff] px-4 py-2 text-xs font-semibold outline-none focus:border-[#00288e]">
              <option>Todos los Roles</option>
              <option>Administrador</option>
              <option>Gerente</option>
              <option>Colaborador</option>
            </select>
            <select className="rounded-lg border border-[#c4c5d5] bg-[#eff4ff] px-4 py-2 text-xs font-semibold outline-none focus:border-[#00288e]">
              <option>Todos los Estados</option>
              <option>Activo</option>
              <option>Ausente</option>
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
              {employees.map((employee) => (
                <tr
                  key={employee.id}
                  className="transition-colors hover:bg-[#eff4ff]/50"
                >
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${employee.avatarBg} ${employee.avatarText}`}
                      >
                        {employee.name
                          .split(" ")
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0b1c30]">
                          {employee.name}
                        </p>
                        <p className="text-xs text-[#757684]">
                          {employee.jobTitle}
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
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-8 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                        employee.status === "Activo"
                          ? "bg-[#86f2e4]/40 text-[#006f66]"
                          : "bg-[#e5eeff] text-[#444653]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          employee.status === "Activo"
                            ? "bg-[#006a61]"
                            : "bg-[#757684]"
                        }`}
                      />
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex gap-1">
                      {employee.permissions.map((perm) => (
                        <span
                          key={perm.icon}
                          title={perm.title}
                          className="material-symbols-outlined cursor-pointer rounded-full bg-[#eff4ff] p-1 text-[18px] text-[#757684] transition-colors hover:text-[#00288e]"
                        >
                          {perm.icon}
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
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#c4c5d5] bg-[#eff4ff] px-8 py-4">
          <p className="text-xs text-[#757684]">
            Mostrando {employees.length} de 24 empleados
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled
              className="rounded p-2 transition-colors hover:bg-[#dce9ff] disabled:opacity-50"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="rounded bg-[#00288e] px-3 py-1 text-xs font-semibold text-white">
              1
            </span>
            <button className="rounded p-2 transition-colors hover:bg-[#dce9ff]">
              <span className="material-symbols-outlined">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </div>

      <button className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#00288e] text-white shadow-2xl transition-transform duration-300 hover:scale-110 active:scale-95">
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>
    </>
  );
}

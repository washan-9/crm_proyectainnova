import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Login | Proyecta Innova CRM",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9ff] text-[#0b1c30]">
      <main className="grid flex-grow grid-cols-1 md:grid-cols-2">
        {/* Panel izquierdo: branding */}
        <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-[#00288e] p-12 md:flex">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative z-10 max-w-md text-center">
            <div
              className="mb-8 h-64 w-full rounded-xl bg-cover bg-center shadow-2xl"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDeegEXz7r8_NyLIslhsHP4gR9wTCtxlb_aKhq7JVqJVe-7kqfIV57K4pUxKUpPHAp63EJuXn3-b3zbGCi_EJHG3Rqtn_y2L8pwObxanNuY_4p71T-x7dP-ZFCbZ2e68pwpAM4CQmxdY4fgjk8wN1kebUEO2njWcfnl-FVIlcr8g3DEpwON7KpCBwEq6z5YM3q1WxLt2UppgDpp46JKKYdJ8rCIHL8eZCHqQs1-RqVoe8Np-v87tYsnnGV50g2YCT569MhEA4gOW8U')",
              }}
            />
            <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-white">
              Elevando la innovación inmobiliaria
            </h1>
            <p className="text-lg text-white/90">
              Gestiona tu cartera de proyectos con las herramientas más
              avanzadas del mercado.
            </p>
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 h-1/3 w-full bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        {/* Panel derecho: formulario */}
        <div className="flex flex-col items-center justify-center bg-white p-4 lg:p-12">
          <div className="w-full max-w-[400px]">
            <div className="mb-8 flex justify-center">
              <Image
                src="/logo.png"
                alt="Proyecta Innova"
                width={160}
                height={80}
                className="h-20 w-auto object-contain"
                priority
              />
            </div>

            <div className="mb-8 text-center">
              <h2 className="mb-1 text-3xl font-semibold text-[#0b1c30]">
                Bienvenido de nuevo
              </h2>
              <p className="text-sm text-[#444653]">
                Ingresa tus datos para acceder a tu cuenta.
              </p>
            </div>

            <LoginForm />

            <div className="mt-12 text-center">
              <p className="text-sm text-[#444653]">
                ¿No tienes cuenta?{" "}
                <a
                  href="#"
                  className="ml-1 text-sm font-semibold text-[#00288e] hover:underline"
                >
                  Contacta a un administrador
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#c4c5d5] bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-8 py-6 md:flex-row">
          <span className="text-xl font-bold text-[#00288e]">
            Proyecta Innova
          </span>
          <div className="flex flex-wrap justify-center gap-8">
            <a
              href="#"
              className="text-xs font-medium text-[#444653] hover:text-[#00288e]"
            >
              Privacidad
            </a>
            <a
              href="#"
              className="text-xs font-medium text-[#444653] hover:text-[#00288e]"
            >
              Términos
            </a>
            <a
              href="#"
              className="text-xs font-medium text-[#444653] hover:text-[#00288e]"
            >
              Seguridad
            </a>
            <a
              href="#"
              className="text-xs font-medium text-[#444653] hover:text-[#00288e]"
            >
              Ayuda
            </a>
          </div>
          <span className="text-xs font-medium text-[#006a61]">
            © 2026 Proyecta Innova. Todos los derechos reservados.
          </span>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "loading" | "success";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setStatus("idle");
      setError(
        signInError.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : signInError.message,
      );
      return;
    }

    setStatus("success");
    router.push("/");
    router.refresh();
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label
          htmlFor="email"
          className="ml-1 text-xs font-medium text-[#444653]"
        >
          Correo electrónico
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[#757684]">
            mail
          </span>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@empresa.com"
            className="h-10 w-full rounded-lg border border-[#c4c5d5] bg-white pl-10 pr-4 text-base outline-none transition-all focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="password"
          className="ml-1 text-xs font-medium text-[#444653]"
        >
          Contraseña
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[#757684]">
            lock
          </span>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-10 w-full rounded-lg border border-[#c4c5d5] bg-white pl-10 pr-10 text-base outline-none transition-all focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#757684] hover:text-[#444653]"
          >
            <span className="material-symbols-outlined text-[20px]">
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-[#ba1a1a]/10 px-4 py-2 text-sm font-medium text-[#ba1a1a]">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between py-1">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-2 border-[#c4c5d5] text-[#00288e] focus:ring-[#00288e]/20"
          />
          <span className="text-sm font-semibold text-[#444653]">
            Recordarme
          </span>
        </label>
        <a
          href="#"
          className="hidden text-sm font-semibold text-[#00288e] hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </div>

      <button
        type="submit"
        disabled={status !== "idle"}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#00288e] text-sm font-semibold text-white shadow-md transition-all hover:bg-[#00288e]/90 active:scale-[0.98] disabled:opacity-70"
      >
        {status === "loading" && (
          <span className="material-symbols-outlined animate-spin text-[18px]">
            progress_activity
          </span>
        )}
        {status === "success" && (
          <span className="material-symbols-outlined text-[18px]">
            check_circle
          </span>
        )}
        {status === "idle" && (
          <span className="material-symbols-outlined text-[18px]">login</span>
        )}
        {status === "loading"
          ? "Ingresando..."
          : status === "success"
            ? "Listo"
            : "Iniciar sesión"}
      </button>
    </form>
  );
}

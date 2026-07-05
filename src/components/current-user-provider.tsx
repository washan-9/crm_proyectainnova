"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/nav-items";

export type CurrentUser = {
  id: string;
  full_name: string;
  role: AppRole;
};

type CurrentUserContextValue = {
  /** null mientras carga o si no hay sesión */
  currentUser: CurrentUser | null;
  loading: boolean;
};

const CurrentUserContext = createContext<CurrentUserContextValue>({
  currentUser: null,
  loading: true,
});

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}

export function CurrentUserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          setCurrentUser((data as CurrentUser | null) ?? null);
          setLoading(false);
        });
    });
  }, []);

  return (
    <CurrentUserContext.Provider value={{ currentUser, loading }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

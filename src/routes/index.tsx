import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FaroProvider } from "@/components/faro/provider";
import { Shell } from "@/components/faro/shell";
import { Mark } from "@/components/faro/icons";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

function Boot() {
  return (
    <main className="splash">
      <div className="splash-beam" aria-hidden />
      <div className="brand-lockup">
        <Mark className="size-14" />
        <h1 className="serif text-6xl">FARO</h1>
        <p className="tagline">Cada moneda en su lugar.</p>
      </div>
    </main>
  );
}

function Home() {
  const [mounted, setMounted] = useState(false);
  const [waited, setWaited] = useState(false);
  const { user, isPending } = useCurrentUserState();
  useEffect(() => {
    setMounted(true);
    const kick = () => {
      void authClient.getSession().catch(() => {});
    };
    kick();
    const retry = window.setInterval(kick, 1500);
    const giveUp = window.setTimeout(() => setWaited(true), 2500);
    return () => {
      window.clearInterval(retry);
      window.clearTimeout(giveUp);
    };
  }, []);
  if ((!mounted || isPending) && !waited) return <Boot />;
  if (!user) return <Navigate to="/login" />;
  return (
    <FaroProvider userId={user.id}>
      <Shell />
    </FaroProvider>
  );
}

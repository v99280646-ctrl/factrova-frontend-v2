import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthSession, getHomeRoute } from "@/lib/auth";

export function SuperadminAccess({ children }) {
  const navigate = useNavigate();
  const session = getAuthSession();
  const allowed = session?.profile.globalRole === "super_admin";

  useEffect(() => {
    if (session && !allowed) {
      navigate({ to: getHomeRoute(session), replace: true });
    }
  }, [allowed, navigate, session]);

  if (!session) {
    return _jsx("div", {
      className:
        "flex min-h-screen items-center justify-center bg-background px-4 text-foreground dark:bg-slate-950 dark:text-white",
      children: _jsx(Card, {
        className:
          "w-full max-w-md border-border bg-card text-card-foreground shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white",
        children: _jsxs(CardContent, {
          className: "space-y-4 p-6 text-center",
          children: [
            _jsx(ShieldAlert, { className: "mx-auto h-10 w-10 text-sky-400" }),
            _jsxs("div", {
              children: [
                _jsx("h1", { className: "text-lg font-semibold", children: "Checking access" }),
                _jsx("p", {
                  className: "mt-2 text-sm text-muted-foreground dark:text-slate-300",
                  children: "Please sign in to continue to the super admin console.",
                }),
              ],
            }),
            _jsx(Button, {
              className:
                "w-full bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300",
              onClick: () => navigate({ to: "/", replace: true }),
              children: "Go to login",
            }),
          ],
        }),
      }),
    });
  }

  if (!allowed) {
    return _jsx("div", {
      className:
        "flex min-h-screen items-center justify-center bg-background px-4 text-foreground dark:bg-slate-950 dark:text-white",
      children: _jsx(Card, {
        className:
          "w-full max-w-md border-border bg-card text-card-foreground shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white",
        children: _jsxs(CardContent, {
          className: "space-y-4 p-6 text-center",
          children: [
            _jsx(ShieldAlert, { className: "mx-auto h-10 w-10 text-rose-400" }),
            _jsxs("div", {
              children: [
                _jsx("h1", { className: "text-lg font-semibold", children: "Super admin only" }),
                _jsx("p", {
                  className: "mt-2 text-sm text-muted-foreground dark:text-slate-300",
                  children: "Your account does not have platform access.",
                }),
              ],
            }),
            _jsx(Button, {
              className:
                "w-full bg-background text-foreground hover:bg-muted dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200",
              onClick: () => navigate({ to: getHomeRoute(session), replace: true }),
              children: "Go to your dashboard",
            }),
          ],
        }),
      }),
    });
  }

  return _jsx(_Fragment, { children });
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiRootRequest } from "@/lib/api";
import { API_PATHS } from "@/lib/api-paths";
import { getAuthSession, getHomeRoute, saveAuthSession, type AuthSession } from "@/lib/auth";
import factrovaLogo from "@/images/tfacrova logo.png";
import whiteFactrovaLogo from "@/images/white facrova logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Factrova - Login" },
      { name: "description", content: "Sign in to manage your factory operations with Factrova." },
    ],
  }),
  component: Login,
});

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          prompt: (
            momentListener?: (notification: {
              isNotDisplayed?: () => boolean;
              isSkippedMoment?: () => boolean;
            }) => void,
          ) => void;
          renderButton: (
            element: HTMLElement,
            options: { theme?: string; size?: string; width?: number; text?: string },
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const GOOGLE_SCRIPT_ID = "factrova-google-gsi";

function loadGoogleScript(onLoad: () => void) {
  const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    if (window.google) {
      onLoad();
    } else {
      existing.addEventListener("load", onLoad, { once: true });
    }
    return;
  }

  const script = document.createElement("script");
  script.id = GOOGLE_SCRIPT_ID;
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;
  script.onload = onLoad;
  document.head.appendChild(script);
}

function Login() {
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [authStatus, setAuthStatus] = useState("Waiting for Google sign-in...");
  const [nextRoute, setNextRoute] = useState<string | null>(null);

  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      navigate({ to: getHomeRoute(session), replace: true });
    }
  }, [navigate]);

  const loginWithGoogle = useCallback(async (credential?: string) => {
    if (!credential) {
      toast.error("Google did not return a login credential");
      setAuthStatus("Google returned no credential");
      return;
    }
    setLoading(true);
    setAuthStatus("Sending Google credential to backend...");
    try {
      toast.message("Signing you in...");
      const session = await apiRootRequest<AuthSession>(API_PATHS.auth.google, {
        method: "POST",
        body: { credential },
      });
      console.info("Google auth session received", {
        email: session.profile.email,
        primaryRole: session.primaryRole,
        memberships: session.memberships.length,
        isNewUser: session.isNewUser,
      });
      setAuthStatus(
        session.isNewUser
          ? `Account created and signed in as ${session.profile.email}`
          : `Signed in as ${session.profile.email}`,
      );
      saveAuthSession(session);
      const homeRoute = session.isNewUser && session.primaryRole !== "staff"
        ? "/dashboard/settings"
        : session.primaryRole === "super_admin"
          ? "/Superadmin"
          : getHomeRoute(session);
      console.info("Redirecting after Google login", { homeRoute });
      setNextRoute(homeRoute);
      setAuthStatus(
        session.isNewUser
          ? "New account ready. Redirecting to setup..."
          : `Redirecting to ${homeRoute}...`,
      );
      window.location.replace(homeRoute);
    } catch (error) {
      console.error("Google login failed", error);
      setAuthStatus(error instanceof Error ? error.message : "Unable to login with Google");
      toast.error(error instanceof Error ? error.message : "Unable to login with Google");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    const renderGoogle = () => {
      if (cancelled || !window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        ux_mode: "popup",
        auto_select: false,
        callback: (response) => {
          console.info("Google credential callback fired", {
            hasCredential: Boolean(response.credential),
          });
          setAuthStatus(
            response.credential
              ? "Google callback received. Preparing login..."
              : "Google callback fired without a credential",
          );
          if (!response.credential) {
            toast.error("Google sign-in did not return a credential");
            return;
          }
          void loginWithGoogle(response.credential);
        },
      });
      googleButtonRef.current.innerHTML = "";
      setAuthStatus("Google button loaded. Select your account.");
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: 360,
        text: "continue_with",
      });
      window.google.accounts.id.prompt();
      setGoogleReady(true);
    };

    loadGoogleScript(renderGoogle);

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle]);

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-[1.05fr_0.95fr]">
      <section
        className="hidden min-h-screen flex-col justify-between px-10 py-9 text-primary-foreground md:flex lg:px-14"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <div className="flex flex-col items-start gap-2">
          <img src={whiteFactrovaLogo} alt="Factrova" className="h-16 w-auto object-contain" />
          <span className="text-2xl font-bold tracking-tight text-primary-foreground">
            Factrova
          </span>
        </div>

        <div className="max-w-xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
            Factory operations
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight lg:text-5xl">
            Control projects, stock and teams from one workspace.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-primary-foreground/80">
            Track production progress, material movement and finance without jumping between tools.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          {[
            { k: "120+", v: "Active projects" },
            { k: "Rs 4.2Cr", v: "Quarterly revenue" },
            { k: "98%", v: "On-time delivery" },
          ].map((stat) => (
            <div key={stat.v} className="border-l border-white/30 pl-4">
              <p className="text-xl font-bold">{stat.k}</p>
              <p className="mt-1 text-primary-foreground/75">{stat.v}</p>
            </div>
          ))}
        </div>
      </section>

      <main className="flex min-h-screen items-center px-6 py-8 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex flex-col items-center justify-center gap-2 md:hidden">
            <img src={factrovaLogo} alt="Factrova" className="h-16 w-auto object-contain" />
            <span className="text-2xl font-bold tracking-tight text-foreground">Factrova</span>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Email login</Label>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Use your Google account</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Access is decided by the backend from your email and factory membership.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-11 justify-center">
              {GOOGLE_CLIENT_ID ? (
                <div
                  ref={googleButtonRef}
                  className={loading ? "pointer-events-none opacity-60" : ""}
                />
              ) : (
                <Button
                  type="button"
                  disabled
                  className="h-11 w-full text-sm font-semibold"
                  size="lg"
                >
                  Google client id missing
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
            {GOOGLE_CLIENT_ID && !googleReady && (
              <p className="text-center text-xs text-muted-foreground">Loading Google login...</p>
            )}
            {GOOGLE_CLIENT_ID && googleReady && (
              <p className="text-center text-xs text-muted-foreground">Google login is ready.</p>
            )}
            <p className="text-center text-xs text-muted-foreground">{authStatus}</p>
            {nextRoute && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => window.location.assign(nextRoute)}
              >
                Go to dashboard
              </Button>
            )}

            <p className="text-center text-xs text-muted-foreground">
              By continuing you agree to our{" "}
              <Link to="/" className="text-primary hover:underline">
                Terms
              </Link>{" "}
              &{" "}
              <Link to="/" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

import NextLink from "next/link";
import { usePathname, useRouter as useNextRouter } from "next/navigation";

export function Link({ to, href, ...props }) {
  const resolvedHref = normalizeHref(href ?? to);
  return <NextLink href={resolvedHref} {...props} />;
}

export function useNavigate() {
  const router = useNextRouter();

  return ({ to, href, replace = false }) => {
    const resolvedHref = normalizeHref(href ?? to);
    if (replace) return router.replace(resolvedHref);
    return router.push(resolvedHref);
  };
}

export function useRouterState({ select }) {
  const pathname = usePathname() || "/";
  return select({ location: { pathname } });
}

export function useRouter() {
  const router = useNextRouter();
  return {
    ...router,
    invalidate: () => {},
  };
}

export function Outlet({ children }) {
  return children ?? null;
}

export function HeadContent() {
  return null;
}

export function Scripts() {
  return null;
}

export function createFileRoute() {
  return () => ({});
}

export function createRootRoute(config) {
  return config;
}

export function createRouter(config) {
  return config;
}

export function redirect(value) {
  return value;
}

function normalizeHref(value) {
  if (!value) return "/";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const pathname = value.pathname || "/";
    const search = value.search || value.query || "";
    const hash = value.hash || "";
    const queryString =
      typeof search === "string"
        ? search
        : search && typeof search === "object"
          ? `?${new URLSearchParams(search).toString()}`
          : "";
    return `${pathname}${queryString}${hash}`;
  }
  return String(value);
}

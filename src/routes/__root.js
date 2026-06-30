import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";
function NotFoundComponent() {
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: _jsxs("div", { className: "max-w-md text-center", children: [_jsx("h1", { className: "text-7xl font-bold text-foreground", children: "404" }), _jsx("h2", { className: "mt-4 text-xl font-semibold text-foreground", children: "Page not found" }), _jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "The page you're looking for doesn't exist or has been moved." }), _jsx("div", { className: "mt-6", children: _jsx(Link, { to: "/", className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90", children: "Go home" }) })] }) }));
}
export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: "utf-8" },
            { name: "viewport", content: "width=device-width, initial-scale=1" },
            { title: "Factrova — Factory Operations" },
            {
                name: "description",
                content: "Manage projects, customers, vendors, stock, and finance — all in one elegant workspace.",
            },
            { name: "author", content: "Factrova" },
            { property: "og:title", content: "Factrova — Factory Operations" },
            {
                property: "og:description",
                content: "Manage projects, customers, vendors, stock, and finance — all in one elegant workspace.",
            },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
            { name: "twitter:site", content: "@Lovable" },
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss,
            },
        ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
});
function RootShell({ children }) {
    return (_jsxs("html", { lang: "en", children: [_jsx("head", { children: _jsx(HeadContent, {}) }), _jsxs("body", { children: [children, _jsx(Toaster, {}), _jsx(Scripts, {})] })] }));
}
function RootComponent() {
    return _jsx(Outlet, {});
}

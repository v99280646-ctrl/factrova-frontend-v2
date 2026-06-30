import { clearAuthSession, getActiveFactoryId, getAuthToken } from "@/lib/auth";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
export const API_ROOT_URL = API_BASE_URL;
const AUTH_ME_REFRESH_KEY = "factrova-auth-me-refreshed-at";
let authMeRefreshPromise = null;
function buildUrl(baseUrl, path, query) {
    const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
    Object.entries(query ?? {}).forEach(([key, value]) => {
        if (value !== undefined)
            url.searchParams.set(key, String(value));
    });
    return url.toString();
}
async function request(baseUrl, path, options = {}) {
    const token = getAuthToken();
    const factoryId = options.includeFactoryHeader === false ? null : getActiveFactoryId();
    const response = await fetch(buildUrl(baseUrl, path, options.query), {
        method: options.method ?? "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(factoryId ? { "X-Factory-Id": factoryId } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const payload = (await response.json().catch(() => ({})));
    if (response.status === 401) {
        clearAuthSession();
        // If token is expired, force user to login.
        if (typeof window !== "undefined") {
            window.location.replace("/");
        }
    }
    if (!response.ok || payload.success === false) {
        throw new Error(payload.message || `API request failed: ${response.status}`);
    }
    return payload.data;
}
export async function apiRequest(path, options = {}) {
    return request(API_BASE_URL, path, options);
}
export const api = {
    list: (resource, query) => apiRequest(`/${resource}`, { query }),
    get: (resource, id) => apiRequest(`/${resource}/${id}`),
    create: (resource, body) => apiRequest(`/${resource}`, { method: "POST", body }),
    update: (resource, id, body) => apiRequest(`/${resource}/${id}`, { method: "PATCH", body }),
    remove: (resource, id) => apiRequest(`/${resource}/${id}`, { method: "DELETE" }),
};
export async function apiRootRequest(path, options = {}) {
    return request(API_ROOT_URL, path, { ...options, includeFactoryHeader: false });
}
export async function refreshAuthSession({ minIntervalMs = 5 * 60 * 1000 } = {}) {
    if (typeof window === "undefined")
        return null;
    const lastRefreshAt = Number(window.sessionStorage.getItem(AUTH_ME_REFRESH_KEY) ?? "0");
    if (lastRefreshAt && Date.now() - lastRefreshAt < minIntervalMs) {
        return null;
    }
    if (authMeRefreshPromise)
        return authMeRefreshPromise;
    authMeRefreshPromise = apiRootRequest("/auth/me")
        .then((session) => {
        window.sessionStorage.setItem(AUTH_ME_REFRESH_KEY, String(Date.now()));
        return session;
    })
        .finally(() => {
        authMeRefreshPromise = null;
    });
    return authMeRefreshPromise;
}

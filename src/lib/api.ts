import { clearAuthSession, getActiveFactoryId, getAuthToken } from "@/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";
export const API_ROOT_URL = API_BASE_URL;

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  includeFactoryHeader?: boolean;
};

function buildUrl(baseUrl: string, path: string, query?: RequestOptions["query"]) {
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function request<T>(baseUrl: string, path: string, options: RequestOptions = {}) {
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

  const payload = (await response.json().catch(() => ({}))) as Partial<ApiResponse<T>>;
  if (response.status === 401) clearAuthSession();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `API request failed: ${response.status}`);
  }
  return payload.data as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  return request<T>(API_BASE_URL, path, options);
}

export const api = {
  list: <T>(resource: string, query?: RequestOptions["query"]) =>
    apiRequest<T[]>(`/${resource}`, { query }),
  get: <T>(resource: string, id: string) => apiRequest<T>(`/${resource}/${id}`),
  create: <T>(resource: string, body: unknown) =>
    apiRequest<T>(`/${resource}`, { method: "POST", body }),
  update: <T>(resource: string, id: string, body: unknown) =>
    apiRequest<T>(`/${resource}/${id}`, { method: "PATCH", body }),
  remove: (resource: string, id: string) =>
    apiRequest<{ message: string }>(`/${resource}/${id}`, { method: "DELETE" }),
};

export async function apiRootRequest<T>(path: string, options: RequestOptions = {}) {
  return request<T>(API_ROOT_URL, path, { ...options, includeFactoryHeader: false });
}

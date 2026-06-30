export const SERVICE_STORAGE_KEY = "factrova-services";
const LEGACY_DUMMY_SERVICE_IDS = new Set([
    "lamination",
    "veneer",
    "acrylic",
    "cutting",
    "edgeband",
    "boring",
]);
export const defaultStoredServices = [];
export function loadStoredServices() {
    if (typeof window === "undefined")
        return defaultStoredServices;
    try {
        const raw = window.localStorage.getItem(SERVICE_STORAGE_KEY);
        if (!raw)
            return defaultStoredServices;
        const parsed = JSON.parse(raw);
        return parsed.filter((service) => !LEGACY_DUMMY_SERVICE_IDS.has(service.id));
    }
    catch {
        return defaultStoredServices;
    }
}
export function saveStoredServices(services) {
    if (typeof window === "undefined")
        return;
    window.localStorage.setItem(SERVICE_STORAGE_KEY, JSON.stringify(services));
}
export function mergeServices(...groups) {
    const map = new Map();
    groups.flat().forEach((service) => {
        const key = service.name.trim().toLowerCase();
        if (key && !map.has(key))
            map.set(key, service);
    });
    return Array.from(map.values());
}

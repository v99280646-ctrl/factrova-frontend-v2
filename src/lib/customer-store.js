export const CUSTOMER_STORAGE_KEY = "factrova-customers";
const LEGACY_DUMMY_CUSTOMER_IDS = new Set(["C001", "C002", "C003", "C004"]);
function getFactoryStorageKey(factoryId) {
    return factoryId ? `${CUSTOMER_STORAGE_KEY}:${factoryId}` : CUSTOMER_STORAGE_KEY;
}
export function loadStoredCustomers(factoryId = null) {
    if (typeof window === "undefined")
        return [];
    try {
        const raw = window.localStorage.getItem(getFactoryStorageKey(factoryId)) ??
            (factoryId ? null : window.localStorage.getItem(CUSTOMER_STORAGE_KEY));
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return parsed.filter((customer) => !LEGACY_DUMMY_CUSTOMER_IDS.has(customer.id) && (!factoryId || customer.factoryId === factoryId));
    }
    catch {
        return [];
    }
}
export function saveStoredCustomers(customers, factoryId = null) {
    if (typeof window === "undefined")
        return;
    window.localStorage.setItem(getFactoryStorageKey(factoryId), JSON.stringify(customers));
}
export function mergeCustomers(...groups) {
    const map = new Map();
    groups.flat().forEach((customer) => {
        const key = customer.email?.trim().toLowerCase() || customer.company.trim().toLowerCase();
        if (key)
            map.set(key, customer);
    });
    return Array.from(map.values());
}

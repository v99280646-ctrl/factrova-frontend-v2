export const STAFF_STORAGE_KEY = "factrova-staff";
const LEGACY_DUMMY_STAFF_IDS = new Set(["local-ramesh", "local-akash"]);
export const defaultStoredStaff = [];
export function loadStoredStaff() {
    if (typeof window === "undefined")
        return defaultStoredStaff;
    try {
        const raw = window.localStorage.getItem(STAFF_STORAGE_KEY);
        if (!raw)
            return defaultStoredStaff;
        const parsed = JSON.parse(raw);
        return parsed.filter((staff) => !LEGACY_DUMMY_STAFF_IDS.has(staff.id || staff._id));
    }
    catch {
        return defaultStoredStaff;
    }
}
export function saveStoredStaff(staff) {
    if (typeof window === "undefined")
        return;
    window.localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staff));
}
export function mergeStaff(...groups) {
    const map = new Map();
    groups.flat().forEach((staff) => {
        const key = staff.email?.trim().toLowerCase() || staff.name.trim().toLowerCase();
        if (key && !map.has(key))
            map.set(key, staff);
    });
    return Array.from(map.values());
}

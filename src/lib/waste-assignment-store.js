const STORAGE_KEY = "factrova-waste-assignments";
function assignmentKeys(assignment) {
    return [assignment.backendId, assignment.code].filter(Boolean);
}
export function loadWasteAssignments() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored)
            return [];
        const rows = JSON.parse(stored);
        return Array.isArray(rows) ? rows : [];
    }
    catch {
        return [];
    }
}
export function saveWasteAssignment(assignment) {
    const keys = new Set(assignmentKeys(assignment));
    const next = [
        assignment,
        ...loadWasteAssignments().filter((item) => !assignmentKeys(item).some((key) => keys.has(key))),
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
export function removeWasteAssignment(assignment) {
    const keys = new Set(assignmentKeys(assignment));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loadWasteAssignments().filter((item) => !assignmentKeys(item).some((key) => keys.has(key)))));
}
export function findWasteAssignment(assignment) {
    const keys = new Set(assignmentKeys(assignment));
    return loadWasteAssignments().find((item) => assignmentKeys(item).some((key) => keys.has(key)));
}

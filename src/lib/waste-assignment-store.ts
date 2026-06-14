export type WasteAssignment = {
  backendId?: string;
  code: string;
  projectId?: string | null;
  projectName?: string;
  usedForProjectId?: string | null;
  usedForProjectName?: string;
};

const STORAGE_KEY = "factrova-waste-assignments";

function assignmentKeys(assignment: Pick<WasteAssignment, "backendId" | "code">) {
  return [assignment.backendId, assignment.code].filter(Boolean) as string[];
}

export function loadWasteAssignments() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const rows = JSON.parse(stored);
    return Array.isArray(rows) ? (rows as WasteAssignment[]) : [];
  } catch {
    return [];
  }
}

export function saveWasteAssignment(assignment: WasteAssignment) {
  const keys = new Set(assignmentKeys(assignment));
  const next = [
    assignment,
    ...loadWasteAssignments().filter((item) => !assignmentKeys(item).some((key) => keys.has(key))),
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function removeWasteAssignment(assignment: Pick<WasteAssignment, "backendId" | "code">) {
  const keys = new Set(assignmentKeys(assignment));
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(loadWasteAssignments().filter((item) => !assignmentKeys(item).some((key) => keys.has(key)))),
  );
}

export function findWasteAssignment(assignment: Pick<WasteAssignment, "backendId" | "code">) {
  const keys = new Set(assignmentKeys(assignment));
  return loadWasteAssignments().find((item) => assignmentKeys(item).some((key) => keys.has(key)));
}

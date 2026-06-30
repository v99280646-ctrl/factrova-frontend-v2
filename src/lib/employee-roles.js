export const EMPLOYEE_ROLES = [
    "Superviser",
    "Manager",
    "Pressing Mechine",
    "Cutting Mechine",
    "Edge Band Mechine",
    "Boring Mechine",
    "Packing & Delivery",
];
export const DEFAULT_EMPLOYEE_ROLE = "Cutting Mechine";
export const SERVICE_ROLE_OPTIONS = [
    { value: "__none__", label: "None" },
    ...EMPLOYEE_ROLES.map((role) => ({ value: role, label: role })),
];

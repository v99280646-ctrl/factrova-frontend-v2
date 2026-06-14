export const EMPLOYEE_ROLES = [
  "Superviser",
  "Manager",
  "Pressing Mechine",
  "Cutting Mechine",
  "Edge Band Mechine",
  "Boring Mechine",
  "Packing & Delivery",
] as const;

export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

export const DEFAULT_EMPLOYEE_ROLE: EmployeeRole = "Cutting Mechine";

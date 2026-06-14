import type { Customer } from "@/lib/data";

export const CUSTOMER_STORAGE_KEY = "factrova-customers";
const LEGACY_DUMMY_CUSTOMER_IDS = new Set(["C001", "C002", "C003", "C004"]);

export function loadStoredCustomers() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Customer[];
    return parsed.filter((customer) => !LEGACY_DUMMY_CUSTOMER_IDS.has(customer.id));
  } catch {
    return [];
  }
}

export function saveStoredCustomers(customers: Customer[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customers));
}

export function mergeCustomers(...groups: Customer[][]) {
  const map = new Map<string, Customer>();
  groups.flat().forEach((customer) => {
    const key = customer.email?.trim().toLowerCase() || customer.company.trim().toLowerCase();
    if (key) map.set(key, customer);
  });
  return Array.from(map.values());
}

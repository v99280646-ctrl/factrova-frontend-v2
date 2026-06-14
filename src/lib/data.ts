export type ProjectStatus = "ongoing" | "completed" | "hold";

export interface Customer {
  id: string;
  company: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  state?: string;
  district?: string;
  pincode?: string;
  gstin?: string;
}

export interface Vendor {
  id: string;
  name: string;
  contact: string;
  alternativeContact: string;
  email: string;
  gst: string;
  address: string;
  materials: string;
}

export interface Project {
  id: string;
  name: string;
  customer: string;
  status: ProjectStatus;
  progress: number;
  delivery: string;
  amount: number;
}

export interface StockItem {
  id: string;
  material: string;
  type: string;
  thickness?: string;
  quantity: number;
  unit: string;
}

export const customers: Customer[] = [];
export const vendors: Vendor[] = [];
export const projects: Project[] = [];
export const stock: StockItem[] = [];
export const services: { id: string; label: string; rate: number }[] = [];
export const revenueByMonth: { month: string; revenue: number }[] = [];
export const projectsByStatus: { name: string; value: number }[] = [];
export const transactions: {
  id: string;
  date: string;
  desc: string;
  type: "credit" | "debit";
  amount: number;
}[] = [];

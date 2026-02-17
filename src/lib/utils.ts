import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function severityLabel(severity: string): string {
  const map: Record<string, string> = {
    HIGH: "Alta",
    MEDIUM: "Media",
    LOW: "Baja",
  };
  return map[severity] || severity;
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    HIGH: "bg-red-100 text-red-800 border-red-200",
    MEDIUM: "bg-amber-100 text-amber-800 border-amber-200",
    LOW: "bg-green-100 text-green-800 border-green-200",
  };
  return map[severity] || "bg-gray-100 text-gray-800";
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    OPEN: "Abierta",
    IN_PROGRESS: "En progreso",
    DONE: "Completada",
  };
  return map[status] || status;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-amber-100 text-amber-800",
    DONE: "bg-green-100 text-green-800",
  };
  return map[status] || "bg-gray-100 text-gray-800";
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    ADMIN: "Administrador",
    CSST: "Comité SST",
    SUPERVISOR: "Supervisor",
    WORKER: "Trabajador",
  };
  return map[role] || role;
}

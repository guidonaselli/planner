export type Role =
  | "Coordinador de técnicos"
  | "Técnico de campo"
  | "Técnico laboratorio"
  | "Operario monitoreo"
  | "Supervisor monitoreo";

export type ShiftStatus = "draft" | "confirmed";

export interface StaffMember {
  id: string;
  fullName: string;
  role: Role;
  homeOffice: boolean;

  scheduledHoursPerDay: number;      // ej 8
  overtimeMaxHoursPerDay: number;    // ej 2

  availabilityTemplate: {
    start: string; // "HH:MM"
    end: string;   // "HH:MM"
  };
}

export interface Shift {
  id: string;
  staffId: string;
  date: string;     // "YYYY-MM-DD" del día donde cae el segmento
  start: string;    // "HH:MM"
  end: string;      // "HH:MM"
  status: ShiftStatus;

  shiftGroupId?: string; // si viene de split por medianoche
  source?: "manual" | "auto";
}

export interface CoverageRequirement {
  id: string;
  role: Role;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  minStaff: number;
  appliesOnHolidays?: boolean; // si querés diferenciar
}

export interface Holiday {
  date: string; // "YYYY-MM-DD"
  name: string;
  defaultRule: "Dotación mínima" | "Sin asignación";
}

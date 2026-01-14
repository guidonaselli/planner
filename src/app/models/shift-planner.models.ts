export type Role =
  | "coordinador"
  | "supervisor"
  | "lider tecnico/gerente"
  | "supervisor instalador 1 (interno)"
  | "supervisor instalador 2 (subcontratados)"
  | "supervisor de campo"
  | "tecnico instalador"
  | "tecnico de calle"
  | "encargado de laboratorio"
  | "empleado de laboratorio"
  | "soporte n1y n2"
  | "soporte n3";

export type ShiftType = "standard" | "exception" | "overtime";
export type ShiftStatus = "draft" | "confirmed";

export interface StaffMember {
  id: string;
  fullName: string;
  role: Role;
  area?: string;
  homeOffice: boolean; // Keep mainly for visual info if needed
  phone: string;

  // Accumulated stats for the month (mocked)
  monthlyHours: number;

  // Standard schedule definition (could be more complex, keeping simple for now)
  standardShiftStart?: string; // "08:00"
  standardShiftEnd?: string;   // "16:00"
}

export interface Shift {
  id: string;
  staffId: string;
  date: string;     // "YYYY-MM-DD"
  start: string;    // "HH:MM"
  end: string;      // "HH:MM"
  type: ShiftType;
  status: ShiftStatus;

  shiftGroupId?: string; // Linked split shifts
  recurrenceGroupId?: string; // Linked recurring shifts
  source?: "manual" | "auto";
}

export interface CoverageRequirement {
  id: string;
  role: Role;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  minStaff: number;
}

export interface DailyRoleMinimum {
  role: Role;
  minDaily: number;
}

export interface Holiday {
  date: string; // "YYYY-MM-DD"
  name: string;
}

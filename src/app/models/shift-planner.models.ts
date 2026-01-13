export type Role =
  | "Coordinador de técnicos"
  | "Técnico de campo"
  | "Técnico laboratorio"
  | "Operario monitoreo"
  | "Supervisor monitoreo";

export type ShiftType = "standard" | "exception" | "overtime";
export type ShiftStatus = "draft" | "confirmed";

export interface StaffMember {
  id: string;
  fullName: string;
  role: Role;
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
  source?: "manual" | "auto";
}

export interface CoverageRequirement {
  id: string;
  role: Role;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  minStaff: number;
}

export interface Holiday {
  date: string; // "YYYY-MM-DD"
  name: string;
}

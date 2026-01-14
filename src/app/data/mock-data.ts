import { StaffMember, CoverageRequirement, Holiday, Shift, Role, DailyRoleMinimum } from '../models/shift-planner.models';

const NAMES = [
  "Tomas García", "Sofía Martínez", "Nicolás Fernández", "Valentina López", "Matías Romero",
  "Camila Pérez", "Juan Cruz Gómez", "Agustina Díaz", "Federico Silva", "Martina Herrera",
  "Bruno Castro", "Lucía Molina", "Pablo Suárez", "Florencia Rivas", "Gonzalo Medina",
  "María Belén Torres", "Diego Navarro", "Carolina Sosa", "Iván Acosta", "Milagros Vega",
  "Julieta Álvarez", "Sebastián Ortega", "Ana Paula Ibarra", "Leandro Cabrera", "Paula Benítez",
  "Hernán Funes", "Rocío Núñez", "Emanuel Peralta", "Micaela Giménez", "Ramiro Arias",
  "Catalina Ponce", "Franco Villalba", "Lorena Quiroga", "Esteban Paz", "Noelia Vázquez",
  "Marcos Ledesma", "Victoria Salas", "Facundo Correa", "Malena Barreto", "Ignacio Moya",
  "Ailén Serrano", "Lautaro Godoy", "Sol Galarza", "Kevin Santillán", "Cecilia Araujo",
  "Gastón Roldán", "Marina Luján", "Santiago Prieto", "Belén Cordero", "Nahuel Latorre"
];

const ROLE_SPECS: {
  area: string;
  role: Role;
  count: number;
  coverageStart?: string;
  coverageEnd?: string;
  shiftHours?: number;
}[] = [
  { area: "CM", role: "coordinador", count: 2, coverageStart: "00:00", coverageEnd: "24:00", shiftHours: 12 },
  { area: "CM", role: "supervisor", count: 5, coverageStart: "00:00", coverageEnd: "24:00" },
  { area: "Tecnicos", role: "lider tecnico/gerente", count: 1, coverageStart: "07:00", coverageEnd: "16:00" },
  { area: "Tecnicos", role: "supervisor instalador 1 (interno)", count: 1, coverageStart: "07:00", coverageEnd: "16:00" },
  { area: "Tecnicos", role: "supervisor instalador 2 (subcontratados)", count: 1, coverageStart: "07:00", coverageEnd: "16:00" },
  { area: "Tecnicos", role: "supervisor de campo", count: 1 },
  { area: "Tecnicos", role: "tecnico instalador", count: 5 },
  { area: "Tecnicos", role: "tecnico de calle", count: 10, coverageStart: "00:00", coverageEnd: "24:00" },
  { area: "Laboratorio", role: "encargado de laboratorio", count: 1 },
  { area: "Laboratorio", role: "empleado de laboratorio", count: 6 },
  { area: "Soporte", role: "soporte n1y n2", count: 4 },
  { area: "Soporte", role: "soporte n3", count: 2 }
];

function getDefaultShiftHours(spec: typeof ROLE_SPECS[number]) {
  if (spec.shiftHours) return spec.shiftHours;
  if (spec.coverageStart === "07:00" && spec.coverageEnd === "16:00") return 9;
  return 8;
}

function getDefaultShiftRange(spec: typeof ROLE_SPECS[number]) {
  const hours = getDefaultShiftHours(spec);
  if (spec.coverageStart === "07:00" && spec.coverageEnd === "16:00") {
    return { start: "07:00", end: "16:00" };
  }
  const start = "08:00";
  const endHour = Math.min(24, 8 + hours);
  const end = `${String(endHour).padStart(2, '0')}:00`;
  return { start, end };
}

function generateStaff(): StaffMember[] {
  const staff: StaffMember[] = [];
  let idx = 0;

  ROLE_SPECS.forEach(spec => {
    const range = getDefaultShiftRange(spec);
    for (let i = 0; i < spec.count; i++) {
      const name = NAMES[idx % NAMES.length];
      staff.push({
        id: `u${1000 + idx}`,
        fullName: name,
        role: spec.role,
        area: spec.area,
        homeOffice: Math.random() > 0.7,
        phone: `+34 6${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        monthlyHours: 120 + Math.floor(Math.random() * 40),
        standardShiftStart: range.start,
        standardShiftEnd: range.end
      });
      idx++;
    }
  });

  return staff;
}

const STAFF = generateStaff();

const REQS: CoverageRequirement[] = [
  { id: "r1", role: "coordinador", start: "00:00", end: "24:00", minStaff: 1 },
  { id: "r2", role: "supervisor", start: "00:00", end: "08:00", minStaff: 1 },
  { id: "r3", role: "supervisor", start: "08:00", end: "18:00", minStaff: 2 },
  { id: "r4", role: "supervisor", start: "18:00", end: "24:00", minStaff: 1 },
  { id: "r5", role: "lider tecnico/gerente", start: "07:00", end: "16:00", minStaff: 1 },
  { id: "r6", role: "supervisor instalador 1 (interno)", start: "07:00", end: "16:00", minStaff: 1 },
  { id: "r7", role: "supervisor instalador 2 (subcontratados)", start: "07:00", end: "16:00", minStaff: 1 },
  { id: "r8", role: "supervisor de campo", start: "07:00", end: "16:00", minStaff: 1 },
  { id: "r9", role: "tecnico instalador", start: "07:00", end: "16:00", minStaff: 3 },
  { id: "r10", role: "tecnico instalador", start: "12:00", end: "13:00", minStaff: 4 },
  { id: "r11", role: "tecnico de calle", start: "00:00", end: "24:00", minStaff: 2 },
  { id: "r12", role: "tecnico de calle", start: "12:00", end: "13:00", minStaff: 3 },
  { id: "r13", role: "encargado de laboratorio", start: "07:00", end: "16:00", minStaff: 1 },
  { id: "r14", role: "empleado de laboratorio", start: "07:00", end: "16:00", minStaff: 2 },
  { id: "r15", role: "empleado de laboratorio", start: "12:00", end: "14:00", minStaff: 3 },
  { id: "r16", role: "soporte n1y n2", start: "08:00", end: "20:00", minStaff: 2 },
  { id: "r17", role: "soporte n3", start: "08:00", end: "20:00", minStaff: 1 }
];

const DAILY_ROLE_MINIMUMS: DailyRoleMinimum[] = ROLE_SPECS.map(spec => ({
  role: spec.role,
  minDaily: 1
}));

const HOLIDAYS: Holiday[] = [
  { date: "2026-01-15", name: "Feriado Local" }
];

function generateShifts(staff: StaffMember[]): Shift[] {
  const shifts: Shift[] = [];
  const date = "2026-01-13"; // Demo Day

  staff.forEach(s => {
    // 80% chance to have a shift today
    if (Math.random() > 0.2) {
      let start = s.standardShiftStart || "08:00";
      let end = s.standardShiftEnd || "16:00";
      let type: "standard" | "exception" | "overtime" = "standard";

      // Random variations
      const rand = Math.random();
      if (rand > 0.9) {
        // Exception
        start = "10:00";
        end = "18:00";
        type = "exception";
      } else if (rand > 0.85) {
        // Overtime (longer shift)
        end = "18:00"; // 2h OT
      }

      shifts.push({
        id: crypto.randomUUID(),
        staffId: s.id,
        date,
        start,
        end,
        type: end > "16:00" && type === "standard" ? "standard" : type, // Simplify
        status: "confirmed",
        source: "manual"
      });

      // Split OT visual if strictly separating blocks (Advanced: for now just one block type)
      // Let's add explicit OT blocks for some "tecnico instalador"
      if (s.role === "tecnico instalador" && Math.random() > 0.8) {
         shifts.push({
            id: crypto.randomUUID(),
            staffId: s.id,
            date,
            start: "18:00",
            end: "20:00",
            type: "overtime",
            status: "draft",
            source: "manual"
         });
      }
    }
  });
  return shifts;
}

const SHIFTS = generateShifts(STAFF);

export const MOCK_DATA = {
  staff: STAFF,
  requirements: REQS,
  dailyRoleMinimums: DAILY_ROLE_MINIMUMS,
  holidays: HOLIDAYS,
  shifts: SHIFTS
};

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

function generateStaff(): StaffMember[] {
  return NAMES.map((name, i) => {
    let role: Role = "Operario monitoreo";
    if (i < 5) role = "Coordinador de técnicos";
    else if (i < 15) role = "Técnico de campo";
    else if (i < 25) role = "Técnico laboratorio";
    else if (i < 45) role = "Operario monitoreo";
    else role = "Supervisor monitoreo";

    return {
      id: `u${1000 + i}`,
      fullName: name,
      role,
      homeOffice: Math.random() > 0.7,
      phone: `+34 6${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      monthlyHours: 120 + Math.floor(Math.random() * 40),
      standardShiftStart: "08:00",
      standardShiftEnd: "16:00"
    };
  });
}

const STAFF = generateStaff();

const REQS: CoverageRequirement[] = [
  { id: "r1", role: "Operario monitoreo", start: "00:00", end: "08:00", minStaff: 2 },
  { id: "r2", role: "Operario monitoreo", start: "08:00", end: "16:00", minStaff: 5 },
  { id: "r3", role: "Operario monitoreo", start: "16:00", end: "24:00", minStaff: 3 },
  { id: "r4", role: "Supervisor monitoreo", start: "08:00", end: "18:00", minStaff: 1 },
  { id: "r5", role: "Técnico de campo", start: "08:00", end: "17:00", minStaff: 3 }
];

const DAILY_ROLE_MINIMUMS: DailyRoleMinimum[] = [
  { role: "Coordinador de técnicos", minDaily: 1 },
  { role: "Técnico de campo", minDaily: 2 },
  { role: "Técnico laboratorio", minDaily: 2 },
  { role: "Operario monitoreo", minDaily: 4 },
  { role: "Supervisor monitoreo", minDaily: 1 }
];

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
      // Let's add explicit OT blocks for some "Técnico de campo"
      if (s.role === "Técnico de campo" && Math.random() > 0.8) {
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

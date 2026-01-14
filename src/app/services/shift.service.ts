import { Injectable, signal, computed, WritableSignal, Signal } from '@angular/core';
import { StaffMember, Shift, CoverageRequirement, Holiday, Role, ShiftStatus, DailyRoleMinimum } from '../models/shift-planner.models';
import { MOCK_DATA } from '../data/mock-data';
import { DateUtils } from '../utils/date-utils';

@Injectable({
  providedIn: 'root'
})
export class ShiftService {
  // State Signals
  currentDate: WritableSignal<Date> = signal(new Date('2026-01-13T00:00:00'));
  viewMode: WritableSignal<'day' | 'week'> = signal('day');

  // Data Signals
  staff: WritableSignal<StaffMember[]> = signal(MOCK_DATA.staff);
  shifts: WritableSignal<Shift[]> = signal(MOCK_DATA.shifts);
  requirements: WritableSignal<CoverageRequirement[]> = signal(MOCK_DATA.requirements);
  dailyRoleMinimums: WritableSignal<DailyRoleMinimum[]> = signal(MOCK_DATA.dailyRoleMinimums);
  holidays: WritableSignal<Holiday[]> = signal(MOCK_DATA.holidays);

  // Undo/Redo Stacks (storing Shift[] snapshots)
  private undoStack: Shift[][] = [];
  private redoStack: Shift[][] = [];

  // Filters
  filterRoles: WritableSignal<Role[]> = signal([]);
  filterHomeOffice: WritableSignal<'all' | 'yes' | 'no'> = signal('all');
  filterSearch: WritableSignal<string> = signal('');
  filterStatus: WritableSignal<'all' | 'draft' | 'confirmed'> = signal('all');
  filterActiveNow: WritableSignal<boolean> = signal(false);
  groupByRole: WritableSignal<boolean> = signal(true);

  constructor() {
    this.normalizeStoredRoles();
  }

  // --- Computed Signals ---

  filteredStaff: Signal<StaffMember[]> = computed(() => {
    const allStaff = this.staff();
    const roles = this.filterRoles();
    const homeOffice = this.filterHomeOffice();
    const search = this.filterSearch().toLowerCase();
    const activeNow = this.filterActiveNow();
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const todayStr = DateUtils.formatDate(now);

    // We need shifts if activeNow is true
    // Optimized: get shifts for today only if needed
    const shiftsToday = this.shifts().filter(s => s.date === todayStr);

    return allStaff.filter(member => {
      if (roles.length > 0 && !roles.includes(member.role)) return false;
      if (homeOffice === 'yes' && !member.homeOffice) return false;
      if (homeOffice === 'no' && member.homeOffice) return false;

      if (search) {
         const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
         if (!normalize(member.fullName).includes(normalize(search))) return false;
      }

      if (activeNow) {
         // Check if member has a shift covering now
         // Assuming 'today' is the relevant day for "Active Now" relative to system time
         // If the planner is viewing a different day, "Active Now" might be confusing.
         // Usually "Active Now" means "System Time Now".
         // So we check if today is the planner date? Or just if they are working at this moment regardless of view?
         // User said "Activos ahora", implies real-time.
         const hasShift = shiftsToday.some(s => {
            if (s.staffId !== member.id) return false;
            const start = DateUtils.timeToMinutes(s.start);
            const end = DateUtils.timeToMinutes(s.end);
            return nowMins >= start && nowMins < end;
         });
         if (!hasShift) return false;
      }

      return true;
    });
  });

  shiftsForCurrentDate: Signal<Shift[]> = computed(() => {
    const dateStr = DateUtils.formatDate(this.currentDate());
    const allShifts = this.shifts();
    const statusFilter = this.filterStatus();

    return allShifts.filter(shift => {
      if (shift.date !== dateStr) return false;
      if (statusFilter !== 'all' && shift.status !== statusFilter) return false;
      return true;
    });
  });

  // Coverage Calculation (5 min buckets -> optimized to 15 min logic for display later if needed)
  dailyCoverage: Signal<any[]> = computed(() => {
    const buckets = [];
    const shifts = this.shiftsForCurrentDate();
    const requirements = this.requirements();
    const staffById = new Map(this.staff().map(member => [member.id, member]));

    // 288 buckets (5 mins) for granularity
    for (let i = 0; i < 288; i++) {
      const minutes = i * 5;
      const timeStr = DateUtils.minutesToTime(minutes);

      let count = 0;
      const roleCounts: Record<string, number> = {};

      shifts.forEach(shift => {
        const start = DateUtils.timeToMinutes(shift.start);
        const end = DateUtils.timeToMinutes(shift.end);

        if (minutes >= start && minutes < end) {
           const staff = staffById.get(shift.staffId);
           if (staff) {
              count++;
              roleCounts[staff.role] = (roleCounts[staff.role] || 0) + 1;
           }
        }
      });

      let warningCount = 0;
      requirements.forEach(req => {
        const reqStart = DateUtils.timeToMinutes(req.start);
        const reqEnd = DateUtils.timeToMinutes(req.end);
        if (minutes < reqStart || minutes >= reqEnd) return;
        const current = roleCounts[req.role] || 0;
        if (current < req.minStaff) warningCount++;
      });

      buckets.push({ time: minutes, timeStr, count, roleCounts, warningCount });
    }
    return buckets;
  });

  getCoverageWarningsAt(dateStr: string, minutes: number) {
    const shifts = this.shifts().filter(s => s.date === dateStr);
    const requirements = this.requirements();
    const staffById = new Map(this.staff().map(member => [member.id, member]));

    const roleCounts: Record<string, number> = {};
    shifts.forEach(shift => {
      const start = DateUtils.timeToMinutes(shift.start);
      const end = DateUtils.timeToMinutes(shift.end);
      if (minutes >= start && minutes < end) {
        const staff = staffById.get(shift.staffId);
        if (staff) {
          roleCounts[staff.role] = (roleCounts[staff.role] || 0) + 1;
        }
      }
    });

    return requirements
      .filter(req => {
        const reqStart = DateUtils.timeToMinutes(req.start);
        const reqEnd = DateUtils.timeToMinutes(req.end);
        return minutes >= reqStart && minutes < reqEnd;
      })
      .map(req => ({
        role: req.role,
        required: req.minStaff,
        current: roleCounts[req.role] || 0,
        start: req.start,
        end: req.end
      }))
      .filter(item => item.current < item.required);
  }

  getDailyWarningCount(dateStr: string, stepMinutes = 15) {
    const shifts = this.shifts().filter(s => s.date === dateStr);
    const requirements = this.requirements();
    const staffById = new Map(this.staff().map(member => [member.id, member]));

    const getRoleCountsAt = (minutes: number) => {
      const roleCounts: Record<string, number> = {};
      shifts.forEach(shift => {
        const start = DateUtils.timeToMinutes(shift.start);
        const end = DateUtils.timeToMinutes(shift.end);
        if (minutes >= start && minutes < end) {
          const staff = staffById.get(shift.staffId);
          if (staff) {
            roleCounts[staff.role] = (roleCounts[staff.role] || 0) + 1;
          }
        }
      });
      return roleCounts;
    };

    let warnings = 0;
    requirements.forEach(req => {
      const reqStart = DateUtils.timeToMinutes(req.start);
      const reqEnd = DateUtils.timeToMinutes(req.end);
      let hasShortage = false;

      for (let minutes = reqStart; minutes < reqEnd; minutes += stepMinutes) {
        const roleCounts = getRoleCountsAt(minutes);
        const current = roleCounts[req.role] || 0;
        if (current < req.minStaff) {
          hasShortage = true;
          break;
        }
      }

      if (hasShortage) warnings++;
    });

    return warnings;
  }

  // --- Actions ---

  private saveSnapshot() {
    // Deep copy shifts
    this.undoStack.push(JSON.parse(JSON.stringify(this.shifts())));
    if (this.undoStack.length > 20) this.undoStack.shift(); // Limit history
    this.redoStack = []; // Clear redo on new action
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const current = this.shifts();
    this.redoStack.push(JSON.parse(JSON.stringify(current)));
    const prev = this.undoStack.pop();
    if (prev) this.shifts.set(prev);
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const current = this.shifts();
    this.undoStack.push(JSON.parse(JSON.stringify(current)));
    const next = this.redoStack.pop();
    if (next) this.shifts.set(next);
  }

  setDate(date: Date) {
    this.currentDate.set(date);
  }

  addShift(shift: Shift) {
    this.saveSnapshot();
    // Normalize logic (check midnight crossing)
    const normalizedShifts = this.normalizeShift(shift.staffId, shift.date, shift.start, shift.end);
    // Apply other properties
    const finalShifts = normalizedShifts.map(s => ({
       ...s,
       type: shift.type,
       status: shift.status,
       source: shift.source ?? s.source,
       recurrenceGroupId: shift.recurrenceGroupId
    }));
    this.shifts.update(current => [...current, ...finalShifts]);
  }

  updateShift(updatedShift: Partial<Shift> & { id: string }) {
    this.saveSnapshot();

    // Logic: Find original to get context, then normalize with new times
    const currentShifts = this.shifts();
    const original = currentShifts.find(s => s.id === updatedShift.id);

    if (!original) return;

    const merged = { ...original, ...updatedShift };

    // Check if we need to re-normalize (times changed)
    if (updatedShift.start || updatedShift.end) {
        // If it was part of a group, we should probably delete the whole group.
        // For prototype: we just delete this specific segment and replace with new normalized segment(s).
        // If original had shiftGroupId, a more advanced logic would be to find the sibling.
        // Here we simplify: Editing a segment acts on that segment's day/time context.

        const newShifts = this.normalizeShift(merged.staffId, merged.date, merged.start, merged.end);
        // Map over properties
        const finalShifts = newShifts.map(s => ({
            ...s,
            id: s.id === newShifts[0].id ? original.id : s.id, // Try to keep ID if single result? No, normalize generates new IDs.
            // Actually better to keep IDs if 1-to-1 but normalizeShift makes new IDs.
            // Let's rely on new IDs for simplicity in split logic, except we want to track status.
            type: merged.type,
            status: merged.status,
            source: merged.source,
            recurrenceGroupId: merged.recurrenceGroupId
        }));

        this.shifts.update(curr => {
           const filtered = curr.filter(s => s.id !== original.id);
           return [...filtered, ...finalShifts];
        });
    } else {
        // Just property update (status, type)
        this.shifts.update(current => current.map(s =>
           s.id === updatedShift.id ? { ...s, ...updatedShift } : s
        ));
    }
  }

  deleteShift(shiftId: string) {
    this.saveSnapshot();
    this.shifts.update(current => current.filter(s => s.id !== shiftId));
  }

  deleteShiftSeries(shiftId: string) {
    const current = this.shifts();
    const target = current.find(s => s.id === shiftId);
    if (!target || !target.recurrenceGroupId) {
      this.deleteShift(shiftId);
      return;
    }

    this.saveSnapshot();
    this.shifts.update(curr => curr.filter(s => s.recurrenceGroupId !== target.recurrenceGroupId));
  }

  deleteShiftSeriesFrom(shiftId: string, mode: 'all' | 'weekday') {
    const current = this.shifts();
    const target = current.find(s => s.id === shiftId);
    if (!target || !target.recurrenceGroupId) {
      this.deleteShift(shiftId);
      return;
    }

    const targetDate = new Date(target.date);
    const targetWeekday = targetDate.getDay();

    this.saveSnapshot();
    this.shifts.update(curr => curr.filter(s => {
      if (s.recurrenceGroupId !== target.recurrenceGroupId) return true;
      const sDate = new Date(s.date);
      if (sDate < targetDate) return true;
      if (mode === 'weekday') {
        return sDate.getDay() !== targetWeekday;
      }
      return false;
    }));
  }

  publishChanges() {
    this.saveSnapshot();
    // In a real backend, this would PUT/POST.
    // Here we just update all 'draft' shifts to 'confirmed'.
    this.shifts.update(current => current.map(s => ({
       ...s,
       status: 'confirmed'
    })));
  }

  // --- Logic: Midnight Crossing ---
  normalizeShift(staffId: string, date: string, start: string, end: string): Shift[] {
    // ... same as before, but ensure ID generation uses a simple random for prototype
    const startMins = DateUtils.timeToMinutes(start);
    const endMins = DateUtils.timeToMinutes(end);
    const shifts: Shift[] = [];
    const base = {
       staffId,
       source: 'manual' as const,
       status: 'draft' as const,
       type: 'standard' as const
    };

    if (startMins < endMins) {
       shifts.push({ ...base, id: crypto.randomUUID(), date, start, end });
    } else {
       // Split
       const groupId = crypto.randomUUID();
       shifts.push({ ...base, id: crypto.randomUUID(), date, start, end: '24:00', shiftGroupId: groupId });
       const nextDate = DateUtils.addDays(new Date(date), 1);
       shifts.push({ ...base, id: crypto.randomUUID(), date: DateUtils.formatDate(nextDate), start: '00:00', end, shiftGroupId: groupId });
    }
    return shifts;
  }

  // --- Logic: Auto Distribute (Greedy) ---
  autoDistribute() {
    this.saveSnapshot();

    const daysToProcess: Date[] = [];
    const start = DateUtils.getStartOfWeek(this.currentDate());
    for (let i = 0; i < 7; i++) {
      daysToProcess.push(DateUtils.addDays(start, i));
    }

    const newShifts: Shift[] = [];
    const allStaff = this.staff();
    const requirements = this.requirements();
    const dailyMinimums = this.dailyRoleMinimums();
    const staffById = new Map(allStaff.map(member => [member.id, member]));
    const weekDateStrs = new Set(daysToProcess.map(d => DateUtils.formatDate(d)));
    const assignedDaysByStaff = new Map<string, Set<string>>();

    this.shifts().forEach(shift => {
      if (!weekDateStrs.has(shift.date)) return;
      if (!assignedDaysByStaff.has(shift.staffId)) {
        assignedDaysByStaff.set(shift.staffId, new Set());
      }
      assignedDaysByStaff.get(shift.staffId)!.add(shift.date);
    });

    const markAssigned = (staffId: string, dateStr: string) => {
      if (!assignedDaysByStaff.has(staffId)) {
        assignedDaysByStaff.set(staffId, new Set());
      }
      assignedDaysByStaff.get(staffId)!.add(dateStr);
    };

    const getWeeklyAssignedCount = (staffId: string) => {
      return assignedDaysByStaff.get(staffId)?.size ?? 0;
    };

    daysToProcess.forEach(day => {
       const dateStr = DateUtils.formatDate(day);

       // Filter shifts for this specific day to check coverage/overlaps        
       const dailyShifts = this.shifts().filter(s => s.date === dateStr);       

       const getAllShiftsForDay = () => [
         ...dailyShifts,
         ...newShifts.filter(s => s.date === dateStr)
       ];

       const getRoleCountForDay = (role: Role) => {
         const activeStaffIds = new Set<string>();
         getAllShiftsForDay().forEach(shift => {
           const member = staffById.get(shift.staffId);
           if (member && member.role === role) {
             activeStaffIds.add(shift.staffId);
           }
         });
         return activeStaffIds.size;
       };

       const getCandidatesForRole = (role: Role) => {
         const dayShifts = getAllShiftsForDay();
         return allStaff.filter(member => {
           if (member.role !== role) return false;
           const hasShiftToday = dayShifts.some(shift => shift.staffId === member.id);
           if (hasShiftToday) return false;
           return true;
         }).sort((a, b) => {
           const countDiff = getWeeklyAssignedCount(a.id) - getWeeklyAssignedCount(b.id);
           if (countDiff !== 0) return countDiff;
           return a.fullName.localeCompare(b.fullName);
         });
       };

       // 0. Ensure daily minimum per role (configurable)
       dailyMinimums.forEach(minimum => {
         const currentCount = getRoleCountForDay(minimum.role);
         if (currentCount >= minimum.minDaily) return;

         const needed = minimum.minDaily - currentCount;
         const candidates = getCandidatesForRole(minimum.role);

         for (let i = 0; i < candidates.length && i < needed; i++) {
           const cand = candidates[i];
           newShifts.push({
             id: crypto.randomUUID(),
             staffId: cand.id,
             date: dateStr,
             start: cand.standardShiftStart || '08:00',
             end: cand.standardShiftEnd || '16:00',
             type: 'standard',
             status: 'draft',
             source: 'auto'
           });
           markAssigned(cand.id, dateStr);
         }
       });

       requirements.forEach(req => {
          const reqStart = DateUtils.timeToMinutes(req.start);
          const reqEnd = DateUtils.timeToMinutes(req.end);
          const dayShifts = getAllShiftsForDay();

          // 1. Calculate current coverage for this requirement
          const activeCount = dayShifts.filter(s => {
             // Does this shift overlap with the requirement?
             const sStart = DateUtils.timeToMinutes(s.start);
             const sEnd = DateUtils.timeToMinutes(s.end);
             const overlap = Math.max(reqStart, sStart) < Math.min(reqEnd, sEnd);

             if (!overlap) return false;

             // Does the staff match the role?
             const member = staffById.get(s.staffId);
             return member && member.role === req.role;
          }).length;

          if (activeCount < req.minStaff) {
             const needed = req.minStaff - activeCount;
             let assigned = 0;

             // 2. Find Candidates: Correct Role + NO shift on this day (Strict "No Overlap" + "Empty Day" preference?)
             // User requirement: "asigne nada más a gente que no tenga un horario ya asignado ese día."

             const candidates = getCandidatesForRole(req.role);

             // Simple greedy assignment
             for (let i = 0; i < candidates.length && assigned < needed; i++) {
                const cand = candidates[i];
                newShifts.push({
                  id: crypto.randomUUID(),
                  staffId: cand.id,
                  date: dateStr,
                  start: req.start,
                  end: req.end,
                  type: 'standard',
                  status: 'draft',
                  source: 'auto'
                });
                assigned++;
                markAssigned(cand.id, dateStr);
             }
          }
       });
    });

    if (newShifts.length > 0) {
      this.shifts.update(curr => [...curr, ...newShifts]);
      alert(`Se han asignado ${newShifts.length} turnos automáticamente para cubrir huecos.`);
      return true;
    } else {
      alert('No se encontraron huecos cubribles con personal libre disponible.');
    }
    return false;
  }

  formatRole(role: string): string {
    const normalized = this.normalizeRole(role);
    return normalized.replace(/(^|[\s\/(\-])([a-záéíóúñ])/g, (_match, sep, chr) => `${sep}${chr.toUpperCase()}`);
  }

  private normalizeRole(role: string): Role {
    const cleaned = (role || '')
      .toLowerCase()
      .replace(/\\s+/g, ' ')
      .trim();
    return cleaned as Role;
  }

  private normalizeStoredRoles() {
    this.staff.update(current => current.map(member => ({
      ...member,
      role: this.normalizeRole(member.role)
    })));
    this.requirements.update(current => current.map(req => ({
      ...req,
      role: this.normalizeRole(req.role)
    })));
    this.dailyRoleMinimums.update(current => current.map(min => ({
      ...min,
      role: this.normalizeRole(min.role)
    })));
    this.filterRoles.update(current => current.map(role => this.normalizeRole(role)));
  }
}

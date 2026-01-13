import { Injectable, signal, computed, WritableSignal, Signal } from '@angular/core';
import { StaffMember, Shift, CoverageRequirement, Holiday, Role, ShiftStatus } from '../models/shift-planner.models';
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
  holidays: WritableSignal<Holiday[]> = signal(MOCK_DATA.holidays);

  // Undo/Redo Stacks (storing Shift[] snapshots)
  private undoStack: Shift[][] = [];
  private redoStack: Shift[][] = [];

  // Filters
  filterRoles: WritableSignal<Role[]> = signal([]);
  filterHomeOffice: WritableSignal<'all' | 'yes' | 'no'> = signal('all');
  filterSearch: WritableSignal<string> = signal('');
  filterStatus: WritableSignal<'all' | 'draft' | 'confirmed'> = signal('all');
  groupByRole: WritableSignal<boolean> = signal(true);

  constructor() {}

  // --- Computed Signals ---

  filteredStaff: Signal<StaffMember[]> = computed(() => {
    const allStaff = this.staff();
    const roles = this.filterRoles();
    const homeOffice = this.filterHomeOffice();
    const search = this.filterSearch().toLowerCase();

    return allStaff.filter(member => {
      if (roles.length > 0 && !roles.includes(member.role)) return false;
      if (homeOffice === 'yes' && !member.homeOffice) return false;
      if (homeOffice === 'no' && member.homeOffice) return false;
      if (search && !member.fullName.toLowerCase().includes(search)) return false;
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
    // Use filtered staff for "Visual Coverage"?
    // Usually coverage is global, but let's stick to "visible" coverage for now
    const staffIds = new Set(this.filteredStaff().map(s => s.id));

    // 288 buckets (5 mins) for granularity
    for (let i = 0; i < 288; i++) {
      const minutes = i * 5;
      const timeStr = DateUtils.minutesToTime(minutes);

      let count = 0;
      const roleCounts: Record<string, number> = {};

      shifts.forEach(shift => {
        if (!staffIds.has(shift.staffId)) return;
        const start = DateUtils.timeToMinutes(shift.start);
        const end = DateUtils.timeToMinutes(shift.end);

        if (minutes >= start && minutes < end) {
           const staff = this.staff().find(s => s.id === shift.staffId);
           if (staff) {
              count++;
              roleCounts[staff.role] = (roleCounts[staff.role] || 0) + 1;
           }
        }
      });
      buckets.push({ time: minutes, timeStr, count, roleCounts });
    }
    return buckets;
  });

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
       status: shift.status
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
            source: merged.source
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
    // 1. Identify Gaps based on Requirements vs Coverage
    // For prototype, let's just find random gaps in requirements and fill them
    const dateStr = DateUtils.formatDate(this.currentDate());
    const reqs = this.requirements();
    const currentShifts = this.shiftsForCurrentDate();
    const staff = this.staff(); // All staff (or filtered?) - usually all available

    // Simple Heuristic: For each requirement, check if minStaff is met.
    // If not, find a staff member of that role who is NOT working in that slot.

    const newShifts: Shift[] = [];

    reqs.forEach(req => {
       const reqStart = DateUtils.timeToMinutes(req.start);
       const reqEnd = DateUtils.timeToMinutes(req.end);

       // Check coverage roughly (middle of requirement)
       // A real algo would check every bucket. Simplified: check start.
       const workingCount = currentShifts.filter(s => {
          const sStart = DateUtils.timeToMinutes(s.start);
          const sEnd = DateUtils.timeToMinutes(s.end);
          // Overlap check
          const staffMember = staff.find(st => st.id === s.staffId);
          return staffMember?.role === req.role && Math.max(reqStart, sStart) < Math.min(reqEnd, sEnd);
       }).length;

       if (workingCount < req.minStaff) {
          const needed = req.minStaff - workingCount;

          // Find candidates
          const candidates = staff.filter(s => s.role === req.role && !currentShifts.some(shift => shift.staffId === s.id)); // Not working at all today (simplified)

          for (let i = 0; i < needed && i < candidates.length; i++) {
             const cand = candidates[i];
             // Create shift
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
          }
       }
    });

    if (newShifts.length > 0) {
      this.shifts.update(curr => [...curr, ...newShifts]);
      return true; // Changes made
    }
    return false;
  }
}

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

  // Filters
  filterRoles: WritableSignal<Role[]> = signal([]);
  filterHomeOffice: WritableSignal<'all' | 'yes' | 'no'> = signal('all');
  filterSearch: WritableSignal<string> = signal('');
  filterStatus: WritableSignal<'all' | 'draft' | 'confirmed'> = signal('all');
  groupByRole: WritableSignal<boolean> = signal(true);

  constructor() {}

  // Computed Signals

  // Filtered Staff
  filteredStaff: Signal<StaffMember[]> = computed(() => {
    const allStaff = this.staff();
    const roles = this.filterRoles();
    const homeOffice = this.filterHomeOffice();
    const search = this.filterSearch().toLowerCase();

    return allStaff.filter(member => {
      // Role filter
      if (roles.length > 0 && !roles.includes(member.role)) return false;

      // Home Office filter
      if (homeOffice === 'yes' && !member.homeOffice) return false;
      if (homeOffice === 'no' && member.homeOffice) return false;

      // Search filter
      if (search && !member.fullName.toLowerCase().includes(search)) return false;

      return true;
    });
  });

  // Shifts for current date
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

  // Coverage Calculation (5 min buckets)
  // Returns an array of 288 buckets (24h * 12 buckets/h)
  // Each bucket: { time: string, count: number, roles: Record<Role, number> }
  dailyCoverage: Signal<any[]> = computed(() => {
    const buckets = [];
    const shifts = this.shiftsForCurrentDate();
    const staffMap = new Map(this.staff().map(s => [s.id, s]));

    for (let i = 0; i < 288; i++) {
      const minutes = i * 5;
      const timeStr = DateUtils.minutesToTime(minutes);

      let count = 0;
      const roleCounts: Record<string, number> = {};

      shifts.forEach(shift => {
        const start = DateUtils.timeToMinutes(shift.start);
        const end = DateUtils.timeToMinutes(shift.end);
        // Standard check: start <= minutes < end
        // Special case: end is 24:00 (1440 mins) which is valid
        if (minutes >= start && minutes < end) {
           const staff = staffMap.get(shift.staffId);
           if (staff) {
             // Apply filters to coverage calculation? Usually coverage reflects reality regardless of view filters,
             // but if we want to see "coverage of filtered view", we check filteredStaff.
             // Requirement: "Capa de cobertura... desde los turnos reales filtrados"
             // But usually coverage helps identify gaps in the whole schedule.
             // Let's stick to showing coverage of *visible* people if that matches the prompt "derived from filtered".
             // Prompt says: "Cobertura... debería calcularse... desde los turnos reales filtrados".
             // Okay, I will check if staff is in filteredStaff.
             if (this.filteredStaff().find(s => s.id === staff.id)) {
                count++;
                roleCounts[staff.role] = (roleCounts[staff.role] || 0) + 1;
             }
           }
        }
      });

      buckets.push({ time: minutes, count, roleCounts });
    }
    return buckets;
  });

  // Requirements status
  requirementsStatus: Signal<any[]> = computed(() => {
    const reqs = this.requirements();
    const coverage = this.dailyCoverage();
    // Logic to check gaps
    // ... simplified for now
    return [];
  });

  // Actions
  setDate(date: Date) {
    this.currentDate.set(date);
  }

  setFilters(filters: any) {
    if (filters.roles) this.filterRoles.set(filters.roles);
    if (filters.homeOffice) this.filterHomeOffice.set(filters.homeOffice);
    if (filters.search !== undefined) this.filterSearch.set(filters.search);
    if (filters.status) this.filterStatus.set(filters.status);
  }

  addShift(shift: Shift) {
    this.shifts.update(current => [...current, shift]);
  }

  updateShift(updatedShift: Shift) {
    this.shifts.update(current => current.map(s => s.id === updatedShift.id ? updatedShift : s));
  }

  deleteShift(shiftId: string) {
    this.shifts.update(current => current.filter(s => s.id !== shiftId));
  }

  // Logic to handle midnight crossing
  // If a shift is 22:00 -> 02:00, it returns two shift objects
  normalizeShift(staffId: string, date: string, start: string, end: string): Shift[] {
    const startMins = DateUtils.timeToMinutes(start);
    const endMins = DateUtils.timeToMinutes(end);

    // Case 1: Normal shift (start < end)
    if (startMins < endMins) {
      return [{
        id: crypto.randomUUID(),
        staffId,
        date,
        start,
        end,
        status: 'draft',
        source: 'manual'
      }];
    }

    // Case 2: Crossing midnight (start > end) e.g. 22:00 -> 02:00
    // Split into:
    // 1. Date @ start -> 24:00
    // 2. Date+1 @ 00:00 -> end
    const groupId = crypto.randomUUID();
    const nextDate = DateUtils.addDays(new Date(date), 1);
    const nextDateStr = DateUtils.formatDate(nextDate);

    return [
      {
        id: crypto.randomUUID(),
        staffId,
        date,
        start,
        end: '24:00',
        status: 'draft',
        shiftGroupId: groupId,
        source: 'manual'
      },
      {
        id: crypto.randomUUID(),
        staffId,
        date: nextDateStr,
        start: '00:00',
        end,
        status: 'draft',
        shiftGroupId: groupId,
        source: 'manual'
      }
    ];
  }
}

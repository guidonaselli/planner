import { Component, inject, computed, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShiftService } from '../../services/shift.service';
import { DateUtils } from '../../utils/date-utils';
import { StaffMember, Shift } from '../../models/shift-planner.models';
import { ShiftEditDialogComponent } from '../shift-edit-dialog/shift-edit-dialog.component';
import { PersonDetailsDialogComponent } from '../person-details-dialog/person-details-dialog.component';
import { CoverageDetailsDialogComponent } from '../coverage-details-dialog/coverage-details-dialog.component';
import { RecurrenceConfig } from '../../models/recurrence.model';

@Component({
  selector: 'app-day-timeline-view',
  standalone: true,
  imports: [CommonModule, ShiftEditDialogComponent, PersonDetailsDialogComponent, CoverageDetailsDialogComponent],
  templateUrl: './day-timeline-view.component.html',
  styleUrls: ['./day-timeline-view.component.css']
})
export class DayTimelineViewComponent {
  shiftService = inject(ShiftService);

  // Hours (0-24)
  hours = Array.from({length: 25}, (_, i) => i);

  // Hover & DnD State
  hoverTime = signal<string | null>(null);
  hoverX = signal<number>(0);

  isDragging = signal(false);
  dragType = signal<'move' | 'resize-start' | 'resize-end' | null>(null);
  draggedShift = signal<Shift | null>(null);
  dragGhost = signal<{ left: number, width: number, start: string, end: string } | null>(null);

  dragStartX = 0;
  initialShiftStartMins = 0;
  initialShiftEndMins = 0;

  // Dialog State
  isDialogOpen = signal(false);
  selectedShift = signal<Shift | null>(null);
  isNewEntry = signal(false);

  // Person Details State
  isPersonDialogOpen = signal(false);
  selectedPerson = signal<StaffMember | null>(null);

  // Coverage Details State
  isCoverageDialogOpen = signal(false);
  coverageTime = signal('');
  coverageStaffList = signal<StaffMember[]>([]);
  coverageBreakdown = signal<{ role: string, count: number }[]>([]);

  // Group Collapse State
  collapsedGroups = signal<Set<string>>(new Set());

  toggleGroup(role: string) {
    this.collapsedGroups.update(set => {
      const newSet = new Set(set);
      if (newSet.has(role)) {
        newSet.delete(role);
      } else {
        newSet.add(role);
      }
      return newSet;
    });
  }

  isGroupCollapsed(role: string): boolean {
    return this.collapsedGroups().has(role);
  }

  groupedStaff = computed(() => {
    const staff = this.shiftService.filteredStaff();
    const groupBy = this.shiftService.groupByRole();

    if (!groupBy) {
      return [{ role: 'Todos', members: staff }];
    }

    const groups: Record<string, StaffMember[]> = {};
    const rolesOrder = [
      "coordinador",
      "supervisor",
      "lider tecnico/gerente",
      "supervisor instalador 1 (interno)",
      "supervisor instalador 2 (subcontratados)",
      "supervisor de campo",
      "tecnico instalador",
      "tecnico de calle",
      "encargado de laboratorio",
      "empleado de laboratorio",
      "soporte n1y n2",
      "soporte n3"
    ];

    staff.forEach(s => {
      if (!groups[s.role]) groups[s.role] = [];
      groups[s.role].push(s);
    });

    return rolesOrder
      .filter(role => groups[role] && groups[role].length > 0)
      .map(role => ({ role, members: groups[role] }));
  });

  shiftsMap = computed(() => {
    const shifts = this.shiftService.shiftsForCurrentDate();
    const map = new Map<string, Shift[]>();
    shifts.forEach(s => {
      if (!map.has(s.staffId)) map.set(s.staffId, []);
      map.get(s.staffId)?.push(s);
    });
    return map;
  });

  // --- Visuals ---
  getLaneStyle() {
    // Just a helper if we need dynamic lane widths
    return {};
  }

  getShiftStyle(shift: Shift) {
    const startMins = DateUtils.timeToMinutes(shift.start);
    const endMins = DateUtils.timeToMinutes(shift.end);
    // Support wrapping? For Day View, we assume clipped to 0-24 or split.
    // Normalized logic splits them.
    const duration = Math.max(endMins - startMins, 15); // Min 15m visual

    return {
      left: `${(startMins / 1440) * 100}%`,
      width: `${(duration / 1440) * 100}%`
    };
  }

  getGhostStyle() {
    const g = this.dragGhost();
    if (!g) return {};
    return {
      left: `${g.left}%`,
      width: `${g.width}%`
    };
  }

  // --- Mouse Events (Timeline) ---
  onTimelineMouseMove(event: MouseEvent) {
    // If dragging, handle drag logic globally or on container
    if (this.isDragging()) {
       this.handleDragMove(event);
       return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.min(Math.max(x / rect.width, 0), 1);

    const totalMinutes = percentage * 1440;
    this.hoverTime.set(DateUtils.minutesToTime(Math.floor(totalMinutes)));
    this.hoverX.set(percentage * 100);
  }

  onTimelineMouseLeave() {
    if (!this.isDragging()) {
      this.hoverTime.set(null);
    }
  }

  onLaneClick(event: MouseEvent, staffId: string) {
    // Prevent if clicking on a shift (handled by stopPropagation in shift)
    if (this.isDragging()) return;

    // Calculate time from click position
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.min(Math.max(x / rect.width, 0), 1);
    const totalMinutes = Math.floor(percentage * 1440);

    // Snap to 15m
    const snappedStart = Math.round(totalMinutes / 15) * 15;
    const snappedEnd = Math.min(snappedStart + 480, 1440); // Default 8h shift

    const newShift: Shift = {
      id: crypto.randomUUID(),
      staffId: staffId,
      date: DateUtils.formatDate(this.shiftService.currentDate()),
      start: DateUtils.minutesToTime(snappedStart),
      end: DateUtils.minutesToTime(snappedEnd),
      type: 'standard',
      status: 'draft',
      source: 'manual'
    };

    // Mark as new for dialog logic
    this.isNewEntry.set(true);
    this.openEditDialog(newShift, event);
  }

  getActiveStaffCountAtHover(): number {
    const time = this.hoverTime();
    if (!time) return 0;
    return this.getStaffAtTime(time).length;
  }

  getStaffAtTime(time: string): StaffMember[] {
    const mins = DateUtils.timeToMinutes(time);
    const shifts = this.shiftService.shiftsForCurrentDate();
    const staffMembers = this.shiftService.filteredStaff();
    const staffIds = new Set(staffMembers.map(s => s.id));

    const activeShiftStaffIds = new Set<string>();

    shifts.forEach(s => {
      if (!staffIds.has(s.staffId)) return;
      const start = DateUtils.timeToMinutes(s.start);
      const end = DateUtils.timeToMinutes(s.end);
      if (mins >= start && mins < end) {
         activeShiftStaffIds.add(s.staffId);
      }
    });

    return staffMembers.filter(s => activeShiftStaffIds.has(s.id));
  }

  getReducedActiveStaffString(): string {
     const staff = this.getStaffAtTime(this.hoverTime() || '00:00');
     if (staff.length === 0) return 'Sin personal activo';

     // Group by role for reduced view
     const roleCounts: Record<string, number> = {};
     staff.forEach(s => roleCounts[s.role] = (roleCounts[s.role] || 0) + 1);

     return Object.entries(roleCounts)
       .map(([role, count]) => `${count} ${this.shortenRole(role)}`)
       .join(', ');
  }

  getCoverageBucketTitle(time: string): string {
    const staff = this.getStaffAtTime(time);
    if (staff.length === 0) {
      return `${time}: Sin personal activo`;
    }

    const maxNames = 4;
    const names = staff.map(s => s.fullName);
    const visible = names.slice(0, maxNames).join(', ');
    const remaining = names.length - maxNames;
    const more = remaining > 0 ? ` +${remaining}` : '';

    return `${time}: ${visible}${more}`;
  }

  shortenRole(role: string): string {
    const map: Record<string, string> = {
      "coordinador": "Coord.",
      "supervisor": "Sup.",
      "lider tecnico/gerente": "Lider",
      "supervisor instalador 1 (interno)": "Sup. Inst 1",
      "supervisor instalador 2 (subcontratados)": "Sup. Inst 2",
      "supervisor de campo": "Sup. Campo",
      "tecnico instalador": "Tec. Inst",
      "tecnico de calle": "Tec. Calle",
      "encargado de laboratorio": "Enc. Lab",
      "empleado de laboratorio": "Emp. Lab",
      "soporte n1y n2": "Soporte N1/2",
      "soporte n3": "Soporte N3"
    };
    return map[role] || role;
  }

  openCoverageDetails(bucket: any) {
     this.coverageTime.set(bucket.timeStr);
     // Re-calculate details for this bucket time (bucket uses 5m, we can use bucket.timeStr)
     const staff = this.getStaffAtTime(bucket.timeStr);
     this.coverageStaffList.set(staff);

     const breakdown: { role: string, count: number }[] = [];
     if (bucket.roleCounts) {
        Object.entries(bucket.roleCounts).forEach(([role, count]) => {
           breakdown.push({ role, count: count as number });
        });
     }
     this.coverageBreakdown.set(breakdown);
     this.isCoverageDialogOpen.set(true);
  }

  closeCoverageDialog() {
    this.isCoverageDialogOpen.set(false);
  }

  // --- Drag & Drop ---
  startDrag(event: MouseEvent, shift: Shift, type: 'move' | 'resize-start' | 'resize-end') {
    event.stopPropagation();
    event.preventDefault(); // Prevent text selection

    this.isDragging.set(true);
    this.dragType.set(type);
    this.draggedShift.set(shift);
    this.dragStartX = event.clientX;
    this.initialShiftStartMins = DateUtils.timeToMinutes(shift.start);
    this.initialShiftEndMins = DateUtils.timeToMinutes(shift.end);

    // Init Ghost
    this.updateGhost(this.initialShiftStartMins, this.initialShiftEndMins);

    // Global listeners for move/up to catch leaving the lane
    window.addEventListener('mousemove', this.globalMouseMove);
    window.addEventListener('mouseup', this.globalMouseUp);
  }

  globalMouseMove = (event: MouseEvent) => {
    if (!this.isDragging()) return;
    this.handleDragMove(event);
  }

  globalMouseUp = (event: MouseEvent) => {
    if (!this.isDragging()) return;
    this.commitDrag();
    this.isDragging.set(false);
    this.draggedShift.set(null);
    this.dragGhost.set(null);
    window.removeEventListener('mousemove', this.globalMouseMove);
    window.removeEventListener('mouseup', this.globalMouseUp);
  }

  handleDragMove(event: MouseEvent) {
     // Calculate delta minutes
     // We need context of the container width to map px to minutes.
     // Approximation: assume window width or standard container.
     // Better: use stored px-to-min ratio.
     // For prototype: assume 1440 mins = window width - sidebar.
     // Let's assume 1px ~ X mins.
     // We need to know the lane width.
     const lane = document.querySelector('.timeline-lane');
     if (!lane) return;
     const rect = lane.getBoundingClientRect();
     const pxPerMin = rect.width / 1440;

     const deltaPx = event.clientX - this.dragStartX;
     const deltaMins = Math.round(deltaPx / pxPerMin / 15) * 15; // Snap to 15m

     let newStart = this.initialShiftStartMins;
     let newEnd = this.initialShiftEndMins;

     if (this.dragType() === 'move') {
       newStart += deltaMins;
       newEnd += deltaMins;
     } else if (this.dragType() === 'resize-start') {
       newStart += deltaMins;
     } else if (this.dragType() === 'resize-end') {
       newEnd += deltaMins;
     }

     // Constraints
     if (newStart < 0) newStart = 0;
     if (newEnd > 1440) newEnd = 1440;
     if (newEnd <= newStart + 15) { // Min duration
        if (this.dragType() === 'resize-start') newStart = newEnd - 15;
        else newEnd = newStart + 15;
     }

     this.updateGhost(newStart, newEnd);
  }

  updateGhost(startMins: number, endMins: number) {
     this.dragGhost.set({
       left: (startMins / 1440) * 100,
       width: ((endMins - startMins) / 1440) * 100,
       start: DateUtils.minutesToTime(startMins),
       end: DateUtils.minutesToTime(endMins)
     });
  }

  commitDrag() {
    const s = this.draggedShift();
    const g = this.dragGhost();
    if (s && g) {
      // Logic: Update shift in service
      // Warning: conflict checking should happen here
      this.shiftService.updateShift({
        id: s.id,
        start: g.start,
        end: g.end,
        status: 'draft' // Changed to draft
      });
    }
  }

  // --- Dialog Integration ---
  openEditDialog(shift: Shift, event: MouseEvent) {
    if (this.isDragging()) return; // Don't open if dragging just finished
    event.stopPropagation();

    // Check if we didn't set isNewEntry explicitly (e.g. from existing shift click)
    const exists = this.shiftService.shifts().some(s => s.id === shift.id);
    if (exists) {
       this.isNewEntry.set(false);
    }

    this.selectedShift.set(shift);
    this.isDialogOpen.set(true);
  }

  closeDialog() {
    this.isDialogOpen.set(false);
    this.selectedShift.set(null);
    this.isNewEntry.set(false);
  }

  saveShift(eventData: { shift: Partial<Shift>, recurrence?: RecurrenceConfig }) {
    const { shift: data, recurrence } = eventData;
    const current = this.selectedShift();
    if (current) {
      // Check if this is a new shift (not in store)
      const exists = this.shiftService.shifts().some(s => s.id === current.id);

      if (exists) {
        this.shiftService.updateShift({ id: current.id, ...data });
      } else {
        // Create new
        const newShift = { ...current, ...data } as Shift;

        // Handle Recurrence
        if (recurrence && recurrence.active) {
            this.handleRecurrence(newShift, recurrence);
        } else {
            this.shiftService.addShift(newShift);
        }
      }
    }
    this.closeDialog();
  }

  handleRecurrence(baseShift: Shift, config: RecurrenceConfig) {
      const currentWeekStart = DateUtils.getStartOfWeek(this.shiftService.currentDate());
      const shiftsToAdd: Shift[] = [];
      const recurrenceGroupId = crypto.randomUUID();
      const maxWeeks = Math.max(1, config.weeks || 1);
      const untilDate = config.untilDate ? new Date(config.untilDate) : null;

      let weekOffset = 0;
      let keepGoing = true;

      while (keepGoing) {
         const weekStart = DateUtils.addDays(currentWeekStart, weekOffset * 7);

         for (let i = 0; i < 7; i++) {
            const dayDate = DateUtils.addDays(weekStart, i);
            if (untilDate && dayDate > untilDate) {
               keepGoing = false;
               break;
            }

            const dayIndex = dayDate.getDay();
            let shouldAdd = false;
            if (config.mode === 'week') {
               shouldAdd = true;
            } else {
               shouldAdd = config.days[dayIndex];
            }

            if (shouldAdd) {
               shiftsToAdd.push({
                  ...baseShift,
                  id: crypto.randomUUID(),
                  date: DateUtils.formatDate(dayDate),
                  status: 'draft',
                  recurrenceGroupId
               });
            }
         }

         weekOffset++;
         if (!untilDate && weekOffset >= maxWeeks) {
            keepGoing = false;
         }
      }

      shiftsToAdd.forEach(s => this.shiftService.addShift(s));
  }

  deleteShift(eventData: { id: string, scope: 'single' | 'series' | 'futureWeekday' }) {
    if (eventData.scope === 'series') {
      this.shiftService.deleteShiftSeries(eventData.id);
    } else if (eventData.scope === 'futureWeekday') {
      this.shiftService.deleteShiftSeriesFrom(eventData.id, 'weekday');
    } else {
      this.shiftService.deleteShift(eventData.id);
    }
    this.closeDialog();
  }

  openPersonDetails(staff: StaffMember) {
    this.selectedPerson.set(staff);
    this.isPersonDialogOpen.set(true);
  }

  closePersonDialog() {
    this.isPersonDialogOpen.set(false);
    this.selectedPerson.set(null);
  }
}

import { Component, inject, computed, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShiftService } from '../../services/shift.service';
import { DateUtils } from '../../utils/date-utils';
import { StaffMember, Shift } from '../../models/shift-planner.models';
import { ShiftEditDialogComponent } from '../shift-edit-dialog/shift-edit-dialog.component';

@Component({
  selector: 'app-day-timeline-view',
  standalone: true,
  imports: [CommonModule, ShiftEditDialogComponent],
  templateUrl: './day-timeline-view.component.html',
  styleUrls: ['./day-timeline-view.component.css']
})
export class DayTimelineViewComponent {
  shiftService = inject(ShiftService);

  // Hours (0-24)
  hours = Array.from({length: 25}, (_, i) => i);
  // Grid columns: 24h * 4 (15min) = 96 slots
  // But strictly, visual grid lines usually at hours.

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

  groupedStaff = computed(() => {
    const staff = this.shiftService.filteredStaff();
    const groupBy = this.shiftService.groupByRole();

    if (!groupBy) {
      return [{ role: 'Todos', members: staff }];
    }

    const groups: Record<string, StaffMember[]> = {};
    const rolesOrder = [
      "Coordinador de técnicos",
      "Técnico de campo",
      "Técnico laboratorio",
      "Operario monitoreo",
      "Supervisor monitoreo"
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

  getActiveStaffCountAtHover(): number {
    const time = this.hoverTime();
    if (!time) return 0;
    const mins = DateUtils.timeToMinutes(time);
    const shifts = this.shiftService.shiftsForCurrentDate();
    const staffIds = new Set(this.shiftService.filteredStaff().map(s => s.id));

    return shifts.filter(s => {
      if (!staffIds.has(s.staffId)) return false;
      const start = DateUtils.timeToMinutes(s.start);
      const end = DateUtils.timeToMinutes(s.end);
      return mins >= start && mins < end;
    }).length;
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
    this.selectedShift.set(shift);
    this.isDialogOpen.set(true);
  }

  closeDialog() {
    this.isDialogOpen.set(false);
    this.selectedShift.set(null);
  }

  saveShift(data: Partial<Shift>) {
    const current = this.selectedShift();
    if (current) {
      this.shiftService.updateShift({ id: current.id, ...data });
    }
    this.closeDialog();
  }

  deleteShift(id: string) {
    this.shiftService.deleteShift(id);
    this.closeDialog();
  }
}

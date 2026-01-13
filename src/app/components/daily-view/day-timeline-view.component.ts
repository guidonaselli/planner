import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShiftService } from '../../services/shift.service';
import { DateUtils } from '../../utils/date-utils';
import { StaffMember, Shift } from '../../models/shift-planner.models';

@Component({
  selector: 'app-day-timeline-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './day-timeline-view.component.html',
  styleUrls: ['./day-timeline-view.component.css']
})
export class DayTimelineViewComponent {
  shiftService = inject(ShiftService);

  // Hours for timeline ruler (0-24)
  hours = Array.from({length: 25}, (_, i) => i);

  // Hover state
  hoverTime = signal<string | null>(null);
  hoverX = signal<number>(0);

  // Grouped Staff Logic
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

  // Shifts Map for easy lookup in template
  shiftsMap = computed(() => {
    const shifts = this.shiftService.shiftsForCurrentDate();
    const map = new Map<string, Shift[]>();
    shifts.forEach(s => {
      if (!map.has(s.staffId)) map.set(s.staffId, []);
      map.get(s.staffId)?.push(s);
    });
    return map;
  });

  // Methods
  getShiftStyle(shift: Shift) {
    const startMins = DateUtils.timeToMinutes(shift.start);
    const endMins = DateUtils.timeToMinutes(shift.end);
    let duration = endMins - startMins;

    // Handle midnight crossing display logic (though backend splits them,
    // sometimes visual glue is needed if we didn't split them)
    // Here we assume shifts are strictly within 0-24h for the day view as per "split" requirement.

    const left = (startMins / 1440) * 100;
    const width = (duration / 1440) * 100;

    return {
      left: `${left}%`,
      width: `${width}%`
    };
  }

  onTimelineMouseMove(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.min(Math.max(x / rect.width, 0), 1);

    const totalMinutes = percentage * 1440;
    this.hoverTime.set(DateUtils.minutesToTime(Math.floor(totalMinutes)));
    this.hoverX.set(percentage * 100);
  }

  onTimelineMouseLeave() {
    this.hoverTime.set(null);
  }

  getActiveStaffCountAtHover(): number {
    const time = this.hoverTime();
    if (!time) return 0;
    const mins = DateUtils.timeToMinutes(time);
    const shifts = this.shiftService.shiftsForCurrentDate();
    // Filter by filtered staff
    const staffIds = new Set(this.shiftService.filteredStaff().map(s => s.id));

    return shifts.filter(s => {
      if (!staffIds.has(s.staffId)) return false;
      const start = DateUtils.timeToMinutes(s.start);
      const end = DateUtils.timeToMinutes(s.end);
      return mins >= start && mins < end;
    }).length;
  }
}

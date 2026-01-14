import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShiftService } from '../../services/shift.service';
import { DateUtils } from '../../utils/date-utils';
import { StaffMember, Shift } from '../../models/shift-planner.models';
import { RecurrenceConfig } from '../../models/recurrence.model';
import { ShiftEditDialogComponent } from '../shift-edit-dialog/shift-edit-dialog.component';
import { PersonDetailsDialogComponent } from '../person-details-dialog/person-details-dialog.component';

@Component({
  selector: 'app-week-view',
  standalone: true,
  imports: [CommonModule, ShiftEditDialogComponent, PersonDetailsDialogComponent],
  templateUrl: './week-view.component.html',
  styleUrls: ['./week-view.component.css']
})
export class WeekViewComponent {
  shiftService = inject(ShiftService);

  // Dialog State
  isDialogOpen = signal(false);
  selectedShift = signal<Shift | null>(null);
  isNewEntry = signal(false);

  // Person Details State
  isPersonDialogOpen = signal(false);
  selectedPerson = signal<StaffMember | null>(null);

  // Week Days Logic
  weekDays = computed(() => {
    const current = this.shiftService.currentDate();
    const start = DateUtils.getStartOfWeek(current); // Assuming generic start of week
    // Adjust to Monday start if needed. getStartOfWeek usually returns Sunday or Monday depending on locale.
    // Let's force Monday start for ISO.
    // My Utils might be returning Sunday.
    // Let's re-implement strictly here or assume Utils is correct.
    const days = [];
    let d = new Date(start);
    // If start is Sunday and we want Monday, we might need to adjust.
    // The previous utils: diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    // So it returns Monday.

    for (let i = 0; i < 7; i++) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  });

  // Data for the grid
  gridData = computed(() => {
    const staff = this.shiftService.filteredStaff();
    const shifts = this.shiftService.shifts(); // Need all shifts to find across week

    // Pre-process shifts into a map: staffId -> dateStr -> Shift[]
    const shiftMap = new Map<string, Map<string, Shift[]>>();

    shifts.forEach(s => {
      if (!shiftMap.has(s.staffId)) shiftMap.set(s.staffId, new Map());
      const dates = shiftMap.get(s.staffId)!;
      if (!dates.has(s.date)) dates.set(s.date, []);
      dates.get(s.date)!.push(s);
    });

    return staff.map(member => {
      return {
        member,
        days: this.weekDays().map(day => {
          const dateStr = DateUtils.formatDate(day);
          const dailyShifts = shiftMap.get(member.id)?.get(dateStr) || [];
          return {
            date: day,
            dateStr,
            shifts: dailyShifts
          };
        })
      };
    });
  });

  getDayName(date: Date): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  }

  isHoliday(date: Date): boolean {
    const dateStr = DateUtils.formatDate(date);
    return this.shiftService.holidays().some(h => h.date === dateStr);
  }

  getDailyWarningCount(date: Date): number {
    return this.shiftService.getDailyWarningCount(DateUtils.formatDate(date));
  }

  // --- Interaction ---
  onCellClick(date: Date, staffId: string) {
    const newShift: Shift = {
      id: crypto.randomUUID(),
      staffId: staffId,
      date: DateUtils.formatDate(date),
      start: '08:00',
      end: '16:00',
      type: 'standard',
      status: 'draft',
      source: 'manual'
    };
    this.isNewEntry.set(true);
    this.selectedShift.set(newShift);
    this.isDialogOpen.set(true);
  }

  onShiftClick(event: MouseEvent, shift: Shift) {
    event.stopPropagation();
    this.isNewEntry.set(false);
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
      const exists = this.shiftService.shifts().some(s => s.id === current.id);
      if (exists) {
        this.shiftService.updateShift({ id: current.id, ...data });
      } else {
        const newShift = { ...current, ...data } as Shift;
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

  // --- Person Details ---
  openPersonDetails(staff: StaffMember) {
    this.selectedPerson.set(staff);
    this.isPersonDialogOpen.set(true);
  }

  closePersonDialog() {
    this.isPersonDialogOpen.set(false);
    this.selectedPerson.set(null);
  }

  // --- Drag & Drop (HTML5 API) ---

  onDragStart(event: DragEvent, shift: Shift) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', JSON.stringify(shift));
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault(); // Allow drop
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, targetDate: Date, targetStaffId: string) {
    event.preventDefault();
    if (event.dataTransfer) {
      const data = event.dataTransfer.getData('text/plain');
      if (data) {
        const sourceShift = JSON.parse(data) as Shift;
        // Check if moving to different day/person
        const targetDateStr = DateUtils.formatDate(targetDate);

        if (sourceShift.staffId !== targetStaffId || sourceShift.date !== targetDateStr) {
           this.shiftService.updateShift({
             id: sourceShift.id,
             staffId: targetStaffId,
             date: targetDateStr,
             status: 'draft'
           });
        }
      }
    }
  }
}

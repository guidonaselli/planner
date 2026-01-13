import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShiftService } from '../../services/shift.service';
import { DateUtils } from '../../utils/date-utils';
import { StaffMember, Shift } from '../../models/shift-planner.models';

@Component({
  selector: 'app-week-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './week-view.component.html',
  styleUrls: ['./week-view.component.css']
})
export class WeekViewComponent {
  shiftService = inject(ShiftService);

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
}

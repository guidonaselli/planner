import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';
import { DateUtils } from '../../utils/date-utils';

@Component({
  selector: 'app-filters-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filters-bar">
      <!-- Date Selector -->
      <div class="filter-group date-selector">
        <button (click)="prevDate()" class="icon-btn">
          <span class="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div class="date-display">
          <span class="material-symbols-outlined icon-primary">calendar_today</span>
          <span class="date-text">{{ formattedDate() }}</span>
        </div>
        <button (click)="nextDate()" class="icon-btn">
          <span class="material-symbols-outlined">arrow_forward_ios</span>
        </button>
      </div>

      <!-- Role Filter -->
      <div class="filter-group role-selector">
        <select
          [ngModel]="shiftService.filterRoles()"
          (ngModelChange)="updateRoles($event)"
          multiple
          class="role-select">
          <option value="Coordinador de técnicos">Coordinador de técnicos</option>
          <option value="Técnico de campo">Técnico de campo</option>
          <option value="Técnico laboratorio">Técnico laboratorio</option>
          <option value="Operario monitoreo">Operario monitoreo</option>
          <option value="Supervisor monitoreo">Supervisor monitoreo</option>
        </select>
        <div class="select-icon">
          <span class="material-symbols-outlined">expand_more</span>
        </div>
        <!-- Custom Label Overlay -->
        <div class="select-label" *ngIf="shiftService.filterRoles().length > 0">
           {{ shiftService.filterRoles().length }} roles selected
        </div>
         <div class="select-label placeholder" *ngIf="shiftService.filterRoles().length === 0">
           Filtrar por Rol...
        </div>
      </div>

      <!-- Home Office Toggle -->
      <div class="filter-group toggle-group">
        <button
           (click)="shiftService.filterHomeOffice.set('all')"
           [class.active]="shiftService.filterHomeOffice() === 'all'"
           class="toggle-btn">All</button>
        <button
           (click)="shiftService.filterHomeOffice.set('yes')"
           [class.active]="shiftService.filterHomeOffice() === 'yes'"
           class="toggle-btn">HO Only</button>
        <button
           (click)="shiftService.filterHomeOffice.set('no')"
           [class.active]="shiftService.filterHomeOffice() === 'no'"
           class="toggle-btn">Office</button>
      </div>

      <!-- Search -->
      <div class="filter-group search-box">
        <div class="search-icon">
          <span class="material-symbols-outlined">search</span>
        </div>
        <input
          [ngModel]="shiftService.filterSearch()"
          (ngModelChange)="shiftService.filterSearch.set($event)"
          class="search-input"
          placeholder="Buscar persona..."
          type="text"/>
      </div>

      <!-- Group Toggle -->
       <div class="group-toggle-container">
         <span class="toggle-label">Agrupar Roles</span>
         <button
           (click)="toggleGroupByRole()"
           [class.active]="shiftService.groupByRole()"
           class="switch-btn">
            <div class="switch-handle"></div>
         </button>
       </div>
    </div>
  `,
  styles: [`
    .filters-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      width: 100%;
    }

    .filter-group {
      display: flex;
      align-items: center;
      background-color: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      height: 40px;
    }

    /* Date Selector */
    .date-selector {
      padding: 2px;
    }
    .icon-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: var(--text-secondary);
      border-radius: 4px;
      cursor: pointer;
    }
    .icon-btn:hover {
      background-color: var(--bg-surface-hover);
      color: var(--text-primary);
    }
    .date-display {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      border-left: 1px solid var(--border-color);
      border-right: 1px solid var(--border-color);
      height: 24px;
    }
    .icon-primary {
      color: var(--primary);
      font-size: 18px;
    }
    .date-text {
      font-size: 0.875rem;
      font-weight: 600;
      white-space: nowrap;
    }

    /* Role Selector */
    .role-selector {
      position: relative;
      min-width: 220px;
      background-color: var(--bg-surface);
    }
    .role-select {
      width: 100%;
      height: 100%;
      background: none;
      border: none;
      padding: 0 12px;
      opacity: 0; /* hidden but clickable */
      cursor: pointer;
      position: absolute;
      z-index: 2;
    }
    .select-icon {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      pointer-events: none;
    }
    .select-label {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.875rem;
      color: var(--text-primary);
      pointer-events: none;
      width: calc(100% - 30px);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .select-label.placeholder {
      color: var(--text-secondary);
    }

    /* Toggle Group */
    .toggle-group {
      padding: 2px;
    }
    .toggle-btn {
      background: none;
      border: none;
      padding: 0 12px;
      height: 100%;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
    }
    .toggle-btn:hover {
      color: var(--text-primary);
    }
    .toggle-btn.active {
      background-color: var(--bg-surface-hover);
      color: var(--primary);
      font-weight: 600;
    }

    /* Search Box */
    .search-box {
      flex: 1;
      max-width: 400px;
      position: relative;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
    }
    .search-input {
      width: 100%;
      height: 100%;
      border: none;
      background: none;
      padding-left: 40px;
      padding-right: 12px;
      font-size: 0.875rem;
      color: var(--text-primary);
    }
    .search-input:focus {
      outline: none;
    }
    .search-input::placeholder {
      color: var(--text-secondary);
    }

    /* Switch */
    .group-toggle-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toggle-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    .switch-btn {
      width: 40px;
      height: 24px;
      background-color: var(--border-color);
      border-radius: 12px;
      border: none;
      position: relative;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .switch-btn.active {
      background-color: var(--primary);
    }
    .switch-handle {
      width: 18px;
      height: 18px;
      background-color: white;
      border-radius: 50%;
      position: absolute;
      top: 3px;
      left: 3px;
      transition: transform 0.2s;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .switch-btn.active .switch-handle {
      transform: translateX(16px);
    }
  `]
})
export class FiltersBarComponent {
  shiftService = inject(ShiftService);

  formattedDate() {
    return DateUtils.formatDate(this.shiftService.currentDate());
  }

  prevDate() {
    const newDate = DateUtils.addDays(this.shiftService.currentDate(), -1);
    this.shiftService.setDate(newDate);
  }

  nextDate() {
    const newDate = DateUtils.addDays(this.shiftService.currentDate(), 1);
    this.shiftService.setDate(newDate);
  }

  updateRoles(val: any) {
    this.shiftService.filterRoles.set(val);
  }

  toggleGroupByRole() {
    this.shiftService.groupByRole.update(v => !v);
  }
}

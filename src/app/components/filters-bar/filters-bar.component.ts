import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';
import { DateUtils } from '../../utils/date-utils';
import { Role } from '../../models/shift-planner.models';

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
          <!-- Date Input hidden but clickable via label/trigger -->
          <!-- Using showPicker() on click to ensure it opens on modern browsers -->
          <input
            #dateInput
            type="date"
            [ngModel]="dateInputValue()"
            (ngModelChange)="onDateChange($event)"
            class="date-input-hidden"
            id="date-picker-trigger">
          <label
            (click)="dateInput.showPicker()"
            for="date-picker-trigger"
            class="date-text cursor-pointer">
            {{ formattedDate() }}
          </label>
        </div>
        <button (click)="nextDate()" class="icon-btn">
          <span class="material-symbols-outlined">arrow_forward_ios</span>
        </button>
      </div>

      <!-- Role Filter (Custom Dropdown) -->
      <div class="filter-group role-selector">
        <div class="role-trigger" (click)="toggleRoleDropdown()">
           <div class="select-label" *ngIf="shiftService.filterRoles().length > 0">
              {{ shiftService.filterRoles().length }} seleccionados
           </div>
           <div class="select-label placeholder" *ngIf="shiftService.filterRoles().length === 0">
              Filtrar por Rol...
           </div>
           <span class="material-symbols-outlined select-icon">expand_more</span>
        </div>

        @if (isRoleDropdownOpen()) {
          <div class="role-dropdown-menu">
            <div class="role-option" *ngFor="let role of availableRoles" (click)="toggleRole(role)">
               <input type="checkbox" [checked]="shiftService.filterRoles().includes(role)" (click)="$event.stopPropagation(); toggleRole(role)">
               <span>{{ role }}</span>
            </div>
          </div>
          <!-- Backdrop to close -->
          <div class="fixed-backdrop" (click)="closeRoleDropdown()"></div>
        }
      </div>

      <!-- Home Office Toggle -->
      <div class="filter-group toggle-group">
        <button
           (click)="shiftService.filterHomeOffice.set('all')"
           [class.active]="shiftService.filterHomeOffice() === 'all'"
           class="toggle-btn">Todos</button>
        <button
           (click)="shiftService.filterHomeOffice.set('yes')"
           [class.active]="shiftService.filterHomeOffice() === 'yes'"
           class="toggle-btn">Solo HO</button>
        <button
           (click)="shiftService.filterHomeOffice.set('no')"
           [class.active]="shiftService.filterHomeOffice() === 'no'"
           class="toggle-btn">Oficina</button>
      </div>

      <!-- Active Now Filter -->
      <button
         (click)="toggleActiveNow()"
         [class.active]="shiftService.filterActiveNow()"
         class="icon-btn-toggle"
         title="Activos ahora">
         <span class="material-symbols-outlined">schedule</span>
      </button>

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
      position: relative;
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
      position: relative;
    }
    .icon-primary {
      color: var(--primary);
      font-size: 18px;
    }
    .date-text {
      font-size: 0.875rem;
      font-weight: 600;
      white-space: nowrap;
      user-select: none;
    }
    .date-input-hidden {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      opacity: 0;
      cursor: pointer;
      z-index: 10;
    }

    /* Role Selector */
    .role-selector {
      min-width: 220px;
      cursor: pointer;
    }
    .role-trigger {
      width: 100%; height: 100%;
      display: flex; align-items: center;
      padding: 0 12px;
    }
    .select-icon {
      margin-left: auto;
      color: var(--text-secondary);
    }
    .select-label {
      font-size: 0.875rem;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-right: 8px;
    }
    .select-label.placeholder {
      color: var(--text-secondary);
    }
    .role-dropdown-menu {
      position: absolute;
      top: 100%; left: 0; width: 100%;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin-top: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 100;
      max-height: 300px;
      overflow-y: auto;
      padding: 4px;
    }
    .role-option {
      display: flex; align-items: center; gap: 8px;
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-primary);
    }
    .role-option:hover {
      background-color: var(--bg-surface-hover);
    }
    .fixed-backdrop {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 99;
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

  isRoleDropdownOpen = signal(false);
  availableRoles: Role[] = [
    "Coordinador de técnicos",
    "Técnico de campo",
    "Técnico laboratorio",
    "Operario monitoreo",
    "Supervisor monitoreo"
  ];

  formattedDate() {
    const d = this.shiftService.currentDate();
    // Manual formatting for Spanish short date: "DD/MM/YYYY" or "15 Ene 2026"
    // Intl is better
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  }

  dateInputValue() {
    return DateUtils.formatDate(this.shiftService.currentDate());
  }

  onDateChange(val: string) {
    if (val) {
      // Input date value is YYYY-MM-DD
      const [y, m, d] = val.split('-').map(Number);
      this.shiftService.setDate(new Date(y, m - 1, d));
    }
  }

  prevDate() {
    const newDate = DateUtils.addDays(this.shiftService.currentDate(), -1);
    this.shiftService.setDate(newDate);
  }

  nextDate() {
    const newDate = DateUtils.addDays(this.shiftService.currentDate(), 1);
    this.shiftService.setDate(newDate);
  }

  toggleGroupByRole() {
    this.shiftService.groupByRole.update(v => !v);
  }

  // Custom Role Dropdown Logic
  toggleRoleDropdown() {
    this.isRoleDropdownOpen.update(v => !v);
  }

  closeRoleDropdown() {
    this.isRoleDropdownOpen.set(false);
  }

  toggleRole(role: Role) {
    const current = this.shiftService.filterRoles();
    if (current.includes(role)) {
      this.shiftService.filterRoles.set(current.filter(r => r !== role));
    } else {
      this.shiftService.filterRoles.set([...current, role]);
    }
  }

  toggleActiveNow() {
    this.shiftService.filterActiveNow.update(v => !v);
  }
}

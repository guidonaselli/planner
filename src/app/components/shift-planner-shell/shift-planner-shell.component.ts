import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShiftService } from '../../services/shift.service';
import { FiltersBarComponent } from '../filters-bar/filters-bar.component';
import { DayTimelineViewComponent } from '../daily-view/day-timeline-view.component';
import { WeekViewComponent } from '../weekly-view/week-view.component';

@Component({
  selector: 'app-shift-planner-shell',
  standalone: true,
  imports: [CommonModule, FiltersBarComponent, DayTimelineViewComponent, WeekViewComponent],
  template: `
    <div class="shell-container">
      <!-- Top Navigation / Header -->
      <header class="app-header">
        <div class="header-top">
          <div class="title-section">
            <h1 class="app-title">Shift Planner</h1>
            <p class="app-subtitle">
              {{ shiftService.viewMode() === 'day' ? 'Vista Diaria - Timeline' : 'Vista Semanal - Grid' }}
            </p>
          </div>

          <div class="actions-section">
            <!-- View Toggles -->
            <div class="view-toggle">
              <button
                (click)="shiftService.viewMode.set('day')"
                [class.active]="shiftService.viewMode() === 'day'">
                Día
              </button>
              <button
                (click)="shiftService.viewMode.set('week')"
                [class.active]="shiftService.viewMode() === 'week'">
                Semana
              </button>
            </div>

            <!-- Draft Status -->
            <div class="draft-badge">
               <span class="dot"></span>
               <span>Draft Mode</span>
            </div>

            <!-- Actions -->
            <div class="action-buttons">
               <button class="btn-text">Descartar</button>
               <button class="btn-primary">Publicar Cambios</button>
            </div>
          </div>
        </div>

        <!-- Filters Bar Component -->
        <app-filters-bar class="filters-container"></app-filters-bar>
      </header>

      <!-- Main Content -->
      <main class="main-content">
        @if (shiftService.viewMode() === 'day') {
          <app-day-timeline-view></app-day-timeline-view>
        } @else {
          <app-week-view></app-week-view>
        }
      </main>
    </div>
  `,
  styles: [`
    .shell-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      background-color: var(--bg-app);
      overflow: hidden;
    }

    .app-header {
      display: flex;
      flex-direction: column;
      background-color: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      z-index: 30;
      flex-shrink: 0;
    }

    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
    }

    .title-section {
      display: flex;
      flex-direction: column;
    }

    .app-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
      color: var(--text-primary);
    }

    .app-subtitle {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin: 4px 0 0 0;
    }

    .actions-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .view-toggle {
      display: flex;
      background-color: var(--bg-surface-hover);
      border-radius: 6px;
      padding: 4px;
      border: 1px solid var(--border-color);
    }

    .view-toggle button {
      border: none;
      background: none;
      padding: 6px 12px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .view-toggle button.active {
      background-color: var(--bg-surface);
      color: var(--primary);
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      font-weight: 600;
    }

    .draft-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 4px;
      background-color: var(--warning-bg);
      border: 1px solid var(--warning-border);
      color: var(--warning-text); /* usually darker amber */
      font-size: 0.75rem;
      font-weight: 600;
      color: #b45309; /* amber-700 */
    }

    .draft-badge .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #f59e0b;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    .btn-text {
      background: none;
      border: none;
      padding: 8px 16px;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
    }
    .btn-text:hover {
      color: var(--text-primary);
    }

    .btn-primary {
      background-color: var(--primary);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(19, 91, 236, 0.2);
    }
    .btn-primary:hover {
      background-color: var(--primary-hover);
    }

    .filters-container {
      padding: 0 24px 16px 24px;
    }

    .main-content {
      flex: 1;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class ShiftPlannerShellComponent {
  shiftService = inject(ShiftService);
}

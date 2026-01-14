import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StaffMember } from '../../models/shift-planner.models';
import { ShiftService } from '../../services/shift.service';

@Component({
  selector: 'app-coverage-details-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
    <div class="modal-overlay" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h3>Detalle de Cobertura</h3>
          <button class="close-btn" (click)="close()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <div class="modal-body">
          <div class="time-header">
            <span class="material-symbols-outlined">schedule</span>
            <span class="time-label">{{ time }}</span>
            <span class="status-pill"
              [class.is-danger]="staffList.length === 0"
              [class.is-warning]="staffList.length > 0 && warnings.length > 0"
              [class.is-ok]="staffList.length > 0 && warnings.length === 0">
              {{ staffList.length === 0 ? 'Sin cobertura' : (warnings.length > 0 ? 'Cobertura parcial' : 'Cobertura OK') }}
            </span>
          </div>

          <div class="stats-summary">
             <div class="stat-box">
                <span class="stat-value">{{ staffList.length }}</span>
                <span class="stat-label">Total Activos</span>
             </div>
          </div>

          <div class="role-breakdown">
            <h4>Desglose por Rol</h4>
            <div *ngFor="let item of roleBreakdown" class="role-row">
               <span class="role-name">{{ item.role }}</span>
               <span class="role-count">{{ item.count }}</span>
            </div>
          </div>

          <div class="staff-list-section">
             <h4>Personal Activo</h4>
             <ul class="staff-list">
               <li *ngFor="let s of staffList" class="staff-item">
                 <div class="avatar-sm">{{ s.fullName.charAt(0) }}</div>
                 <div class="staff-info">
                   <span class="staff-name">{{ s.fullName }}</span>
                   <span class="staff-role">{{ s.role }}</span>
                 </div>
               </li>
               <li *ngIf="staffList.length === 0" class="empty-state">
                  No hay personal activo en este horario.
               </li>
             </ul>
          </div>

          @if(warnings.length > 0) {
            <div class="warnings-card">
              <h4>Advertencias</h4>
              <ul>
                @for(item of warnings; track item.role) {
                  <li>Se requieren {{ item.required }} {{ item.role }} entre {{ item.start }}-{{ item.end }} (actual: {{ item.current }})</li>
                }
              </ul>
            </div>
          }

        </div>

        <footer class="modal-footer">
          <button class="btn-secondary" (click)="close()">Cerrar</button>
        </footer>
      </div>
    </div>
    }
  `,
  styles: [`
    @keyframes fadeIn {
       from { opacity: 0; }
       to { opacity: 1; }
    }
    @keyframes slideUp {
       from { opacity: 0; transform: translateY(20px); }
       to { opacity: 1; transform: translateY(0); }
    }

    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.5); z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.2s ease-out;
      backdrop-filter: blur(2px);
    }
    .modal-content {
      background: var(--bg-surface);
      width: 400px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      overflow: hidden;
      display: flex; flex-direction: column;
      max-height: 80vh;
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .modal-header {
      padding: 16px; border-bottom: 1px solid var(--border-color);
      display: flex; justify-content: space-between; align-items: center;
    }
    .modal-header h3 { margin: 0; font-size: 1.125rem; }
    .close-btn { background: none; border: none; cursor: pointer; color: var(--text-secondary); }

    .modal-body { padding: 16px; overflow-y: auto; }

    .time-header {
       display: flex; align-items: center; gap: 8px;
       font-size: 1.25rem; font-weight: 600; color: var(--primary);
       margin-bottom: 16px;
    }
    .status-pill {
       margin-left: auto;
       padding: 4px 10px;
       border-radius: 999px;
       font-size: 0.65rem;
       font-weight: 700;
       text-transform: uppercase;
       letter-spacing: 0.04em;
       background: #e2e8f0;
       color: #475569;
    }
    .status-pill.is-danger { background: #fee2e2; color: #b91c1c; }
    .status-pill.is-warning { background: #fef3c7; color: #b45309; }
    .status-pill.is-ok { background: #dcfce7; color: #15803d; }

    .stats-summary { display: flex; gap: 16px; margin-bottom: 16px; }
    .stat-box {
       background: var(--bg-surface-hover);
       padding: 12px; border-radius: 8px;
       display: flex; flex-direction: column; align-items: center;
       flex: 1;
    }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--primary); }
    .stat-label { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; }

    .role-breakdown { margin-bottom: 16px; }
    .role-row {
      display: flex; justify-content: space-between;
      padding: 6px 0; border-bottom: 1px solid var(--border-color);
      font-size: 0.875rem;
    }

    .staff-list-section h4 { margin: 0 0 8px 0; font-size: 0.875rem; color: var(--text-secondary); }
    .staff-list { list-style: none; padding: 0; margin: 0; }
    .staff-item {
       display: flex; align-items: center; gap: 10px;
       padding: 8px; border-radius: 6px;
    }
    .staff-item:hover { background-color: var(--bg-surface-hover); }
    .avatar-sm {
       width: 28px; height: 28px; background: var(--primary-light); color: var(--primary);
       border-radius: 50%; display: flex; align-items: center; justify-content: center;
       font-size: 0.75rem; font-weight: 600;
    }
    .staff-info { display: flex; flex-direction: column; }
    .staff-name { font-size: 0.875rem; font-weight: 500; }
    .staff-role { font-size: 0.75rem; color: var(--text-secondary); }
    .empty-state { font-size: 0.875rem; color: var(--text-secondary); font-style: italic; }
    .warnings-card {
      border: 1px solid #facc15;
      background: #fefce8;
      border-radius: 10px;
      padding: 12px;
      font-size: 0.8rem;
      color: #92400e;
    }
    .warnings-card h4 {
      margin: 0 0 6px 0;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #b45309;
    }
    .warnings-card ul { margin: 0; padding-left: 16px; }
    .warnings-card li { margin-bottom: 4px; }

    .modal-footer {
      padding: 12px 16px; border-top: 1px solid var(--border-color);
      display: flex; justify-content: flex-end;
    }
    .btn-secondary {
      background: none; border: 1px solid var(--border-color);
      padding: 8px 16px; border-radius: 6px; cursor: pointer;
    }
  `]
})
export class CoverageDetailsDialogComponent {
  @Input() isOpen = false;
  @Input() time = '';
  @Input() roleBreakdown: { role: string, count: number }[] = [];
  @Input() staffList: StaffMember[] = [];
  @Input() warnings: { role: string, required: number, current: number, start: string, end: string }[] = [];
  @Output() closeEvent = new EventEmitter<void>();

  close() {
    this.closeEvent.emit();
  }
}

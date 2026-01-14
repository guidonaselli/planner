import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';
import { DailyRoleMinimum } from '../../models/shift-planner.models';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen) {
      <div class="overlay" (click)="close()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <header class="dialog-header">
            <div>
              <h3>Configuracion de cobertura</h3>
              <p class="subtitle">Minimos diarios por rol</p>
            </div>
            <button class="icon-btn" (click)="close()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>

          <div class="dialog-body">
            @for(item of draftMinimums; track item.role) {
              <div class="role-row">
                <div class="role-info">
                  <span class="role-name">{{ shiftService.formatRole(item.role) }}</span>
                  <span class="role-meta">Min diario</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  class="role-input"
                  [(ngModel)]="item.minDaily">
              </div>
            }
          </div>

          <footer class="dialog-footer">
            <button class="btn-secondary" (click)="close()">Cancelar</button>
            <button class="btn-primary" (click)="save()">Guardar</button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1200;
    }
    .dialog {
      width: min(92vw, 440px);
      background: var(--bg-surface);
      border-radius: 12px;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 80vh;
    }
    .dialog-header {
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, rgba(19, 91, 236, 0.08), rgba(59, 130, 246, 0.02));
    }
    .dialog-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
    }
    .subtitle {
      margin: 4px 0 0 0;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    .icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-secondary);
      padding: 4px;
      border-radius: 6px;
    }
    .icon-btn:hover {
      background: var(--bg-surface-hover);
      color: var(--text-primary);
    }
    .dialog-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
      max-height: 55vh;
      background: var(--bg-app);
    }
    .role-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
    }
    .role-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .role-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .role-meta {
      font-size: 0.7rem;
      color: var(--text-secondary);
    }
    .role-input {
      width: 80px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: white;
      padding: 0 8px;
      font-weight: 600;
      text-align: center;
    }
    .dialog-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .btn-secondary {
      background: none;
      border: 1px solid var(--border-color);
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      color: var(--text-secondary);
      font-weight: 600;
    }
    .btn-primary {
      background: var(--primary);
      color: white;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
  `]
})
export class SettingsDialogComponent {
  shiftService = inject(ShiftService);

  @Input() isOpen = false;
  @Output() closeEvent = new EventEmitter<void>();

  draftMinimums: DailyRoleMinimum[] = [];

  ngOnChanges() {
    if (this.isOpen) {
      this.draftMinimums = this.shiftService
        .dailyRoleMinimums()
        .map(item => ({ ...item }));
    }
  }

  close() {
    this.closeEvent.emit();
  }

  save() {
    const sanitized = this.draftMinimums.map(item => ({
      ...item,
      minDaily: Math.max(0, Math.floor(item.minDaily || 0))
    }));
    this.shiftService.dailyRoleMinimums.set(sanitized);
    this.close();
  }
}

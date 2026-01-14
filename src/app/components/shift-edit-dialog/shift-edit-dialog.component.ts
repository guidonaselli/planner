import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Shift, ShiftType } from '../../models/shift-planner.models';
import { RecurrenceConfig } from '../../models/recurrence.model';

@Component({
  selector: 'app-shift-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if(isOpen) {
      <div class="overlay" (click)="close()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>{{ isNew ? 'Nuevo Turno' : 'Editar Turno' }}</h3>
            <button class="close-btn" (click)="close()">×</button>
          </div>

          <div class="dialog-body">
            <div class="form-group">
              <label>Inicio</label>
              <input type="time" [(ngModel)]="editData.start" class="form-input">
            </div>

            <div class="form-group">
              <label>Fin</label>
              <input type="time" [(ngModel)]="editData.end" class="form-input">
            </div>

            <div class="form-group">
              <label>Tipo</label>
              <select [(ngModel)]="editData.type" class="form-input">
                <option value="standard">Estándar</option>
                <option value="exception">Excepción</option>
                <option value="overtime">Horas Extra</option>
              </select>
            </div>

            <!-- Recurrence Section (Only for New Shifts) -->
            @if(isNew) {
               <div class="recurrence-section">
                 <label class="section-label">Repetir</label>
                 <div class="recurrence-options">
                   <div class="radio-option">
                     <input type="radio" name="recurrence" [value]="false" [ngModel]="recurrenceActive" (ngModelChange)="setRecurrence(false)">
                     <span>No repetir</span>
                   </div>
                   <div class="radio-option">
                     <input type="radio" name="recurrence" [value]="true" [ngModel]="recurrenceActive" (ngModelChange)="setRecurrence(true)">
                     <span>Repetir...</span>
                   </div>
                 </div>

                @if(recurrenceActive) {
                    <div class="recurrence-details">
                      <div class="repeat-mode">
                        <div class="radio-option">
                          <input type="radio" name="repeatMode" [value]="'weeks'" [ngModel]="repeatMode" (ngModelChange)="repeatMode = 'weeks'">
                          <span>Semanas</span>
                        </div>
                        <div class="radio-option">
                          <input type="radio" name="repeatMode" [value]="'until'" [ngModel]="repeatMode" (ngModelChange)="repeatMode = 'until'">
                          <span>Hasta fecha</span>
                        </div>
                      </div>
                      <div class="repeat-weeks">
                        <label>Semanas</label>
                        <input type="number" min="1" max="52" [(ngModel)]="recurrence.weeks" class="form-input small" [disabled]="repeatMode !== 'weeks'">
                        <input type="date" class="form-input small" [(ngModel)]="recurrence.untilDate" [disabled]="repeatMode !== 'until'">
                      </div>
                      <select [(ngModel)]="recurrence.mode" class="form-input small">
                         <option value="week">Toda la semana</option>
                         <option value="custom">Días específicos</option>
                      </select>

                       @if(recurrence.mode === 'custom') {
                          <div class="days-selector">
                             @for(day of daysOfWeek; track $index) {
                                <div class="day-check" [class.selected]="recurrence.days[$index]" (click)="toggleDay($index)">
                                   {{ day }}
                                </div>
                             }
                          </div>
                       }
                    </div>
                 }
               </div>
            }

          </div>

          <div class="dialog-footer">
            @if(!isNew) {
              <button class="btn btn-danger" (click)="requestDelete()">Eliminar</button>
            }
            <div class="spacer"></div>
            <button class="btn btn-secondary" (click)="close()">Cancelar</button>
            <button class="btn btn-primary" (click)="save()">Guardar</button>
          </div>
          @if(showDeleteOptions && shift?.recurrenceGroupId) {
            <div class="delete-overlay" (click)="cancelDelete()">
              <div class="delete-modal" (click)="$event.stopPropagation()">
                <span class="delete-title">Eliminar turno recurrente</span>
                <p class="delete-subtitle">Elegí el alcance de la eliminacion.</p>
                <div class="delete-actions">
                  <button class="btn btn-danger" (click)="deleteSingle()">Solo este día</button>
                  <button class="btn btn-danger ghost" (click)="deleteFutureWeekday()">Este día de la semana en adelante</button>
                  <button class="btn btn-danger ghost" (click)="deleteSeries()">Toda la serie</button>
                </div>
                <button class="btn btn-secondary" (click)="cancelDelete()">Cancelar</button>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .dialog {
      background: white;
      border-radius: 8px;
      width: 400px; /* Increased width */
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .dialog-header {
      padding: 16px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dialog-header h3 { margin: 0; font-size: 1rem; color: #0f172a; }
    .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }

    .dialog-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 0.75rem; font-weight: 600; color: #64748b; }
    .form-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; }
    .form-input.small { padding: 4px 8px; font-size: 0.875rem; }

    .recurrence-section {
       margin-top: 8px; padding-top: 12px; border-top: 1px dashed #cbd5e1;
    }
    .section-label { font-size: 0.75rem; font-weight: 600; color: #64748b; display: block; margin-bottom: 8px; }
    .recurrence-options { display: flex; gap: 16px; margin-bottom: 8px; }
    .radio-option { display: flex; align-items: center; gap: 6px; font-size: 0.875rem; cursor: pointer; }
    .recurrence-details { display: flex; flex-direction: column; gap: 8px; }
    .repeat-mode { display: flex; gap: 16px; align-items: center; }
    .repeat-weeks { display: flex; align-items: center; gap: 8px; }
    .repeat-weeks label { font-size: 0.75rem; font-weight: 600; color: #64748b; }

    .days-selector { display: flex; justify-content: space-between; gap: 4px; }
    .day-check {
       width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
       border: 1px solid #cbd5e1; border-radius: 4px;
       font-size: 0.75rem; font-weight: 600; color: #64748b;
       cursor: pointer;
       transition: all 0.2s;
    }
    .day-check:hover {
       border-color: #135bec;
       color: #135bec;
    }
    .day-check.selected {
       background-color: #135bec; color: white; border-color: #135bec;
    }

    .dialog-footer {
      padding: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 8px;
    }
    .spacer { flex: 1; }
    .btn { padding: 8px 16px; border-radius: 4px; font-weight: 600; cursor: pointer; border: none; font-size: 0.875rem; }
    .btn-primary { background: #135bec; color: white; }
    .btn-secondary { background: #e2e8f0; color: #475569; }
    .btn-danger { background: #fee2e2; color: #ef4444; }
    .btn-danger.ghost { background: #fff1f2; color: #ef4444; }

    .delete-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
    }
    .delete-modal {
      width: 360px;
      background: #fff;
      border-radius: 10px;
      padding: 16px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.25);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .delete-title { font-size: 0.85rem; font-weight: 700; color: #ef4444; text-transform: uppercase; }
    .delete-subtitle { margin: 0; font-size: 0.75rem; color: #64748b; }
    .delete-actions { display: flex; flex-direction: column; gap: 8px; }
  `]
})
export class ShiftEditDialogComponent {
  @Input() isOpen = false;
  @Input() shift: Shift | null = null;
  @Output() closeEvent = new EventEmitter<void>();
  @Output() saveEvent = new EventEmitter<{ shift: Partial<Shift>, recurrence?: RecurrenceConfig }>();
  @Output() deleteEvent = new EventEmitter<{ id: string, scope: 'single' | 'series' | 'futureWeekday' }>();

  editData: Partial<Shift> = { start: '08:00', end: '16:00', type: 'standard' };
  isNew = true;

  // Recurrence State
  recurrenceActive = false;
  recurrence: RecurrenceConfig = {
    active: false,
    mode: 'week',
    days: [false, true, true, true, true, true, false], // Default Mon-Fri
    weeks: 1,
    untilDate: ''
  };
  daysOfWeek = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // Sun to Sat
  showDeleteOptions = false;
  repeatMode: 'weeks' | 'until' = 'weeks';

  ngOnChanges() {
    if (this.shift) {
      this.isNew = this.isNewEntry;
      this.editData = { ...this.shift };
    } else {
      this.isNew = true;
      this.editData = { start: '08:00', end: '16:00', type: 'standard' };
    }

    // Reset recurrence
    this.recurrenceActive = false;
    this.recurrence.active = false;
    this.recurrence.weeks = 1;
    this.recurrence.untilDate = '';
    this.repeatMode = 'weeks';
    this.showDeleteOptions = false;
  }

  // To fix the isNew issue, I'll use the fact that I control the parent.
  // I will assume for now that if I enable recurrence, it is treated as new logic.
  // But wait, I need to know IF I should show the recurrence UI.
  // I'll update `DayTimelineViewComponent` to pass `isNew`.
  @Input() isNewEntry = false; // New input

  setRecurrence(active: boolean) {
     this.recurrenceActive = active;
     this.recurrence.active = active;
     if (!this.recurrence.weeks || this.recurrence.weeks < 1) {
       this.recurrence.weeks = 1;
     }
     if (this.repeatMode === 'until' && !this.recurrence.untilDate) {
       this.recurrence.untilDate = '';
     }
  }

  toggleDay(index: number) {
     const newDays = [...this.recurrence.days];
     newDays[index] = !newDays[index];
     this.recurrence.days = newDays;
  }

  close() {
    this.closeEvent.emit();
  }

  save() {
    if (this.repeatMode === 'weeks') {
      this.recurrence.untilDate = '';
      if (!this.recurrence.weeks || this.recurrence.weeks < 1) {
        this.recurrence.weeks = 1;
      }
    } else if (this.repeatMode === 'until') {
      this.recurrence.weeks = 1;
    }
    this.saveEvent.emit({
       shift: this.editData,
       recurrence: this.recurrenceActive ? this.recurrence : undefined
    });
  }

  requestDelete() {
    if (!this.shift) return;
    if (this.shift.recurrenceGroupId) {
      this.showDeleteOptions = true;
    } else {
      this.deleteSingle();
    }
  }

  deleteSingle() {
    if (this.shift) {
      this.deleteEvent.emit({ id: this.shift.id, scope: 'single' });
    }
  }

  deleteSeries() {
    if (this.shift) {
      this.deleteEvent.emit({ id: this.shift.id, scope: 'series' });
    }
  }

  deleteFutureWeekday() {
    if (this.shift) {
      this.deleteEvent.emit({ id: this.shift.id, scope: 'futureWeekday' });
    }
  }

  cancelDelete() {
    this.showDeleteOptions = false;
  }
}

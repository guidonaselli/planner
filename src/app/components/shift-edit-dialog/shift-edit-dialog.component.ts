import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Shift, ShiftType } from '../../models/shift-planner.models';

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
          </div>

          <div class="dialog-footer">
            @if(!isNew) {
              <button class="btn btn-danger" (click)="delete()">Eliminar</button>
            }
            <div class="spacer"></div>
            <button class="btn btn-secondary" (click)="close()">Cancelar</button>
            <button class="btn btn-primary" (click)="save()">Guardar</button>
          </div>
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
      width: 300px;
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
  `]
})
export class ShiftEditDialogComponent {
  @Input() isOpen = false;
  @Input() shift: Shift | null = null;
  @Output() closeEvent = new EventEmitter<void>();
  @Output() saveEvent = new EventEmitter<Partial<Shift>>();
  @Output() deleteEvent = new EventEmitter<string>();

  editData: Partial<Shift> = { start: '08:00', end: '16:00', type: 'standard' };
  isNew = true;

  ngOnChanges() {
    if (this.shift) {
      this.isNew = false;
      this.editData = { ...this.shift };
    } else {
      this.isNew = true;
      this.editData = { start: '08:00', end: '16:00', type: 'standard' };
    }
  }

  close() {
    this.closeEvent.emit();
  }

  save() {
    this.saveEvent.emit(this.editData);
  }

  delete() {
    if (this.shift) {
      this.deleteEvent.emit(this.shift.id);
    }
  }
}

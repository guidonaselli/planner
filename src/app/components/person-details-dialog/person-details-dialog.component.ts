import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StaffMember } from '../../models/shift-planner.models';
import { ShiftService } from '../../services/shift.service';

@Component({
  selector: 'app-person-details-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if(isOpen && staff) {
      <div class="overlay" (click)="close()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>Detalle del Personal</h3>
            <button class="close-btn" (click)="close()">×</button>
          </div>

          <div class="dialog-body">
            <div class="profile-header">
               <div class="avatar-large">{{ staff.fullName.substring(0,2) }}</div>
               <div>
                 <h2 class="name">{{ staff.fullName }}</h2>
                 <span class="role-badge">{{ shiftService.formatRole(staff.role) }}</span>
               </div>
            </div>

            <div class="info-grid">
               <div class="info-item">
                 <span class="label">Teléfono</span>
                 <span class="value">{{ staff.phone }}</span>
               </div>
               <div class="info-item">
                 <span class="label">Modalidad</span>
                 <span class="value">{{ staff.homeOffice ? 'Home Office' : 'Oficina' }}</span>
               </div>
               <div class="info-item">
                 <span class="label">Horas Mensuales</span>
                 <span class="value highlight">{{ staff.monthlyHours }}h</span>
               </div>
            </div>
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
      z-index: 1100;
    }
    .dialog {
      background: white;
      border-radius: 12px;
      width: min(92vw, 360px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
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
    .dialog-header h3 { margin: 0; font-size: 1rem; color: #0f172a; font-weight: 600; }
    .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }

    .dialog-body { padding: 24px; }

    .profile-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .avatar-large {
      width: 64px; height: 64px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #475569;
      font-size: 1.5rem;
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      text-transform: uppercase;
    }
    .name { margin: 0; font-size: 1.1rem; color: #0f172a; font-weight: 700; }
    .role-badge {
      display: inline-block;
      margin-top: 4px;
      font-size: 0.75rem;
      background: #eff6ff;
      color: #1d4ed8;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
    }

    .info-grid { display: grid; gap: 16px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .label { font-size: 0.75rem; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
    .value { font-size: 0.95rem; color: #1e293b; font-weight: 500; }
    .value.highlight { color: #135bec; font-weight: 700; }
  `]
})
export class PersonDetailsDialogComponent {
  shiftService = inject(ShiftService);
  @Input() isOpen = false;
  @Input() staff: StaffMember | null = null;
  @Output() closeEvent = new EventEmitter<void>();

  close() {
    this.closeEvent.emit();
  }
}

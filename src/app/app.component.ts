import { Component } from '@angular/core';
import { ShiftPlannerShellComponent } from './components/shift-planner-shell/shift-planner-shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ShiftPlannerShellComponent],
  template: '<app-shift-planner-shell></app-shift-planner-shell>'
})
export class AppComponent {}

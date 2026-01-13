// Placeholder for a main.ts if this was a full app
import { bootstrapApplication } from '@angular/platform-browser';
import { ShiftPlannerShellComponent } from './components/shift-planner-shell/shift-planner-shell.component';

bootstrapApplication(ShiftPlannerShellComponent, {
  providers: []
}).catch(err => console.error(err));

import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeType } from '../../../core/models/auth.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-employee-overview',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './employee-overview.component.html',
})
export class EmployeeOverviewComponent {
  private readonly authService = inject(AuthService);

  readonly EmployeeType = EmployeeType;

  displayName  = this.authService.getDisplayName();
  employeeType = this.authService.getEmployeeTypeFromToken();
}

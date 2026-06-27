import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeType } from '../../../core/models/auth.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-employee-overview',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './employee-overview.component.html',
})
export class EmployeeOverviewComponent implements OnInit {
  private readonly authService = inject(AuthService);

  readonly EmployeeType = EmployeeType;

  displayName  = this.authService.getDisplayName();
  employeeType = this.authService.getEmployeeTypeFromToken();
  loading      = signal(true);

  ngOnInit(): void {
    setTimeout(() => this.loading.set(false), 350);
  }
}

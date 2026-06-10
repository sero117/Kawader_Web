import { Component, signal, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeType } from '../../../core/models/auth.models';
import { ThemeSwitcherComponent } from '../../../core/components/theme-switcher/theme-switcher.component';
import { LanguageSwitcherComponent } from '../../../core/components/language-switcher/language-switcher.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-employee-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeSwitcherComponent, LanguageSwitcherComponent, TranslatePipe],
  templateUrl: './employee-layout.component.html',
})
export class EmployeeLayoutComponent {
  private readonly router      = inject(Router);
  private readonly authService = inject(AuthService);

  readonly EmployeeType = EmployeeType;

  collapsed    = signal(window.innerWidth < 640);
  displayName  = signal(this.authService.getDisplayName());
  employeeType = signal(this.authService.getEmployeeTypeFromToken());

  toggle(): void { this.collapsed.update(v => !v); }

  signOut(): void {
    this.authService.clearTokens();
    this.router.navigate(['/auth/login']);
  }
}

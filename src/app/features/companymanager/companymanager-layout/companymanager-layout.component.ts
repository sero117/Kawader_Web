import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeSwitcherComponent } from '../../../core/components/theme-switcher/theme-switcher.component';
import { LanguageSwitcherComponent } from '../../../core/components/language-switcher/language-switcher.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { WelcomeOverlayComponent } from '../welcome-overlay/welcome-overlay.component';

const WELCOME_FLAG_KEY = 'kawader_show_welcome';

@Component({
  selector: 'app-companymanager-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeSwitcherComponent, LanguageSwitcherComponent, TranslatePipe, WelcomeOverlayComponent],
  templateUrl: './companymanager-layout.component.html',
})
export class CompanyManagerLayoutComponent implements OnInit {
  private readonly router      = inject(Router);
  private readonly authService = inject(AuthService);

  collapsed    = signal(window.innerWidth < 640);
  shiftsOpen   = signal(true);
  managerName  = signal(this.authService.getDisplayName());
  showWelcome  = signal(false);

  ngOnInit(): void {
    if (sessionStorage.getItem(WELCOME_FLAG_KEY)) {
      sessionStorage.removeItem(WELCOME_FLAG_KEY);
      this.showWelcome.set(true);
    }
  }

  toggle(): void { this.collapsed.update(v => !v); }
  toggleShifts(): void { this.shiftsOpen.update(v => !v); }

  onWelcomeNavigate(path: string): void {
    this.showWelcome.set(false);
    this.router.navigate([path]);
  }

  signOut(): void {
    this.authService.clearTokens();
    this.router.navigate(['/auth/login']);
  }
}

import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AccountService } from '../../../core/services/account.service';
import { ThemeSwitcherComponent } from '../../../core/components/theme-switcher/theme-switcher.component';
import { LanguageSwitcherComponent } from '../../../core/components/language-switcher/language-switcher.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { WelcomeOverlayComponent, WelcomeAction } from '../../companymanager/welcome-overlay/welcome-overlay.component';

const WELCOME_FLAG_KEY = 'kawader_show_welcome';

const ADMIN_WELCOME_ACTIONS: WelcomeAction[] = [
  {
    path: '/dashboard/admin/companies',
    labelKey: 'nav.companies',
    iconD: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18m-9-13.5h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  },
  {
    path: '/dashboard/admin/accounts',
    labelKey: 'nav.accounts',
    iconD: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  },
];

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeSwitcherComponent, LanguageSwitcherComponent, TranslatePipe, WelcomeOverlayComponent],
  templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent implements OnInit {
  private readonly router        = inject(Router);
  private readonly authService   = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly accountService = inject(AccountService);

  collapsed      = signal(window.innerWidth < 640);
  adminName      = signal(this.authService.getDisplayName());
  adminId        = signal(this.authService.getUserId());
  showWelcome    = signal(false);
  welcomeActions = ADMIN_WELCOME_ACTIONS;

  ngOnInit(): void {
    if (sessionStorage.getItem(WELCOME_FLAG_KEY)) {
      sessionStorage.removeItem(WELCOME_FLAG_KEY);
      this.showWelcome.set(true);
    }
    this.resolveRealName();
  }

  /**
   * The JWT often doesn't carry given/family name claims, so fall back to
   * looking the account up by the phone number used at login (matched
   * against the user id from the sign-in response, since phone search can
   * return more than one row).
   */
  private resolveRealName(): void {
    const phone = this.authService.getLoginPhone();
    const id    = this.authService.getUserId();
    if (!phone || !id) return;

    this.accountService.getAll({ phoneNumber: phone, pageNumber: 1, pageSize: 10 }).subscribe({
      next: res => {
        const items = res?.data?.items ?? [];
        const match = items.find(a => a.id === id);
        if (match) this.adminName.set(`${match.firstName} ${match.lastName}`.trim());
      },
      error: () => { /* keep JWT-derived fallback */ },
    });
  }

  toggle(): void { this.collapsed.update(v => !v); }

  onWelcomeNavigate(path: string): void {
    this.showWelcome.set(false);
    this.router.navigate([path]);
  }

  signOut(): void {
    this.notificationService.disconnect();
    this.authService.clearTokens();
    this.router.navigate(['/auth/login']);
  }
}

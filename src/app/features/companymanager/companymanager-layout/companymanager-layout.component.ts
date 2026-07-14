import { Component, signal, computed, inject, OnInit, HostListener } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { Role, EmployeeType } from '../../../core/models/auth.models';
import { NotificationService } from '../../../core/services/notification.service';
import { CompanyService } from '../../../core/services/company.service';
import { VisitTrackingService } from '../../../core/services/visit-tracking.service';
import { AccentService } from '../../../core/services/accent.service';
import { ThemeSwitcherComponent } from '../../../core/components/theme-switcher/theme-switcher.component';
import { LanguageSwitcherComponent } from '../../../core/components/language-switcher/language-switcher.component';
import { AccentPickerComponent } from '../../../core/components/accent-picker/accent-picker.component';
import { CommandPaletteComponent } from '../../../core/components/command-palette/command-palette.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { WelcomeOverlayComponent, WelcomeAction } from '../welcome-overlay/welcome-overlay.component';
import { OfflineBannerComponent } from '../../../core/components/offline-banner/offline-banner.component';

const WELCOME_FLAG_KEY = 'kawader_show_welcome';

const MANAGER_WELCOME_ACTIONS: WelcomeAction[] = [
  {
    path: '/dashboard/manager/branches',
    labelKey: 'manager.nav.branches',
    iconD: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21',
  },
  {
    path: '/dashboard/manager/shifts',
    labelKey: 'manager.nav.shifts',
    iconD: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  {
    path: '/dashboard/manager/company-holidays',
    labelKey: 'manager.nav.companyHolidays',
    iconD: 'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-6.364-.386 1.591-1.591M3 12h2.25m.386-6.364 1.591 1.591M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z',
  },
];

@Component({
  selector: 'app-companymanager-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeSwitcherComponent, LanguageSwitcherComponent, AccentPickerComponent, CommandPaletteComponent, TranslatePipe, WelcomeOverlayComponent, OfflineBannerComponent],
  templateUrl: './companymanager-layout.component.html',
})
export class CompanyManagerLayoutComponent implements OnInit {
  private readonly router        = inject(Router);
  private readonly authService   = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly companyService = inject(CompanyService);
  private readonly visitTracking = inject(VisitTrackingService);
  private readonly accentService = inject(AccentService);

  collapsed        = signal(window.innerWidth < 640);
  shiftsOpen       = signal(true);
  managerName      = signal(this.authService.getDisplayName());
  managerId        = signal(this.authService.getUserId());
  companyName      = signal<string | null>(null);
  showWelcome      = signal(false);
  welcomeActions   = MANAGER_WELCOME_ACTIONS;
  lastVisitText    = signal<string | null>(null);
  showNotifPanel   = signal(false);
  showSearch       = signal(false);

  readonly isHr = this.authService.getStoredRole() === Role.Employee &&
                  this.authService.getStoredEmployeeType() === EmployeeType.HumanResourceManager;
  readonly isManager = !this.isHr;
  readonly homeRoute = this.isHr ? '/dashboard/hr' : '/dashboard/manager';

  ngOnInit(): void {
    this.accentService.init();

    if (sessionStorage.getItem(WELCOME_FLAG_KEY)) {
      sessionStorage.removeItem(WELCOME_FLAG_KEY);
      this.showWelcome.set(true);
    }

    const previousVisit = this.visitTracking.recordAccountVisit();
    if (previousVisit) this.lastVisitText.set(this.visitTracking.formatTimeAgo(previousVisit));

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      if (window.innerWidth < 640) this.collapsed.set(true);
    });

    if (this.isManager) {
      this.companyService.getStatus().subscribe({
        next: (res: any) => {
          const name = res?.data?.companyName ?? res?.companyName;
          if (name) this.companyName.set(name);
        },
        error: () => { /* badge just stays hidden */ },
      });
    }
  }

  toggle(): void { this.collapsed.update(v => !v); }
  toggleShifts(): void { this.shiftsOpen.update(v => !v); }
  toggleNotifPanel(): void { this.showNotifPanel.update(v => !v); }
  closeNotifPanel(): void { this.showNotifPanel.set(false); }

  openSearch(): void { this.showSearch.set(true); this.showNotifPanel.set(false); }
  closeSearch(): void { this.showSearch.set(false); }

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      this.showSearch.update(v => !v);
    }
  }

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

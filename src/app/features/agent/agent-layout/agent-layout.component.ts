import { Component, signal, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeSwitcherComponent } from '../../../core/components/theme-switcher/theme-switcher.component';
import { LanguageSwitcherComponent } from '../../../core/components/language-switcher/language-switcher.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { OfflineBannerComponent } from '../../../core/components/offline-banner/offline-banner.component';

@Component({
  selector: 'app-agent-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeSwitcherComponent, LanguageSwitcherComponent, TranslatePipe, OfflineBannerComponent],
  templateUrl: './agent-layout.component.html',
})
export class AgentLayoutComponent {
  private readonly router      = inject(Router);
  private readonly authService = inject(AuthService);

  collapsed   = signal(window.innerWidth < 640);
  displayName = signal(this.authService.getDisplayName());

  toggle(): void { this.collapsed.update(v => !v); }

  signOut(): void {
    this.authService.clearTokens();
    this.router.navigate(['/auth/login']);
  }
}

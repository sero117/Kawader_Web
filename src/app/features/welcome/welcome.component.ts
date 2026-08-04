import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LanguageSwitcherComponent } from '../../core/components/language-switcher/language-switcher.component';
import { ThemeSwitcherComponent } from '../../core/components/theme-switcher/theme-switcher.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterLink, TranslatePipe, LanguageSwitcherComponent, ThemeSwitcherComponent],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.css',
})
export class WelcomeComponent {
  // ── 3D pointer-tracking tilt for the hero illustration ─────────────────────
  private readonly illustrationHost = viewChild<ElementRef<HTMLElement>>('illustrationHost');
  readonly tiltX = signal(0);
  readonly tiltY = signal(0);

  onIllustrationMove(event: MouseEvent): void {
    const el = this.illustrationHost()?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;   // 0..1
    const py = (event.clientY - rect.top) / rect.height;   // 0..1
    this.tiltY.set((px - 0.5) * 22);   // rotateY range
    this.tiltX.set((0.5 - py) * 16);   // rotateX range
  }

  resetIllustrationTilt(): void {
    this.tiltX.set(0);
    this.tiltY.set(0);
  }

  // ── Laptop lid: opens once on load, then toggles open/closed on click ──────
  readonly laptopOpen = signal(false);

  constructor() {
    setTimeout(() => this.laptopOpen.set(true), 500);
  }

  toggleLaptop(): void {
    this.laptopOpen.update(v => !v);
  }
}

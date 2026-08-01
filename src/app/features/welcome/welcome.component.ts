import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LanguageSwitcherComponent } from '../../core/components/language-switcher/language-switcher.component';
import { ThemeSwitcherComponent } from '../../core/components/theme-switcher/theme-switcher.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterLink, TranslatePipe, LanguageSwitcherComponent, ThemeSwitcherComponent],
  templateUrl: './welcome.component.html',
})
export class WelcomeComponent {}

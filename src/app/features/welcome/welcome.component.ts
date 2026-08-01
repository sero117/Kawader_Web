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
  styleUrl: './welcome.component.css',
})
export class WelcomeComponent {
  readonly sparkles: { top: string; left: string; size: string; duration: string; delay: string }[] = [
    { top: '8%',  left: '90%', size: '18px', duration: '3.3s', delay: '0s'   },
    { top: '14%', left: '5%',  size: '13px', duration: '2.8s', delay: '0.7s' },
    { top: '46%', left: '95%', size: '11px', duration: '2.5s', delay: '0.3s' },
    { top: '68%', left: '4%',  size: '12px', duration: '3.6s', delay: '0.9s' },
    { top: '82%', left: '90%', size: '15px', duration: '3.8s', delay: '1.9s' },
    { top: '30%', left: '50%', size: '7px',  duration: '4.2s', delay: '1.2s' },
  ];

  readonly blobs: { top: string; left: string; width: string; height: string; rot: string; delay: string; duration: string }[] = [
    { top: '-6%',  left: '35%',  width: '560px', height: '210px', rot: '38deg',  delay: '0s',   duration: '10s' },
    { top: '22%',  left: '-12%', width: '420px', height: '160px', rot: '-16deg', delay: '1.4s', duration: '11s' },
    { top: '70%',  left: '-6%',  width: '260px', height: '260px', rot: '0deg',   delay: '0.6s', duration: '9s'  },
    { top: '58%',  left: '62%',  width: '380px', height: '145px', rot: '24deg',  delay: '2.1s', duration: '12s' },
  ];
}

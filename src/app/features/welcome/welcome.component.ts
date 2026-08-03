import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LanguageService } from '../../core/services/language.service';
import { LanguageSwitcherComponent } from '../../core/components/language-switcher/language-switcher.component';
import { ThemeSwitcherComponent } from '../../core/components/theme-switcher/theme-switcher.component';

type ShiftKind = 'morning' | 'evening' | 'off';
type StatusKind = 'present' | 'late' | 'leave';

interface RosterRow {
  name: string;
  role: string;
  shift: ShiftKind;
  status: StatusKind;
  salary: number;
  stamped?: boolean;
}

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterLink, TranslatePipe, DecimalPipe, LanguageSwitcherComponent, ThemeSwitcherComponent],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.css',
})
export class WelcomeComponent {
  private readonly lang = inject(LanguageService);

  // The hero's left/right arrangement is a fixed compositional choice (board
  // always on the physical right, text always on the physical left) — not
  // something that should mirror with reading direction. The grid itself is
  // forced to `direction: ltr` for placement, so each side re-declares its
  // own `dir` here to keep its own text rendering correct per language.
  readonly isRtl = computed(() => this.lang.current() === 'ar');

  // Illustrative sample data for the hero roster board — not real records.
  readonly rosterRows: RosterRow[] = [
    { name: 'سارة عودة',  role: 'مندوبة مبيعات',       shift: 'morning', status: 'present', salary: 4500 },
    { name: 'خالد يوسف',  role: 'محاسب',               shift: 'evening', status: 'late',    salary: 3800 },
    { name: 'ريم ملحم',   role: 'مسؤولة موارد بشرية',   shift: 'off',     status: 'leave',   salary: 4200 },
    { name: 'أحمد درويش', role: 'فني صيانة',            shift: 'morning', status: 'present', salary: 3200, stamped: true },
  ];

  readonly ledgerRows: { key: string; color: string }[] = [
    { key: 'employees',  color: 'var(--nav-accent)' },
    { key: 'payroll',    color: '#34d399' },
    { key: 'shifts',     color: '#f97316' },
    { key: 'branches',   color: '#a855f7' },
    { key: 'leaves',     color: 'var(--wc-ink)' },
    { key: 'incentives', color: '#eab308' },
    { key: 'devices',    color: 'var(--wc-brass)' },
  ];

  readonly roleCards: { key: string; letter: string; color: string }[] = [
    { key: 'manager', letter: 'م', color: '#a855f7' },
    { key: 'hr',       letter: 'ه', color: 'var(--nav-accent)' },
    { key: 'agent',    letter: 'و', color: 'var(--wc-brass)' },
  ];
}

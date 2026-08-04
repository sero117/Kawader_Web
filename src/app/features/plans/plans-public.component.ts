import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LanguageService } from '../../core/services/language.service';
import { AccentService } from '../../core/services/accent.service';
import { LanguageSwitcherComponent } from '../../core/components/language-switcher/language-switcher.component';
import { ThemeSwitcherComponent } from '../../core/components/theme-switcher/theme-switcher.component';
import { Plan } from '../../core/models/plan.models';

// Placeholder data — GET /Plans currently requires auth (confirmed 401 for an
// anonymous request), so a public visitor calling it would get bounced to
// /auth/login by the global 401 interceptor. Once the backend opens that
// endpoint to anonymous access, swap this array for a PlanService.getAll()
// call filtered to `showPlan`; the template already reads the real Plan shape.
const PLACEHOLDER_PLANS: Plan[] = [
  {
    id: 1,
    name: 'الأساسية',
    price: 15,
    currency: 'USD',
    subscriptionCategoryId: 1,
    subscriptionCategoryArabicName: 'شهري',
    subscriptionCategoryEnglishName: 'Monthly',
    durationDays: 30,
    details: ['حتى 10 موظفين', 'فرع واحد وقسم واحد', 'الحضور والانصراف', 'الإجازات ورصيدها'],
    showPlan: true,
    isRecommended: false,
    maxEmployees: 10,
    maxSections: 3,
    maxBranches: 1,
    locked: false,
  },
  {
    id: 2,
    name: 'الاحترافية',
    price: 35,
    currency: 'USD',
    subscriptionCategoryId: 1,
    subscriptionCategoryArabicName: 'شهري',
    subscriptionCategoryEnglishName: 'Monthly',
    durationDays: 30,
    details: [
      'حتى 50 موظفًا', 'حتى 5 فروع وأقسامها', 'احتساب الرواتب تلقائيًا',
      'الحوافز والخصومات', 'الورديات وتسجيل الحضور', 'دعم فني بأولوية',
    ],
    showPlan: true,
    isRecommended: true,
    maxEmployees: 50,
    maxSections: 15,
    maxBranches: 5,
    locked: false,
  },
  {
    id: 3,
    name: 'المؤسسية',
    price: 75,
    currency: 'USD',
    subscriptionCategoryId: 1,
    subscriptionCategoryArabicName: 'شهري',
    subscriptionCategoryEnglishName: 'Monthly',
    durationDays: 30,
    details: [
      'عدد غير محدود من الموظفين', 'عدد غير محدود من الفروع', 'كل مزايا الخطة الاحترافية',
      'ربط أجهزة البصمة', 'مدير حساب مخصص', 'دعم فني على مدار الساعة',
    ],
    showPlan: true,
    isRecommended: false,
    maxEmployees: 0,
    maxSections: 0,
    maxBranches: 0,
    locked: false,
  },
];

@Component({
  selector: 'app-plans-public',
  standalone: true,
  imports: [RouterLink, TranslatePipe, DecimalPipe, LanguageSwitcherComponent, ThemeSwitcherComponent],
  templateUrl: './plans-public.component.html',
  styleUrl: './plans-public.component.css',
})
export class PlansPublicComponent {
  private readonly lang = inject(LanguageService);

  readonly plans = PLACEHOLDER_PLANS;

  constructor() {
    inject(AccentService).resetToBrandDefault();
  }

  categoryLabel(plan: Plan): string {
    return this.lang.current() === 'ar' ? plan.subscriptionCategoryArabicName : plan.subscriptionCategoryEnglishName;
  }
}

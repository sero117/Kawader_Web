import { Component, signal, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { LanguageService } from '../../../core/services/language.service';
import { CompanyService } from '../../../core/services/company.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { SignInRequest, AuthTokenResponse, Role } from '../../../core/models/auth.models';
import { digitsOnlyInput } from '../../../core/utils/phone-input';
import { extractErrorMessage, ServiceProblemDetails } from '../../../core/models/problem-details.model';
import { apiErrorMessage } from '../../../core/utils/api-error-message';

/** Matches the backend's business-rule identifiers for an account that exists
 *  but hasn't completed activation yet (no password set / not yet verified). */
function isNotVerifiedMessage(msg: string | null | undefined): boolean {
  return !!msg && /not.?verif|unverif|not.?activ|inactiv/i.test(msg);
}

function rawBackendMessage(err: any): string | null {
  const body = err?.error;
  if (typeof body === 'string' && body.trim()) return body.trim();
  return extractErrorMessage(body as ServiceProblemDetails | null);
}

function loginErrorMessage(err: any): string {
  return apiErrorMessage(err, 'Sign in failed. Please try again.', {
    400: 'Invalid phone number or password.',
    401: 'Incorrect phone number or password.',
    403: 'Access denied.',
    404: 'Account not found.',
    429: 'Too many attempts. Please wait a moment.',
    502: 'Server error. Please try again later.',
    503: 'Server error. Please try again later.',
  });
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private readonly fb          = inject(FormBuilder);
  private readonly authService          = inject(AuthService);
  private readonly notificationService  = inject(NotificationService);
  private readonly snackbar             = inject(SnackbarService);
  private readonly lang                 = inject(LanguageService);
  private readonly companyService       = inject(CompanyService);
  private readonly router               = inject(Router);

  ngOnInit(): void {
    this.authService.clearTokens();
  }

  loading      = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  form = this.fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(/^09\d{8}$/)]],
    password:    ['', [Validators.required]],
  });

  get phoneNumber() { return this.form.get('phoneNumber')!; }
  get password()    { return this.form.get('password')!; }

  togglePassword(): void { this.showPassword.update(v => !v); }

  onRoleShortcut(route: string): void {
    if (route) this.router.navigate([route]);
  }

  onPhoneInput(event: Event): void {
    this.phoneNumber.setValue(digitsOnlyInput(event));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const payload: SignInRequest = {
      phoneNumber: this.form.value.phoneNumber!,
      password:    this.form.value.password!,
    };

    this.authService.signIn(payload).subscribe({
      next: response => {
        this.loading.set(false);

        const tokenData: AuthTokenResponse =
          (response as any).data ?? (response as unknown as AuthTokenResponse);

        const hasToken = !!(tokenData?.token ?? tokenData?.accessToken);

        if (hasToken) {
          this.authService.saveTokens(tokenData);
          this.notificationService.connect();
          this.authService.setLoginPhone(payload.phoneNumber);

          const needsSelection = this.authService.needsCompanySelection();
          // Sign-in succeeds (a valid token is issued) even for a frozen
          // company/employee account — the backend only rejects it on the
          // first subsequent request. Confirm the company isn't frozen
          // *before* greeting or navigating for roles that can be frozen, so
          // "welcome" never flashes right before the frozen message replaces
          // it (the interceptor already shows that message on its own if
          // this check 403s, so the error case here is a no-op).
          const canBeFrozen = !needsSelection &&
            (tokenData?.role === Role.CompanyManager || tokenData?.role === Role.Employee);

          if (canBeFrozen) {
            this.companyService.getStatus().subscribe({
              next: () => this.proceedAfterSignIn(tokenData, needsSelection),
              error: () => { /* interceptor already handled the frozen/expired message */ },
            });
          } else {
            this.proceedAfterSignIn(tokenData, needsSelection);
          }
        } else if ((response as any).isSuccess === false) {
          const msg = (response as any).message as string | undefined;
          this.errorMessage.set(
            isNotVerifiedMessage(msg) ? this.lang.t('auth.login.accountNotVerified') : (msg || 'Sign in failed.'),
          );
        } else {
          this.errorMessage.set('Unexpected response. Please try again.');
        }
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(
          isNotVerifiedMessage(rawBackendMessage(err))
            ? this.lang.t('auth.login.accountNotVerified')
            : loginErrorMessage(err),
        );
      },
    });
  }

  private proceedAfterSignIn(tokenData: AuthTokenResponse, needsSelection: boolean): void {
    const name = this.authService.getDisplayName();
    this.snackbar.show(
      `${this.lang.t('auth.loginSuccess')}، ${name}`,
      'success',
      3500,
    );
    const next = needsSelection ? '/auth/select-company' : this.authService.getHomeRoute(tokenData?.role);
    if (next === '/dashboard/manager' || next === '/dashboard/hr' || next === '/dashboard/admin') {
      sessionStorage.setItem('kawader_show_welcome', '1');
    }
    this.router.navigate([next]);
  }
}

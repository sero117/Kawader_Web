import { Component, signal, computed, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ConfirmCodeRequest, GenerateCodeRequest, AuthTokenResponse } from '../../../core/models/auth.models';

/** Several Identity endpoints return the created/verified resource directly on
 *  success (e.g. confirm-code returns the auth tokens themselves) with no
 *  `isSuccess` envelope at all — only an explicit `isSuccess: false` counts
 *  as a failure. */
function apiErr(err: any, fallback: string): string {
  if (err?.status === 0) return 'Cannot connect to server. Check your internet connection.';
  const body = err?.error;
  if (!body) return fallback;
  if (typeof body === 'string' && body.trim()) return body.trim();
  for (const key of ['title', 'message', 'detail', 'error']) {
    const v = body[key];
    if (typeof v === 'string' && v.trim() && v.length < 400) return v.trim();
  }
  switch (err?.status) {
    case 429: return 'Too many attempts. Please wait a moment.';
    case 500: return 'Server error. Please try again later.';
    default:  return fallback;
  }
}

@Component({
  selector: 'app-confirm-code',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './confirm-code.component.html',
})
export class ConfirmCodeComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loading = signal(false);
  resendLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  cooldownSeconds = signal(0);
  canResend = computed(() => this.cooldownSeconds() === 0 && !this.resendLoading());

  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  form = this.fb.group({
    phoneNumber: [
      this.route.snapshot.queryParams['phoneNumber'] ?? '',
      [Validators.required, Validators.pattern(/^\d{10}$/)],
    ],
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  get phoneNumber() { return this.form.get('phoneNumber')!; }
  get code() { return this.form.get('code')!; }

  ngOnDestroy(): void {
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
  }

  resendCode(): void {
    const phoneVal = this.phoneNumber.value?.trim();
    if (!phoneVal || this.phoneNumber.invalid) {
      this.phoneNumber.markAsTouched();
      return;
    }

    this.resendLoading.set(true);
    this.errorMessage.set(null);

    this.authService.generateCode({ phoneNumber: phoneVal } as GenerateCodeRequest).subscribe({
      next: (response: any) => {
        this.resendLoading.set(false);
        if (response?.isSuccess === false) {
          this.errorMessage.set(response.message || 'Could not resend code. Please try again.');
          return;
        }
        this.successMessage.set('A new verification code has been sent to your phone.');
        this.startCooldown(60);
        setTimeout(() => this.successMessage.set(null), 5000);
      },
      error: err => {
        this.resendLoading.set(false);
        this.errorMessage.set(apiErr(err, 'Could not resend code. Please try again.'));
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const payload: ConfirmCodeRequest = {
      phoneNumber: this.phoneNumber.value!,
      code: this.code.value!,
    };

    this.authService.confirmCode(payload).subscribe({
      next: (response: any) => {
        this.loading.set(false);
        if (response?.isSuccess === false) {
          this.errorMessage.set(response.message || 'Verification failed. Please try again.');
          return;
        }

        // The endpoint returns the auth tokens directly on success — the phone
        // is now verified and the account is effectively signed in, so skip
        // sending the user back to re-enter the password they just set.
        const tokenData: AuthTokenResponse = response?.data ?? response;
        const hasToken = !!(tokenData?.token ?? tokenData?.accessToken);

        if (hasToken) {
          this.authService.saveTokens(tokenData);
          this.notificationService.connect();
          this.authService.setLoginPhone(payload.phoneNumber);
          this.successMessage.set('Phone number verified!');
          const next = this.authService.needsCompanySelection()
            ? '/auth/select-company'
            : this.authService.getHomeRoute(tokenData?.role);
          setTimeout(() => this.router.navigate([next]), 1200);
        } else {
          this.successMessage.set('Phone number verified! Redirecting to sign in…');
          setTimeout(() => this.router.navigate(['/auth/login']), 2000);
        }
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(apiErr(err, 'Verification failed. Please try again.'));
      },
    });
  }

  private startCooldown(seconds: number): void {
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
    this.cooldownSeconds.set(seconds);
    this.cooldownInterval = setInterval(() => {
      this.cooldownSeconds.update(s => {
        if (s <= 1) {
          clearInterval(this.cooldownInterval!);
          this.cooldownInterval = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }
}

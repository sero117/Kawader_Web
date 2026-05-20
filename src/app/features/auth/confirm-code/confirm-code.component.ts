import { Component, signal, computed, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmCodeRequest, GenerateCodeRequest } from '../../../core/models/auth.models';

@Component({
  selector: 'app-confirm-code',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './confirm-code.component.html',
})
export class ConfirmCodeComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
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
      next: response => {
        this.resendLoading.set(false);
        if (response.isSuccess) {
          this.successMessage.set('A new verification code has been sent to your phone.');
          this.startCooldown(60);
          setTimeout(() => this.successMessage.set(null), 5000);
        } else {
          this.errorMessage.set(response.message);
        }
      },
      error: err => {
        this.resendLoading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Could not resend code. Please try again.');
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
      next: response => {
        this.loading.set(false);
        if (response.isSuccess) {
          this.successMessage.set('Phone number verified! Redirecting to sign in…');
          setTimeout(() => this.router.navigate(['/auth/login']), 2000);
        } else {
          this.errorMessage.set(response.message);
        }
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Verification failed. Please try again.');
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

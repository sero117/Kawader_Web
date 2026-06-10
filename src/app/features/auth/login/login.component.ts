import { Component, signal, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { SignInRequest, AuthTokenResponse } from '../../../core/models/auth.models';

function extractErrorMessage(err: any): string {
  if (err?.status === 0) return 'Cannot connect to server. Check your internet connection.';

  const body = err?.error;

  if (typeof body === 'string' && body.trim()) return body.trim();

  for (const key of ['message', 'title', 'detail', 'error']) {
    const v = body?.[key];
    if (typeof v === 'string' && v.trim() && v.length < 400) return v.trim();
  }

  if (body?.errors) {
    if (Array.isArray(body.errors)) {
      const m = body.errors.map((e: any) => e?.message ?? e).filter((s: any) => typeof s === 'string').join('. ');
      if (m) return m;
    } else if (typeof body.errors === 'object') {
      const m = (Object.values(body.errors) as unknown[]).flat()
        .filter((s): s is string => typeof s === 'string').join('. ');
      if (m) return m;
    }
  }

  switch (err?.status) {
    case 400: return 'Invalid phone number or password.';
    case 401: return 'Incorrect phone number or password.';
    case 403: return 'Access denied.';
    case 404: return 'Account not found.';
    case 429: return 'Too many attempts. Please wait a moment.';
    case 500:
    case 502:
    case 503: return 'Server error. Please try again later.';
    default:  return 'Sign in failed. Please try again.';
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);

  ngOnInit(): void { this.authService.clearTokens(); }

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
          this.router.navigate([this.authService.getHomeRoute(tokenData?.role)]);
        } else if ((response as any).isSuccess === false) {
          this.errorMessage.set((response as any).message || 'Sign in failed.');
        } else {
          this.errorMessage.set('Unexpected response. Please try again.');
        }
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(err));
      },
    });
  }
}

import { Component, signal, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { SignUpRequest, GenerateCodeRequest, Role } from '../../../core/models/auth.models';
import { digitsOnlyInput } from '../../../core/utils/phone-input';

/** Several Identity endpoints return the created resource directly on success
 *  (e.g. `{ id, code }`) with no `isSuccess` envelope at all — only an explicit
 *  `isSuccess: false` should be treated as a failure. */
function apiErr(err: any, fallback: string): string {
  if (err?.status === 0) return 'Cannot connect to server. Check your internet connection.';
  const body = err?.error;
  if (!body) return fallback;
  if (typeof body === 'string' && body.trim()) return body.trim();
  for (const key of ['title', 'message', 'detail', 'error']) {
    const v = body[key];
    if (typeof v === 'string' && v.trim() && v.length < 400) return v.trim();
  }
  if (body.errors) {
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
    case 409: return 'This phone number is already registered.';
    case 429: return 'Too many attempts. Please wait a moment.';
    case 500: return 'Server error. Please try again later.';
    default:  return fallback;
  }
}

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const pw  = control.get('password')?.value;
  const cpw = control.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { passwordMismatch: true } : null;
}

function passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value as string;
  if (!v) return null;
  const errors: ValidationErrors = {};
  if (!/[A-Z]/.test(v)) errors['requiresUppercase'] = true;
  if (!/[a-z]/.test(v)) errors['requiresLowercase'] = true;
  if (!/[0-9]/.test(v)) errors['requiresNumber'] = true;
  if (!/[^A-Za-z0-9]/.test(v)) errors['requiresSpecial'] = true;
  return Object.keys(errors).length ? errors : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);

  loading             = signal(false);
  errorMessage        = signal<string | null>(null);
  successMessage      = signal<string | null>(null);
  showPassword        = signal(false);
  showConfirmPassword = signal(false);

  form = this.fb.group(
    {
      firstName:       ['', [Validators.required, Validators.minLength(2)]],
      lastName:        ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber:     ['', [Validators.required, Validators.pattern(/^09\d{8}$/)]],
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(8), Validators.maxLength(20), passwordComplexityValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  get firstName()       { return this.form.get('firstName')!; }
  get lastName()        { return this.form.get('lastName')!; }
  get phoneNumber()     { return this.form.get('phoneNumber')!; }
  get email()           { return this.form.get('email')!; }
  get password()        { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }

  togglePassword():        void { this.showPassword.update(v => !v); }

  onPhoneInput(event: Event): void { this.phoneNumber.setValue(digitsOnlyInput(event)); }
  toggleConfirmPassword(): void { this.showConfirmPassword.update(v => !v); }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const payload: SignUpRequest = {
      firstName:   this.form.value.firstName!,
      lastName:    this.form.value.lastName!,
      phoneNumber: this.form.value.phoneNumber!,
      email:       this.form.value.email!,
      password:    this.form.value.password!,
      role:        Role.Employee,
    };

    this.authService.signUp(payload).subscribe({
      next: (signUpRes: any) => {
        if (signUpRes?.isSuccess === false) {
          this.loading.set(false);
          this.errorMessage.set(signUpRes.message || 'Registration failed. Please try again.');
          return;
        }

        const codePayload: GenerateCodeRequest = { phoneNumber: payload.phoneNumber };
        this.authService.generateCode(codePayload).subscribe({
          next: (codeRes: any) => {
            this.loading.set(false);
            if (codeRes?.isSuccess === false) {
              this.errorMessage.set(codeRes.message || 'Failed to send verification code.');
              return;
            }
            this.successMessage.set(
              'Account created! A verification code has been sent to your phone.'
            );
            setTimeout(
              () => this.router.navigate(['/auth/confirm-code'], { queryParams: { phoneNumber: payload.phoneNumber } }),
              1500
            );
          },
          error: err => {
            this.loading.set(false);
            this.errorMessage.set(
              apiErr(err, 'Account created but failed to send verification code. Please try again.')
            );
          },
        });
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(apiErr(err, 'Registration failed. Please try again.'));
      },
    });
  }
}

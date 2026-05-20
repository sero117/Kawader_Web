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
import { SignInRequest, Role } from '../../../core/models/auth.models';

function navigateByRole(role: Role | undefined, router: import('@angular/router').Router): void {
  switch (role) {
    case Role.Admin:          router.navigate(['/dashboard/admin']);   break;
    case Role.CompanyManager: router.navigate(['/dashboard/manager']); break;
    default:                  router.navigate(['/dashboard']);         break;
  }
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
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  form = this.fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(20),
        passwordComplexityValidator,
      ],
    ],
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
        if (response.isSuccess) {
          this.authService.saveTokens(response.data);
          navigateByRole(response.data?.role, this.router);
        } else {
          this.errorMessage.set(response.message);
        }
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message ?? 'Sign in failed. Please try again.'
        );
      },
    });
  }
}

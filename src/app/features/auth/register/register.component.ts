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
import { SignUpRequest, GenerateCodeRequest } from '../../../core/models/auth.models';

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
  imports: [ReactiveFormsModule, RouterLink],
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
      phoneNumber:     ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
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
  toggleConfirmPassword(): void { this.showConfirmPassword.update(v => !v); }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const payload: SignUpRequest = {
      firstName:       this.form.value.firstName!,
      lastName:        this.form.value.lastName!,
      phoneNumber:     this.form.value.phoneNumber!,
      email:           this.form.value.email!,
      password:        this.form.value.password!,
      confirmPassword: this.form.value.confirmPassword!,
    };

    this.authService.signUp(payload).subscribe({
      next: signUpRes => {
        if (!signUpRes.isSuccess) {
          this.loading.set(false);
          this.errorMessage.set(signUpRes.message);
          return;
        }

        const codePayload: GenerateCodeRequest = { phoneNumber: payload.phoneNumber };
        this.authService.generateCode(codePayload).subscribe({
          next: codeRes => {
            this.loading.set(false);
            if (codeRes.isSuccess) {
              this.successMessage.set(
                'Account created! A verification code has been sent to your phone.'
              );
              setTimeout(
                () => this.router.navigate(['/auth/confirm-code'], { queryParams: { phoneNumber: payload.phoneNumber } }),
                1500
              );
            } else {
              this.errorMessage.set(codeRes.message);
            }
          },
          error: err => {
            this.loading.set(false);
            this.errorMessage.set(
              err.error?.message ?? 'Account created but failed to send verification code. Please try again.'
            );
          },
        });
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message ?? 'Registration failed. Please try again.'
        );
      },
    });
  }
}

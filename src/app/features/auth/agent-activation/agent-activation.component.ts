import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormBuilder, ReactiveFormsModule, Validators,
  AbstractControl, ValidationErrors,
} from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

function passwordComplexity(ctrl: AbstractControl): ValidationErrors | null {
  const v: string = ctrl.value ?? '';
  if (!v) return null;
  const ok = /[A-Z]/.test(v) && /[a-z]/.test(v) && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v);
  return ok ? null : { complexity: true };
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw  = group.get('password')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { mismatch: true } : null;
}

@Component({
  selector: 'app-agent-activation',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './agent-activation.component.html',
})
export class AgentActivationComponent {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb          = inject(FormBuilder);
  private readonly router      = inject(Router);

  step       = signal(1);
  submitting = signal(false);
  errorMsg   = signal<string | null>(null);
  showPw     = signal(false);
  showCpw    = signal(false);

  private _phone = '';

  step1Form = this.fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(/^09\d{8}$/)]],
  });

  step2Form = this.fb.group({
    code:            ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    password:        ['', [Validators.required, Validators.minLength(8), passwordComplexity]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  submitStep1(): void {
    if (this.step1Form.invalid) { this.step1Form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMsg.set(null);

    const phone = this.step1Form.value.phoneNumber!;
    this.authService.generateCode({ phoneNumber: phone }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.isSuccess === false) {
          this.errorMsg.set(res.message || 'Failed to send code.');
          return;
        }
        this._phone = phone;
        this.step.set(2);
      },
      error: err => {
        this.submitting.set(false);
        this.errorMsg.set(this.apiErr(err, 'Failed to send code.'));
      },
    });
  }

  submitStep2(): void {
    if (this.step2Form.invalid) { this.step2Form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMsg.set(null);

    const { code, password } = this.step2Form.value;
    this.authService.completeAgentInfo({
      phoneNumber: this._phone,
      code:        code!,
      password:    password!,
    }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.isSuccess === false) {
          this.errorMsg.set(res.message || 'Activation failed.');
          return;
        }
        const tokenData = res?.data ?? res;
        const token = tokenData?.token ?? tokenData?.accessToken;
        if (!token) {
          this.errorMsg.set('Activation succeeded but no token received.');
          return;
        }
        this.authService.saveTokens(tokenData);
        this.notificationService.connect();
        this.router.navigate([this.authService.getHomeRoute(tokenData?.role)]);
      },
      error: err => {
        this.submitting.set(false);
        this.errorMsg.set(this.apiErr(err, 'Activation failed.'));
      },
    });
  }

  private apiErr(err: any, fallback: string): string {
    if (err?.status === 0) return 'Cannot connect to server.';
    const body = err?.error;
    if (!body) return fallback;
    if (typeof body === 'string' && body.trim()) return body.trim();
    for (const key of ['message', 'title', 'detail', 'error']) {
      const v = body[key];
      if (typeof v === 'string' && v.trim() && v.length < 400) return v.trim();
    }
    switch (err?.status) {
      case 400: return 'Invalid code or phone number.';
      case 404: return 'Account not found.';
      case 412: return 'This account cannot be activated as an agent, or is already verified.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}

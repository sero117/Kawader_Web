import {
  Component, signal, inject, ViewChild, ElementRef,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormBuilder, ReactiveFormsModule, Validators,
  AbstractControl, ValidationErrors,
} from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { CompanySetupService } from '../../../core/services/company-setup.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyType } from '../../../core/models/company.models';
import { Role } from '../../../core/models/auth.models';

// ── Validators ────────────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-company-setup',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './company-setup.component.html',
})
export class CompanySetupComponent {
  private readonly setupService = inject(CompanySetupService);
  private readonly authService  = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb           = inject(FormBuilder);
  private readonly router       = inject(Router);

  @ViewChild('logoInput') logoInput!: ElementRef<HTMLInputElement>;

  step       = signal(1);
  submitting = signal(false);
  errorMsg   = signal<string | null>(null);
  showPw     = signal(false);
  showCpw    = signal(false);

  private _managerPhone = '';
  private _managerToken = '';

  // ── Step 1 form ──────────────────────────────────────────────────────────────
  step1Form = this.fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(/^09\d{8}$/)]],
  });

  // ── Step 2 form ──────────────────────────────────────────────────────────────
  step2Form = this.fb.group({
    code:            ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    firstName:       ['', [Validators.required, Validators.maxLength(50)]],
    lastName:        ['', [Validators.required, Validators.maxLength(50)]],
    password:        ['', [Validators.required, passwordComplexity]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordsMatch });

  readonly CurrencyType = CurrencyType;

  // ── Step 3 form ──────────────────────────────────────────────────────────────
  step3Form = this.fb.group({
    companyName:   ['', [Validators.required, Validators.maxLength(200)]],
    address:       ['', [Validators.maxLength(500)]],
    landlinePhone: ['', [Validators.pattern(/^\d{7,10}$/)]],
    businessField: ['', [Validators.maxLength(200)]],
    companyType:   [''],
    currency:      [CurrencyType.LYD, [Validators.required]],
    // Defaults to the browser's own timezone offset — still editable by hand.
    utcOffset:     [Math.round(-new Date().getTimezoneOffset() / 60), [Validators.required, Validators.min(-12), Validators.max(14)]],
    latitude:      [null as number | null, [Validators.min(-90), Validators.max(90)]],
    longitude:     [null as number | null, [Validators.min(-180), Validators.max(180)]],
  });

  logoFile  = signal<File | null>(null);
  logoError = signal<string | null>(null);
  logoPreview = signal<string | null>(null);

  locating      = signal(false);
  locationError = signal<string | null>(null);

  // ── Step 3: "use my location" (auto-fill lat/long, manual entry still allowed) ──
  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.locationError.set('setup.geoUnsupported');
      return;
    }
    this.locating.set(true);
    this.locationError.set(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.locating.set(false);
        this.step3Form.patchValue({
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        this.locating.set(false);
        this.locationError.set('setup.geoDenied');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // ── Step 1: send verification code ───────────────────────────────────────────
  submitStep1(): void {
    if (this.step1Form.invalid) { this.step1Form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMsg.set(null);

    const phone = this.step1Form.value.phoneNumber!;

    this.setupService.generateCode(phone).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.isSuccess === false) {
          this.errorMsg.set(res.message || 'Failed to send code.');
          return;
        }
        this._managerPhone = phone;
        this.step.set(2);
      },
      error: err => {
        this.submitting.set(false);
        console.error('[generate-code] error:', err.status, err.error);
        this.errorMsg.set(this.apiErr(err, 'Failed to send code.'));
      },
    });
  }

  // ── Step 2: create manager account ───────────────────────────────────────────
  submitStep2(): void {
    if (this.step2Form.invalid) { this.step2Form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMsg.set(null);

    const { code, firstName, lastName, password } = this.step2Form.value;

    this.setupService.completeAccount({
      phoneNumber: this._managerPhone,
      code:        code!,
      firstName:   firstName!,
      lastName:    lastName!,
      password:    password!,
    }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.isSuccess === false) {
          this.errorMsg.set(res.message || 'Failed to create account.');
          return;
        }
        const token: string =
          res?.data?.token       ??
          res?.data?.accessToken ??
          res?.token             ??
          res?.accessToken       ?? '';

        if (!token) {
          this.errorMsg.set('Account created but no token received. Please contact support.');
          return;
        }
        this._managerToken = token;
        this.authService.saveTokens({
          accessToken:  token,
          refreshToken: res?.data?.refreshToken ?? '',
          userId:       res?.data?.userId       ?? res?.userId,
          // This flow is exclusively the company-manager setup journey — role
          // is implied, not something the response body reliably carries here.
          role:         Role.CompanyManager,
        });
        this.notificationService.connect();
        this.authService.setLoginPhone(this._managerPhone);
        this.authService.setKnownName(this._managerPhone, firstName!, lastName!);
        this.step.set(3);
      },
      error: err => {
        this.submitting.set(false);
        this.errorMsg.set(this.apiErr(err, 'Failed to create account.'));
      },
    });
  }

  // ── Step 3: complete company profile ─────────────────────────────────────────
  onLogoChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.logoError.set(null);
    this.logoFile.set(null);
    this.logoPreview.set(null);

    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.logoError.set('setup.logoInvalidType');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.logoError.set('setup.logoTooLarge');
      return;
    }
    this.logoFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.logoPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  submitStep3(): void {
    if (this.step3Form.invalid) { this.step3Form.markAllAsTouched(); return; }

    if (!this.logoFile()) {
      this.logoError.set('setup.logoRequired');
      return;
    }

    this.submitting.set(true);
    this.errorMsg.set(null);

    const v = this.step3Form.value;
    const fd = new FormData();
    fd.append('companyName',   v.companyName!);
    if (v.address?.trim())       fd.append('address',       v.address.trim());
    if (v.landlinePhone?.trim()) fd.append('landlinePhone',  v.landlinePhone.trim());
    if (v.businessField?.trim()) fd.append('businessField',  v.businessField.trim());
    if (v.companyType != null && v.companyType !== '')
      fd.append('companyType', v.companyType);
    fd.append('currency',   v.currency!.toString());
    fd.append('utcOffset',  v.utcOffset!.toString());
    if (v.latitude  != null) fd.append('latitude',  v.latitude.toString());
    if (v.longitude != null) fd.append('longitude', v.longitude.toString());
    fd.append('logo', this.logoFile()!);

    this.setupService.completeCompany(fd, this._managerToken).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.isSuccess === false) {
          this.errorMsg.set(res.message || 'Failed to complete company setup.');
          return;
        }
        if (res?.data != null || res?.id != null || res?.isSuccess === true) {
          this.router.navigate(['/dashboard/manager']);
          return;
        }
        this.errorMsg.set(res?.message || 'Failed to complete company setup.');
      },
      error: err => {
        this.submitting.set(false);
        this.errorMsg.set(this.apiErr(err, 'Failed to complete company setup.'));
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  get phone()  { return this.step1Form.get('phoneNumber')!; }
  get code()   { return this.step2Form.get('code')!; }
  get fname()  { return this.step2Form.get('firstName')!; }
  get lname()  { return this.step2Form.get('lastName')!; }
  get pw()     { return this.step2Form.get('password')!; }
  get cpw()    { return this.step2Form.get('confirmPassword')!; }
  get cname()     { return this.step3Form.get('companyName')!; }
  get addr()      { return this.step3Form.get('address')!; }
  get landline()  { return this.step3Form.get('landlinePhone')!; }
  get bfield()    { return this.step3Form.get('businessField')!; }
  get utcOffset() { return this.step3Form.get('utcOffset')!; }
  get lat()       { return this.step3Form.get('latitude')!; }
  get lng()       { return this.step3Form.get('longitude')!; }

  private apiErr(err: any, fallback: string): string {
    if (err?.status === 0) return 'Cannot connect to server.';
    const body = err?.error;
    if (!body) return fallback;
    if (typeof body === 'string' && body.trim()) return body.trim();
    for (const key of ['message', 'title', 'detail', 'error']) {
      const v = body[key];
      if (typeof v === 'string' && v.trim() && v.length < 400) return v.trim();
    }
    if (body.errors) {
      if (Array.isArray(body.errors)) {
        const m = body.errors.map((e: any) => e?.message ?? e)
          .filter((s: any) => typeof s === 'string').join('. ');
        if (m) return m;
      } else if (typeof body.errors === 'object') {
        const m = (Object.values(body.errors) as unknown[]).flat()
          .filter((s): s is string => typeof s === 'string').join('. ');
        if (m) return m;
      }
    }
    switch (err?.status) {
      case 400: return fallback;
      case 401: return 'Session expired.';
      case 403: return 'You do not have permission.';
      case 409: return 'This record already exists.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}

import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { AccountService } from '../../../core/services/account.service';
import { Account, GetAccountsParams } from '../../../core/models/account.models';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './accounts.component.html',
})
export class AccountsComponent implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly lang           = inject(LanguageService);

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    phone:      '',
    firstName:  '',
    lastName:   '',
    pageNumber: 1,
    pageSize:   10,
  });

  // ── Table state ────────────────────────────────────────────────────────────
  accounts  = signal<Account[]>([]);
  loading   = signal(true);
  hasMore   = signal(false);

  // ── Flash / error ──────────────────────────────────────────────────────────
  successMsg = signal<string | null>(null);
  listError  = signal<string | null>(null);
  submitting = signal(false);

  // ── Lock / Unlock modals ───────────────────────────────────────────────────
  showLockModal   = signal(false);
  showUnlockModal = signal(false);
  targetId        = signal<number | null>(null);


  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void { this.loadAccounts(); }

  loadAccounts(): void {
    this.loading.set(true);
    const { phone, firstName, lastName, pageNumber, pageSize } = this.filter.value();
    const params: GetAccountsParams = { pageNumber, pageSize };
    if (phone.trim())      params.phoneNumber = phone.trim();
    if (firstName.trim())  params.firstName   = firstName.trim();
    if (lastName.trim())   params.lastName    = lastName.trim();

    this.accountService.getAll(params).subscribe({
      next: (res: any) => {
        this.listError.set(null);
        const raw   = res?.data ?? res;
        const items: Account[] = raw?.items ?? [];
        const total = raw?.totalCount ?? items.length;
        this.accounts.set(items);
        this.hasMore.set(pageNumber * pageSize < total);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'Failed to load accounts.'));
      },
    });
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  onSearchPhone(v: string): void { this.filter.set({ phone: v, pageNumber: 1 }); this.loadAccounts(); }
  onSearchFirst(v: string): void { this.filter.patch({ firstName: v, pageNumber: 1 }); this.loadAccounts(); }
  onSearchLast(v: string): void  { this.filter.patch({ lastName: v, pageNumber: 1 }); this.loadAccounts(); }

  // ── Pagination ─────────────────────────────────────────────────────────────
  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.loadAccounts();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.loadAccounts();
  }

  // ── Lock ───────────────────────────────────────────────────────────────────
  confirmLock(id: number): void { this.targetId.set(id); this.showLockModal.set(true); }

  executeLock(): void {
    const id = this.targetId();
    if (id === null) return;
    this.submitting.set(true);
    this.accountService.lock(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showLockModal.set(false);
        this.accounts.update(list => list.map(a => a.id === id ? { ...a, isLocked: true } : a));
        this.flash(this.lang.t('admin.accounts.lockSuccess'));
      },
      error: err => {
        this.submitting.set(false);
        this.showLockModal.set(false);
        this.flash(this.apiErr(err, 'Failed to lock account.'));
      },
    });
  }

  // ── Unlock ─────────────────────────────────────────────────────────────────
  confirmUnlock(id: number): void { this.targetId.set(id); this.showUnlockModal.set(true); }

  executeUnlock(): void {
    const id = this.targetId();
    if (id === null) return;
    this.submitting.set(true);
    this.accountService.unlock(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showUnlockModal.set(false);
        this.accounts.update(list => list.map(a => a.id === id ? { ...a, isLocked: false } : a));
        this.flash(this.lang.t('admin.accounts.unlockSuccess'));
      },
      error: err => {
        this.submitting.set(false);
        this.showUnlockModal.set(false);
        this.flash(this.apiErr(err, 'Failed to unlock account.'));
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  roleBadge(role: string): { label: string; color: string; bg: string; border: string } {
    switch (role) {
      case 'Admin':
        return { label: 'Admin', color: 'rgba(239,68,68,0.9)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' };
      case 'CompanyManager':
        return { label: 'Manager', color: 'rgba(139,92,246,0.9)', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' };
      default:
        return { label: 'Employee', color: 'var(--text-faint)', bg: 'var(--bg-subtle-sm)', border: 'var(--border)' };
    }
  }

  private flash(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3500);
  }

  apiErr(err: any, fallback: string): string {
    if (err?.status === 0) return 'Cannot connect to server.';
    const body = err?.error;
    if (!body) return fallback;
    if (typeof body === 'string' && body.trim()) return body.trim();
    for (const key of ['message', 'title', 'detail', 'error']) {
      const v = body[key];
      if (typeof v === 'string' && v.trim() && v.length < 400) return v.trim();
    }
    switch (err?.status) {
      case 400: return body?.type ?? fallback;
      case 403: return 'You do not have permission.';
      case 404: return 'Account not found.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}

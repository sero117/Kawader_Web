import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { UrlFilter } from '../../../core/utils/url-filter';
import { digitsOnlyInput } from '../../../core/utils/phone-input';
import { CompanyService } from '../../../core/services/company.service';
import { AgentService } from '../../../core/services/agent.service';
import { CountryService } from '../../../core/services/country.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { Agent } from '../../../core/models/agent.models';
import { Country } from '../../../core/models/country.models';
import { Currency, CompanyCurrency } from '../../../core/models/currency.models';
import {
  Company, GetCompaniesParams,
} from '../../../core/models/company.models';
import { formatCompanyDate } from '../../../core/utils/company-time';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './companies.component.html',
})
export class CompaniesComponent implements OnInit {
  private readonly companyService  = inject(CompanyService);
  private readonly agentService    = inject(AgentService);
  private readonly countryService  = inject(CountryService);
  private readonly currencyService = inject(CurrencyService);
  private readonly fb              = inject(FormBuilder);
  private readonly snackbar        = inject(SnackbarService);

  agents         = signal<Agent[]>([]);
  countries      = signal<Country[]>([]);
  allCurrencies  = signal<Currency[]>([]);

  // ── Company currency grants modal ─────────────────────────────────────────
  showCurrenciesModal  = signal(false);
  currenciesTarget     = signal<Company | null>(null);
  companyCurrencies    = signal<CompanyCurrency[]>([]);
  currenciesLoading    = signal(false);
  currenciesError      = signal<string | null>(null);
  grantCurrencyId      = signal<number | null>(null);
  grantPriority        = signal<number>(1);

  // ── Frozen IDs persisted in localStorage (API list doesn't return isFrozen) ─
  private readonly FROZEN_KEY = 'kawader_frozen_companies';
  private getFrozenIds(): Set<number> {
    try { return new Set(JSON.parse(localStorage.getItem(this.FROZEN_KEY) ?? '[]')); }
    catch { return new Set(); }
  }
  private saveFrozenId(id: number, frozen: boolean): void {
    const ids = this.getFrozenIds();
    frozen ? ids.add(id) : ids.delete(id);
    localStorage.setItem(this.FROZEN_KEY, JSON.stringify([...ids]));
  }

  // ── Agent IDs persisted in localStorage (list endpoint doesn't return it) ──
  private readonly AGENT_KEY = 'kawader_company_agents';
  private getAgentCache(): Record<number, number> {
    try { return JSON.parse(localStorage.getItem(this.AGENT_KEY) ?? '{}'); }
    catch { return {}; }
  }
  private saveAgentId(id: number, agentId: number | null): void {
    const cache = this.getAgentCache();
    if (agentId == null) delete cache[id]; else cache[id] = agentId;
    localStorage.setItem(this.AGENT_KEY, JSON.stringify(cache));
  }

  // ── Filter (synced with URL) ───────────────────────────────────────────────
  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    search:      '',
    emailSearch: '',
    pageNumber:  1,
    pageSize:    10,
  });

  // ── Table state ────────────────────────────────────────────────────────────
  companies           = signal<Company[]>([]);
  loading             = signal(true);
  hasMore             = signal(false);
  frozenCount         = computed(() => this.companies().filter(c => c.isFrozen === true).length);
  companiesWithStatus = computed(() =>
    this.filter.filterItems(
      // Live-filter the already-loaded page as the admin types, so results
      // narrow immediately instead of waiting for a full 10-digit number
      // (the backend only accepts a complete phone number, per loadCompanies()).
      this.filter.filterItems(this.companies(), 'search', (c, term) =>
        (c.phoneNumber ?? '').toLowerCase().includes(term)
      ),
      'emailSearch', (c, term) =>
        (c.email?.toLowerCase() ?? '').includes(term) ||
        (c.companyName?.toLowerCase() ?? '').includes(term)
    )
  );

  // ── Flash / error ──────────────────────────────────────────────────────────
  successMsg = signal<string | null>(null);
  listError  = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  // ── Add modal ──────────────────────────────────────────────────────────────
  showWizard = signal(false);

  private readonly phonePattern = /^09\d{8}$/;

  addForm = this.fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
    email:       ['', [Validators.email]],
    countryId:   [null as number | null, [Validators.required]],
    agentId:     [null as number | null],
  });

  // ── View / Edit / Delete / Freeze modals ──────────────────────────────────
  showViewModal     = signal(false);
  showEditModal     = signal(false);
  showDeleteModal   = signal(false);
  showFreezeModal   = signal(false);
  showUnfreezeModal = signal(false);
  selectedCompany   = signal<Company | null>(null);
  viewLoading       = signal(false);
  deleteTargetId    = signal<number | null>(null);
  freezeTargetId    = signal<number | null>(null);

  editForm = this.fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
    email:       ['', [Validators.email]],
    countryId:   [null as number | null, [Validators.required]],
    agentId:     [null as number | null],
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadCompanies();
    this.agentService.getAll({ pageNumber: 1, pageSize: 100 }, true).subscribe({
      next: res => this.agents.set(res.items ?? []),
      error: () => {},
    });
    this.countryService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res => this.countries.set(res.items ?? []),
      error: () => {},
    });
    this.currencyService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: res => this.allCurrencies.set(res.items ?? []),
      error: () => {},
    });
  }

  // ── Company currency grants ────────────────────────────────────────────────
  openCurrencies(company: Company, event: Event): void {
    event.stopPropagation();
    this.currenciesTarget.set(company);
    this.showCurrenciesModal.set(true);
    this.currenciesError.set(null);
    this.grantCurrencyId.set(null);
    this.grantPriority.set(1);
    this.loadCompanyCurrencies();
  }

  closeCurrenciesModal(): void { this.showCurrenciesModal.set(false); }

  loadCompanyCurrencies(): void {
    const company = this.currenciesTarget();
    if (!company) return;
    this.currenciesLoading.set(true);
    this.companyService.getCurrencies(company.id).subscribe({
      next: res => { this.companyCurrencies.set(res ?? []); this.currenciesLoading.set(false); },
      error: (err: any) => { this.currenciesLoading.set(false); this.currenciesError.set(this.apiErr(err, 'Failed to load currencies.')); },
    });
  }

  grantCurrency(): void {
    const company = this.currenciesTarget();
    const currencyId = this.grantCurrencyId();
    if (!company || !currencyId) return;
    this.submitting.set(true);
    this.currenciesError.set(null);
    this.companyService.grantCurrency(company.id, { currencyId, priority: this.grantPriority() }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.grantCurrencyId.set(null);
        this.grantPriority.set(this.companyCurrencies().length + 2);
        this.loadCompanyCurrencies();
      },
      error: () => { this.submitting.set(false); },
    });
  }

  revokeCurrency(currencyId: number): void {
    const company = this.currenciesTarget();
    if (!company) return;
    this.submitting.set(true);
    this.currenciesError.set(null);
    this.companyService.revokeCurrency(company.id, currencyId).subscribe({
      next: () => { this.submitting.set(false); this.loadCompanyCurrencies(); },
      error: () => { this.submitting.set(false); },
    });
  }

  availableCurrenciesToGrant(): Currency[] {
    const grantedIds = new Set(this.companyCurrencies().map(c => c.id));
    return this.allCurrencies().filter(c => !grantedIds.has(c.id));
  }

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private requestSeq = 0;

  loadCompanies(): void {
    const { search, pageNumber, pageSize } = this.filter.value();
    const trimmedSearch = search.trim();
    // The backend rejects a partial phone number outright (400: "max length is
    // 10"). Rather than surface that as a scary error while the user is still
    // typing, just wait until it's cleared or a full 10-digit number.
    if (trimmedSearch.length > 0 && trimmedSearch.length < 10) {
      this.listError.set(null);
      return;
    }

    this.loading.set(true);
    const seq = ++this.requestSeq;
    const params: GetCompaniesParams = { pageSize, pageNumber };
    if (trimmedSearch) params.phoneNumber = trimmedSearch;

    this.companyService.getAll(params).subscribe({
      next: res => {
        if (seq !== this.requestSeq) return; // a newer search superseded this one
        this.listError.set(null);

        if ((res as any).isSuccess === false) {
          this.listError.set((res as any).message || 'Failed to load companies.');
          this.loading.set(false);
          return;
        }

        const raw = (res as any)?.data ?? res;
        const items: Company[] = Array.isArray(raw)
          ? raw
          : (raw?.items ?? raw?.data ?? raw?.companies ?? []);

        // Normalize PascalCase fields from .NET API. isFrozen now comes back on
        // *some* rows (apparently only once a company has been through at least
        // one freeze/unfreeze — a never-touched row omits the field instead of
        // sending false) — agentId is still absent from the list entirely.
        //
        // When the API DOES give an explicit isFrozen for a row, that's the
        // truth and wins outright — a stale localStorage "frozen" from an
        // earlier session must never override a live "not frozen" answer.
        // localStorage is only consulted as a guess for rows where the API
        // omitted the field, and gets corrected to match the API wherever it
        // did answer, so a stale value can't keep re-surfacing on later visits.
        const frozenIds = this.getFrozenIds();
        const agentCache = this.getAgentCache();
        const normalized = items.map((c: any) => {
          const apiFrozen = c.isFrozen ?? c.IsFrozen;
          const apiFrozenAt = c.frozenAt ?? c.FrozenAt;
          let isFrozen: boolean;
          if (apiFrozen !== undefined) {
            isFrozen = !!apiFrozen;
            this.saveFrozenId(c.id, isFrozen);
          } else {
            isFrozen = (apiFrozenAt != null && apiFrozenAt !== '') || frozenIds.has(c.id);
          }
          return {
            ...c,
            isActive:    c.isActive    !== undefined ? c.isActive    : c.IsActive,
            isCompleted: c.isCompleted !== undefined ? c.isCompleted : c.IsCompleted,
            isFrozen,
            agentId: c.agentId ?? c.AgentId ?? agentCache[c.id] ?? null,
          };
        });

        this.companies.set(normalized);
        this.hasMore.set(items.length >= this.filter.value().pageSize);
        this.loading.set(false);
        // No automatic per-row detail fetch here on purpose — that meant
        // opening this page always fired one request per visible company
        // just to render it. isFrozen now relies solely on the localStorage
        // cache (populated by freeze/unfreeze and by opening a company's own
        // details), and the row no longer needs companyName at all now that
        // its avatar doesn't depend on it. Real per-company data only gets
        // fetched on demand — when the admin actually opens that company.
      },
      error: err => {
        if (seq !== this.requestSeq) return;
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'Failed to load companies.'));
      },
    });
  }

  readonly digitsOnlyInput = digitsOnlyInput;

  onAddPhoneInput(event: Event): void { this.addForm.get('phoneNumber')!.setValue(digitsOnlyInput(event)); }
  onEditPhoneInput(event: Event): void { this.editForm.get('phoneNumber')!.setValue(digitsOnlyInput(event)); }

  // ── Search ─────────────────────────────────────────────────────────────────
  /** Debounced so fast typing doesn't fire a request per keystroke (which was
   *  racing and making the list flicker/appear "stuck" on short input). */
  onSearch(value: string): void {
    this.filter.set({ search: value });
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadCompanies(), 350);
  }

  onEmailSearch(value: string): void {
    this.filter.patch({ emailSearch: value });
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.loadCompanies();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.loadCompanies();
  }

  // ── Add company modal ──────────────────────────────────────────────────────
  openWizard(): void {
    this.addForm.reset();
    this.modalError.set(null);
    this.showWizard.set(true);
  }

  closeWizard(): void { this.showWizard.set(false); }

  submitAdd(): void {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);

    this.companyService.create({
      phoneNumber:    this.addForm.value.phoneNumber!,
      email:          this.addForm.value.email || undefined,
      tenantId:       crypto.randomUUID(),
      countryId:      this.addForm.value.countryId!,
      idempotencyKey: crypto.randomUUID(),
      agentId:        this.addForm.value.agentId || undefined,
    }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        // API returns { data: companyId }
        const newId = res?.data ?? res?.id;
        if (newId != null || res?.isSuccess === true) {
          this.showWizard.set(false);
          this.flash('Company created successfully!');
          const agentId = this.addForm.value.agentId || null;
          const countryId = this.addForm.value.countryId ?? null;
          const country = this.countries().find(c => c.id === countryId);
          const newId2  = typeof newId === 'number' ? newId : Number(newId);
          const newCompany: Company = {
            id:            newId2,
            phoneNumber:   this.addForm.value.phoneNumber!,
            email:         this.addForm.value.email || undefined,
            tenantId:      '',
            agentId,
            countryId,
            countryArabicName:  country?.arabicName ?? null,
            countryEnglishName: country?.englishName ?? null,
            isCompleted:   false,
            isFrozen:      false,
            createdAt:     new Date().toISOString(),
          };
          this.saveAgentId(newId2, agentId);
          this.filter.patch({ pageNumber: 1 });
          this.companies.update(list => [newCompany, ...list]);
        } else {
          this.snackbar.show(res?.message || 'Failed to create company.', 'error');
        }
      },
      // No local error banner — the global interceptor already shows this
      // failure as a snackbar.
      error: () => { this.submitting.set(false); },
    });
  }

  // ── View modal ─────────────────────────────────────────────────────────────
  viewCompany(company: Company): void {
    this.selectedCompany.set(company);
    this.showViewModal.set(true);
    this.viewLoading.set(true);

    this.companyService.getByIdCached(company.id).subscribe({
      next: res => {
        // Some deployments wrap this in {isSuccess, data}, others return the
        // company object directly — handle both instead of silently keeping
        // the stale list-row data when the envelope isn't there.
        const d: any = (res as any)?.data ?? res;
        if (d && d.id != null) {
          // The backend's own field is authoritative when present — sync the
          // localStorage cache to it so a company frozen before the cache
          // existed (or on another browser) heals itself here instead of
          // permanently showing "not frozen" in the list from then on.
          const backendSaysFrozen = !!d.isFrozen || !!d.IsFrozen
            || (d.frozenAt != null && d.frozenAt !== '')
            || (d.FrozenAt != null && d.FrozenAt !== '');
          if (backendSaysFrozen) this.saveFrozenId(d.id, true);
          const isFrozen = backendSaysFrozen || this.getFrozenIds().has(d.id);
          this.selectedCompany.set({
            ...d,
            isActive:    d.isActive    !== undefined ? d.isActive    : d.IsActive,
            isCompleted: d.isCompleted !== undefined ? d.isCompleted : d.IsCompleted,
            isFrozen,
            agentId: d.agentId ?? d.AgentId ?? null,
          });
          this.companies.update(list => list.map(c => c.id === d.id ? { ...c, isFrozen } : c));
        }
        this.viewLoading.set(false);
      },
      error: () => this.viewLoading.set(false),
    });
  }

  // ── Edit modal ─────────────────────────────────────────────────────────────
  openEdit(company: Company, event: Event): void {
    event.stopPropagation();
    this.selectedCompany.set(company);
    this.editForm.patchValue({
      phoneNumber: company.phoneNumber,
      email:       company.email ?? '',
      countryId:   company.countryId ?? null,
      agentId:     (company as any).agentId ?? null,
    });
    this.modalError.set(null);
    this.showEditModal.set(true);
  }

  submitEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const id = this.selectedCompany()?.id;
    if (!id) return;
    this.submitting.set(true);
    this.modalError.set(null);

    this.companyService.update(id, {
      phoneNumber: this.editForm.value.phoneNumber || undefined,
      email:       this.editForm.value.email       || null,
      countryId:   this.editForm.value.countryId   ?? undefined,
      // `?? null` (not `|| undefined`) so picking "no agent" actually sends a
      // clearing value — `undefined` would drop the key from the JSON body
      // entirely and the backend would just leave the previous agent in place.
      agentId:     this.editForm.value.agentId ?? null,
    }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        // Some responses omit the envelope entirely (e.g. 204 No Content) — only
        // an explicit isSuccess:false counts as a failure, matching submitAdd().
        // This is a 200 OK with a business-level failure, so the interceptor's
        // automatic snackbar never fires for it — show one here instead of the
        // modal's own inline banner (single message, not two).
        if (res?.isSuccess === false) {
          this.snackbar.show(res.message || 'Update failed.', 'error');
          return;
        }
        this.companyService.invalidateCache(id);
        this.showEditModal.set(false);
        this.flash('Company updated.');
        const countryId = this.editForm.value.countryId ?? null;
        const country = this.countries().find(c => c.id === countryId);
        const patch = {
          phoneNumber: this.editForm.value.phoneNumber!,
          email:       this.editForm.value.email || undefined,
          countryId,
          countryArabicName:  country?.arabicName ?? null,
          countryEnglishName: country?.englishName ?? null,
          agentId:     this.editForm.value.agentId ?? null,
        };
        this.saveAgentId(id, patch.agentId);
        this.companies.update(list => list.map(c => c.id === id ? { ...c, ...patch } : c));
        this.selectedCompany.update(c => c && c.id === id ? { ...c, ...patch } : c);
      },
      // No local error banner here — the global interceptor already shows this
      // failure as a snackbar; showing both was a duplicate message.
      error: () => { this.submitting.set(false); },
    });
  }

  // ── Freeze / Unfreeze ─────────────────────────────────────────────────────
  confirmFreeze(id: number, event: Event): void {
    event.stopPropagation();
    this.freezeTargetId.set(id);
    this.showFreezeModal.set(true);
  }

  confirmUnfreeze(id: number, event: Event): void {
    event.stopPropagation();
    this.freezeTargetId.set(id);
    this.showUnfreezeModal.set(true);
  }

  executeFreeze(): void {
    const id = this.freezeTargetId();
    if (id === null) return;
    this.submitting.set(true);
    this.companyService.freeze(id).subscribe({
      next: () => {
        this.saveFrozenId(id, true);
        this.companyService.invalidateCache(id);
        this.submitting.set(false);
        this.showFreezeModal.set(false);
        this.companies.update(list => list.map(c => c.id === id ? { ...c, isFrozen: true } : c));
        this.flash('Company frozen.');
      },
      error: err => {
        this.submitting.set(false);
        if (err?.status === 400) {
          // 400 = already frozen → sync UI and persist
          this.saveFrozenId(id, true);
          this.companyService.invalidateCache(id);
          this.companies.update(list => list.map(c => c.id === id ? { ...c, isFrozen: true } : c));
          this.showFreezeModal.set(false);
        }
        // Any other status: no local error banner — the global interceptor
        // already shows it as a snackbar.
      },
    });
  }

  executeUnfreeze(): void {
    const id = this.freezeTargetId();
    if (id === null) return;
    this.submitting.set(true);
    this.companyService.unfreeze(id).subscribe({
      next: () => {
        this.saveFrozenId(id, false);
        this.companyService.invalidateCache(id);
        this.submitting.set(false);
        this.showUnfreezeModal.set(false);
        this.companies.update(list => list.map(c => c.id === id ? { ...c, isFrozen: false } : c));
        this.flash('Company unfrozen.');
      },
      // No local error banner — the global interceptor already shows this
      // failure as a snackbar.
      error: () => { this.submitting.set(false); },
    });
  }

  // ── Delete modal ───────────────────────────────────────────────────────────
  confirmDelete(id: number, event: Event): void {
    event.stopPropagation();
    this.deleteTargetId.set(id);
    this.showDeleteModal.set(true);
  }

  executeDelete(): void {
    const id = this.deleteTargetId();
    if (id === null) return;
    this.submitting.set(true);
    this.companyService.delete(id).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        // Some responses omit the envelope entirely (e.g. 204 No Content) — only
        // an explicit isSuccess:false counts as a failure, matching submitEdit().
        if (res?.isSuccess === false) {
          this.listError.set(res.message || 'Failed to delete company.');
          return;
        }
        this.companies.update(list => list.filter(c => c.id !== id));
        this.flash('Company deleted.');
      },
      error: () => { this.submitting.set(false); this.showDeleteModal.set(false); },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  agentName(agentId?: number | null): string | null {
    if (!agentId) return null;
    const a = this.agents().find(ag => ag.id === agentId);
    return a ? `${a.firstName} ${a.lastName}` : null;
  }

  countryDisplayName(c: Company): string | null {
    if (c.countryArabicName || c.countryEnglishName) {
      return [c.countryArabicName, c.countryEnglishName].filter(Boolean).join(' / ');
    }
    if (!c.countryId) return null;
    const country = this.countries().find(co => co.id === c.countryId);
    return country ? `${country.arabicName} / ${country.englishName}` : null;
  }

  /** Each company keeps its own timezone (utcOffset) — unlike the manager/
   *  employee side, there's no single "viewer's own company" here, so every
   *  call site must pass that specific company's own offset. */
  formatDate(dateStr?: string, utcOffsetHours = 0): string {
    return formatCompanyDate(dateStr, utcOffsetHours);
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
      case 401: return 'Session expired. Please sign in again.';
      case 403: return 'You do not have permission for this action.';
      case 409: return 'This record already exists.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}

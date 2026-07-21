import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';
import { UrlFilter } from '../../../core/utils/url-filter';
import { AgentService } from '../../../core/services/agent.service';
import { Agent, Country, CreateAgentRequest, UpdateAgentRequest } from '../../../core/models/agent.models';

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="page-content">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ 'admin.agents.title' | translate }}</h1>
          <p class="page-subtitle">{{ 'admin.agents.subtitle' | translate }}</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          {{ 'admin.agents.addAgent' | translate }}
        </button>
      </div>

      <!-- Search -->
      <div class="admin-card" style="margin-bottom:16px">
        <div class="p-5 pb-4">
          <div class="relative" style="max-width:320px">
            <svg class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style="color: var(--text-very-faint);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input type="text" [placeholder]="'admin.agents.searchName' | translate"
              class="w-full ps-9 pe-4 py-2.5 rounded-xl text-sm"
              style="background: var(--bg-subtle-sm); border: 1px solid var(--border); color: var(--text-muted); outline: none;"
              [value]="filter.value().name"
              (input)="onSearch($any($event.target).value)" />
          </div>
        </div>
      </div>

      <!-- Error -->
      @if (listError()) {
        <div class="error-banner">{{ listError() }}</div>
      }

      @if (loading()) {
        <div class="loading-state"><div class="spinner"></div></div>
      } @else if (agents().length === 0) {
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <p class="empty-state-title">{{ 'admin.agents.empty' | translate }}</p>
        </div>
      } @else {
        <div class="admin-card">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>{{ 'admin.agents.colName' | translate }}</th>
                  <th>{{ 'admin.agents.colPhone' | translate }}</th>
                  <th>{{ 'admin.agents.colEmail' | translate }}</th>
                  <th>{{ 'admin.agents.colCountry' | translate }}</th>
                  <th>{{ 'admin.agents.colStatus' | translate }}</th>
                  <th>{{ 'admin.agents.colCreated' | translate }}</th>
                  <th style="text-align: right;">{{ 'admin.agents.colActions' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (a of agents(); track a.id) {
                  <tr>
                    <td style="color: var(--text-base); font-weight: 600;">{{ a.firstName }} {{ a.lastName }}</td>
                    <td style="color: var(--text-faint);">{{ a.phoneNumber }}</td>
                    <td style="color: var(--text-faint);">{{ a.email || '—' }}</td>
                    <td style="color: var(--text-faint);">{{ ('countries.' + a.country) | translate }}</td>
                    <td>
                      <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
                        [style.background]="a.isVerified ? 'rgba(52,211,153,0.1)' : 'var(--bg-subtle-sm)'"
                        [style.color]="a.isVerified ? 'rgba(5,150,105,0.9)' : 'var(--text-muted)'">
                        {{ (a.isVerified ? 'admin.agents.verified' : 'admin.agents.unverified') | translate }}
                      </span>
                    </td>
                    <td style="color: var(--text-faint);">{{ formatDate(a.createdAt) }}</td>
                    <td>
                      <div class="flex items-center justify-end gap-1.5">
                        <button (click)="openEdit(a)" class="w-8 h-8 rounded-lg flex items-center justify-center"
                          style="color: var(--text-faint); background: var(--bg-subtle-sm);"
                          [title]="'common.edit' | translate">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        @if (!a.isVerified) {
                          <button (click)="confirmDelete(a)" class="w-8 h-8 rounded-lg flex items-center justify-center"
                            style="color: rgba(239,68,68,0.55); background: rgba(239,68,68,0.07);"
                            [title]="'common.delete' | translate">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination-row">
          <button class="pagination-btn" [disabled]="filter.value().pageNumber <= 1" (click)="prevPage()">{{ 'common.back' | translate }}</button>
          <span class="pagination-info">{{ 'common.page' | translate }} {{ filter.value().pageNumber }}</span>
          <button class="pagination-btn" [disabled]="!hasMore()" (click)="nextPage()">{{ 'common.next' | translate }}</button>
        </div>
      }
    </div>

    <!-- Create / Edit Modal -->
    @if (showModal()) {
      <div class="modal-backdrop" (click)="closeModal()"></div>
      <div class="modal-box" style="max-width:520px">
        <h2 class="modal-title">{{ editingAgent() ? ('admin.agents.editAgent' | translate) : ('admin.agents.addAgent' | translate) }}</h2>

        @if (modalError()) {
          <div class="modal-error">{{ modalError() }}</div>
        }

        <div class="form-grid">
          <div class="form-field">
            <label class="form-label">{{ 'admin.agents.firstName' | translate }}</label>
            <input class="form-input" type="text" maxlength="50" [value]="form.firstName" (input)="form.firstName = $any($event.target).value" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.agents.lastName' | translate }}</label>
            <input class="form-input" type="text" maxlength="50" [value]="form.lastName" (input)="form.lastName = $any($event.target).value" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.agents.phone' | translate }}</label>
            <input class="form-input" type="tel" inputmode="numeric" maxlength="10"
              [value]="form.phoneNumber" (input)="form.phoneNumber = $any($event.target).value"
              [disabled]="editingAgent()?.isVerified === true" />
            @if (editingAgent()?.isVerified) {
              <p style="font-size:0.7rem;color:var(--text-faint);margin-top:4px">{{ 'admin.agents.phoneLockedHint' | translate }}</p>
            }
          </div>
          <div class="form-field">
            <label class="form-label">{{ 'admin.agents.email' | translate }}</label>
            <input class="form-input" type="email" [value]="form.email" (input)="form.email = $any($event.target).value" />
          </div>
          <div class="form-field form-field-full">
            <label class="form-label">{{ 'admin.agents.country' | translate }}</label>
            <div style="display:flex;gap:8px;margin-top:2px;flex-wrap:wrap">
              @for (c of countries; track c.value) {
                <label style="flex:1;min-width:100px;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;transition:border-color .15s,background .15s"
                  [style.borderColor]="form.country === c.value ? 'var(--nav-accent)' : 'var(--border)'"
                  [style.background]="form.country === c.value ? 'color-mix(in srgb, var(--nav-accent) 8%, transparent)' : 'transparent'">
                  <input type="radio" name="agentCountry" [value]="c.value" [checked]="form.country === c.value"
                    (change)="form.country = c.value" style="accent-color:var(--nav-accent)" />
                  <span style="font-weight:600;font-size:0.85rem">{{ c.label }}</span>
                </label>
              }
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-ghost" (click)="closeModal()" [disabled]="submitting()">{{ 'common.cancel' | translate }}</button>
          <button class="btn-primary" (click)="submit()" [disabled]="submitting()">
            {{ submitting() ? ('common.saving' | translate) : ('common.save' | translate) }}
          </button>
        </div>
      </div>
    }

    <!-- Delete Confirm Modal -->
    @if (deleteTarget()) {
      <div class="modal-backdrop" (click)="deleteTarget.set(null)"></div>
      <div class="modal-box" style="max-width:400px">
        <h2 class="modal-title">{{ 'admin.agents.confirmDelete' | translate }}</h2>
        <p style="font-size:0.875rem;color:var(--text-muted);margin-bottom:20px">
          {{ 'admin.agents.confirmDeleteMsg' | translate }} <strong>{{ deleteTarget()?.firstName }} {{ deleteTarget()?.lastName }}</strong>؟
        </p>
        @if (modalError()) { <div class="modal-error">{{ modalError() }}</div> }
        <div class="modal-actions">
          <button class="btn-ghost" (click)="deleteTarget.set(null)" [disabled]="submitting()">{{ 'common.cancel' | translate }}</button>
          <button class="btn-danger" (click)="deleteAgent()" [disabled]="submitting()">
            {{ submitting() ? ('common.deleting' | translate) : ('common.delete' | translate) }}
          </button>
        </div>
      </div>
    }
  `,
})
export class AgentsComponent implements OnInit {
  private readonly agentService = inject(AgentService);
  private readonly lang         = inject(LanguageService);

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    name:       '',
    pageNumber: 1,
    pageSize:   10,
  });

  agents    = signal<Agent[]>([]);
  loading   = signal(true);
  listError = signal<string | null>(null);
  hasMore   = signal(false);

  showModal    = signal(false);
  editingAgent = signal<Agent | null>(null);
  deleteTarget = signal<Agent | null>(null);
  submitting   = signal(false);
  modalError   = signal<string | null>(null);

  readonly countries: { value: Country; label: string }[] = [
    { value: Country.Libya, label: 'ليبيا' },
    { value: Country.Syria, label: 'سوريا' },
    { value: Country.Iraq,  label: 'العراق' },
  ];

  form: { firstName: string; lastName: string; phoneNumber: string; email: string; country: Country } =
    { firstName: '', lastName: '', phoneNumber: '', email: '', country: Country.Libya };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const { name, pageNumber, pageSize } = this.filter.value();
    this.agentService.getAll({ pageNumber, pageSize, name: name || undefined }).subscribe({
      next: res => {
        this.agents.set(res.items ?? []);
        this.hasMore.set(pageNumber * pageSize < res.totalCount);
        this.loading.set(false);
        this.listError.set(null);
      },
      error: (err: any) => { this.loading.set(false); this.listError.set(this.apiErr(err)); },
    });
  }

  onSearch(value: string): void {
    this.filter.set({ name: value });
    this.load();
  }

  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.load();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.load();
  }

  openCreate(): void {
    this.editingAgent.set(null);
    this.form = { firstName: '', lastName: '', phoneNumber: '', email: '', country: Country.Libya };
    this.modalError.set(null);
    this.showModal.set(true);
  }

  openEdit(agent: Agent): void {
    this.editingAgent.set(agent);
    this.form = {
      firstName: agent.firstName, lastName: agent.lastName,
      phoneNumber: agent.phoneNumber, email: agent.email ?? '', country: agent.country,
    };
    this.modalError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  submit(): void {
    if (!this.form.firstName.trim() || !this.form.lastName.trim()) {
      this.modalError.set(this.lang.t('admin.agents.nameRequired'));
      return;
    }
    if (!/^09\d{8}$/.test(this.form.phoneNumber)) {
      this.modalError.set(this.lang.t('validation.phone09'));
      return;
    }
    this.submitting.set(true);
    this.modalError.set(null);
    const editing = this.editingAgent();

    if (editing) {
      const payload: UpdateAgentRequest = {
        firstName: this.form.firstName, lastName: this.form.lastName,
        phoneNumber: this.form.phoneNumber, email: this.form.email || undefined, country: this.form.country,
      };
      this.agentService.update(editing.id, payload).subscribe({
        next: () => { this.submitting.set(false); this.closeModal(); this.load(); },
        error: (err: any) => { this.submitting.set(false); this.modalError.set(this.apiErr(err)); },
      });
    } else {
      const payload: CreateAgentRequest = {
        firstName: this.form.firstName, lastName: this.form.lastName,
        phoneNumber: this.form.phoneNumber, email: this.form.email || undefined, country: this.form.country,
        idempotencyKey: crypto.randomUUID(),
      };
      this.agentService.create(payload).subscribe({
        next: () => { this.submitting.set(false); this.closeModal(); this.filter.set({ pageNumber: 1 }); this.load(); },
        error: (err: any) => { this.submitting.set(false); this.modalError.set(this.apiErr(err)); },
      });
    }
  }

  confirmDelete(agent: Agent): void { this.deleteTarget.set(agent); this.modalError.set(null); }

  deleteAgent(): void {
    const t = this.deleteTarget();
    if (!t) return;
    this.submitting.set(true);
    this.agentService.delete(t.id).subscribe({
      next: () => { this.submitting.set(false); this.deleteTarget.set(null); this.load(); },
      error: (err: any) => { this.submitting.set(false); this.modalError.set(this.apiErr(err)); },
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  apiErr(err: any): string {
    if (err?.status === 0) return this.lang.t('errors.unexpected');
    const b = err?.error;
    if (!b) return this.lang.t('errors.unexpected');
    if (typeof b === 'string' && b.trim()) return b.trim();
    for (const k of ['title', 'message', 'detail']) { if (typeof b[k] === 'string' && b[k].trim()) return b[k]; }
    return this.lang.t('errors.unexpected');
  }
}

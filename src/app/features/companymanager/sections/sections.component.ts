import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { UrlFilter } from '../../../core/utils/url-filter';
import { SectionService } from '../../../core/services/section.service';
import { Section, GetSectionsParams } from '../../../core/models/section.models';

@Component({
  selector: 'app-sections',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './sections.component.html',
})
export class SectionsComponent implements OnInit {
  private readonly sectionService = inject(SectionService);
  private readonly fb             = inject(FormBuilder);
  private readonly route          = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private branchId = 0;
  branchName       = signal<string>('');

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    name:       '',
    code:       '',
    pageNumber: 1,
    pageSize:   10,
  });

  sections   = signal<Section[]>([]);
  loading    = signal(true);
  hasMore    = signal(false);
  successMsg = signal<string | null>(null);
  listError  = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  showAddModal    = signal(false);
  showEditModal   = signal(false);
  showDeleteModal = signal(false);
  selected        = signal<Section | null>(null);
  deleteTargetId  = signal<number | null>(null);

  addForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    code: ['', [Validators.required, Validators.maxLength(20)]],
  });

  editForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    code: ['', [Validators.required, Validators.maxLength(20)]],
  });

  ngOnInit(): void {
    this.branchId = Number(this.route.snapshot.paramMap.get('branchId'));
    const state = history.state as { branchName?: string };
    if (state?.branchName) this.branchName.set(state.branchName);
    this.loadSections();
  }

  loadSections(): void {
    this.loading.set(true);
    const { name, code, pageNumber, pageSize } = this.filter.value();
    const params: GetSectionsParams = { pageSize, pageNumber, branchId: this.branchId };
    if (name.trim()) params.name = name.trim();
    if (code.trim()) params.code = code.trim();

    this.sectionService.getAll(params).subscribe({
      next: (res: any) => {
        this.listError.set(null);
        if (res?.isSuccess === false) {
          this.listError.set(res.message || 'Failed to load sections.');
          this.loading.set(false);
          return;
        }
        const raw   = res?.data ?? res;
        const items: Section[] = Array.isArray(raw)
          ? raw
          : (raw?.items ?? raw?.data ?? raw?.sections ?? []);
        const total = raw?.totalCount ?? items.length;
        this.sections.set(items);
        this.hasMore.set(this.filter.value().pageNumber * this.filter.value().pageSize < total);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'Failed to load sections.'));
      },
    });
  }

  viewEmployees(section: Section): void {
    this.router.navigate(
      ['/dashboard/manager/branches', this.branchId, 'sections', section.id, 'employees'],
      { state: { sectionName: section.name, branchId: this.branchId } }
    );
  }

  onSearchName(value: string): void { this.filter.set({ name: value }); this.loadSections(); }
  onSearchCode(value: string): void { this.filter.set({ code: value }); this.loadSections(); }

  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.loadSections();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.loadSections();
  }

  openAdd(): void {
    this.addForm.reset();
    this.modalError.set(null);
    this.showAddModal.set(true);
  }

  submitAdd(): void {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.modalError.set(null);

    const v = this.addForm.value;
    this.sectionService.create({
      branchId:       this.branchId,
      name:           v.name!,
      code:           v.code!,
      idempotencyKey: crypto.randomUUID(),
    }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.isSuccess === false) { this.modalError.set(res.message || 'Failed to add section.'); return; }
        if (res?.data != null || res?.id != null || res?.isSuccess === true) {
          this.showAddModal.set(false);
          this.flash('Section added successfully!');
          this.filter.patch({ pageNumber: 1 });
          this.loadSections();
        } else {
          this.modalError.set(res?.message || 'Failed to add section.');
        }
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to add section.')); },
    });
  }

  openEdit(section: Section, event: Event): void {
    event.stopPropagation();
    this.selected.set(section);
    this.editForm.patchValue({ name: section.name, code: section.code });
    this.modalError.set(null);
    this.showEditModal.set(true);
  }

  submitEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const id = this.selected()?.id;
    if (!id) return;
    this.submitting.set(true);
    this.modalError.set(null);

    const v = this.editForm.value;
    this.sectionService.update(id, { name: v.name || undefined, code: v.code || undefined }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.isSuccess === false) { this.modalError.set(res.message || 'Update failed.'); return; }
        this.showEditModal.set(false);
        this.flash('Section updated.');
        this.loadSections();
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Update failed.')); },
    });
  }

  confirmDelete(id: number, event: Event): void {
    event.stopPropagation();
    this.deleteTargetId.set(id);
    this.showDeleteModal.set(true);
  }

  executeDelete(): void {
    const id = this.deleteTargetId();
    if (id === null) return;
    this.submitting.set(true);
    this.sectionService.delete(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        this.sections.update(list => list.filter(s => s.id !== id));
        this.flash('Section deleted.');
      },
      error: () => { this.submitting.set(false); this.showDeleteModal.set(false); },
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
        const m = (Object.values(body.errors) as unknown[]).flat().filter((s): s is string => typeof s === 'string').join('. ');
        if (m) return m;
      }
    }
    switch (err?.status) {
      case 401: return 'Session expired.';
      case 403: return 'You do not have permission.';
      case 404: return 'Section or branch not found.';
      case 409: return 'A section with this code already exists in this branch.';
      case 412: return 'No changes detected or record already deleted.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}

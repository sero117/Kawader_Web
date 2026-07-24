import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { UrlFilter } from '../../../core/utils/url-filter';
import { BranchService } from '../../../core/services/branch.service';
import { VisitTrackingService } from '../../../core/services/visit-tracking.service';
import { Branch, GetBranchesParams } from '../../../core/models/branch.models';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './branches.component.html',
})
export class BranchesComponent implements OnInit {
  private readonly branchService  = inject(BranchService);
  private readonly visitTracking  = inject(VisitTrackingService);
  private readonly fb             = inject(FormBuilder);
  private readonly router         = inject(Router);

  filter = new UrlFilter(inject(ActivatedRoute), inject(Router), {
    name:       '',
    code:       '',
    pageNumber: 1,
    pageSize:   10,
  });

  branches   = signal<Branch[]>([]);
  loading    = signal(true);
  hasMore    = signal(false);
  successMsg = signal<string | null>(null);
  listError  = signal<string | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);

  showAddModal    = signal(false);
  showEditModal   = signal(false);
  showDeleteModal = signal(false);
  selected        = signal<Branch | null>(null);
  deleteTargetId  = signal<number | null>(null);

  addForm = this.fb.group({
    name:      ['', [Validators.required, Validators.maxLength(200)]],
    code:      ['', [Validators.required, Validators.maxLength(20)]],
    address:   ['', [Validators.maxLength(500)]],
    city:      ['', [Validators.maxLength(100)]],
    latitude:  [null as number | null, [Validators.min(-90),  Validators.max(90)]],
    longitude: [null as number | null, [Validators.min(-180), Validators.max(180)]],
  });

  editForm = this.fb.group({
    name:      ['', [Validators.required, Validators.maxLength(200)]],
    code:      ['', [Validators.required, Validators.maxLength(20)]],
    address:   ['', [Validators.maxLength(500)]],
    city:      ['', [Validators.maxLength(100)]],
    latitude:  [null as number | null, [Validators.min(-90),  Validators.max(90)]],
    longitude: [null as number | null, [Validators.min(-180), Validators.max(180)]],
  });

  locatingAdd    = signal(false);
  locatingEdit   = signal(false);
  locationError  = signal<string | null>(null);

  ngOnInit(): void { this.loadBranches(); }

  /** "Use my location" for either the add or edit form — auto-fills lat/long,
   *  manual entry into the same fields is still allowed. */
  useMyLocation(target: 'add' | 'edit'): void {
    const locating = target === 'add' ? this.locatingAdd : this.locatingEdit;
    const form     = target === 'add' ? this.addForm      : this.editForm;

    if (!navigator.geolocation) {
      this.locationError.set('setup.geoUnsupported');
      return;
    }
    locating.set(true);
    this.locationError.set(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        locating.set(false);
        form.patchValue({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        locating.set(false);
        this.locationError.set('setup.geoDenied');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  loadBranches(): void {
    this.loading.set(true);
    const { name, code, pageNumber, pageSize } = this.filter.value();
    const params: GetBranchesParams = { pageSize, pageNumber };
    if (name.trim()) params.name = name.trim();
    if (code.trim()) params.code = code.trim();

    this.branchService.getAll(params).subscribe({
      next: (res: any) => {
        this.listError.set(null);
        if (res?.isSuccess === false) {
          this.listError.set(res.message || 'Failed to load branches.');
          this.loading.set(false);
          return;
        }
        const raw   = res?.data ?? res;
        const items: Branch[] = Array.isArray(raw)
          ? raw
          : (raw?.items ?? raw?.data ?? raw?.branches ?? []);
        const total = raw?.totalCount ?? items.length;
        this.branches.set(items);
        this.hasMore.set(this.filter.value().pageNumber * this.filter.value().pageSize < total);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.listError.set(this.apiErr(err, 'Failed to load branches.'));
      },
    });
  }

  onSearchName(value: string): void { this.filter.set({ name: value }); this.loadBranches(); }
  onSearchCode(value: string): void { this.filter.set({ code: value }); this.loadBranches(); }

  prevPage(): void {
    if (this.filter.value().pageNumber <= 1) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber - 1 });
    this.loadBranches();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.filter.patch({ pageNumber: this.filter.value().pageNumber + 1 });
    this.loadBranches();
  }

  viewSections(branch: Branch): void {
    this.visitTracking.recordBranchVisit(branch.id);
    const base = this.router.url.startsWith('/dashboard/hr') ? '/dashboard/hr' : '/dashboard/manager';
    this.router.navigate([base + '/branches', branch.id, 'sections']);
  }

  lastVisitLabel(branchId: number): string {
    return this.visitTracking.formatTimeAgo(this.visitTracking.getLastBranchVisit(branchId));
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
    this.branchService.create({
      name:           v.name!,
      code:           v.code!,
      address:        v.address || undefined,
      city:           v.city    || undefined,
      latitude:       v.latitude  ?? undefined,
      longitude:      v.longitude ?? undefined,
      idempotencyKey: crypto.randomUUID(),
    }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.isSuccess === false) { this.modalError.set(res.message || 'Failed to add branch.'); return; }
        if (res?.data != null || res?.id != null || res?.isSuccess === true) {
          this.showAddModal.set(false);
          this.flash('Branch added successfully!');
          this.filter.patch({ pageNumber: 1 });
          this.loadBranches();
        } else {
          this.modalError.set(res?.message || 'Failed to add branch.');
        }
      },
      error: err => { this.submitting.set(false); this.modalError.set(this.apiErr(err, 'Failed to add branch.')); },
    });
  }

  openEdit(branch: Branch, event: Event): void {
    event.stopPropagation();
    this.selected.set(branch);
    this.editForm.patchValue({
      name:      branch.name,
      code:      branch.code,
      address:   branch.address  ?? '',
      city:      branch.city     ?? '',
      latitude:  branch.latitude  ?? null,
      longitude: branch.longitude ?? null,
    });
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
    this.branchService.update(id, {
      name:      v.name      || undefined,
      code:      v.code      || undefined,
      address:   v.address   || undefined,
      city:      v.city      || undefined,
      latitude:  v.latitude  ?? undefined,
      longitude: v.longitude ?? undefined,
    }).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.isSuccess === false) { this.modalError.set(res.message || 'Update failed.'); return; }
        this.showEditModal.set(false);
        this.flash('Branch updated.');
        this.loadBranches();
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
    this.branchService.delete(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDeleteModal.set(false);
        this.branches.update(list => list.filter(b => b.id !== id));
        this.flash('Branch deleted.');
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
      case 404: return 'Branch not found.';
      case 409: return 'A branch with this code already exists.';
      case 412: return 'No changes detected or record already deleted.';
      case 500: return 'Server error. Please try again later.';
      default:  return fallback;
    }
  }
}

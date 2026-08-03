import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { EmployeeService } from '../../../../core/services/employee.service';
import { AttachmentType } from '../../../../core/models/employee.models';

@Component({
  selector: 'app-employee-attachments',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './employee-attachments.component.html',
})
export class EmployeeAttachmentsComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly lang            = inject(LanguageService);
  private readonly route           = inject(ActivatedRoute);

  employeeId = 0;

  readonly AttachmentType = AttachmentType;

  loading            = signal(true);
  pendingAttachType  = signal<AttachmentType | null>(null);
  uploadingType      = signal<AttachmentType | null>(null);
  deletingAttachType = signal<AttachmentType | null>(null);
  attachmentError    = signal<string | null>(null);
  attachedTypes      = signal<Set<AttachmentType>>(new Set());
  attachmentUrls     = signal<Map<AttachmentType, string>>(new Map());
  previewImageUrl    = signal<string | null>(null);

  readonly attachmentList: { type: AttachmentType; labelKey: string }[] = [
    { type: AttachmentType.IdentityPhoto,       labelKey: 'manager.attachmentTypes.0' },
    { type: AttachmentType.PersonalPhoto,       labelKey: 'manager.attachmentTypes.1' },
    { type: AttachmentType.WorkContract,        labelKey: 'manager.attachmentTypes.2' },
    { type: AttachmentType.Certificate,         labelKey: 'manager.attachmentTypes.3' },
    { type: AttachmentType.Qualifications,      labelKey: 'manager.attachmentTypes.4' },
    { type: AttachmentType.HealthCard,          labelKey: 'manager.attachmentTypes.5' },
    { type: AttachmentType.ProfessionalLicense, labelKey: 'manager.attachmentTypes.6' },
  ];

  ngOnInit(): void {
    this.employeeId = Number(this.route.parent!.snapshot.paramMap.get('employeeId'));
    this.loading.set(true);
    this.employeeService.getAttachments(this.employeeId).subscribe({
      next: (list: any) => {
        const items: any[] = Array.isArray(list) ? list : (list?.data ?? []);
        const types = new Set<AttachmentType>();
        const urls = new Map<AttachmentType, string>();
        for (const a of items) {
          types.add(a.type);
          if (a.url) urls.set(a.type, a.url);
        }
        this.attachedTypes.set(types);
        this.attachmentUrls.set(urls);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); },
    });
  }

  isImageAttachment(url: string): boolean {
    return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url);
  }

  openImagePreview(url: string, event: Event): void {
    event.stopPropagation();
    this.previewImageUrl.set(url);
  }

  closeImagePreview(): void {
    this.previewImageUrl.set(null);
  }

  triggerAttachmentUpload(type: AttachmentType): void {
    this.pendingAttachType.set(type);
    this.attachmentError.set(null);
    const input = document.getElementById('emp-att-input') as HTMLInputElement | null;
    if (input) { input.value = ''; input.click(); }
  }

  onAttachmentFile(event: Event): void {
    const type = this.pendingAttachType();
    if (type === null) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      this.attachmentError.set(this.lang.t('manager.editEmployee.fileTypeError'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.attachmentError.set(this.lang.t('manager.editEmployee.fileSizeError'));
      return;
    }

    this.uploadingType.set(type);
    this.attachmentError.set(null);

    this.employeeService.uploadAttachment(this.employeeId, file, type).subscribe({
      next: (url: string) => {
        this.uploadingType.set(null);
        this.attachedTypes.update(s => new Set([...s, type]));
        this.attachmentUrls.update(m => new Map(m).set(type, url));
      },
      error: () => { this.uploadingType.set(null); },
    });
  }

  removeAttachment(type: AttachmentType): void {
    this.deletingAttachType.set(type);
    this.attachmentError.set(null);

    this.employeeService.deleteAttachment(this.employeeId, type).subscribe({
      next: () => {
        this.deletingAttachType.set(null);
        this.attachedTypes.update(s => { const n = new Set(s); n.delete(type); return n; });
        this.attachmentUrls.update(m => { const n = new Map(m); n.delete(type); return n; });
      },
      error: () => { this.deletingAttachType.set(null); },
    });
  }
}

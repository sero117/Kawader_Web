/** The .NET backend's model-validation errors (FluentValidation / DataAnnotations)
 *  come back in English regardless of the `language` header, in a handful of
 *  well-known templates (e.g. "'Age' must be greater than '15'."). This maps
 *  those known templates to Arabic; anything it doesn't recognize is returned
 *  unchanged rather than guessed at. */

const FIELD_NAMES_AR: Record<string, string> = {
  Age:             'العمر',
  BirthDate:       'تاريخ الميلاد',
  FirstName:       'الاسم الأول',
  LastName:        'اسم العائلة',
  PhoneNumber:      'رقم الهاتف',
  Email:           'البريد الإلكتروني',
  Password:        'كلمة المرور',
  ConfirmPassword: 'تأكيد كلمة المرور',
  BaseSalary:      'الراتب الأساسي',
  HireDate:        'تاريخ التوظيف',
  JobTitle:        'المسمى الوظيفي',
  EmployeeNumber:  'الرقم الوظيفي',
  Name:            'الاسم',
  CompanyName:     'اسم الشركة',
  Address:         'العنوان',
  Code:            'الرمز',
  Notes:           'الملاحظات',
  Priority:        'الأولوية',
  Count:           'العدد',
  Price:           'السعر',
  Rate:            'السعر',
  StartDate:       'تاريخ البداية',
  EndDate:         'تاريخ النهاية',
  Date:            'التاريخ',
};

function fieldAr(name: string): string {
  return FIELD_NAMES_AR[name] ?? name;
}

const NUM = "'?(-?\\d+(?:\\.\\d+)?)'?";
const FIELD = "'?([A-Za-z]+)'?";

const PATTERNS: { re: RegExp; ar: (m: RegExpMatchArray) => string }[] = [
  { re: new RegExp(`^${FIELD}\\s+must be greater than or equal to\\s+${NUM}\\.?$`, 'i'),
    ar: m => `يجب أن يكون ${fieldAr(m[1])} أكبر من أو يساوي ${m[2]}.` },
  { re: new RegExp(`^${FIELD}\\s+must be less than or equal to\\s+${NUM}\\.?$`, 'i'),
    ar: m => `يجب أن يكون ${fieldAr(m[1])} أقل من أو يساوي ${m[2]}.` },
  { re: new RegExp(`^${FIELD}\\s+must be greater than\\s+${NUM}\\.?$`, 'i'),
    ar: m => `يجب أن يكون ${fieldAr(m[1])} أكبر من ${m[2]}.` },
  { re: new RegExp(`^${FIELD}\\s+must be less than\\s+${NUM}\\.?$`, 'i'),
    ar: m => `يجب أن يكون ${fieldAr(m[1])} أقل من ${m[2]}.` },
  { re: new RegExp(`^${FIELD}\\s+must be between\\s+${NUM}\\s+and\\s+${NUM}\\.?$`, 'i'),
    ar: m => `يجب أن يكون ${fieldAr(m[1])} بين ${m[2]} و${m[3]}.` },
  { re: new RegExp(`^the length of\\s+${FIELD}\\s+must be (?:at least\\s+)?(\\d+)\\s+characters?\\.?`, 'i'),
    ar: m => `يجب ألا يقل طول ${fieldAr(m[1])} عن ${m[2]} حرفاً.` },
  { re: new RegExp(`^${FIELD}\\s+must be (\\d+) characters? or fewer\\.?$`, 'i'),
    ar: m => `يجب ألا يتجاوز ${fieldAr(m[1])} ${m[2]} حرفاً.` },
  { re: new RegExp(`^${FIELD}\\s+is not a valid .*\\.?$`, 'i'),
    ar: m => `${fieldAr(m[1])} غير صالح.` },
  { re: new RegExp(`^'?${FIELD}'?\\s+must not be empty\\.?$`, 'i'),
    ar: m => `${fieldAr(m[1])} مطلوب.` },
  { re: new RegExp(`^the\\s+${FIELD}\\s+field is required\\.?$`, 'i'),
    ar: m => `${fieldAr(m[1])} مطلوب.` },
  { re: new RegExp(`^${FIELD}\\s+is required\\.?$`, 'i'),
    ar: m => `${fieldAr(m[1])} مطلوب.` },
];

function translateOne(msg: string): string {
  const trimmed = msg.trim();
  for (const { re, ar } of PATTERNS) {
    const m = trimmed.match(re);
    if (m) return ar(m);
  }
  return msg;
}

/** Multiple validation messages are often joined with '. ' — translate each
 *  independently so a partial match doesn't block the rest. */
export function translateBackendMessage(raw: string | null | undefined): string {
  if (!raw) return raw ?? '';
  const parts = raw.split(/(?<=\.)\s+(?=[A-Z'])/).map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return translateOne(raw);
  return parts.map(translateOne).join(' ');
}

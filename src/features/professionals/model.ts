export type ProfessionalStatus =
  "draft" | "pending_review" | "changes_requested" | "approved" | "suspended";

export type ProfessionalProfileForm = {
  account_type: "company" | "individual";
  business_name: string;
  contact_name: string;
  phone: string;
  city: string;
  province: string;
  postal_code: string;
  website: string;
  google_maps_url: string;
  services: string[];
  service_areas: string;
};

export type ProfessionalAccount = Omit<ProfessionalProfileForm, "service_areas"> & {
  id: string;
  user_id: string;
  email: string;
  service_areas: string[];
  preferred_language: "en" | "fr";
  review_status: ProfessionalStatus;
  review_message: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentCategory = "business_registration" | "insurance" | "trade_licence" | "other";
export type ProfessionalDocument = {
  id: string;
  account_id: string;
  category: DocumentCategory;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

export const PROFESSIONAL_SERVICE_OPTIONS = [
  { value: "cleaning", en: "Cleaning", fr: "Nettoyage" },
  { value: "moving", en: "Moving", fr: "Déménagement" },
  { value: "junk_removal", en: "Junk removal", fr: "Débarras" },
  { value: "furniture_assembly", en: "Furniture assembly", fr: "Montage de meubles" },
  { value: "vehicle_detailing", en: "Vehicle detailing", fr: "Esthétique automobile" },
  { value: "tire_change", en: "Seasonal tire change", fr: "Changement de pneus" },
  { value: "snow_removal", en: "Snow removal", fr: "Déneigement" },
  { value: "landscaping", en: "Yard care and gardening", fr: "Entretien extérieur et jardinage" },
  { value: "handyman", en: "Minor repairs and maintenance", fr: "Petits travaux et entretien" },
  { value: "tutoring", en: "Tutoring and lessons", fr: "Tutorat et cours" },
  { value: "coaching", en: "Coaching", fr: "Accompagnement et coaching" },
  { value: "driving_instruction", en: "Driving lessons", fr: "Cours de conduite" },
  { value: "real_estate", en: "Real estate brokerage", fr: "Courtage immobilier" },
  { value: "other", en: "Other services", fr: "Autres services" },
] as const;

export const CANADIAN_PROVINCES = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
] as const;

export const EMPTY_PROFESSIONAL_PROFILE: ProfessionalProfileForm = {
  account_type: "company",
  business_name: "",
  contact_name: "",
  phone: "",
  city: "",
  province: "ON",
  postal_code: "",
  website: "",
  google_maps_url: "",
  services: [],
  service_areas: "",
};

export function isProfessionalEditable(status?: ProfessionalStatus) {
  return !status || status === "draft" || status === "changes_requested";
}

export function professionalStatusLabel(status: ProfessionalStatus, language: "en" | "fr" = "en") {
  const labels: Record<ProfessionalStatus, [string, string]> = {
    draft: ["Draft", "Brouillon"],
    pending_review: ["Under review", "En cours d’examen"],
    changes_requested: ["Changes requested", "Modifications demandées"],
    approved: ["Application approved", "Dossier approuvé"],
    suspended: ["Account suspended", "Compte suspendu"],
  };
  return labels[status]?.[language === "fr" ? 1 : 0] ?? status;
}

export function profileToForm(account: ProfessionalAccount): ProfessionalProfileForm {
  return {
    account_type: account.account_type,
    business_name: account.business_name ?? "",
    contact_name: account.contact_name ?? "",
    phone: account.phone ?? "",
    city: account.city ?? "",
    province: account.province ?? "ON",
    postal_code: account.postal_code ?? "",
    website: account.website ?? "",
    google_maps_url: account.google_maps_url ?? "",
    services: account.services ?? [],
    service_areas: (account.service_areas ?? []).join(", "),
  };
}

export function professionalProfilePayload(form: ProfessionalProfileForm, language: "en" | "fr") {
  return {
    account_type: form.account_type,
    business_name: form.business_name.trim() || form.contact_name.trim(),
    contact_name: form.contact_name.trim(),
    phone: form.phone.trim(),
    city: form.city.trim(),
    province: form.province,
    postal_code: form.postal_code
      .replace(/\s/g, "")
      .toUpperCase()
      .replace(/^(.{3})(.{3})$/, "$1 $2"),
    website: form.website.trim() || null,
    google_maps_url: form.google_maps_url?.trim() || null,
    services: [...new Set(form.services)],
    service_areas: [
      ...new Set(
        form.service_areas
          .split(",")
          .map((area) => area.trim())
          .filter(Boolean),
      ),
    ],
    preferred_language: language,
  };
}

export function validateProfessionalProfile(
  form: ProfessionalProfileForm,
): (keyof ProfessionalProfileForm)[] {
  const invalid: (keyof ProfessionalProfileForm)[] = [];
  if (form.account_type === "company" && !form.business_name.trim()) invalid.push("business_name");
  if (!form.contact_name.trim()) invalid.push("contact_name");
  const digits = form.phone.replace(/\D/g, "");
  if (!(digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))))
    invalid.push("phone");
  if (!form.city.trim()) invalid.push("city");
  if (!(CANADIAN_PROVINCES as readonly string[]).includes(form.province)) invalid.push("province");
  if (
    !/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\s?\d[ABCEGHJ-NPRSTV-Z]\d$/i.test(
      form.postal_code.trim(),
    )
  )
    invalid.push("postal_code");
  if (form.google_maps_url?.trim() && !googleListingUrl(form.google_maps_url.trim())) invalid.push("google_maps_url");
  if (form.website.trim()) {
    try {
      const url = new URL(form.website.trim());
      if (!["https:", "http:"].includes(url.protocol) || !url.hostname.includes("."))
        invalid.push("website");
    } catch {
      invalid.push("website");
    }
  }
  if (!form.services.length || form.services.length > 30) invalid.push("services");
  const areas = professionalProfilePayload(form, "en").service_areas;
  if (!areas.length || areas.length > 30 || areas.some((area) => area.length > 100))
    invalid.push("service_areas");
  return invalid;
}

export const MAX_PROFESSIONAL_DOCUMENT_BYTES = 8 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
};

export function validateProfessionalDocument(file: {
  name: string;
  type: string;
  size: number;
}): "size" | "type" | null {
  if (file.size <= 0 || file.size > MAX_PROFESSIONAL_DOCUMENT_BYTES) return "size";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_EXTENSIONS[file.type]?.includes(extension) ? null : "type";
}

export function professionalDocumentPath(
  userId: string,
  accountId: string,
  documentId: string,
  fileName: string,
) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (![userId, accountId, documentId].every((id) => uuid.test(id)))
    throw new Error("Invalid document owner.");
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!["pdf", "jpg", "jpeg", "png"].includes(extension)) throw new Error("Invalid document type.");
  return `${userId}/${accountId}/${documentId}.${extension}`;
}

export function googleListingUrl(value: string | null | undefined): string | null {
  if (!value || value.length > 2048 || /[\\\s]/.test(value)) return null;
  const valid = /^https:\/\/(?:maps\.app\.goo\.gl\/[A-Za-z0-9_-]+\/?$|goo\.gl\/maps\/[A-Za-z0-9_-]+\/?$|(?:(?:www|maps)\.)?google\.(?:com|ca)\/maps\/(?:place|search)\/|(?:(?:www|maps)\.)?google\.(?:com|ca)\/maps\/?\?cid=\d+$|maps\.google\.(?:com|ca)\/\?cid=\d+$)/.test(value);
  return valid ? value : null;
}

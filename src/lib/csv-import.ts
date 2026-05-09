/**
 * CSV import utilities for GOED spreadsheet data.
 * Parses Google Sheets exports into Supabase-compatible rows.
 */
import Papa from "papaparse";

// ─── Resource import ───────────────────────────────────────────

export interface ResourceRow {
  title: string;
  description: string | null;
  link: string | null;
  email: string | null;
  image_url: string | null;
  topics: string[];
  industries: string[];
  communities: string[];
  locations: string[];
  external_id: string | null;
  is_active: boolean;
}

/** Column-mapping config for the GOED resources spreadsheet */
const RESOURCE_COL_MAP: Record<string, keyof ResourceRow | "_array_topics" | "_array_industries" | "_array_communities" | "_array_locations"> = {
  // Primary mappings (case-insensitive header matching)
  "title": "title",
  "name": "title",
  "resource name": "title",
  "resource": "title",
  "description": "description",
  "link": "link",
  "url": "link",
  "website": "link",
  "email": "email",
  "contact email": "email",
  "image": "image_url",
  "image url": "image_url",
  "logo": "image_url",
  "topics": "_array_topics",
  "topic": "_array_topics",
  "category": "_array_topics",
  "categories": "_array_topics",
  "type": "_array_topics",
  "industries": "_array_industries",
  "industry": "_array_industries",
  "sector": "_array_industries",
  "communities": "_array_communities",
  "community": "_array_communities",
  "audience": "_array_communities",
  "locations": "_array_locations",
  "location": "_array_locations",
  "region": "_array_locations",
  "county": "_array_locations",
  "id": "external_id",
  "external id": "external_id",
};

function parseArrayField(val: string): string[] {
  if (!val) return [];
  // Handle both comma-separated and semicolon-separated
  return val
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseResourceCSV(csvText: string): { rows: ResourceRow[]; errors: string[] } {
  const errors: string[] = [];
  const { data, errors: parseErrors } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parseErrors.length) {
    errors.push(...parseErrors.map((e) => `Row ${e.row}: ${e.message}`));
  }

  const rows: ResourceRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const raw = data[i];
    const row: Partial<ResourceRow> = {
      is_active: true,
      topics: [],
      industries: [],
      communities: [],
      locations: [],
    };

    for (const [csvCol, value] of Object.entries(raw)) {
      const mapped = RESOURCE_COL_MAP[csvCol.toLowerCase().trim()];
      if (!mapped) continue;

      if (mapped === "_array_topics") {
        row.topics = [...(row.topics || []), ...parseArrayField(value)];
      } else if (mapped === "_array_industries") {
        row.industries = [...(row.industries || []), ...parseArrayField(value)];
      } else if (mapped === "_array_communities") {
        row.communities = [...(row.communities || []), ...parseArrayField(value)];
      } else if (mapped === "_array_locations") {
        row.locations = [...(row.locations || []), ...parseArrayField(value)];
      } else {
        (row as any)[mapped] = value.trim() || null;
      }
    }

    if (!row.title) {
      errors.push(`Row ${i + 2}: Missing title — skipped`);
      continue;
    }

    rows.push(row as ResourceRow);
  }

  return { rows, errors };
}

// ─── Company import ────────────────────────────────────────────

export interface CompanyRow {
  name: string;
  description: string | null;
  website: string | null;
  sector: string | null;
  stage: string | null;
  full_address: string | null;
  latitude: number | null;
  longitude: number | null;
  year_founded: number | null;
  employee_count: string | null;
  hiring_status: boolean;
  linkedin_url: string | null;
  logo_url: string | null;
  status: string;
}

const COMPANY_COL_MAP: Record<string, keyof CompanyRow> = {
  "name": "name",
  "company": "name",
  "company name": "name",
  "description": "description",
  "website": "website",
  "url": "website",
  "sector": "sector",
  "industry": "sector",
  "stage": "stage",
  "address": "full_address",
  "full address": "full_address",
  "city": "full_address",
  "location": "full_address",
  "latitude": "latitude",
  "lat": "latitude",
  "longitude": "longitude",
  "lng": "longitude",
  "lon": "longitude",
  "year founded": "year_founded",
  "founded": "year_founded",
  "year": "year_founded",
  "employees": "employee_count",
  "employee count": "employee_count",
  "team size": "employee_count",
  "size": "employee_count",
  "hiring": "hiring_status",
  "hiring status": "hiring_status",
  "linkedin": "linkedin_url",
  "linkedin url": "linkedin_url",
  "logo": "logo_url",
  "logo url": "logo_url",
};

export function parseCompanyCSV(csvText: string): { rows: CompanyRow[]; errors: string[] } {
  const errors: string[] = [];
  const { data, errors: parseErrors } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parseErrors.length) {
    errors.push(...parseErrors.map((e) => `Row ${e.row}: ${e.message}`));
  }

  const rows: CompanyRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const raw = data[i];
    const row: Partial<CompanyRow> = {
      hiring_status: false,
      status: "active",
    };

    for (const [csvCol, value] of Object.entries(raw)) {
      const mapped = COMPANY_COL_MAP[csvCol.toLowerCase().trim()];
      if (!mapped) continue;

      if (mapped === "latitude" || mapped === "longitude") {
        const n = parseFloat(value);
        (row as any)[mapped] = isNaN(n) ? null : n;
      } else if (mapped === "year_founded") {
        const n = parseInt(value, 10);
        (row as any)[mapped] = isNaN(n) ? null : n;
      } else if (mapped === "hiring_status") {
        row.hiring_status = ["true", "yes", "1", "hiring"].includes(value.toLowerCase().trim());
      } else {
        (row as any)[mapped] = value.trim() || null;
      }
    }

    if (!row.name) {
      errors.push(`Row ${i + 2}: Missing company name — skipped`);
      continue;
    }

    rows.push(row as CompanyRow);
  }

  return { rows, errors };
}

// ─── Import stats ──────────────────────────────────────────────

export interface ImportStats {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}

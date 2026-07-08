// NDIS Invoice data model, support item codes, and line-item types.
// Consumed by invoicePDF.ts (builder) and /api/invoices/generate (route).

// ── NDIS Support Item Codes ────────────────────────────────────────────────
// Maps OpenCare service types to NDIA support item registration numbers.
// Format: {SupportCategory}_{ItemCode}_{RegistrationGroup}_{SupportPurpose}_{Unit}

export interface NDISSupportCode {
  itemNumber:      string;   // e.g. "01_011_0107_1_1"
  supportCategory: string;   // e.g. "01 — Assistance with Daily Life"
  supportPurpose:  string;   // e.g. "Daily Activities"
  unit:            'H' | 'EA' | 'D'; // Hour / Each / Day
}

export const NDIS_SUPPORT_CODES: Record<string, NDISSupportCode> = {
  'Personal Care': {
    itemNumber:      '01_011_0107_1_1',
    supportCategory: '01 — Assistance with Daily Life',
    supportPurpose:  'Daily Activities',
    unit:            'H',
  },
  'Community Access': {
    itemNumber:      '04_210_0125_6_1',
    supportCategory: '04 — Assistance with Social & Community Participation',
    supportPurpose:  'Social & Community Participation',
    unit:            'H',
  },
  'Domestic Assistance': {
    itemNumber:      '01_019_0107_1_1',
    supportCategory: '01 — Assistance with Daily Life',
    supportPurpose:  'Daily Activities',
    unit:            'H',
  },
  'Cleaning': {
    itemNumber:      '01_019_0107_1_1',
    supportCategory: '01 — Assistance with Daily Life',
    supportPurpose:  'Daily Activities',
    unit:            'H',
  },
  'Gardening': {
    itemNumber:      '01_029_0107_1_1',
    supportCategory: '01 — Assistance with Daily Life',
    supportPurpose:  'Daily Activities',
    unit:            'H',
  },
  'OT Assessment': {
    itemNumber:      '15_048_0128_1_3',
    supportCategory: '15 — Improved Daily Living Skills',
    supportPurpose:  'Capacity Building',
    unit:            'H',
  },
};

export function resolveNDISCode(serviceType: string): NDISSupportCode {
  return NDIS_SUPPORT_CODES[serviceType] ?? {
    itemNumber:      '01_011_0107_1_1',
    supportCategory: '01 — Assistance with Daily Life',
    supportPurpose:  'Daily Activities',
    unit:            'H',
  };
}

// ── Invoice data model ─────────────────────────────────────────────────────

export interface NDISInvoiceProvider {
  name:       string;
  abn:        string;
  address:    string;
  contact:    string;
  ndisNumber: string;  // NDIS provider registration number
}

export interface NDISInvoiceParticipant {
  id:               string;
  name:             string;
  ndisNumber:       string;  // participant NDIS plan number
  suburb:           string;
  primaryDiagnosis: string;
}

export interface NDISInvoiceWorker {
  id:                      string;
  name:                    string;
  category:                string;
  backgroundCheckVerified: boolean;
}

export interface NDISLineItem {
  description:     string;
  ndisItemNumber:  string;
  supportCategory: string;
  hours:           number;
  hourlyRate:      number;
  subtotal:        number;  // hours × hourlyRate
  gst:             number;  // always 0 for NDIS (GST-free supply)
}

export interface NDISInvoice {
  // Identity
  invoiceNumber:    string;   // INV-{YYYYMMDD}-{shiftId}
  shiftId:          string;
  bookingId:        string | null;
  issueDate:        string;   // DD MMM YYYY
  dueDate:          string;   // 30 days from issue
  generatedAt:      string;   // ISO

  // Parties
  provider:         NDISInvoiceProvider;
  participant:      NDISInvoiceParticipant;
  worker:           NDISInvoiceWorker;

  // Service
  serviceDate:      string;   // DD MMM YYYY
  serviceType:      string;
  serviceAddress:   string;
  ndisCode:         string;   // NDIS item number
  supportPurpose:   string;
  supportCategory:  string;
  clockIn:          string;
  clockOut:         string;
  durationHours:    number;
  gpsVerified:      boolean;

  // Amounts (AUD)
  hourlyRate:       number;
  lineItems:        NDISLineItem[];
  participantTotal: number;   // hourlyRate × 1.05 × hours
  workerPayout:     number;   // hourlyRate × 0.925 × hours
  platformFee:      number;   // 12.5% of hourlyRate × hours
  gstTotal:         number;   // always 0
}

// ── Response shape returned by /api/invoices/generate ─────────────────────

export interface InvoiceGenerateResponse {
  invoiceNumber: string;
  shiftId:       string;
  filename:      string;
  pdfDataUri:    string;   // data:application/pdf;base64,... — bind directly to <a href>
  invoiceData:   NDISInvoice;
}

// NDIS Invoice PDF generator.
//
// Produces a standards-compliant PDF/1.4 document from a structured NDISInvoice
// using only built-in Node.js primitives — no jspdf, pdfkit, or browser APIs.
//
// Output: a base64 data URI (data:application/pdf;base64,...)
// that a frontend <a> download button can bind to directly.
//
// PDF coordinate system: origin (0,0) = bottom-left corner of the page.
// A4 dimensions: 595 × 842 points (1 pt = 1/72 inch).

import { getStore } from './dataStore';
import {
  type NDISInvoice,
  type NDISInvoiceProvider,
  type NDISLineItem,
  resolveNDISCode,
} from './invoiceSchema';

// ── Internal PDF drawing primitives ───────────────────────────────────────

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

type Ops = string[];

function text(ops: Ops, x: number, y: number, s: string, size: number, bold = false): void {
  const font = bold ? 'F2' : 'F1';
  ops.push(`BT /${font} ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`);
}

function hline(ops: Ops, x1: number, y: number, x2: number, weight = 0.5): void {
  ops.push(`${weight} w ${x1} ${y} m ${x2} ${y} l S`);
}

function band(ops: Ops, x: number, y: number, w: number, h: number, fillGray = 0.93): void {
  ops.push(`${fillGray} g ${x} ${y} ${w} ${h} re f 0 g`);
}

// ── Layout constants ───────────────────────────────────────────────────────

const L   = 50;   // left margin (pt)
const R   = 545;  // right margin (pt)
const MID = 310;  // column midpoint

// ── Invoice content stream ─────────────────────────────────────────────────

function buildContentStream(inv: NDISInvoice): string {
  const ops: Ops = [];

  // ── Header band ──────────────────────────────────────────────────────────
  band(ops, L, 790, R - L, 40);
  text(ops, L + 8,  808, 'NDIS TAX INVOICE', 18, true);
  text(ops, L + 8,  795, 'GST-Free Supply under NDIS Act 2013 & GST Act 1999', 8);
  text(ops, 370,    815, `Invoice No: ${inv.invoiceNumber}`, 9, true);
  text(ops, 370,    803, `Issue Date: ${inv.issueDate}`, 9);
  text(ops, 370,    791, `Due Date:   ${inv.dueDate}`, 9);

  // ── Provider block ────────────────────────────────────────────────────────
  const p = inv.provider;
  text(ops, L, 775, p.name,        12, true);
  text(ops, L, 762, `ABN: ${p.abn}`, 9);
  text(ops, L, 750, p.address,      9);
  text(ops, L, 738, p.contact,      9);
  text(ops, L, 726, `NDIS Provider No: ${p.ndisNumber}`, 9);

  hline(ops, L, 716, R, 1);

  // ── Participant / Worker columns ──────────────────────────────────────────
  text(ops, L,   702, 'PARTICIPANT',    8, true);
  text(ops, MID, 702, 'SUPPORT WORKER', 8, true);

  text(ops, L,   689, inv.participant.name, 11, true);
  text(ops, MID, 689, inv.worker.name,      11, true);

  text(ops, L,   676, `NDIS Number: ${inv.participant.ndisNumber}`, 9);
  text(ops, MID, 676, `Registration: ${inv.worker.category}`,       9);

  text(ops, L,   663, inv.participant.suburb, 9);
  text(ops, MID, 663,
    `Background Check: ${inv.worker.backgroundCheckVerified ? 'Verified' : 'Pending'}`, 9);

  text(ops, L, 650, `Primary Diagnosis: ${inv.participant.primaryDiagnosis}`, 9);

  // ── Service details ───────────────────────────────────────────────────────
  hline(ops, L, 638, R, 0.5);
  band(ops, L, 625, R - L, 13);
  text(ops, L + 4, 630, 'SERVICE DETAILS', 9, true);

  text(ops, L,         612, 'Service Date:',  9, true);
  text(ops, 145,       612, inv.serviceDate,  9);
  text(ops, MID,       612, 'GPS Verified:',  9, true);
  text(ops, MID + 72,  612, inv.gpsVerified ? 'Yes - Clock-In Confirmed' : 'Manual Entry', 9);

  text(ops, L,         599, 'Service Type:',  9, true);
  text(ops, 145,       599, inv.serviceType,  9);
  text(ops, MID,       599, 'Address:',       9, true);
  text(ops, MID + 52,  599, inv.serviceAddress, 8);

  text(ops, L,         586, 'NDIS Item No:', 9, true);
  text(ops, 145,       586, inv.ndisCode,    9);
  text(ops, MID,       586, 'Support Cat.:',  9, true);
  text(ops, MID + 80,  586, inv.supportCategory.split('—')[0].trim(), 9);

  text(ops, L,        573, 'Clock In:',  9, true);
  text(ops, 145,      573, inv.clockIn,  9);
  text(ops, MID,      573, 'Clock Out:', 9, true);
  text(ops, MID + 68, 573, inv.clockOut, 9);

  text(ops, L,   560, 'Duration:', 9, true);
  text(ops, 145, 560, `${inv.durationHours.toFixed(2)} hours`, 9);

  // ── Line items table ──────────────────────────────────────────────────────
  hline(ops, L, 547, R, 0.5);
  band(ops, L, 534, R - L, 13);
  text(ops, L + 4, 538, 'DESCRIPTION',  8, true);
  text(ops, 312,   538, 'HRS',          8, true);
  text(ops, 368,   538, 'RATE (AUD)',   8, true);
  text(ops, 460,   538, 'AMOUNT (AUD)', 8, true);
  hline(ops, L, 533, R, 0.3);

  let rowY = 519;
  for (const item of inv.lineItems) {
    text(ops, L + 4, rowY, item.description,              9);
    text(ops, 312,   rowY, item.hours.toFixed(2),          9);
    text(ops, 368,   rowY, `$${item.hourlyRate.toFixed(2)}`, 9);
    text(ops, 460,   rowY, `$${item.subtotal.toFixed(2)}`,   9);
    rowY -= 14;
  }

  text(ops, L + 4, rowY - 2,
    'GST: NDIS support services are a GST-free supply (s38-25 of GST Act 1999). GST = $0.00', 8);

  // ── Fee breakdown ──────────────────────────────────────────────────────────
  const feeTop = rowY - 18;
  hline(ops, L, feeTop, R, 0.5);
  band(ops, L, feeTop - 13, R - L, 13);
  text(ops, L + 4, feeTop - 8, 'MARKETPLACE FEE BREAKDOWN', 9, true);

  const col2 = 405;
  let fy = feeTop - 26;

  text(ops, L + 4, fy, 'Participant charge  (base rate + 5% marketplace levy):', 9);
  text(ops, col2,  fy, `$${inv.participantTotal.toFixed(2)}`, 9, true);
  fy -= 14;

  text(ops, L + 4, fy, 'Support worker payout  (87.5% of base rate):', 9);
  text(ops, col2,  fy, `$${inv.workerPayout.toFixed(2)}`, 9);
  fy -= 14;

  text(ops, L + 4, fy, 'OpenCare platform fee  (12.5%):', 9);
  text(ops, col2,  fy, `$${inv.platformFee.toFixed(2)}`, 9);
  fy -= 6;

  hline(ops, col2 - 4, fy, R, 0.3);
  fy -= 14;

  text(ops, L + 4, fy, 'TOTAL AMOUNT PAYABLE (GST-free):', 12, true);
  text(ops, col2,  fy, `$${inv.participantTotal.toFixed(2)}`, 13, true);

  // ── Payment instructions ──────────────────────────────────────────────────
  const piTop = fy - 20;
  hline(ops, L, piTop, R, 0.5);
  band(ops, L, piTop - 13, R - L, 13);
  text(ops, L + 4, piTop - 8, 'PAYMENT INSTRUCTIONS', 9, true);

  text(ops, L + 4, piTop - 24,
    'Submit via NDIS portal or plan manager. Quote invoice number on all remittances.', 9);
  text(ops, L + 4, piTop - 37,
    `Support Item: ${inv.ndisCode}   |   Purpose: ${inv.supportPurpose}`, 9);
  text(ops, L + 4, piTop - 50,
    `Bank Transfer: BSB 062-000  Acc 1234 5678  Ref: ${inv.invoiceNumber}`, 9);

  // ── Footer ────────────────────────────────────────────────────────────────
  hline(ops, L, 70, R, 0.5);
  text(ops, L,   55, `${p.name}  |  NDIS Provider  |  ABN ${p.abn}`, 7);
  text(ops, L,   43, `Generated: ${inv.generatedAt}  |  Retain for 5 years per NDIS audit requirements.`, 7);
  text(ops, 472, 43, 'Page 1 of 1', 7);

  return ops.join('\n');
}

// ── Minimal PDF/1.4 assembler ─────────────────────────────────────────────
// Builds a fully-conformant PDF with correct xref byte offsets.
// Content is ASCII-safe so string.length === byte length.

function assemblePDF(contentStream: string): string {
  const segs: string[] = [];
  const offsets: number[] = [];
  let pos = 0;

  const w = (s: string) => { segs.push(s); pos += s.length; };

  w('%PDF-1.4\n');

  offsets[1] = pos;
  w('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets[2] = pos;
  w('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  offsets[3] = pos;
  w(
    '3 0 obj\n' +
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]\n' +
    '   /Contents 4 0 R\n' +
    '   /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\n' +
    'endobj\n',
  );

  offsets[4] = pos;
  w(
    '4 0 obj\n' +
    `<< /Length ${contentStream.length} >>\n` +
    'stream\n' +
    contentStream + '\n' +
    'endstream\nendobj\n',
  );

  offsets[5] = pos;
  w(
    '5 0 obj\n' +
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica\n' +
    '   /Encoding /WinAnsiEncoding >>\n' +
    'endobj\n',
  );

  offsets[6] = pos;
  w(
    '6 0 obj\n' +
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold\n' +
    '   /Encoding /WinAnsiEncoding >>\n' +
    'endobj\n',
  );

  const xrefPos = pos;
  w('xref\n0 7\n');
  w('0000000000 65535 f \n');
  for (let i = 1; i <= 6; i++) {
    w(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
  }

  w('trailer\n<< /Size 7 /Root 1 0 R >>\n');
  w(`startxref\n${xrefPos}\n%%EOF`);

  return segs.join('');
}

// ── Public: assemble NDISInvoice from shift data ──────────────────────────
// Production: replace each .find() with a DB query.

export function buildInvoiceFromShift(shiftId: string): NDISInvoice | null {
  const store       = getStore();
  const shift       = store.shiftLogs.find((s) => s.id === shiftId);
  if (!shift) return null;

  const booking     = store.bookings.find((b)     => b.id === shift.bookingId);
  const worker      = store.workers.find((w)      => w.id === shift.workerId);
  const participant = store.participants.find((p) => p.id === shift.participantId);

  const ndisCode      = resolveNDISCode(shift.serviceType);
  const now           = new Date();
  const issueDate     = formatDate(now);
  const dueDate       = formatDate(new Date(now.getTime() + 30 * 86_400_000));
  const invoiceNum    = `INV-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${shiftId.toUpperCase()}`;

  const durationHours    = shift.durationHrs ?? 0;
  const baseAmount       = shift.hourlyRate * durationHours;
  const participantTotal = booking?.participantTotal ?? round2(baseAmount * 1.05);
  const workerPayout     = booking?.workerPayout     ?? round2(baseAmount * 0.925);
  const platformFee      = booking?.platformFee      ?? round2(participantTotal - workerPayout);

  const lineItem: NDISLineItem = {
    description:     shift.serviceType,
    ndisItemNumber:  ndisCode.itemNumber,
    supportCategory: ndisCode.supportCategory,
    hours:           durationHours,
    hourlyRate:      shift.hourlyRate,
    subtotal:        round2(baseAmount),
    gst:             0,
  };

  const provider: NDISInvoiceProvider = {
    name:       'OpenCare Support Services Pty Ltd',
    abn:        '12 345 678 901',
    address:    'Level 1, 100 George Street, Sydney NSW 2000',
    contact:    'invoices@opencare.com.au  |  1800 OPENCARE',
    ndisNumber: 'NDIS40001234',
  };

  return {
    invoiceNumber:    invoiceNum,
    shiftId,
    bookingId:        shift.bookingId ?? null,
    issueDate,
    dueDate,
    generatedAt:      now.toISOString(),

    provider,

    participant: {
      id:               shift.participantId,
      name:             shift.participantName,
      ndisNumber:       ndisNumberFor(shift.participantId),
      suburb:           participant?.suburb           ?? '',
      primaryDiagnosis: participant?.primaryDiagnosis ?? '',
    },

    worker: {
      id:                      shift.workerId,
      name:                    shift.workerName,
      category:                worker ? cap(worker.category) : 'Support',
      backgroundCheckVerified: worker?.backgroundCheckVerified ?? false,
    },

    serviceDate:     shift.date,
    serviceType:     shift.serviceType,
    serviceAddress:  shift.gpsAddress,
    ndisCode:        ndisCode.itemNumber,
    supportPurpose:  ndisCode.supportPurpose,
    supportCategory: ndisCode.supportCategory,
    clockIn:         shift.clockIn,
    clockOut:        shift.clockOut ?? 'Active',
    durationHours,
    gpsVerified:     shift.gpsVerified,

    hourlyRate:       shift.hourlyRate,
    lineItems:        [lineItem],
    participantTotal,
    workerPayout,
    platformFee,
    gstTotal:         0,
  };
}

// ── Public: render invoice → base64 PDF data URI ─────────────────────────

export function renderInvoicePDF(invoice: NDISInvoice): string {
  const content = buildContentStream(invoice);
  const pdfStr  = assemblePDF(content);
  const b64     = Buffer.from(pdfStr, 'latin1').toString('base64');
  return `data:application/pdf;base64,${b64}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Derives a placeholder NDIS plan number from participant ID.
// Production: read from participant_profiles table.
function ndisNumberFor(participantId: string): string {
  const n = participantId.replace(/\D/g, '') || '1';
  return `4301${n.padStart(4, '0')}XXXX`;
}

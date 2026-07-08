import { NextResponse } from 'next/server';
import { buildInvoiceFromShift, renderInvoicePDF } from '@/lib/invoicePDF';
import type { InvoiceGenerateResponse } from '@/lib/invoiceSchema';

// GET /api/invoices/generate?shift_id=sl1
//
// Generates an NDIS-compliant PDF invoice for a completed shift.
//
// Default response (JSON):
//   { invoiceNumber, shiftId, filename, pdfDataUri, invoiceData }
//   pdfDataUri is a data:application/pdf;base64,... URI — bind directly to <a href>.
//
// Binary response (when Accept: application/pdf):
//   Raw PDF bytes streamed as an attachment download.
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const shiftId = searchParams.get('shift_id');

  if (!shiftId) {
    return NextResponse.json(
      { error: 'MISSING_PARAM', message: "'shift_id' query parameter is required", retryable: false },
      { status: 400 },
    );
  }

  let invoice;
  let pdfDataUri: string;

  try {
    invoice = buildInvoiceFromShift(shiftId);

    if (!invoice) {
      return NextResponse.json(
        { error: 'SHIFT_NOT_FOUND', message: `No shift found with id '${shiftId}'`, retryable: false },
        { status: 404 },
      );
    }

    pdfDataUri = renderInvoicePDF(invoice);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF generation failed';
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message, retryable: false },
      { status: 500 },
    );
  }

  const filename = `opencare-invoice-${invoice.invoiceNumber}-${shiftId}.pdf`;
  const accept   = req.headers.get('Accept') ?? '';

  // ── Binary PDF stream (for <a download> or direct fetch with Accept header) ─
  if (accept.includes('application/pdf')) {
    const b64    = pdfDataUri.replace('data:application/pdf;base64,', '');
    const buffer = Buffer.from(b64, 'base64');

    return new Response(buffer, {
      status:  200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(buffer.byteLength),
        'Cache-Control':       'no-store',
      },
    });
  }

  // ── Default JSON response ────────────────────────────────────────────────────
  const body: InvoiceGenerateResponse = {
    invoiceNumber: invoice.invoiceNumber,
    shiftId,
    filename,
    pdfDataUri,
    invoiceData:   invoice,
  };

  return NextResponse.json(body, { status: 200 });
}

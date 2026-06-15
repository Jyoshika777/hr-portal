import jsPDF from 'jspdf';

const COMPANY = 'TRIVON SOFTWARE SOLUTIONS PRIVATE LIMITED';
const ADDR    = 'Madhapur, Hyderabad';

// ── CSV ───────────────────────────────────────────────────────────────────────
function escapeCell(val) {
  if (val == null) return '';
  const s = String(val);
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCSV(filename, headers, rows) {
  const headerRow = headers.map(escapeCell).join(',');
  const dataRows  = rows.map((r) => r.map(escapeCell).join(','));
  const csv       = [headerRow, ...dataRows].join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : filename + '.csv');
}

// ── Excel (XML-based .xls, no library needed) ─────────────────────────────────
export function exportExcel(filename, headers, rows, sheetName = 'Sheet1') {
  const toXml = (v) => {
    if (v == null) return '';
    return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  };

  const headerCells = headers
    .map((h) => `<Cell ss:StyleID="s1"><Data ss:Type="String">${toXml(h)}</Data></Cell>`)
    .join('');

  const dataRowsXml = rows.map((r) => {
    const cells = r.map((v) => {
      const isNum = typeof v === 'number' || (!isNaN(v) && v !== '' && v != null);
      const type  = isNum ? 'Number' : 'String';
      return `<Cell><Data ss:Type="${type}">${toXml(v)}</Data></Cell>`;
    }).join('');
    return `<Row>${cells}</Row>`;
  }).join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
  <Style ss:ID="s1">
    <Font ss:Bold="1"/>
    <Interior ss:Color="#2563EB" ss:Pattern="Solid"/>
    <Font ss:Color="#FFFFFF" ss:Bold="1"/>
  </Style>
</Styles>
<Worksheet ss:Name="${toXml(sheetName)}">
<Table>
<Row>${headerCells}</Row>
${dataRowsXml}
</Table>
</Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.xls') ? filename : filename + '.xls');
}

// ── PDF via jsPDF ─────────────────────────────────────────────────────────────
export function exportPDF(filename, title, headers, rows, columnWidths = []) {
  const doc    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const margin = 14;
  const usable = pageW - margin * 2;

  const colW = columnWidths.length === headers.length
    ? columnWidths
    : headers.map(() => usable / headers.length);

  let y = margin;

  // Header bar
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(COMPANY, margin, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(ADDR, margin, 16);

  y = 26;

  // Report title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(title, margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, y);
  y += 8;

  // Table header row
  doc.setFillColor(239, 246, 255);
  doc.rect(margin, y - 4, usable, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235);

  let x = margin;
  headers.forEach((h, i) => {
    doc.text(String(h), x + 1, y);
    x += colW[i];
  });
  y += 6;

  doc.setDrawColor(219, 234, 254);
  doc.line(margin, y - 2, margin + usable, y - 2);

  // Data rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  let rowIdx = 0;
  for (const row of rows) {
    if (y > pageH - 14) {
      doc.addPage();
      y = 20;
    }

    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, usable, 6, 'F');
    }

    x = margin;
    const rowY = y;
    let cellX = x;
    row.forEach((cell, i) => {
      const text = cell == null ? '' : String(cell);
      const avail = colW[i] - 2;
      const truncated = doc.getStringUnitWidth(text) * 8 * 0.35 > avail
        ? text.slice(0, Math.floor(avail / 2)) + '…'
        : text;
      doc.text(truncated, cellX + 1, rowY);
      cellX += colW[i];
    });
    x = cellX;

    y += 6;
    rowIdx++;
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`${COMPANY} · Confidential`, margin, pageH - 5);
    doc.text(`Page ${p} of ${pageCount}`, pageW - margin - 18, pageH - 5);
  }

  doc.save(filename.endsWith('.pdf') ? filename : filename + '.pdf');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function fmtINR(num) {
  if (!num && num !== 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(num);
}

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function safe(str) {
  if (str == null) return '';
  return String(str)
    .replace(/₹/g, 'Rs.')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/ /g, ' ');
}

export async function fetchLogoAsDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

/**
 * Captures `element` (a rendered CertificatePrintTemplate) via html2canvas
 * and saves it as an A4 landscape PDF. True WYSIWYG — same DOM as the preview.
 */
export async function downloadCertificatePDF(cert, element) {
  const canvas = await html2canvas(element, {
    scale: 2,
    width: 1122,
    height: 793,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.addImage(imgData, 'JPEG', 0, 0, 297, 210);
  doc.save(`${safe(cert.certificate_number || 'certificate')}.pdf`);
}

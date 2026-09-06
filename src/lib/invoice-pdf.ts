/** Turns the on-screen invoice into a downloadable PDF file. */
export async function downloadInvoicePdf(el: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const img = canvas.toDataURL("image/jpeg", 0.94);
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const width = pageWidth - margin * 2;
  const height = (canvas.height / canvas.width) * width;

  if (height <= pageHeight - margin * 2) {
    pdf.addImage(img, "JPEG", margin, margin, width, height);
  } else {
    let offset = 0;
    const usable = pageHeight - margin * 2;
    while (offset < height) {
      if (offset > 0) pdf.addPage();
      pdf.addImage(img, "JPEG", margin, margin - offset, width, height);
      offset += usable;
    }
  }

  pdf.save(filename);
}

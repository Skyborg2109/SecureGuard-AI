import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface SensitiveEncryptionData {
  text: string;
  type: string;
  ciphertext: string;
  iv: string;
  mode: string;
}

export const exportSensitiveToPDF = (data: SensitiveEncryptionData[]) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Laporan Enkripsi Data Sensitif (AES-128 GCM)", 10, 20);
  
  doc.setFontSize(10);
  let y = 30;
  
  data.forEach((item, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}. Tipe Data: ${item.type}`, 10, y);
    y += 6;
    
    doc.setFont("helvetica", "normal");
    doc.text(`Teks Asli: ${item.text}`, 15, y);
    y += 6;
    
    const cipherLines = doc.splitTextToSize(`Ciphertext: ${item.ciphertext}`, 180);
    doc.text(cipherLines, 15, y);
    y += cipherLines.length * 5 + 4;
  });
  
  doc.save("Data_Sensitif_Terenkripsi.pdf");
};

export const exportSensitiveToDOCX = async (data: SensitiveEncryptionData[]) => {
  const children: any[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: "Laporan Enkripsi Data Sensitif (AES-128 GCM)",
          bold: true,
          size: 32,
        }),
      ],
    }),
    new Paragraph({ text: "" })
  ];

  data.forEach((item, index) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${index + 1}. Tipe Data: ${item.type}`, bold: true, size: 24 }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({ text: `Teks Asli: ${item.text}`, size: 20 })],
      }),
      new Paragraph({
        children: [new TextRun({ text: `Ciphertext: ${item.ciphertext}`, size: 20 })],
      }),
      new Paragraph({
        children: [new TextRun({ text: `IV: ${item.iv}`, size: 16, color: "888888" })],
      }),
      new Paragraph({ text: "" })
    );
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Data_Sensitif_Terenkripsi.docx");
};

export const exportSensitiveToXLSX = (data: SensitiveEncryptionData[]) => {
  const rows = [
    ["No", "Tipe Data", "Teks Asli", "Ciphertext", "IV", "Mode"]
  ];

  data.forEach((item, i) => {
    rows.push([
      (i + 1).toString(),
      item.type,
      item.text,
      item.ciphertext,
      item.iv,
      item.mode
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 15 },
    { wch: 30 },
    { wch: 50 },
    { wch: 20 },
    { wch: 10 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Sensitif");
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, "Data_Sensitif_Terenkripsi.xlsx");
};


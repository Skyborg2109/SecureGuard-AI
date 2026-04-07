import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const generateSamplePDF = () => {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text("Laporan Keuangan Bulanan - SecureGuard AI", 10, 20);
  
  doc.setFontSize(12);
  doc.text("Informasi Umum:", 10, 40);
  doc.text("Laporan ini berisi rincian transaksi bulan April 2026.", 10, 50);
  doc.text("Perusahaan: SecureGuard Corp.", 10, 60);
  
  doc.setTextColor(255, 0, 0);
  doc.text("DATA SENSITIF (UNTUK PENGUJIAN):", 10, 80);
  doc.setTextColor(0, 0, 0);
  doc.text("Email Admin: finance@secureguard.com", 10, 90);
  doc.text("Password Akses: Keuangan2026!", 10, 100);
  doc.text("Nomor Rekening Utama: 9876543210", 10, 110);
  doc.text("Kode CVV Kartu: 456", 10, 120);
  
  doc.save("Sample_Keuangan.pdf");
};

export const generateSampleDOCX = async () => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Daftar Karyawan Tetap - SecureGuard AI",
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Berikut adalah data akses internal karyawan:",
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "Nama: Budi Santoso", size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Email: budi@secureguard.com", size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Password: BudiPass123", size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "No Rekening: 1122334455", size: 24 }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Sample_Karyawan.docx");
};

export const generateSampleXLSX = () => {
  const data = [
    ["Nama", "Email", "No Rekening", "CVV", "Status"],
    ["Andi Wijaya", "andi@secureguard.com", "1234567890", "123", "Aktif"],
    ["Siti Aminah", "siti@secureguard.com", "0987654321", "789", "Non-Aktif"],
    ["Riko Pratama", "riko@secureguard.com", "5566778899", "321", "Aktif"],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Sensitif");
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, "Sample_Data_Sensitif.xlsx");
};

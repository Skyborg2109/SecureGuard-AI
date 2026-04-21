import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Shield, 
  FileText, 
  Upload, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  FileUp,
  Database,
  Cpu,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { extractTextFromFile } from './lib/fileProcessor';
import { detectSensitiveInformation, type SensitiveEntity } from './services/geminiService';
import { generateKey, encryptCBC, encryptGCM } from './lib/crypto';
import { generateSamplePDF, generateSampleDOCX, generateSampleXLSX } from './lib/sampleGenerator';
import { 
  exportSensitiveToPDF, exportSensitiveToDOCX, exportSensitiveToXLSX
} from './lib/exportProcessor';

const ExportMenu = ({ onExport, label = "Unduh" }: { onExport: (type: 'pdf' | 'docx' | 'xlsx') => void, label?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 shadow-sm"
      >
        <Download className="w-3.5 h-3.5" />
        {label}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 p-1 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20"
          >
            <button onMouseDown={() => onExport('pdf')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
              <span className="text-red-400">📄</span> PDF File
            </button>
            <button onMouseDown={() => onExport('docx')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
              <span className="text-blue-400">📝</span> Word (DOCX)
            </button>
            <button onMouseDown={() => onExport('xlsx')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
              <span className="text-emerald-400">📊</span> Excel (XLSX)
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


interface ProcessedData {
  originalText: string;
  sensitiveEntities: SensitiveEntity[];
  generalEncryption: { ciphertext: string; iv: string };
  sensitiveEncryptions: { 
    text: string; 
    type: string; 
    ciphertext: string; 
    iv: string;
    mode: 'GCM'
  }[];
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  } as any);

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const text = await extractTextFromFile(file);
      const entities = await detectSensitiveInformation(text);
      const masterKey = await generateKey("secure-guard-default-key-128");
      const generalEnc = await encryptCBC(text, masterKey);
      const sensitiveEnc = await Promise.all(
        entities.map(async (entity) => {
          const enc = await encryptGCM(entity.text, masterKey);
          return {
            text: entity.text,
            type: entity.type,
            ciphertext: enc.ciphertext,
            iv: enc.iv,
            mode: 'GCM' as const
          };
        })
      );

      setResult({
        originalText: text,
        sensitiveEntities: entities,
        generalEncryption: generalEnc,
        sensitiveEncryptions: sensitiveEnc
      });
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses file.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSample = (type: 'pdf' | 'docx' | 'xlsx') => {
    if (type === 'pdf') generateSamplePDF();
    else if (type === 'docx') generateSampleDOCX();
    else if (type === 'xlsx') generateSampleXLSX();
  };


  const downloadSensitiveResult = async (type: 'pdf' | 'docx' | 'xlsx') => {
    if (!result || result.sensitiveEncryptions.length === 0) return;
    try {
      if (type === 'pdf') await exportSensitiveToPDF(result.sensitiveEncryptions);
      else if (type === 'docx') await exportSensitiveToDOCX(result.sensitiveEncryptions);
      else if (type === 'xlsx') await exportSensitiveToXLSX(result.sensitiveEncryptions);
    } catch(err: any) {
      setError(err.message || "Gagal mendownload hasil enkripsi sensitif.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12">
        <header className="text-center mb-16 space-y-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 mb-4"
          >
            <Shield className="w-10 h-10 text-cyan-400" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            SecureGuard <span className="text-cyan-400">AI</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Deteksi data sensitif otomatis dan enkripsi AES-128 multi-mode.
            Melindungi aset PDF, DOCX, dan XLSX Anda dengan kecerdasan buatan.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileUp className="w-5 h-5 text-cyan-400" />
                Unggah Dokumen
              </h2>
              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer text-center",
                  isDragActive ? "border-cyan-500 bg-cyan-500/5" : "border-slate-700 hover:border-slate-600 bg-slate-950/50"
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-slate-900 rounded-full">
                    <Upload className={cn("w-8 h-8", isDragActive ? "text-cyan-400" : "text-slate-500")} />
                  </div>
                  {file ? (
                    <div className="space-y-1">
                      <p className="text-cyan-400 font-medium">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-slate-300 font-medium">Letakkan file Anda di sini</p>
                      <p className="text-xs text-slate-500">PDF, DOCX, atau XLSX (Maks 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={processFile}
                disabled={!file || isProcessing}
                className={cn(
                  "w-full mt-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
                  !file || isProcessing 
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                    : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menganalisis dengan AI...
                  </>
                ) : (
                  <>
                    <Cpu className="w-5 h-5" />
                    Mulai Otomasi
                  </>
                )}
              </button>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200">{error}</p>
                </motion.div>
              )}
            </section>

            <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                Spesifikasi Keamanan
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                  <span className="text-sm text-slate-400">Algoritma</span>
                  <span className="text-sm font-mono text-cyan-400">AES-128</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                  <span className="text-sm text-slate-400">Mode Umum</span>
                  <span className="text-sm font-mono text-blue-400">CBC</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                  <span className="text-sm text-slate-400">Mode Sensitif</span>
                  <span className="text-sm font-mono text-purple-400">GCM</span>
                </div>
              </div>
            </section>

            <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-cyan-400" />
                Unduh File Contoh
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Gunakan file contoh ini untuk menguji deteksi data sensitif.
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => downloadSample('pdf')}
                  className="flex items-center justify-between p-3 bg-slate-950/50 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors text-sm text-slate-300"
                >
                  <span>Sample_Keuangan.pdf</span>
                  <Download className="w-4 h-4 text-cyan-500" />
                </button>
                <button 
                  onClick={() => downloadSample('docx')}
                  className="flex items-center justify-between p-3 bg-slate-950/50 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors text-sm text-slate-300"
                >
                  <span>Sample_Karyawan.docx</span>
                  <Download className="w-4 h-4 text-cyan-500" />
                </button>
                <button 
                  onClick={() => downloadSample('xlsx')}
                  className="flex items-center justify-between p-3 bg-slate-950/50 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors text-sm text-slate-300"
                >
                  <span>Sample_Data_Sensitif.xlsx</span>
                  <Download className="w-4 h-4 text-cyan-500" />
                </button>
              </div>
            </section>
          </div>

          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 border border-slate-800 border-dashed rounded-3xl bg-slate-900/20"
                >
                  <Database className="w-16 h-16 text-slate-700 mb-4" />
                  <h3 className="text-xl font-medium text-slate-400">Belum Ada Data Diproses</h3>
                  <p className="text-slate-500 max-w-xs mt-2">
                    Unggah dokumen untuk melihat analisis AI dan hasil enkripsi.
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Entitas Ditemukan</p>
                      <p className="text-2xl font-bold text-white">{result.sensitiveEntities.length}</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</p>
                      {result.sensitiveEntities.length > 0 ? (
                        <div className="flex items-center gap-2 text-red-500">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="font-bold">Tidak Aman</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-bold">Terlindungi</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <section className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-purple-400" />
                        Entitas Sensitif (GCM)
                      </h3>
                      {result.sensitiveEncryptions.length > 0 && (
                        <div className="flex items-center gap-2">
                          <ExportMenu onExport={downloadSensitiveResult} label="Unduh Laporan" />
                        </div>
                      )}
                    </div>
                    <div className="divide-y divide-slate-800 max-h-[300px] overflow-y-auto">
                      {result.sensitiveEncryptions.length > 0 ? (
                        result.sensitiveEncryptions.map((item, idx) => (
                          <div key={idx} className="p-4 hover:bg-slate-800/30 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold rounded uppercase border border-purple-500/20">
                                {item.type}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">AES-128-GCM</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              <div className="space-y-1">
                                <p className="text-xs text-slate-500">Asli</p>
                                <p className="text-sm font-mono text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800 truncate">
                                  {item.text}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-slate-500">Ciphertext</p>
                                <p className="text-sm font-mono text-purple-300 bg-purple-500/5 p-2 rounded-lg border border-purple-500/20 break-all">
                                  {item.ciphertext}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-500 italic">
                          Tidak ada informasi sensitif yang terdeteksi oleh AI.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-400" />
                        Konten Umum (CBC)
                      </h3>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowOriginal(!showOriginal)}
                          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
                          title={showOriginal ? "Sembunyikan Teks Asli" : "Tampilkan Teks Asli"}
                        >
                          {showOriginal ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 max-h-[400px] overflow-y-auto font-mono text-sm leading-relaxed">
                        {showOriginal ? (
                          <div className="text-slate-300 whitespace-pre-wrap">
                            {result.originalText}
                          </div>
                        ) : (
                          <div className="text-blue-300/80 break-all">
                            {result.generalEncryption.ciphertext}
                          </div>
                        )}
                      </div>
                      {!showOriginal && (
                        <div className="mt-4 flex items-center gap-4 text-[10px] font-mono text-slate-500">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            MODE: CBC
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-slate-500" />
                            IV: {result.generalEncryption.iv.substring(0, 16)}...
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        <footer className="mt-20 pt-8 border-t border-slate-800 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-slate-500 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
              Deteksi Berbasis AI
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              AES-128-CBC (Umum)
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              AES-128-GCM (Sensitif)
            </div>
          </div>
          <p className="mt-6 text-slate-600 text-xs">
            Proyek Mata Kuliah Keamanan Jaringan &copy; 2026
          </p>
        </footer>
      </div>
    </div>
  );
}

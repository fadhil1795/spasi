'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  Printer,
  QrCode,
  BookOpen,
  FileSpreadsheet,
  Upload,
  Download,
  FileText,
  Boxes,
  Database,
  CheckCircle2,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export default function ToolsUtilitasPage() {
  const { showToast } = useToast();

  // Import Modal State
  const [importModalOpen, setModalOpen] = useState(false);
  const [importType, setImportType] = useState<'biblio' | 'marc' | 'items'>('biblio');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
      reader.onload = (evt) => {
        try {
          const json = JSON.parse(evt.target?.result as string);
          setParsedData(Array.isArray(json) ? json : [json]);
          showToast(`Berhasil membaca ${Array.isArray(json) ? json.length : 1} record dari ${file.name}`, 'success');
        } catch (err) {
          showToast('File JSON tidak valid', 'error');
        }
      };
      reader.readAsText(file);
    } else {
      // Excel / CSV File Parsing using XLSX
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          setParsedData(data);
          showToast(`Berhasil membaca ${data.length} baris data dari ${file.name}`, 'success');
        } catch (err) {
          showToast('Gagal membaca berkas Excel/CSV', 'error');
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedData.length === 0) {
      showToast('Pilih berkas data yang berisi baris valid terlebih dahulu', 'error');
      return;
    }

    try {
      setImporting(true);
      const res = await fetch('/api/tools/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: importType,
          records: parsedData,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        showToast(result.message, 'success');
        setModalOpen(false);
        setParsedData([]);
        setFileName('');
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal mengimpor data', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan jaringan saat mengimpor', 'error');
    } finally {
      setImporting(false);
    }
  };

  const openImportDialog = (type: 'biblio' | 'marc' | 'items') => {
    setImportType(type);
    setParsedData([]);
    setFileName('');
    setModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Pintasan & Utilitas Data Aset</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Pusat pencetakan label stiker, ekspor & impor data katalog aset, cetak buku inventaris, dan kelola rincian unit barang.
        </p>
      </div>

      {/* Group 1: Pencetakan & Label Fisik */}
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Printer size={20} style={{ color: 'var(--color-primary)' }} /> 1. Pencetakan & Label Fisik
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {/* Tool 1: Pencetakan Label */}
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                <Printer size={18} style={{ color: 'var(--color-primary-light)' }} /> Pencetakan Label Stiker Aset
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Cetak stiker label QR Code fisik berukuran A4 untuk ditempel pada barang inventaris instansi.
              </p>
            </div>
            <Link href="/dashboard/assets/qr-labels" className="btn btn-secondary" style={{ width: '100%' }}>
              Buka Cetak Label QR Stiker
            </Link>
          </Card>

          {/* Tool 2: Cetak Barcode / QR Unit Barang */}
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                <QrCode size={18} style={{ color: 'var(--color-success)' }} /> Cetak Barcode & QR Unit Barang
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Cetak kode barcode 1D / QR Code individual per unit fisik barang lengkap dengan kode inventaris.
              </p>
            </div>
            <Link href="/dashboard/assets" className="btn btn-secondary" style={{ width: '100%' }}>
              Pilih Unit Barang di Katalog
            </Link>
          </Card>

          {/* Tool 3: Mencetak Buku Inventaris */}
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                <BookOpen size={18} style={{ color: 'var(--color-warning)' }} /> Mencetak Buku Katalog Inventaris
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Cetak format buku rekapitulasi katalog aset lengkap dengan nilai perolehan, spesifikasi, dan lokasi.
              </p>
            </div>
            <Link href="/dashboard/reports" className="btn btn-secondary" style={{ width: '100%' }}>
              Cetak Buku Inventaris (PDF)
            </Link>
          </Card>
        </div>
      </div>

      {/* Group 2: Ekspor & Impor Data Katalog Aset */}
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={20} style={{ color: 'var(--color-warning)' }} /> 2. Ekspor & Impor Data Katalog Aset
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {/* Tool 4: Ekspor Data Katalog Aset */}
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                <FileSpreadsheet size={18} style={{ color: 'var(--color-success)' }} /> Ekspor Data Katalog (Excel / CSV)
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Unduh seluruh data katalog aset dalam format spreadsheet `.xlsx` untuk analisis & cadangan.
              </p>
            </div>
            <a href="/api/tools/export?type=biblio_excel" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
              <Download size={16} /> Unduh Excel Katalog
            </a>
          </Card>

          {/* Tool 5: Impor Data Katalog Aset */}
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                <Upload size={18} style={{ color: 'var(--color-primary-light)' }} /> Impor Data Katalog (Batch Excel)
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Impor massal puluhan/ratusan aset baru secara instan dari templat berkas Excel `.xlsx` / `.csv`.
              </p>
            </div>
            <Button variant="primary" onClick={() => openImportDialog('biblio')}>
              <Upload size={16} /> Unggah File Excel Katalog
            </Button>
          </Card>

          {/* Tool 6: Ekspor Format Standar JSON */}
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                <FileText size={18} style={{ color: 'var(--color-info)' }} /> Ekspor Data Standar (JSON)
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Ekspor data inventaris sesuai format standar JSON untuk integrasi sistem antar instansi.
              </p>
            </div>
            <a href="/api/tools/export?type=marc_json" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
              <Download size={16} /> Unduh Data JSON
            </a>
          </Card>

          {/* Tool 7: Impor Format Standar JSON */}
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                <Upload size={18} style={{ color: 'var(--color-info)' }} /> Impor Data Standar (JSON)
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Impor rekaman data inventaris format JSON ke dalam database sistem SPASI.
              </p>
            </div>
            <Button variant="secondary" onClick={() => openImportDialog('marc')}>
              <Upload size={16} /> Unggah File JSON
            </Button>
          </Card>
        </div>
      </div>

      {/* Group 3: Data Rincian Unit Barang */}
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Boxes size={20} style={{ color: 'var(--color-success)' }} /> 3. Kelola Data Rincian Unit Barang
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {/* Tool 8: Ekspor Data Unit Barang */}
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                <FileSpreadsheet size={18} style={{ color: 'var(--color-success)' }} /> Ekspor Data Unit Barang
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Unduh rincian kondisi fisik, nomor seri, dan lokasi penempatan setiap unit barang.
              </p>
            </div>
            <a href="/api/tools/export?type=items_excel" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
              <Download size={16} /> Ekspor Data Unit (.xlsx)
            </a>
          </Card>

          {/* Tool 9: Impor & Update Data Unit Barang */}
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                <Upload size={18} style={{ color: 'var(--color-warning)' }} /> Impor & Update Data Unit Barang
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Update massal kondisi fisik, nomor seri, dan penempatan lokasi ruang unit barang dari Excel.
              </p>
            </div>
            <Button variant="secondary" onClick={() => openImportDialog('items')}>
              <Upload size={16} /> Update Data Unit Barang
            </Button>
          </Card>
        </div>
      </div>

      {/* Import Modal Dialog */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setModalOpen(false)}
        title={
          importType === 'biblio'
            ? 'Impor Data Katalog Aset (Excel/CSV)'
            : importType === 'marc'
            ? 'Impor Data Standar (JSON)'
            : 'Impor Data Rincian Unit Barang'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              isLoading={importing}
              disabled={parsedData.length === 0}
              onClick={handleExecuteImport}
            >
              Proses Impor ({parsedData.length} Baris)
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
            Pilih berkas spreadsheet <strong>.xlsx / .csv</strong> atau <strong>.json</strong> dari komputer Anda. Sistem akan secara otomatis membaca dan memasukkan data aset ke database.
          </p>

          <div
            style={{
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '2rem 1.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface2)',
              cursor: 'pointer',
            }}
          >
            <input
              type="file"
              accept=".xlsx, .xls, .csv, .json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="file-upload-input"
            />
            <label htmlFor="file-upload-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={32} style={{ color: 'var(--color-primary-light)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {fileName ? `File Terpilih: ${fileName}` : 'Klik untuk Memilih Berkas Excel / CSV / JSON'}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                Dukungan format: .xlsx, .csv, .json
              </span>
            </label>
          </div>

          {parsedData.length > 0 && (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={18} /> Berhasil membaca {parsedData.length} baris data siap impor!
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

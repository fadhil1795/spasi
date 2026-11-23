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
  FileCheck,
  AlertCircle,
  Bookmark,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ToolsUtilitasPage() {
  const { showToast } = useToast();

  // Import Modal State
  const [importModalOpen, setModalOpen] = useState(false);
  const [importType, setImportType] = useState<'catalog' | 'items' | 'json'>('catalog');
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
          const dataArr = Array.isArray(json) ? json : [json];
          setParsedData(dataArr);
          showToast(`Berhasil membaca ${dataArr.length} data dari ${file.name}`, 'success');
        } catch (err) {
          showToast('Format berkas JSON tidak valid', 'error');
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
      showToast('Pilih berkas Excel/CSV yang berisi baris data valid', 'error');
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

      const result = await res.json();

      if (res.ok) {
        showToast(result.message || 'Impor data aset berhasil diselesaikan!', 'success');
        setModalOpen(false);
        setParsedData([]);
        setFileName('');
      } else {
        showToast(result.error || 'Gagal memproses impor data', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan jaringan saat mengimpor', 'error');
    } finally {
      setImporting(false);
    }
  };

  const openImportDialog = (type: 'catalog' | 'items' | 'json') => {
    setImportType(type);
    setParsedData([]);
    setFileName('');
    setModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Database size={28} style={{ color: 'var(--color-primary-light)' }} />
          Pusat Utilitas & Manajemen Data Aset
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Impor & ekspor massal inventaris aset, unduh templat Excel resmi, cetak label stiker QR code, dan rekap buku inventaris.
        </p>
      </div>

      {/* Group 1: Impor & Ekspor Data Spreadsheet (Utama) */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)' }}>
          <FileSpreadsheet size={20} style={{ color: 'var(--color-success)' }} />
          1. Impor & Ekspor Data Inventaris (Excel / CSV)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {/* Tool A: Unduh Template Excel Resmi */}
          <div className="spasi-card spasi-card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--color-success)' }}>
                <FileCheck size={20} /> Unduh Templat Excel Resmi
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Unduh templat spreadsheet <strong>.xlsx</strong> resmi yang dilengkapi contoh pengisian dan lembar referensi kode kategori, subkategori, serta lokasi ruang.
              </p>
            </div>
            <a
              href="/api/tools/template"
              className="btn btn-secondary"
              style={{
                width: '100%',
                textAlign: 'center',
                borderColor: 'var(--color-success)',
                color: 'var(--color-success)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              <Download size={16} /> Unduh Template (.xlsx)
            </a>
          </div>

          {/* Tool B: Impor Data Massal Excel */}
          <div className="spasi-card spasi-card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', border: '1px solid rgba(79, 70, 229, 0.3)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--color-primary-light)' }}>
                <Upload size={20} /> Impor Massal Aset (Excel / CSV)
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Unggah berkas Excel/CSV untuk mendaftarkan puluhan hingga ratusan aset inventaris sekaligus. Otomatis menghubungkan kategori, subkategori, dan lokasi.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => openImportDialog('catalog')}
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <Upload size={16} /> Unggah File Excel Impor
            </Button>
          </div>

          {/* Tool C: Ekspor Lengkap Katalog Inventaris */}
          <div className="spasi-card spasi-card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                <Download size={20} style={{ color: 'var(--color-info)' }} /> Ekspor Katalog Lengkap (.xlsx)
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Unduh seluruh data katalog aset terdaftar lengkap dengan kode tag, kategori, subkategori, merek, nomor seri, harga beli, dan status fisik.
              </p>
            </div>
            <a
              href="/api/tools/export?type=catalog_excel"
              className="btn btn-secondary"
              style={{ width: '100%', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <Download size={16} /> Unduh Data Katalog (.xlsx)
            </a>
          </div>

          {/* Tool D: Ekspor Rincian Unit & Lokasi */}
          <div className="spasi-card spasi-card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                <Boxes size={20} style={{ color: '#F59E0B' }} /> Ekspor Unit & Lokasi Fisik (.xlsx)
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Unduh daftar rincian unit fisik barang lengkap dengan nomor seri/plat dan gedung/ruang penempatan untuk audit lapangan.
              </p>
            </div>
            <a
              href="/api/tools/export?type=items_excel"
              className="btn btn-secondary"
              style={{ width: '100%', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <Download size={16} /> Unduh Unit & Lokasi (.xlsx)
            </a>
          </div>

          {/* Tool E: Cadangan Data JSON */}
          <div className="spasi-card spasi-card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                <FileText size={20} style={{ color: '#A855F7' }} /> Cadangan Inventaris (JSON)
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Ekspor seluruh data katalog aset dalam format standar JSON untuk kebutuhan integrasi API dan cadangan data sistem.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a
                href="/api/tools/export?type=catalog_json"
                className="btn btn-secondary"
                style={{ flex: 1, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.82rem' }}
              >
                <Download size={14} /> Unduh JSON
              </a>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openImportDialog('json')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Upload size={14} /> Impor JSON
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Group 2: Pencetakan Fisik, Label & Referensi */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)' }}>
          <Printer size={20} style={{ color: 'var(--color-primary-light)' }} />
          2. Pencetakan Label Fisik & Master Data
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {/* Cetak Label QR Stiker */}
          <div className="spasi-card spasi-card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                <QrCode size={20} style={{ color: 'var(--color-primary-light)' }} /> Cetak Label QR Code Stiker Masal
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Generator stiker label QR fisik berukuran A4 (2 kolom / 3 kolom Tom & Jerry / 4 kolom thermal) untuk ditempel pada unit barang.
              </p>
            </div>
            <Link
              href="/dashboard/assets/qr-labels"
              className="btn btn-secondary"
              style={{ width: '100%', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <Printer size={16} /> Buka Studio Cetak Label QR
            </Link>
          </div>

          {/* Master Merek */}
          <div className="spasi-card spasi-card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                <Bookmark size={20} style={{ color: '#A855F7' }} /> Master Data Merek (Brand)
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Kelola katalog merek standar industri (70+ merek) dan subkategori terkait untuk standardisasi penamaan aset.
              </p>
            </div>
            <Link
              href="/dashboard/brands"
              className="btn btn-secondary"
              style={{ width: '100%', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <Bookmark size={16} /> Kelola Master Merek
            </Link>
          </div>

          {/* Rekap Buku Inventaris */}
          <div className="spasi-card spasi-card-hover" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                <BookOpen size={20} style={{ color: '#F59E0B' }} /> Laporan & Buku Inventaris (PDF)
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Cetak laporan rekapitulasi buku inventaris sarana & prasarana lengkap per unit instansi untuk laporan yayasan dan audit.
              </p>
            </div>
            <Link
              href="/dashboard/reports"
              className="btn btn-secondary"
              style={{ width: '100%', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              <BookOpen size={16} /> Buka Laporan & Rekapitulasi
            </Link>
          </div>
        </div>
      </div>

      {/* Modal Dialog Impor Data */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setModalOpen(false)}
        title={
          importType === 'json'
            ? 'Impor Data Inventaris (Format JSON)'
            : 'Impor Massal Aset dari File Excel / CSV'
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={importing}>
              Batal
            </Button>
            <Button
              variant="primary"
              disabled={parsedData.length === 0 || importing}
              onClick={handleExecuteImport}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {importing ? 'Memproses Impor...' : `Mulai Impor (${parsedData.length} Baris)`}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', background: 'var(--color-surface2)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)' }}>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.82rem', lineHeight: 1.5, margin: 0 }}>
              Sistem akan secara otomatis mencocokkan <strong>Kategori, Subkategori, Merek, dan Lokasi Ruangan</strong> berdasarkan kolom di file Excel Anda.
            </p>
            <a
              href="/api/tools/template"
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--color-primary-light)',
                textDecoration: 'underline',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Download size={13} /> Unduh Template
            </a>
          </div>

          {/* Area Upload File */}
          <div
            style={{
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '2rem 1.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface2)',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
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
              <Upload size={36} style={{ color: 'var(--color-primary-light)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                {fileName ? `File Terpilih: ${fileName}` : 'Klik untuk Memilih Berkas Excel (.xlsx, .csv, .json)'}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                Gunakan format templat resmi agar data terimpor dengan sempurna
              </span>
            </label>
          </div>

          {/* Pratinjau Baris Data Terbaca */}
          {parsedData.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: 'var(--color-success)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle2 size={18} /> Berhasil membaca {parsedData.length} baris data siap diproses!
              </div>

              {/* Tabel Pratinjau 3 Baris Pertama */}
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface2)', color: 'var(--color-muted)' }}>
                      <th style={{ padding: '0.4rem 0.6rem' }}>Nama Aset</th>
                      <th style={{ padding: '0.4rem 0.6rem' }}>Kategori</th>
                      <th style={{ padding: '0.4rem 0.6rem' }}>Subkategori</th>
                      <th style={{ padding: '0.4rem 0.6rem' }}>Merek</th>
                      <th style={{ padding: '0.4rem 0.6rem' }}>Gedung/Ruang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600 }}>
                          {row['Nama Aset *'] || row['Nama Aset / Sarana'] || row['Nama Aset'] || row.name || '-'}
                        </td>
                        <td style={{ padding: '0.4rem 0.6rem' }}>
                          {row['Kode Kategori *'] || row['Kode Kategori'] || row['Kategori Utama'] || row.categoryCode || '-'}
                        </td>
                        <td style={{ padding: '0.4rem 0.6rem' }}>
                          {row['Kode Subkategori'] || row['Subkategori'] || row.subCategoryCode || '-'}
                        </td>
                        <td style={{ padding: '0.4rem 0.6rem' }}>
                          {row['Merek / Brand'] || row['Merek'] || row.brand || '-'}
                        </td>
                        <td style={{ padding: '0.4rem 0.6rem' }}>
                          {row['Gedung / Lokasi'] || row['Gedung'] || row.building || '-'} {row['Ruangan'] || row['Ruang'] || row.room || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 5 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textAlign: 'right' }}>
                  ...dan {parsedData.length - 5} baris data lainnya
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

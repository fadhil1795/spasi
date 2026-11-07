'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Printer, ArrowLeft, Trash2, AlertOctagon } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function AssetDisposalReportPage() {
  const params = useParams();
  const assetId = params?.id as string;

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assetId) return;
    fetch(`/api/assets/${assetId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setAsset(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [assetId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
        <p>Memuat Berita Acara Penghapusan Aset...</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
        <p>Aset tidak ditemukan.</p>
        <Link href="/dashboard/assets" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Kembali ke Daftar Aset
        </Link>
      </div>
    );
  }

  const disposalDate = asset.updatedAt ? new Date(asset.updatedAt) : new Date();
  const year = disposalDate.getFullYear();
  const month = String(disposalDate.getMonth() + 1).padStart(2, '0');
  const docNumber = `BA-PENGHAPUSAN/${year}/${month}/${asset.code.replace(/[^a-zA-Z0-9]/g, '-')}`;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Action Bar */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <Link
          href={`/dashboard/assets/${asset.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--color-muted)',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <ArrowLeft size={16} /> Kembali ke Detail Aset
        </Link>

        <button
          onClick={() => window.print()}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
        >
          <Printer size={18} /> Cetak Berita Acara (Print / PDF)
        </button>
      </div>

      {/* Printable Sheet */}
      <div
        className="disposal-printable-sheet"
        style={{
          backgroundColor: '#FFFFFF',
          color: '#111827',
          padding: '2.5rem 3rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Kop Surat Institusi */}
        <div style={{ borderBottom: '3px double #111827', paddingBottom: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.2rem' }}>
            SUB BAGIAN SARANA DAN PRASARANA (SIM SARPRAS)
          </div>
          <div style={{ fontSize: '0.85rem', color: '#4B5563', marginTop: '0.2rem' }}>
            Panitia Pemeriksaan &amp; Penghapusan Barang Milik Institusi
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
            BERITA ACARA PENGHAPUSAN / PEMUTIHAN ASET
          </h2>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'monospace', color: '#374151', marginTop: '0.35rem' }}>
            Nomor: {docNumber}
          </div>
        </div>

        {/* Introduction */}
        <div style={{ fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
          Pada hari ini, <strong>{formatDate(disposalDate, 'EEEE, dd MMMM yyyy')}</strong>, berdasarkan hasil pemeriksaan fisik dan telaah teknis kondisi barang inventaris kampus, Panitia Penghapusan Sarana dan Prasarana menerangkan bahwa aset di bawah ini dinyatakan <strong>DIHAPUSKAN / DIAFKIR DARI BUKU INVENTARIS KAMPUS</strong>:
        </div>

        {/* Asset Details Table */}
        <div style={{ marginBottom: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', border: '1px solid #D1D5DB' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                <td style={{ padding: '0.6rem 0.75rem', width: '220px', fontWeight: 600, color: '#4B5563' }}>Kode Inventaris Aset</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontWeight: 800, color: '#DC2626' }}>{asset.code}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#4B5563' }}>Nama Barang</td>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>{asset.name}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#4B5563' }}>Kategori &amp; Merek</td>
                <td style={{ padding: '0.6rem 0.75rem' }}>{asset.category?.name || '-'} • {asset.brand || '-'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#4B5563' }}>Nomor Seri Pabrik</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace' }}>{asset.serialNumber || '-'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#4B5563' }}>Tahun / Biaya Perolehan</td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  {asset.purchaseDate ? formatDate(asset.purchaseDate, 'yyyy') : '-'} • {formatCurrency(asset.purchaseCost || 0)}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#4B5563' }}>Taksiran Nilai Sisa (Salvage)</td>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#166534' }}>{formatCurrency(asset.salvageValue || 0)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#4B5563' }}>Alasan Penghapusan</td>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#991B1B' }}>
                  {asset.disposalReason || 'Kondisi rusak berat dan biaya perbaikan melampaui nilai ekonomis'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#4B5563' }}>Unit Penanggung Jawab Terakhir</td>
                <td style={{ padding: '0.6rem 0.75rem' }}>{asset.department?.name || 'Milik Pusat Kampus'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legal Clause */}
        <div style={{ fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '2.5rem', color: '#374151' }}>
          Dengan diterbitkannya Berita Acara ini, barang inventaris tersebut di atas secara resmi dikeluarkan dari daftar aset aktif, tidak dapat dipinjamkan maupun disewakan kembali, serta dibebaskan dari kewajiban pencatatan Kartu Inventaris Ruangan (KIR).
        </div>

        {/* 3 Signature Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', textAlign: 'center', pageBreakInside: 'avoid' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#4B5563', marginBottom: '0.2rem' }}>Pemeriksa Teknis</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Petugas Sarpras / Teknisi</div>
            <div style={{ height: '65px' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textDecoration: 'underline' }}>
              (............................................)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>NIP. ........................................</div>
          </div>

          <div>
            <div style={{ fontSize: '0.82rem', color: '#4B5563', marginBottom: '0.2rem' }}>Penanggung Jawab Unit</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Kepala Unit / Jurusan</div>
            <div style={{ height: '65px' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textDecoration: 'underline' }}>
              (............................................)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>NIP. ........................................</div>
          </div>

          <div>
            <div style={{ fontSize: '0.82rem', color: '#4B5563', marginBottom: '0.2rem' }}>Menyetujui,</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Kepala Bagian Sarpras / Rektorat</div>
            <div style={{ height: '65px' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textDecoration: 'underline' }}>
              (............................................)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>NIP. ........................................</div>
          </div>
        </div>
      </div>

      {/* Print Style */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print,
          .sidebar-container,
          aside,
          header {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .disposal-printable-sheet {
            box-shadow: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Printer, ArrowLeft, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function TransferBASTPage() {
  const params = useParams();
  const transferId = params?.id as string;

  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transferId) return;
    fetch(`/api/transfers/${transferId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setTransfer(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [transferId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
        <p>Memuat data Berita Acara Mutasi Aset (BAST)...</p>
      </div>
    );
  }

  if (!transfer || !transfer.asset) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
        <p>Data mutasi tidak ditemukan.</p>
        <Link href="/dashboard/assets" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Kembali ke Daftar Aset
        </Link>
      </div>
    );
  }

  const asset = transfer.asset;
  const transferDate = new Date(transfer.transferredAt);
  const year = transferDate.getFullYear();
  const month = String(transferDate.getMonth() + 1).padStart(2, '0');
  const bastNumber = transfer.transferNumber
    ? `BAST-${transfer.transferNumber}`
    : `BAST-MUT/${year}/${month}/${transfer.id.slice(-6).toUpperCase()}`;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Action Bar (Hidden when printing) */}
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
          <Printer size={18} /> Cetak BAST Mutasi (Print / PDF)
        </button>
      </div>

      {/* Printable Sheet */}
      <div
        className="bast-printable-sheet"
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
            Gedung Rektorat Lt. 2 • Bagian Logistik, Mutasi, dan Inventaris Aset Kampus
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
            BERITA ACARA SERAH TERIMA (BAST) MUTASI ASET
          </h2>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'monospace', color: '#374151', marginTop: '0.35rem' }}>
            Nomor: {bastNumber}
          </div>
        </div>

        {/* Introduction Paragraph */}
        <div style={{ fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
          Pada hari ini, <strong>{formatDate(transfer.transferredAt, 'EEEE, dd MMMM yyyy')}</strong>, telah dilakukan pemindahan fisik dan pengalihan tanggung jawab penempatan aset inventaris sarana prasarana dengan rincian sebagai berikut:
        </div>

        {/* Transfer Movement Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Lokasi Penempatan Asal</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginTop: '0.2rem' }}>
              {transfer.fromLocation || 'Gudang Sarpras Utama'}
            </div>
          </div>

          <div style={{ fontSize: '1.5rem', color: '#2563EB', fontWeight: 900 }}>➔</div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Lokasi Penempatan Tujuan (Baru)</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#166534', marginTop: '0.2rem' }}>
              {transfer.toLocation}
            </div>
          </div>
        </div>

        {/* Asset Details Table */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.5rem', color: '#374151' }}>
            Identitas Barang / Aset yang Dimutasi:
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', border: '1px solid #D1D5DB' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                <td style={{ padding: '0.6rem 0.75rem', width: '200px', fontWeight: 600, color: '#4B5563' }}>Kode Aset (Barcode)</td>
                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontWeight: 800, color: '#111827' }}>{asset.code}</td>
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
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#4B5563' }}>Kondisi Fisik Saat Mutasi</td>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#166534' }}>{asset.condition || 'Baik'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#4B5563' }}>Mutasi Unit / Fakultas</td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  {transfer.fromDepartment || asset.department?.name || 'Inventaris Pusat'} ➔ <strong>{transfer.toDepartment || asset.department?.name || 'Inventaris Pusat'}</strong>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#4B5563' }}>Perubahan Penanggung Jawab (PIC)</td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  {transfer.fromPicName || 'Petugas Asal'} ➔ <strong>{transfer.toPicName || asset.picName || 'Penanggung Jawab Baru'}</strong>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#4B5563' }}>Status Persetujuan Mutasi</td>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>
                  {transfer.status || 'APPROVED'} {transfer.approvedBy ? `(Disetujui oleh: ${transfer.approvedBy})` : ''}
                </td>
              </tr>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#4B5563' }}>Alasan Pemindahan</td>
                <td style={{ padding: '0.6rem 0.75rem', fontStyle: 'italic' }}>&quot;{transfer.reason || 'Optimalisasi utilisasi ruang dan kebutuhan operasional'}&quot;</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Statement */}
        <div style={{ fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '2.5rem', color: '#374151' }}>
          Demikian Berita Acara Serah Terima Mutasi ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dapat dipergunakan sebagaimana mestinya dan dijadikan dasar pemutakhiran data Kartu Inventaris Ruangan (KIR).
        </div>

        {/* 3 Signature Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', textAlign: 'center', pageBreakInside: 'avoid' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#4B5563', marginBottom: '0.2rem' }}>Pihak I (Penyerah)</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Petugas / Pengelola Asal</div>
            <div style={{ height: '65px' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textDecoration: 'underline' }}>
              ({transfer.transferredBy || 'Petugas Sarpras'})
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>NIP. ........................................</div>
          </div>

          <div>
            <div style={{ fontSize: '0.82rem', color: '#4B5563', marginBottom: '0.2rem' }}>Pihak II (Penerima)</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Penanggung Jawab Ruang Baru</div>
            <div style={{ height: '65px' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textDecoration: 'underline' }}>
              (............................................)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>NIP. ........................................</div>
          </div>

          <div>
            <div style={{ fontSize: '0.82rem', color: '#4B5563', marginBottom: '0.2rem' }}>Mengetahui,</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Kepala Sub Bagian Sarpras</div>
            <div style={{ height: '65px' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textDecoration: 'underline' }}>
              (............................................)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>NIP. ........................................</div>
          </div>
        </div>
      </div>

      {/* Global Print Style */}
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
          .bast-printable-sheet {
            box-shadow: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

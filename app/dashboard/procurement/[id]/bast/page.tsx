'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Printer, ArrowLeft, CheckCircle2, ShoppingBag } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function ProcurementBASTPage() {
  const params = useParams();
  const requestId = params?.id as string;

  const [procurement, setProcurement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;
    fetch(`/api/procurement/${requestId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProcurement(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [requestId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
        <p>Memuat Berita Acara Serah Terima (BAST) Pengadaan...</p>
      </div>
    );
  }

  if (!procurement) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
        <p>Data pengadaan tidak ditemukan.</p>
        <Link href="/dashboard/procurement" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Kembali ke Daftar Pengadaan
        </Link>
      </div>
    );
  }

  const receiptDate = procurement.updatedAt ? new Date(procurement.updatedAt) : new Date();
  const year = receiptDate.getFullYear();
  const month = String(receiptDate.getMonth() + 1).padStart(2, '0');
  const bastNumber = `BAST-PB/${year}/${month}/${procurement.requestNumber || procurement.id.slice(-6).toUpperCase()}`;

  const items = procurement.items || [];
  const totalAmount = items.reduce(
    (sum: number, it: any) => sum + (it.realizedPrice || it.estimatedPrice || 0) * (it.quantity || 1),
    0
  );

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', paddingBottom: '3rem' }}>
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
          href="/dashboard/procurement"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--color-muted)',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <ArrowLeft size={16} /> Kembali ke Usulan Pengadaan
        </Link>

        <button
          onClick={() => window.print()}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
        >
          <Printer size={18} /> Cetak BAST Pengadaan (Print / PDF)
        </button>
      </div>

      {/* Printable Sheet */}
      <div
        className="bast-procurement-sheet"
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
            Panitia Penerima Hasil Pekerjaan &amp; Pengadaan Barang Inventaris Kampus
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
            BERITA ACARA SERAH TERIMA (BAST) HASIL PENGADAAN BARANG
          </h2>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'monospace', color: '#374151', marginTop: '0.35rem' }}>
            Nomor: {bastNumber}
          </div>
        </div>

        {/* Introduction */}
        <div style={{ fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
          Pada hari ini, <strong>{formatDate(receiptDate, 'EEEE, dd MMMM yyyy')}</strong>, yang bertanda tangan di bawah ini telah melaksanakan pemeriksaan fisik, uji fungsi teknis, dan serah terima hasil pengadaan barang inventaris sarana prasarana:
        </div>

        {/* Reference Meta Box */}
        <div
          style={{
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <span style={{ color: '#6B7280' }}>Judul Pengadaan:</span>{' '}
              <strong style={{ color: '#111827' }}>{procurement.title}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Nomor Usulan / SP:</span>{' '}
              <strong style={{ fontFamily: 'monospace', color: '#1D4ED8' }}>{procurement.requestNumber}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Unit / Jurusan Pemohon:</span>{' '}
              <strong>{procurement.department?.name || 'Seluruh Kampus'}</strong>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Penyedia / Toko Rekanan:</span>{' '}
              <strong style={{ color: '#047857' }}>{procurement.vendorName || 'Penyedia Rekanan Sarpras'}</strong>
            </div>
          </div>
        </div>

        {/* Item Table */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.5rem', color: '#374151' }}>
            Rincian Barang yang Diterima &amp; Lolos Uji Fungsi:
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', border: '1px solid #D1D5DB' }}>
            <thead>
              <tr style={{ backgroundColor: '#F3F4F6', borderBottom: '1px solid #D1D5DB', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem 0.75rem', width: '35px' }}>No</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Nama Barang &amp; Spesifikasi</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Kategori / Merek</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', width: '70px' }}>Jumlah</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Harga Satuan</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Total (Rp)</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', width: '90px' }}>Hasil QC</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any, idx: number) => {
                const unitPrice = it.realizedPrice || it.estimatedPrice || 0;
                const subTotal = unitPrice * (it.quantity || 1);
                return (
                  <tr key={it.id || idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{it.itemName}</div>
                      {it.specs && <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.15rem' }}>{it.specs}</div>}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <div>{it.category?.name || '-'}</div>
                      {it.brand && <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Merek: {it.brand}</div>}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>
                      {it.quantity} {it.unit || 'Unit'}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                      {formatCurrency(unitPrice)}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>
                      {formatCurrency(subTotal)}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', background: '#D1FAE5', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                        ✓ Baik
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#F9FAFB', fontWeight: 800, borderTop: '2px solid #D1D5DB' }}>
                <td colSpan={5} style={{ padding: '0.75rem', textAlign: 'right' }}>
                  Total Realisasi Nilai Pengadaan:
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right', color: '#1E40AF', fontSize: '0.9rem' }}>
                  {formatCurrency(totalAmount)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legal Clause */}
        <div style={{ fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '2.5rem', color: '#374151' }}>
          Telah dilakukan pemeriksaan fisik dan uji fungsi teknis terhadap barang-barang hasil pengadaan sebagaimana tertera dalam rincian di atas. Seluruh barang dinyatakan dalam keadaan baru (100%), lengkap dengan buku panduan dan aksesori standar, serta berfungsi dengan baik sesuai spesifikasi yang dipersyaratkan. Barang-barang ini secara resmi diserahterimakan untuk dicatat dan dibukukan ke dalam Master Data Inventaris Aset Institusi.
        </div>

        {/* 3 Signature Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', textAlign: 'center', pageBreakInside: 'avoid' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#4B5563', marginBottom: '0.2rem' }}>Pihak I (Penyedia)</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Rekanan / Vendor</div>
            <div style={{ height: '65px' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textDecoration: 'underline' }}>
              ({procurement.vendorName || 'Penyedia Barang'})
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>Cap &amp; Tanda Tangan</div>
          </div>

          <div>
            <div style={{ fontSize: '0.82rem', color: '#4B5563', marginBottom: '0.2rem' }}>Pihak II (Penerima)</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Panitia Pemeriksa / Staf Sarpras</div>
            <div style={{ height: '65px' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textDecoration: 'underline' }}>
              ({procurement.requestedBy?.name || 'Petugas Sarpras'})
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>NIP. ........................................</div>
          </div>

          <div>
            <div style={{ fontSize: '0.82rem', color: '#4B5563', marginBottom: '0.2rem' }}>Mengetahui &amp; Menyetujui</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Kepala Bagian Sarana &amp; Prasarana</div>
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
          .bast-procurement-sheet {
            box-shadow: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}


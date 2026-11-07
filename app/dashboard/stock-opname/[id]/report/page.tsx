'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { Printer, ArrowLeft } from 'lucide-react';

export default function StockOpnameReportPage() {
  const { id } = useParams();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetch(`/api/stock-opname/${id}`)
        .then((res) => res.json())
        .then((data) => {
          setSession(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif' }}>Memuat dokumen Berita Acara...</div>;
  }

  if (!session || !session.id) {
    return <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif' }}>Data sesi stock opname tidak ditemukan.</div>;
  }

  const items = session.items || [];
  const matchItems = items.filter((i: any) => i.scanStatus === 'MATCH');
  const wrongLocationItems = items.filter((i: any) => i.scanStatus === 'WRONG_LOCATION');
  const missingItems = items.filter((i: any) => i.scanStatus === 'MISSING');

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '2rem 1rem' }}>
      {/* Print Action Toolbar (Hidden when printing) */}
      <div
        className="no-print"
        style={{
          maxWidth: '850px',
          margin: '0 auto 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => window.history.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#fff',
            border: '1px solid #cbd5e1',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} /> Kembali
        </button>

        <button
          onClick={() => window.print()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            padding: '0.5rem 1.25rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <Printer size={16} /> Cetak Berita Acara (Print / PDF)
        </button>
      </div>

      {/* Main A4 Document Sheet */}
      <div
        style={{
          maxWidth: '850px',
          margin: '0 auto',
          background: '#ffffff',
          color: '#000000',
          padding: '3rem',
          boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
          borderRadius: '4px',
          fontFamily: "'Times New Roman', Times, serif",
        }}
      >
        {/* Kop Surat Resmi */}
        <div style={{ textAlign: 'center', borderBottom: '3px double #000', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '13pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI
          </div>
          <div style={{ fontSize: '14pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.2rem' }}>
            BAGIAN PENGELOLAAN SARANA DAN PRASARANA
          </div>
          <div style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.2rem' }}>
            SISTEM INFORMASI MANAJEMEN ASET & INVENTARISASI (SPASI)
          </div>
          <div style={{ fontSize: '9pt', color: '#334155', marginTop: '0.3rem' }}>
            Gedung Rektorat Lt. 1 &bull; Telepon: (021) 12345678 &bull; Email: sarpras@kampus.ac.id
          </div>
        </div>

        {/* Title & Number */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '13pt', fontWeight: 800, textTransform: 'uppercase', textDecoration: 'underline' }}>
            BERITA ACARA HASIL STOCK OPNAME FISIK INVENTARIS
          </div>
          <div style={{ fontSize: '10.5pt', marginTop: '0.25rem' }}>
            Nomor: <strong>BA-SO/{session.sessionNumber}</strong>
          </div>
        </div>

        {/* Introduction Paragraph */}
        <p style={{ fontSize: '10.5pt', lineHeight: 1.6, textAlign: 'justify', marginBottom: '1rem' }}>
          Pada hari ini, <strong>{formatDate(session.completedDate || session.startDate)}</strong>, telah dilaksanakan kegiatan pemeriksaan fisik dan pencocokan data inventaris sarana dan prasarana (Stock Opname) pada unit ruangan sebagai berikut:
        </p>

        {/* Room & Audit Metadata Table */}
        <table style={{ width: '100%', fontSize: '10pt', marginBottom: '1.25rem', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '28%', padding: '0.25rem 0' }}>Nama Ruangan / Gedung</td>
              <td style={{ width: '2%' }}>:</td>
              <td style={{ fontWeight: 700 }}>{session.location?.name || session.location?.building}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.25rem 0' }}>Lantai / Nomor Ruang</td>
              <td>:</td>
              <td>Lantai {session.location?.floor || '1'} {session.location?.room ? `(${session.location.room})` : ''}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.25rem 0' }}>Pelaksana / Ketua Auditor</td>
              <td>:</td>
              <td style={{ fontWeight: 700 }}>{session.auditor?.name || 'Petugas Sarpras'}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.25rem 0' }}>Status Sesi Opname</td>
              <td>:</td>
              <td>{session.status === 'COMPLETED' ? 'SELESAI (COMPLETED)' : 'DALAM PROSES (IN PROGRESS)'}</td>
            </tr>
          </tbody>
        </table>

        {/* Summary Box */}
        <div style={{ border: '1px solid #000', padding: '0.75rem 1rem', marginBottom: '1.5rem', background: '#fafafa' }}>
          <div style={{ fontWeight: 700, fontSize: '10.5pt', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
            Rekapitulasi Hasil Pemeriksaan Fisik:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '9.5pt', textAlign: 'center' }}>
            <div>
              <div style={{ color: '#475569' }}>Total Tercatat di Buku</div>
              <div style={{ fontSize: '13pt', fontWeight: 800 }}>{session.totalExpected} Unit</div>
            </div>
            <div>
              <div style={{ color: '#15803d' }}>Fisik Sesuai (Match)</div>
              <div style={{ fontSize: '13pt', fontWeight: 800, color: '#15803d' }}>{session.totalMatch} Unit</div>
            </div>
            <div>
              <div style={{ color: '#b45309' }}>Salah Kamar / Nyasar</div>
              <div style={{ fontSize: '13pt', fontWeight: 800, color: '#b45309' }}>{session.totalWrongLoc} Unit</div>
            </div>
            <div>
              <div style={{ color: '#b91c1c' }}>Belum Ditemukan (Hilang)</div>
              <div style={{ fontSize: '13pt', fontWeight: 800, color: '#b91c1c' }}>{session.totalMissing} Unit</div>
            </div>
          </div>
        </div>

        {/* Table 1: Missing Items (Selisih Kurang) */}
        {missingItems.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '10.5pt', fontWeight: 700, marginBottom: '0.4rem', color: '#b91c1c' }}>
              A. DAFTAR ASET TIDAK DITEMUKAN / HILANG ({missingItems.length} UNIT)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #000', padding: '0.4rem', width: '35px', textAlign: 'center' }}>No</th>
                  <th style={{ border: '1px solid #000', padding: '0.4rem', width: '140px' }}>Kode Aset</th>
                  <th style={{ border: '1px solid #000', padding: '0.4rem' }}>Nama Barang / Merek</th>
                  <th style={{ border: '1px solid #000', padding: '0.4rem', width: '100px' }}>Nomor Seri</th>
                  <th style={{ border: '1px solid #000', padding: '0.4rem', width: '100px' }}>Kondisi Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {missingItems.map((item: any, idx: number) => (
                  <tr key={item.id}>
                    <td style={{ border: '1px solid #000', padding: '0.35rem', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '0.35rem', fontFamily: 'monospace' }}>{item.asset?.code}</td>
                    <td style={{ border: '1px solid #000', padding: '0.35rem' }}>{item.asset?.name} {item.asset?.brand ? `(${item.asset.brand})` : ''}</td>
                    <td style={{ border: '1px solid #000', padding: '0.35rem' }}>{item.asset?.serialNumber || '-'}</td>
                    <td style={{ border: '1px solid #000', padding: '0.35rem' }}>{item.conditionBefore || 'Baik'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table 2: Misplaced Items (Salah Kamar) */}
        {wrongLocationItems.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '10.5pt', fontWeight: 700, marginBottom: '0.4rem', color: '#b45309' }}>
              B. DAFTAR ASET SALAH KAMAR / DITEMUKAN DARI RUANGAN LAIN ({wrongLocationItems.length} UNIT)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #000', padding: '0.4rem', width: '35px', textAlign: 'center' }}>No</th>
                  <th style={{ border: '1px solid #000', padding: '0.4rem', width: '140px' }}>Kode Aset</th>
                  <th style={{ border: '1px solid #000', padding: '0.4rem' }}>Nama Barang</th>
                  <th style={{ border: '1px solid #000', padding: '0.4rem' }}>Lokasi Asal di Buku</th>
                  <th style={{ border: '1px solid #000', padding: '0.4rem', width: '90px' }}>Kondisi Fisik</th>
                </tr>
              </thead>
              <tbody>
                {wrongLocationItems.map((item: any, idx: number) => (
                  <tr key={item.id}>
                    <td style={{ border: '1px solid #000', padding: '0.35rem', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '0.35rem', fontFamily: 'monospace' }}>{item.asset?.code}</td>
                    <td style={{ border: '1px solid #000', padding: '0.35rem' }}>{item.asset?.name}</td>
                    <td style={{ border: '1px solid #000', padding: '0.35rem' }}>{item.asset?.location?.name || item.asset?.location?.building || 'Gudang Lain'}</td>
                    <td style={{ border: '1px solid #000', padding: '0.35rem' }}>{item.conditionAfter || 'Baik'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Concluding Statement */}
        <p style={{ fontSize: '10pt', lineHeight: 1.5, textAlign: 'justify', marginBottom: '2rem' }}>
          Demikian Berita Acara Hasil Pemeriksaan Fisik ini dibuat dengan sebenar-benarnya sebagai dasar pertanggungjawaban inventarisasi sarpras, mutasi penyesuaian lokasi aset, dan proses verifikasi audit internal.
        </p>

        {/* Signature Blocks (3 Columns) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center', fontSize: '10pt' }}>
          <div>
            <div>Ketua Tim Auditor Fisik,</div>
            <div style={{ height: '65px' }} />
            <div style={{ fontWeight: 700, textDecoration: 'underline' }}>{session.auditor?.name || 'Petugas Auditor'}</div>
            <div style={{ fontSize: '8.5pt', color: '#475569' }}>NIP / NIK. ........................</div>
          </div>

          <div>
            <div>Penanggung Jawab Ruangan,</div>
            <div style={{ height: '65px' }} />
            <div style={{ fontWeight: 700, textDecoration: 'underline' }}>..........................................</div>
            <div style={{ fontSize: '8.5pt', color: '#475569' }}>NIP / NIK. ........................</div>
          </div>

          <div>
            <div>Mengetahui,<br />Kepala Bagian Sarpras,</div>
            <div style={{ height: '50px' }} />
            <div style={{ fontWeight: 700, textDecoration: 'underline' }}>Dr. Ir. H. M. Sarpras, M.T.</div>
            <div style={{ fontSize: '8.5pt', color: '#475569' }}>NIP. 19780101 200501 1 002</div>
          </div>
        </div>
      </div>

      {/* Print CSS Rules */}
      <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  );
}

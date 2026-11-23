'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Printer, ArrowLeft, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function RoomKIRPage() {
  const params = useParams();
  const roomId = params?.id as string;

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    fetch(`/api/rooms/${roomId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRoom(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [roomId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
        <p>Memuat data Kartu Inventaris Ruangan (KIR)...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
        <p>Ruangan tidak ditemukan.</p>
        <Link href="/dashboard/rooms" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Kembali ke Daftar Ruangan
        </Link>
      </div>
    );
  }

  // Gabungkan aset yang tertaut langsung (assets) dan alokasi jumlah per ruangan (assetAllocations)
  const combinedMap = new Map<string, any>();
  (room.assets || []).forEach((a: any) => {
    combinedMap.set(a.id, { ...a, roomQty: a.quantity || 1 });
  });
  (room.assetAllocations || []).forEach((al: any) => {
    if (al.asset) {
      combinedMap.set(al.asset.id, { ...al.asset, roomQty: al.quantity || 1 });
    }
  });
  const assets: any[] = Array.from(combinedMap.values());
  const baikCount = assets.filter((a) => (a.condition || '').toLowerCase() === 'baik').length;
  const rusakRinganCount = assets.filter((a) => (a.condition || '').toLowerCase().includes('ringan')).length;
  const rusakBeratCount = assets.filter((a) => (a.condition || '').toLowerCase().includes('berat')).length;

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', paddingBottom: '3rem' }}>
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
          href={`/dashboard/rooms/${room.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--color-muted)',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <ArrowLeft size={16} /> Kembali ke Detail Ruangan
        </Link>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => window.print()}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
          >
            <Printer size={18} /> Cetak KIR (Print / PDF)
          </button>
        </div>
      </div>

      {/* Printable Sheet (Standard KIR Layout) */}
      <div
        className="kir-printable-sheet"
        style={{
          backgroundColor: '#FFFFFF',
          color: '#111827',
          padding: '2.5rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Kop Surat */}
        <div style={{ borderBottom: '3px double #111827', paddingBottom: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.2rem' }}>
            SISTEM INFORMASI MANAJEMEN SARANA DAN PRASARANA (SIM SARPRAS)
          </div>
          <div style={{ fontSize: '0.85rem', color: '#4B5563', marginTop: '0.2rem' }}>
            Bagian Pengelolaan Inventaris, Gedung &amp; Fasilitas Kampus Terpadu
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
            KARTU INVENTARIS RUANGAN (KIR)
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#4B5563', marginTop: '0.25rem' }}>
            Lembar Pencatatan Inventaris Fisik Ruangan — Tahun Anggaran {new Date().getFullYear()}
          </div>
        </div>

        {/* Room Identity Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem 2rem',
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            fontSize: '0.88rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', marginBottom: '0.35rem' }}>
              <span style={{ width: '150px', color: '#6B7280', fontWeight: 600 }}>Kode Ruangan:</span>
              <strong style={{ fontFamily: 'monospace', color: '#111827' }}>{room.code || '-'}</strong>
            </div>
            <div style={{ display: 'flex', marginBottom: '0.35rem' }}>
              <span style={{ width: '150px', color: '#6B7280', fontWeight: 600 }}>Nama Ruangan:</span>
              <strong style={{ color: '#111827' }}>{room.name}</strong>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: '150px', color: '#6B7280', fontWeight: 600 }}>Gedung / Lantai:</span>
              <span style={{ color: '#111827' }}>{room.building} {room.floor ? `(Lantai ${room.floor})` : ''}</span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', marginBottom: '0.35rem' }}>
              <span style={{ width: '160px', color: '#6B7280', fontWeight: 600 }}>Unit / Jurusan Pemilik:</span>
              <strong style={{ color: '#111827' }}>{room.department?.name || 'Bagian Sarana & Prasarana'}</strong>
            </div>
            <div style={{ display: 'flex', marginBottom: '0.35rem' }}>
              <span style={{ width: '160px', color: '#6B7280', fontWeight: 600 }}>Kapasitas / Luas:</span>
              <span style={{ color: '#111827' }}>{room.capacity ? `${room.capacity} Orang` : '-'} {room.area ? `• Luas: ${room.area} m²` : ''}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: '160px', color: '#6B7280', fontWeight: 600 }}>Tanggal Pemutakhiran:</span>
              <span style={{ color: '#111827' }}>{formatDate(new Date())}</span>
            </div>
          </div>
        </div>

        {/* Asset Inventory Table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.82rem',
            textAlign: 'left',
            marginBottom: '1.5rem',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#F3F4F6', borderTop: '2px solid #111827', borderBottom: '2px solid #111827' }}>
              <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', width: '40px' }}>No</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Kode Aset (Barcode)</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Nama Barang / Aset</th>
              <th style={{ padding: '0.6rem 0.75rem' }}>Merek &amp; Model</th>
              <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>No. Seri</th>
              <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', width: '55px' }}>Jml</th>
              <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', width: '95px' }}>Kondisi</th>
              <th style={{ padding: '0.6rem 0.75rem', width: '110px' }}>Status Pakai</th>
            </tr>
          </thead>
          <tbody>
            {assets.length > 0 ? (
              assets.map((ast, idx) => (
                <tr key={ast.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center', color: '#4B5563' }}>{idx + 1}</td>
                  <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', fontWeight: 700, color: '#1F2937' }}>
                    {ast.code}
                  </td>
                  <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>{ast.name}</td>
                  <td style={{ padding: '0.55rem 0.75rem', color: '#4B5563' }}>{ast.brand || '-'}</td>
                  <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center', fontFamily: 'monospace', color: '#6B7280' }}>
                    {ast.serialNumber || '-'}
                  </td>
                  <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>
                    {ast.roomQty || ast.quantity || 1}
                  </td>
                  <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor:
                          (ast.condition || '').toLowerCase() === 'baik'
                            ? '#DCFCE7'
                            : (ast.condition || '').toLowerCase().includes('ringan')
                            ? '#FEF3C7'
                            : '#FEE2E2',
                        color:
                          (ast.condition || '').toLowerCase() === 'baik'
                            ? '#166534'
                            : (ast.condition || '').toLowerCase().includes('ringan')
                            ? '#92400E'
                            : '#991B1B',
                      }}
                    >
                      {ast.condition || 'Baik'}
                    </span>
                  </td>
                  <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.75rem', color: '#6B7280' }}>
                    {ast.status === 'AVAILABLE' ? 'Tersedia' : ast.status === 'BORROWED' ? 'Dipinjam' : ast.status}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
                  Belum ada aset fisik yang ditempatkan pada ruangan ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Summary Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            fontSize: '0.85rem',
            marginBottom: '3rem',
          }}
        >
          <div>
            Total Aset Terdaftar: <strong>{assets.length} Item</strong>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem' }}>
            <span>Baik: <strong style={{ color: '#166534' }}>{baikCount}</strong></span>
            <span>Rusak Ringan: <strong style={{ color: '#D97706' }}>{rusakRinganCount}</strong></span>
            <span>Rusak Berat: <strong style={{ color: '#DC2626' }}>{rusakBeratCount}</strong></span>
          </div>
        </div>

        {/* Official Signature Block */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', pageBreakInside: 'avoid' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#4B5563', marginBottom: '0.25rem' }}>Mengetahui,</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Kepala Bagian Sarana &amp; Prasarana</div>
            <div style={{ height: '70px' }}></div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, textDecoration: 'underline' }}>
              (...................................................)
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.2rem' }}>NIP. ...............................................</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#4B5563', marginBottom: '0.25rem' }}>
              Ditetapkan di Kampus, {formatDate(new Date())}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Penanggung Jawab Ruangan (PIC)</div>
            <div style={{ height: '70px' }}></div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, textDecoration: 'underline' }}>
              {room.picName ? room.picName : '(...................................................)'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.2rem' }}>NIP/NIDN. ........................................</div>
          </div>
        </div>
      </div>

      {/* Global CSS for Print Mode */}
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
          .kir-printable-sheet {
            box-shadow: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { ArrowLeft, Printer, Building2, Users, UserCheck, ShieldCheck } from 'lucide-react';
import { getRoomTypeLabel } from '@/lib/roomConstants';

export default function RoomQRLabelPage() {
  const params = useParams();
  const roomId = params?.id as string;

  const [room, setRoom] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    fetch(`/api/rooms/${roomId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        setRoom(data);
        if (data) {
          const scanTarget =
            typeof window !== 'undefined'
              ? `${window.location.origin}/dashboard/rooms/${data.id}`
              : data.qrToken || data.code || data.id;
          const url = await QRCode.toDataURL(scanTarget, {
            width: 300,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
          });
          setQrUrl(url);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [roomId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
        Memuat Label QR Pintu Ruangan...
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

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '3rem' }}>
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

        <button
          onClick={() => window.print()}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
        >
          <Printer size={18} /> Cetak Stiker QR Pintu
        </button>
      </div>

      {/* Door Plate / QR Sticker Preview */}
      <div
        className="qr-door-plate"
        style={{
          backgroundColor: '#FFFFFF',
          color: '#0f172a',
          border: '3px solid #1e293b',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1rem',
        }}
      >
        {/* Top Badge */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.85rem', color: '#4f46e5', letterSpacing: '0.05em' }}>
            <ShieldCheck size={18} /> SPASI SARPRAS KAMPUS
          </div>
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 800,
              fontSize: '0.9rem',
              background: '#f1f5f9',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
            }}
          >
            {room.code || room.id.slice(0, 8).toUpperCase()}
          </span>
        </div>

        {/* Room Title */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
            {getRoomTypeLabel(room.roomType)}
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, margin: '0.25rem 0', color: '#0f172a', lineHeight: 1.2 }}>
            {room.name}
          </h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
            <Building2 size={16} />
            {room.building}
            {room.floor ? ` — Lantai ${room.floor}` : ''}
          </div>
        </div>

        {/* QR Code Box */}
        <div
          style={{
            padding: '1rem',
            border: '2px dashed #94a3b8',
            borderRadius: '12px',
            background: '#ffffff',
            margin: '0.25rem 0',
          }}
        >
          {qrUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt={`QR Code ${room.name}`} style={{ width: '210px', height: '210px', display: 'block' }} />
          )}
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginTop: '0.5rem' }}>
            PINDAI UNTUK CHECK-IN, JADWAL, &amp; INVENTARIS RUANG (KIR)
          </div>
        </div>

        {/* Footer Info */}
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            borderTop: '2px solid #e2e8f0',
            paddingTop: '0.9rem',
            fontSize: '0.82rem',
            color: '#334155',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Users size={15} color="#4f46e5" />
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Kapasitas Ruangan</div>
              <strong>{room.capacity ? `${room.capacity} Orang` : '-'}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <UserCheck size={15} color="#4f46e5" />
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Penanggung Jawab (PIC)</div>
              <strong>{room.picName || 'Staf Sarpras'}</strong>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print, nav, aside, header {
            display: none !important;
          }
          body {
            background: #ffffff !important;
          }
          .qr-door-plate {
            box-shadow: none !important;
            margin: 0 auto !important;
          }
        }
      `}</style>
    </div>
  );
}


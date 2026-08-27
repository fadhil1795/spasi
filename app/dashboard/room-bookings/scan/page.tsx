'use client';

import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Camera, CheckCircle, XCircle, Clock, Building2, QrCode } from 'lucide-react';

export default function RoomBookingScanPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [booking, setBooking] = useState<any>(null);
  const [manualCode, setManualCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);

  useEffect(() => {
    setScannerReady(true);
  }, []);

  useEffect(() => {
    if (!scannerReady) return;

    let scanner: any;
    try {
      scanner = new Html5QrcodeScanner(
        'qr-room-scanner',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scanner.render(
        (decodedText: string) => {
          handleLookupBooking(decodedText);
        },
        () => {}
      );
    } catch (e) {}

    return () => {
      if (scanner) scanner.clear().catch(() => {});
    };
  }, [scannerReady]);

  const handleLookupBooking = async (bookingNumber: string) => {
    const code = bookingNumber.trim().toUpperCase();
    if (!code) return;
    try {
      setSearching(true);
      setBooking(null);
      // Search by booking number
      const res = await fetch(`/api/room-bookings?bookingNumber=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        // Find matching booking
        const found = Array.isArray(data) ? data.find((b: any) => b.bookingNumber === code) : null;
        if (found) {
          setBooking(found);
        } else {
          showToast(`Booking "${code}" tidak ditemukan`, 'error');
        }
      } else {
        showToast('Gagal mencari booking', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSearching(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return <Badge status={status} />;
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <Link
        href="/dashboard/room-bookings"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: 'var(--color-muted)',
          fontSize: '0.9rem',
          fontWeight: 600,
          marginBottom: '1.5rem',
        }}
      >
        <ArrowLeft size={16} /> Kembali ke Booking Ruangan
      </Link>

      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.35rem' }}>
        Scanner QR Booking Ruangan
      </h1>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Scan QR Code E-Voucher penyewa atau masukkan Nomor Booking secara manual untuk proses Check-In / Check-Out.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* QR Scanner */}
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 700 }}>
            <Camera size={18} style={{ color: 'var(--color-primary)' }} />
            Scan QR E-Voucher
          </div>
          <div id="qr-room-scanner" style={{ width: '100%' }} />
        </Card>

        {/* Manual Input */}
        <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            <QrCode size={18} style={{ color: 'var(--color-accent)' }} />
            Input Manual
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
            Masukkan Nomor Booking jika QR tidak bisa terbaca.
          </p>
          <input
            className="input-field"
            placeholder="Contoh: BK-2026-0001"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLookupBooking(manualCode); }}
            style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.05em' }}
          />
          <Button
            variant="primary"
            isLoading={searching}
            onClick={() => handleLookupBooking(manualCode)}
            style={{ width: '100%' }}
          >
            Cari Booking
          </Button>
        </Card>
      </div>

      {/* Booking Result */}
      {booking && (
        <Card style={{ padding: '1.5rem', border: '2px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
                BOOKING DITEMUKAN
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
                {booking.bookingNumber}
              </div>
            </div>
            {getStatusBadge(booking.bookingStatus)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>RUANGAN</div>
              <div style={{ fontWeight: 700 }}>{booking.location?.name || booking.location?.building}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{booking.location?.code}</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>PENYEWA</div>
              <div style={{ fontWeight: 700 }}>{booking.renter?.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{booking.renter?.phone}</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>WAKTU MULAI</div>
              <div style={{ fontWeight: 700 }}>{new Date(booking.startTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>WAKTU SELESAI</div>
              <div style={{ fontWeight: 700 }}>{new Date(booking.endTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
            <span style={{ fontWeight: 600 }}>Total Tagihan</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary)' }}>{formatCurrency(booking.totalAmount)}</span>
          </div>

          {/* Action buttons based on status */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {booking.bookingStatus === 'CONFIRMED' && (
              <Button
                variant="primary"
                style={{ flex: 1 }}
                onClick={() => router.push(`/dashboard/room-bookings/${booking.id}/checkin`)}
              >
                <CheckCircle size={18} /> Mulai Proses Check-In
              </Button>
            )}
            {booking.bookingStatus === 'ACTIVE' && (
              <Button
                variant="primary"
                style={{ flex: 1, background: 'var(--color-success)' }}
                onClick={() => router.push(`/dashboard/room-bookings/${booking.id}/checkout`)}
              >
                <XCircle size={18} /> Mulai Proses Check-Out
              </Button>
            )}
            {booking.bookingStatus === 'PENDING' && (
              <div style={{ flex: 1, padding: '0.75rem', textAlign: 'center', background: 'var(--color-warning-bg, rgba(234,179,8,0.1))', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--color-warning)', fontWeight: 600 }}>
                ⚠️ Booking belum dikonfirmasi admin. Minta admin konfirmasi terlebih dahulu.
              </div>
            )}
            <Button
              variant="secondary"
              onClick={() => router.push(`/dashboard/room-bookings/${booking.id}`)}
            >
              Lihat Detail
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

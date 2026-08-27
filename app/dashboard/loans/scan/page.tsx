'use client';

import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Camera, LogIn, LogOut, Eye } from 'lucide-react';

export default function QRScannerPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [scanResult, setScanResult] = useState<any>(null);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);

  // Return condition selection
  const [condition, setCondition] = useState('Baik');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader-container',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        handleProcessQR(decodedText);
      },
      (error) => {
        // ignore scan errors
      }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  const handleProcessQR = async (token: string) => {
    try {
      setProcessing(true);
      const res = await fetch('/api/loans/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: token, condition, notes }),
      });

      const data = await res.json();
      if (res.ok) {
        setScanResult(data);
        showToast(data.message, 'success');
      } else {
        showToast(data.error || 'Gagal memproses QR Code', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const getModalTitle = () => {
    if (!scanResult) return '';
    if (scanResult.type === 'ROOM_BOOKING') return 'E-Voucher Ruangan Ditemukan 🏢';
    return scanResult.type === 'CHECK_IN' ? 'Check-In Berhasil ✅' : 'Check-Out (Pengembalian) Berhasil ✅';
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <Link
        href="/dashboard/loans"
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
        <ArrowLeft size={16} /> Kembali ke Daftar Peminjaman
      </Link>

      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>
        Scanner QR Code &amp; E-Voucher
      </h1>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Arahkan kamera ke stiker QR Code aset atau QR Code E-Voucher Ruangan untuk verifikasi instan.
      </p>

      <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 700 }}>
          <Camera size={20} style={{ color: 'var(--color-primary)' }} /> Area Kamera Active WebRTC
        </div>

        {/* Video Camera Scan Container */}
        <div
          id="qr-reader-container"
          style={{
            width: '100%',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: 'var(--color-surface2)',
          }}
        />
      </Card>

      {/* Manual Input Fallback */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          Atau Masukkan Kode / Token Secara Manual:
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Input
            placeholder="Contoh: AST-2026-0001 atau BK-2026-0001"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            style={{ marginBottom: 0 }}
          />
          <Button
            variant="primary"
            isLoading={processing}
            onClick={() => handleProcessQR(manualCode)}
          >
            Proses
          </Button>
        </div>
      </Card>

      {/* Result Modal */}
      <Modal
        isOpen={Boolean(scanResult)}
        onClose={() => setScanResult(null)}
        title={getModalTitle()}
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={() => setScanResult(null)}>
              Scan Lagi
            </Button>
            {scanResult?.type === 'ROOM_BOOKING' && (
              <Button
                variant="primary"
                onClick={() => {
                  router.push(scanResult.redirectUrl);
                  setScanResult(null);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {scanResult.nextAction === 'checkin' ? <LogIn size={15} /> : (scanResult.nextAction === 'checkout' ? <LogOut size={15} /> : <Eye size={15} />)}
                {scanResult.nextAction === 'checkin' ? 'Proses Check-In' : (scanResult.nextAction === 'checkout' ? 'Proses Check-Out & Inspeksi' : 'Lihat Detail')}
              </Button>
            )}
          </div>
        }
      >
        {scanResult && scanResult.type === 'ROOM_BOOKING' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
            <div style={{ padding: '0.85rem 1rem', background: 'rgba(79,70,229,0.08)', borderRadius: 'var(--radius-md)', borderLeft: '3.5px solid var(--color-primary)', fontWeight: 700 }}>
              {scanResult.message}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', background: 'var(--color-surface2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.75rem' }}>Ruangan / Lokasi</span>
                <strong>{scanResult.booking?.location?.name}</strong> ({scanResult.booking?.location?.building})
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.75rem' }}>Penyewa / Renter</span>
                <strong>{scanResult.booking?.renter?.name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.75rem' }}>Status Sesi</span>
                <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>{scanResult.booking?.bookingStatus}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.75rem' }}>Status Pembayaran</span>
                <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>{scanResult.booking?.payStatus}</span>
              </div>
            </div>
          </div>
        )}

        {scanResult && scanResult.type !== 'ROOM_BOOKING' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'var(--color-success-bg)', borderRadius: 'var(--radius-md)', color: 'var(--color-success)', fontWeight: 600 }}>
              {scanResult.message}
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', display: 'block' }}>Aset</span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{scanResult.asset?.name}</span> ({scanResult.asset?.code})
            </div>

            {scanResult.penaltyFee > 0 && (
              <div style={{ padding: '0.75rem', background: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)' }}>
                <strong>Denda Keterlambatan:</strong> {formatCurrency(scanResult.penaltyFee)}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

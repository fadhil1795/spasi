'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Download, Building2, Clock, CheckCircle, Package, User } from 'lucide-react';
import QRCode from 'qrcode';

import { PaymentModal } from '@/components/public/PaymentModal';

export default function BookingStatusPage() {
  const params = useParams();
  const { showToast } = useToast();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchBooking();
  }, []);

  useEffect(() => {
    if (booking && qrCanvasRef.current && ['CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(booking.bookingStatus)) {
      QRCode.toCanvas(qrCanvasRef.current, booking.bookingNumber, { width: 200, margin: 2 }).catch(() => {});
    }
  }, [booking]);

  const fetchBooking = async () => {
    try {
      // Search by booking number via public query
      const res = await fetch(`/api/room-bookings?bookingNumber=${encodeURIComponent(params.bookingNumber as string)}`);
      if (res.ok) {
        const data = await res.json();
        const found = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (found) {
          setBooking(found);
        }
      }
    } catch (e) {
      showToast('Gagal memuat data booking', 'error');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; icon: any; desc: string }> = {
    PENDING: { label: 'Menunggu Konfirmasi', color: 'var(--color-warning)', icon: Clock, desc: 'Booking Anda sedang ditinjau oleh admin. Kami akan segera mengkonfirmasi.' },
    CONFIRMED: { label: 'Dikonfirmasi!', color: 'var(--color-primary)', icon: CheckCircle, desc: 'Booking Anda telah dikonfirmasi. Tunjukkan QR Code ini saat Check-In.' },
    ACTIVE: { label: 'Sedang Aktif', color: 'var(--color-success)', icon: CheckCircle, desc: 'Ruangan sedang dalam penggunaan Anda.' },
    COMPLETED: { label: 'Selesai', color: 'var(--color-muted)', icon: CheckCircle, desc: 'Terima kasih! Sewa ruangan telah selesai.' },
    COMPLETED_WITH_CLAIM: { label: 'Selesai (Ada Klaim)', color: 'var(--color-danger)', icon: CheckCircle, desc: 'Sewa selesai dengan catatan klaim kerusakan/kehilangan.' },
    CANCELLED: { label: 'Dibatalkan', color: 'var(--color-danger)', icon: Clock, desc: 'Booking telah dibatalkan.' },
  };

  const steps = ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED'];
  const currentStep = steps.indexOf(booking?.bookingStatus) === -1 ? 0 : steps.indexOf(booking?.bookingStatus);

  if (loading) {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ height: '400px', background: 'var(--color-surface2)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite' }} />
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
        <h2>Booking Tidak Ditemukan</h2>
        <p style={{ color: 'var(--color-muted)' }}>Nomor booking tidak ditemukan dalam sistem.</p>
        <Link href="/rooms" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: '1rem' }}>Kembali ke Katalog Ruangan</Link>
      </div>
    );
  }

  const sc = statusConfig[booking.bookingStatus] || statusConfig['PENDING'];
  const StatusIcon = sc.icon;

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <Link href="/rooms" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-muted)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Kembali ke Katalog Ruangan
      </Link>

      {/* Status Header */}
      <Card style={{ padding: '1.75rem', marginBottom: '1.25rem', textAlign: 'center', borderTop: `4px solid ${sc.color}` }}>
        <StatusIcon size={48} style={{ color: sc.color, margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: sc.color, marginBottom: '0.5rem' }}>{sc.label}</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>{sc.desc}</p>
        <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.08em' }}>
          {booking.bookingNumber}
        </div>

        {/* Progress Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginTop: '1.5rem' }}>
          {steps.map((step, idx) => (
            <React.Fragment key={step}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: idx <= currentStep ? sc.color : 'var(--color-surface2)',
                  color: idx <= currentStep ? '#fff' : 'var(--color-muted)',
                  fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.3s',
                }}>
                  {idx < currentStep ? '✓' : idx + 1}
                </div>
                <span style={{ fontSize: '0.65rem', color: idx <= currentStep ? sc.color : 'var(--color-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {['Pending', 'Konfirmasi', 'Aktif', 'Selesai'][idx]}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div style={{ flex: 1, height: '2px', background: idx < currentStep ? sc.color : 'var(--color-border)', transition: 'all 0.3s', margin: '0 4px', marginTop: '-16px' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Payment Action Banner if Unpaid */}
      {['UNPAID', 'PENDING'].includes(booking.payStatus) && (
        <Card style={{ padding: '1.25rem', marginBottom: '1.25rem', background: 'var(--color-warning-bg, rgba(234,179,8,0.12))', border: '1px solid var(--color-warning, #eab308)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--color-warning, #eab308)', fontSize: '1.05rem', marginBottom: '0.2rem' }}>⚠️ Pembayaran Belum Selesai</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--color-muted)' }}>Lakukan pembayaran tagihan sebesar <strong>{formatCurrency(booking.totalAmount + booking.depositAmount)}</strong> untuk menyelesaikan reservasi.</div>
            {booking.paymentExpiredAt && (
              <div style={{ fontSize: '0.82rem', color: 'var(--color-danger)', marginTop: '0.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                ⏰ Bayar sebelum: {new Date(booking.paymentExpiredAt).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
              </div>
            )}
          </div>
          <Button variant="primary" onClick={() => setPaymentModalOpen(true)}>
            💳 Lakukan Pembayaran
          </Button>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Detail Booking */}
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '1rem' }}>
            <Building2 size={18} style={{ color: 'var(--color-primary)' }} />
            Detail Ruangan
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
            <div><span style={{ color: 'var(--color-muted)' }}>Ruangan:</span> <strong>{booking.location?.name}</strong></div>
            <div><span style={{ color: 'var(--color-muted)' }}>Kode:</span> {booking.location?.code}</div>
            <div><span style={{ color: 'var(--color-muted)' }}>Lokasi:</span> {booking.location?.building}</div>
            <div><span style={{ color: 'var(--color-muted)' }}>Mulai:</span> <strong>{new Date(booking.startTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</strong></div>
            <div><span style={{ color: 'var(--color-muted)' }}>Selesai:</span> <strong>{new Date(booking.endTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</strong></div>
            <div><span style={{ color: 'var(--color-muted)' }}>Durasi:</span> {booking.durationHours} Jam</div>
          </div>
        </Card>

        {/* QR Code E-Voucher */}
        <Card style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem' }}>📲 E-Voucher QR Code</div>
          {['CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(booking.bookingStatus) ? (
            <>
              <canvas ref={qrCanvasRef} style={{ borderRadius: 'var(--radius-md)' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>Tunjukkan ke petugas saat Check-In</p>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Download size={14} /> Cetak E-Voucher
              </button>
            </>
          ) : (
            <div style={{ padding: '2rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
              QR tersedia setelah booking dikonfirmasi
            </div>
          )}
        </Card>
      </div>

      {/* Rincian Biaya */}
      <Card style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '1rem' }}>
          <Package size={18} style={{ color: 'var(--color-accent)' }} />
          Rincian Biaya
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span>Sewa Ruangan ({booking.durationHours} Jam × {formatCurrency(booking.roomRate)}/jam)</span>
            <span>{formatCurrency(booking.roomSubtotal)}</span>
          </div>
          {booking.addonAssets?.map((a: any) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
              <span>Add-On: {a.assetName} ×{a.quantity}</span>
              <span>+{formatCurrency(a.subtotal)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
            <span>Deposit Jaminan (refundable)</span>
            <span>{formatCurrency(booking.depositAmount)}</span>
          </div>
          <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem' }}>
            <span>Total Bayar</span>
            <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(booking.totalAmount + booking.depositAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--color-muted)' }}>Status Pembayaran</span>
            <Badge status={booking.payStatus} />
          </div>
          {booking.paymentScheme && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--color-muted)' }}>Skema Pembayaran</span>
              <span style={{ fontWeight: 700, color: booking.paymentScheme === 'DOWN_PAYMENT' ? 'var(--color-warning)' : 'var(--color-success)' }}>
                {booking.paymentScheme === 'DOWN_PAYMENT' ? '💡 DP 50% (Cicilan)' : '✅ Lunas Penuh'}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Penyewa */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          <User size={18} style={{ color: 'var(--color-muted)' }} />
          Data Penyewa
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.88rem' }}>
          <div><span style={{ color: 'var(--color-muted)' }}>Nama:</span> <strong>{booking.renter?.name}</strong></div>
          <div><span style={{ color: 'var(--color-muted)' }}>No. HP:</span> {booking.renter?.phone}</div>
          {booking.renter?.email && <div><span style={{ color: 'var(--color-muted)' }}>Email:</span> {booking.renter?.email}</div>}
        </div>
      </Card>

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        bookingId={booking.id}
        bookingNumber={booking.bookingNumber}
        totalAmount={booking.totalAmount + booking.depositAmount}
        renterName={booking.renter?.name || 'Penyewa'}
        paymentScheme={booking.paymentScheme}
        onPaymentSuccess={fetchBooking}
      />
    </div>
  );
}

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FilterPill } from '@/components/ui/FilterPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, CalendarCheck, LogIn, LogOut, Eye, Timer, FileText, Download, Ticket, CreditCard, Calendar, Building2, Package, Box, AlertCircle } from 'lucide-react';
import { PaymentModal } from '@/components/public/PaymentModal';
import { RoomScheduleCalendar } from '@/components/public/RoomScheduleCalendar';
import { AssetRentalCalendar } from '@/components/public/AssetRentalCalendar';

type BookingStatus = 'SEMUA' | 'PENDING' | 'APPROVED' | 'CONFIRMED' | 'ACTIVE' | 'RETURN_REQUESTED' | 'COMPLETED' | 'CANCELLED';

const FILTER_PILLS: BookingStatus[] = ['SEMUA', 'PENDING', 'APPROVED', 'CONFIRMED', 'ACTIVE', 'RETURN_REQUESTED', 'COMPLETED', 'CANCELLED'];

function CountdownCell({ endTime }: { endTime: string }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Waktu habis'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-warning)', fontWeight: 700, fontSize: '0.78rem', marginTop: '0.25rem' }}>
      <Timer size={13} />
      <span>Sisa {remaining}</span>
    </div>
  );
}

export default function UnifiedBookingsHistoryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [bookingCategory, setBookingCategory] = useState<'ROOMS' | 'ASSETS'>('ROOMS');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CALENDAR'>('TABLE');
  
  const [roomBookings, setRoomBookings] = useState<any[]>([]);
  const [assetRentals, setAssetRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeFilter, setActiveFilter] = useState<BookingStatus>('SEMUA');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState<any | null>(null);
  
  // SOP State untuk Penolakan Alasan Wajib & Preview Dokumen
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectBookingId, setRejectBookingId] = useState('');
  const [rejectType, setRejectType] = useState<'BOOKING' | 'PROOF'>('BOOKING');
  const [rejectNotes, setRejectNotes] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState('');
  const [previewDocIndex, setPreviewDocIndex] = useState(0);
  const [isPaymentAsset, setIsPaymentAsset] = useState(false);
  const [isPaymentPelunasan, setIsPaymentPelunasan] = useState(false);

  const isBorrower = session?.user && (session.user as any).role === 'BORROWER';

  const fetchAllBookings = useCallback(async () => {
    try {
      setLoading(true);
      const [resRooms, resAssets] = await Promise.all([
        fetch('/api/room-bookings'),
        fetch('/api/rentals'),
      ]);

      if (resRooms.ok) setRoomBookings(await resRooms.json());
      if (resAssets.ok) setAssetRentals(await resAssets.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllBookings();
  }, [fetchAllBookings]);

  const handleConfirm = async (id: string) => {
    try {
      setConfirmingId(id);
      const res = await fetch(`/api/room-bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingStatus: 'CONFIRMED' }),
      });
      if (res.ok) {
        showToast('Booking berhasil dikonfirmasi!', 'success');
        fetchAllBookings();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal mengkonfirmasi booking', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleApproveBooking = async (b: any) => {
    try {
      setConfirmingId(b.id);
      const isFree = ((b.totalAmount || 0) + (b.depositAmount || 0)) === 0;
      const targetStatus = isFree ? 'CONFIRMED' : 'APPROVED';
      const toastMessage = isFree
        ? 'Pengajuan sewa/booking gratis berhasil disetujui & otomatis terkonfirmasi!'
        : 'Pengajuan sewa/booking berhasil disetujui! Pemesan sekarang dapat melakukan pembayaran.';

      const res = await fetch(`/api/room-bookings/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingStatus: targetStatus }),
      });
      if (res.ok) {
        showToast(toastMessage, 'success');
        fetchAllBookings();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyetujui pengajuan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleVerifyPayment = async (b: any) => {
    try {
      setConfirmingId(b.id);
      const isInitialDp = b.paymentScheme === 'DOWN_PAYMENT' && (b.paidAmount || 0) === 0;
      const res = await fetch(`/api/room-bookings/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payStatus: isInitialDp ? 'DOWN_PAYMENT' : 'PAID',
          bookingStatus: ['PENDING', 'APPROVED'].includes(b.bookingStatus) ? 'CONFIRMED' : b.bookingStatus,
        }),
      });

      if (res.ok) {
        showToast(
          isInitialDp
            ? 'DP 50% diverifikasi & booking dikonfirmasi! Sisa tagihan dapat dilunasi kemudian.'
            : 'Pembayaran Lunas berhasil diverifikasi & booking dikonfirmasi!',
          'success'
        );
        fetchAllBookings();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memverifikasi pembayaran', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRejectAction = async () => {
    if (!rejectNotes.trim()) {
      showToast('Alasan penolakan wajib diisi', 'error');
      return;
    }

    try {
      setConfirmingId(rejectBookingId);
      if (rejectType === 'BOOKING') {
        const res = await fetch(`/api/room-bookings/${rejectBookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payStatus: 'REJECTED', bookingStatus: 'CANCELLED', notes: rejectNotes }),
        });
        if (res.ok) {
          showToast('Pengajuan booking ruangan berhasil ditolak', 'info');
        } else {
          const err = await res.json();
          showToast(err.error || 'Gagal menolak booking', 'error');
        }
      } else {
        const res = await fetch(`/api/room-bookings/${rejectBookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payStatus: 'REJECTED', notes: rejectNotes }),
        });
        if (res.ok) {
          showToast('Pembayaran struk transfer ditolak', 'warning');
        } else {
          const err = await res.json();
          showToast(err.error || 'Gagal menolak struk', 'error');
        }
      }
      setRejectModalOpen(false);
      setRejectNotes('');
      fetchAllBookings();
    } catch {
      showToast('Koneksi bermasalah', 'error');
    } finally {
      setConfirmingId(null);
    }
  };

  const matchesStatus = (statusVal: string, filter: BookingStatus) => {
    if (filter === 'SEMUA') return true;
    if (filter === 'COMPLETED') return ['COMPLETED', 'COMPLETED_WITH_CLAIM', 'RETURNED'].includes(statusVal);
    return statusVal === filter;
  };

  const filteredRoomBookings = roomBookings.filter((b) => matchesStatus(b.bookingStatus, activeFilter));

  const filteredAssetRentals = assetRentals.filter((r) => matchesStatus(r.status, activeFilter));

  const payBadgeStyle = (payStatus: string) => {
    switch (payStatus?.toUpperCase()) {
      case 'PAID':                 return { background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16,185,129,0.3)' };
      case 'DOWN_PAYMENT':         return { background: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: '1px solid rgba(245,158,11,0.3)' };
      case 'UNPAID':               return { background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.3)' };
      case 'PENDING_VERIFICATION': return { background: 'rgba(139,92,246,0.12)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.3)' };
      case 'REFUNDED':             return { background: 'rgba(6,182,212,0.12)', color: '#0891b2', border: '1px solid rgba(6,182,212,0.3)' };
      case 'CLAIMED':              return { background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.2)' };
      case 'REJECTED':             return { background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.3)' };
      default:                     return { background: 'var(--color-surface2)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' };
    }
  };

  const payLabel = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'PAID':                 return '✅ Lunas';
      case 'DOWN_PAYMENT':         return '🔶 DP 50%';
      case 'UNPAID':               return '❌ Belum Bayar';
      case 'PENDING_VERIFICATION': return '🔍 Menunggu Verifikasi';
      case 'REFUNDED':             return '↩️ Dikembalikan';
      case 'CLAIMED':              return '⚠️ Ada Klaim';
      case 'REJECTED':             return '🚫 Ditolak (Struk Palsu)';
      default:                     return s || '-';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            {isBorrower ? 'Riwayat & Transaksi Booking Saya' : 'Manajemen Booking Ruangan & Aset'}
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Pantau seluruh riwayat reservasi gedung/ruangan serta penyewaan peralatan &amp; sarana aset instansi.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* View Mode Toggle — tersedia untuk ROOMS dan ASSETS */}
          <div style={{ display: 'flex', background: 'var(--color-surface2)', padding: '0.25rem', borderRadius: 'var(--radius-md)', gap: '0.25rem' }}>
            <button
              onClick={() => setViewMode('TABLE')}
              style={{
                padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-sm)', border: 'none',
                background: viewMode === 'TABLE' ? 'var(--color-surface)' : 'transparent',
                color: viewMode === 'TABLE' ? 'var(--color-primary-light)' : 'var(--color-muted)',
                fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}
            >
              <FileText size={15} /> Mode Tabel
            </button>

            <button
              onClick={() => setViewMode('CALENDAR')}
              style={{
                padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-sm)', border: 'none',
                background: viewMode === 'CALENDAR' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'CALENDAR' ? '#FFFFFF' : 'var(--color-muted)',
                fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}
            >
              <Calendar size={15} /> Mode Kalender
            </button>
          </div>

          <Link href="/dashboard/room-bookings/new" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            <Plus size={16} /> Booking Ruangan
          </Link>
          <Link href="/dashboard/rentals/new" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            <Plus size={16} /> Booking Aset
          </Link>
        </div>
      </div>

      {/* Main Category Tabs: RUANGAN vs ASET */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setBookingCategory('ROOMS')}
          style={{
            padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-md)', border: 'none',
            background: bookingCategory === 'ROOMS' ? 'var(--grad-primary)' : 'var(--color-surface2)',
            color: bookingCategory === 'ROOMS' ? '#FFFFFF' : 'var(--color-muted)',
            fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: bookingCategory === 'ROOMS' ? 'var(--shadow-glow)' : 'none', transition: 'all 0.2s',
          }}
        >
          <Building2 size={18} /> 🏢 Booking Ruangan ({roomBookings.length})
        </button>

        <button
          onClick={() => setBookingCategory('ASSETS')}
          style={{
            padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-md)', border: 'none',
            background: bookingCategory === 'ASSETS' ? 'var(--grad-primary)' : 'var(--color-surface2)',
            color: bookingCategory === 'ASSETS' ? '#FFFFFF' : 'var(--color-muted)',
            fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: bookingCategory === 'ASSETS' ? 'var(--shadow-glow)' : 'none', transition: 'all 0.2s',
          }}
        >
          <Package size={18} /> 📦 Booking Aset &amp; Peralatan ({assetRentals.length})
        </button>
      </div>

      {/* CATEGORY 1: ROOM BOOKINGS */}
      {bookingCategory === 'ROOMS' && (
        <>
          {viewMode === 'CALENDAR' ? (
            <RoomScheduleCalendar
              onSelectSlot={(roomId, date, startTime) => {
                router.push(`/dashboard/room-bookings/new?roomId=${roomId}&date=${formatDate(date, 'yyyy-MM-dd')}&start=${startTime}`);
              }}
            />
          ) : (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {FILTER_PILLS.map((pill) => (
                  <FilterPill
                    key={pill}
                    label={pill}
                    count={pill === 'SEMUA' ? roomBookings.length : roomBookings.filter((b) => matchesStatus(b.bookingStatus, pill)).length}
                    active={activeFilter === pill}
                    onClick={() => setActiveFilter(pill)}
                  />
                ))}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                      <th style={{ padding: '1rem 1.25rem' }}>No. Booking</th>
                      <th style={{ padding: '1rem' }}>Ruangan</th>
                      <th style={{ padding: '1rem' }}>Penyewa</th>
                      <th style={{ padding: '1rem' }}>Waktu Sewa</th>
                      <th style={{ padding: '1rem' }}>Total Biaya</th>
                      <th style={{ padding: '1rem' }}>Status Bayar</th>
                      <th style={{ padding: '1rem' }}>Status Booking</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '3rem', textAlign: 'center' }}>
                          <Skeleton height="40px" />
                        </td>
                      </tr>
                    ) : filteredRoomBookings.length > 0 ? (
                      filteredRoomBookings.map((b) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                            {b.bookingNumber}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 700 }}>
                              {b.location?.name || 'Paket Peralatan Sarpras'}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                              {b.location
                                ? `${b.location.building || '-'} • ${b.location.code || '-'}`
                                : `${b.addonAssets?.length || 0} Peralatan Sarpras`}
                              {b.location && b.addonAssets?.length > 0 && ` • +${b.addonAssets.length} Aset`}
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 600 }}>{b.renter?.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{b.renter?.phone}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 600 }}>{formatDate(b.startTime, 'dd MMM yyyy')}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                              {formatDate(b.startTime, 'HH:mm')} - {formatDate(b.endTime, 'HH:mm')} ({b.durationHours} Jam)
                            </div>
                            {b.bookingStatus === 'ACTIVE' && b.endTime && <CountdownCell endTime={b.endTime} />}
                          </td>
                          <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                            {formatCurrency(b.totalAmount + b.depositAmount)}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span className="badge" style={payBadgeStyle(b.payStatus)}>{payLabel(b.payStatus)}</span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <Badge status={b.bookingStatus} />
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <a href={`/bookings/${b.bookingNumber}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                                <Ticket size={13} /> E-Voucher
                              </a>

                              {/* User Actions */}
                              {['PENDING', 'PENDING_L1', 'PENDING_L2'].includes(b.bookingStatus) && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => router.push(`/dashboard/room-bookings/new?editId=${b.id}`)}
                                  title="Edit pesanan selama belum disetujui admin"
                                >
                                  ✏️ Edit
                                </Button>
                              )}

                              {['PENDING', 'PENDING_L1', 'PENDING_L2', 'APPROVED', 'CONFIRMED'].includes(b.bookingStatus) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  style={{ color: 'var(--color-danger)' }}
                                  isLoading={confirmingId === b.id}
                                  onClick={async () => {
                                    if (!confirm(`Batalkan pesanan #${b.bookingNumber}?`)) return;
                                    try {
                                      setConfirmingId(b.id);
                                      const res = await fetch(`/api/room-bookings/${b.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ bookingStatus: 'CANCELLED', notes: 'Dibatalkan oleh pengguna' }),
                                      });
                                      if (res.ok) {
                                        showToast(`Pesanan #${b.bookingNumber} berhasil dibatalkan`, 'success');
                                        fetchAllBookings();
                                      } else {
                                        const err = await res.json().catch(() => ({}));
                                        showToast(err.error || 'Gagal membatalkan pesanan', 'error');
                                      }
                                    } catch {
                                      showToast('Terjadi kesalahan koneksi', 'error');
                                    } finally {
                                      setConfirmingId(null);
                                    }
                                  }}
                                >
                                  ❌ Batalkan
                                </Button>
                              )}

                              {isBorrower && b.bookingStatus === 'PENDING' && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 600, padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }} title="Pembayaran dapat dilakukan setelah pengajuan sewa disetujui oleh Admin/Kepala">
                                  ⏳ Menunggu Persetujuan Admin
                                </span>
                              )}

                              {isBorrower && b.bookingStatus === 'APPROVED' && (b.payStatus === 'UNPAID' || (b.payStatus === 'REJECTED' && b.paymentScheme !== 'DOWN_PAYMENT')) && (
                                <Button variant="primary" size="sm" onClick={() => {
                                  setIsPaymentAsset(false);
                                  setIsPaymentPelunasan(false);
                                  setSelectedPaymentBooking(b);
                                }}>
                                  <CreditCard size={13} /> Bayar Sekarang
                                </Button>
                              )}

                              {isBorrower && ['APPROVED', 'CONFIRMED', 'ACTIVE'].includes(b.bookingStatus) && (b.payStatus === 'DOWN_PAYMENT' || (b.payStatus === 'REJECTED' && b.paymentScheme === 'DOWN_PAYMENT')) && (
                                <Button variant="primary" size="sm" style={{ background: '#7c3aed', color: '#FFF' }} onClick={() => {
                                  setIsPaymentAsset(false);
                                  setIsPaymentPelunasan(true);
                                  setSelectedPaymentBooking(b);
                                }}>
                                  <CreditCard size={13} /> Bayar Pelunasan (50%)
                                </Button>
                              )}

                              {/* Admin Actions: Step 1 Approval */}
                              {!isBorrower && b.bookingStatus === 'PENDING' && (
                                <>
                                  <Button variant="primary" size="sm" style={{ background: 'var(--color-success)', color: '#FFFFFF' }} isLoading={confirmingId === b.id} onClick={() => handleApproveBooking(b)}>
                                    ✓ Setujui Pengajuan
                                  </Button>
                                  <Button variant="secondary" size="sm" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} isLoading={confirmingId === b.id} onClick={() => {
                                    setRejectBookingId(b.id);
                                    setRejectType('BOOKING');
                                    setRejectNotes('');
                                    setRejectModalOpen(true);
                                  }}>
                                    ❌ Tolak
                                  </Button>
                                </>
                              )}

                              {/* Admin Actions: Step 2 Payment Verification */}
                              {!isBorrower && b.payStatus === 'PENDING_VERIFICATION' && (
                                <>
                                  <Button variant="primary" size="sm" style={{ background: 'var(--color-success)', color: '#FFFFFF' }} isLoading={confirmingId === b.id} onClick={() => handleVerifyPayment(b)}>
                                    <CalendarCheck size={14} /> Verifikasi Struk
                                  </Button>
                                  <Button variant="secondary" size="sm" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} isLoading={confirmingId === b.id} onClick={() => {
                                    setRejectBookingId(b.id);
                                    setRejectType('PROOF');
                                    setRejectNotes('');
                                    setRejectModalOpen(true);
                                  }}>
                                    ❌ Tolak Struk
                                  </Button>
                                </>
                              )}

                              {/* SOP Check-In Handover Ruangan & Aset */}
                              {!isBorrower && b.bookingStatus === 'CONFIRMED' && (
                                <Button variant="secondary" size="sm" onClick={() => router.push(`/dashboard/room-bookings/${b.id}/checkin`)}>
                                  <LogIn size={14} /> Serah Terima Masuk
                                </Button>
                              )}

                              {isBorrower && b.bookingStatus === 'ACTIVE' && (
                                <Button variant="secondary" size="sm" onClick={async () => {
                                  if (!confirm('Ajukan pengembalian / selesai pemakaian ruangan sekarang? Petugas akan melakukan verifikasi & inspeksi fisik.')) return;
                                  try {
                                    const res = await fetch(`/api/room-bookings/${b.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ bookingStatus: 'RETURN_REQUESTED' }),
                                    });
                                    if (res.ok) {
                                      showToast('Pengajuan pengembalian ruangan berhasil dikirim! Petugas akan melakukan inspeksi check-out.', 'success');
                                      fetchAllBookings();
                                    } else {
                                      const err = await res.json().catch(() => ({}));
                                      showToast(err.error || 'Gagal mengajukan pengembalian', 'error');
                                    }
                                  } catch { showToast('Gagal mengajukan pengembalian', 'error'); }
                                }}>
                                  <LogOut size={14} /> Ajukan Selesai Pemakaian
                                </Button>
                              )}

                              {/* SOP Check-Out Handover Ruangan & Aset */}
                              {!isBorrower && ['ACTIVE', 'RETURN_REQUESTED'].includes(b.bookingStatus) && (
                                <Button variant="primary" size="sm" onClick={() => router.push(`/dashboard/room-bookings/${b.id}/checkout`)}>
                                  <LogOut size={14} /> Serah Terima Keluar
                                </Button>
                              )}

                              {/* Preview Document In-App (KTP/BAST/Surat Tugas) */}
                              {b.supportingDocUrl && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setPreviewDocUrl(b.supportingDocUrl);
                                    setPreviewDocIndex(0);
                                    setPreviewModalOpen(true);
                                  }}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                >
                                  <FileText size={13} /> Dokumen
                                </Button>
                              )}

                              <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/room-bookings/${b.id}`)}>
                                <Eye size={14} /> Detail
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                          Tidak ada data booking ruangan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* CATEGORY 2: ASSET RENTALS */}
      {bookingCategory === 'ASSETS' && viewMode === 'CALENDAR' && (
        <AssetRentalCalendar
          rentals={assetRentals}
          onSelectSlot={(_assetId, _date) => {
            // Arahkan ke halaman booking aset baru
          }}
        />
      )}

      {bookingCategory === 'ASSETS' && viewMode === 'TABLE' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  <th style={{ padding: '1rem 1.25rem' }}>No. Transaksi</th>
                  <th style={{ padding: '1rem' }}>Penyewa</th>
                  <th style={{ padding: '1rem' }}>Nama Aset / Peralatan</th>
                  <th style={{ padding: '1rem' }}>Periode Sewa</th>
                  <th style={{ padding: '1rem' }}>Total Biaya</th>
                  <th style={{ padding: '1rem' }}>Status Bayar</th>
                  <th style={{ padding: '1rem' }}>Status Penyewaan</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center' }}>
                      <Skeleton height="40px" />
                    </td>
                  </tr>
                ) : filteredAssetRentals.length > 0 ? (
                  filteredAssetRentals.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                        {r.bookingNumber || `RNT-${r.id.substring(0, 6)}`}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700 }}>{r.renter?.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{r.renter?.phone}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{r.asset?.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                          {r.asset?.code}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600 }}>{formatDate(r.startDate, 'dd MMM yyyy')}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                          s.d {formatDate(r.endDate, 'dd MMM yyyy')}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                        {formatCurrency(r.totalAmount)}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge" style={payBadgeStyle(r.payStatus)}>{payLabel(r.payStatus)}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <Badge status={r.status || 'ACTIVE'} />
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {r.paymentProofUrl && (
                            <a href={r.paymentProofUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                              🖼️ Lihat Struk
                            </a>
                          )}

                          {isBorrower && r.status === 'APPROVED' && ['UNPAID', 'REJECTED'].includes(r.payStatus) && (
                            <Button variant="primary" size="sm" onClick={() => {
                              setIsPaymentAsset(true);
                              setSelectedPaymentBooking(r);
                            }}>
                              <CreditCard size={13} /> Bayar Sekarang
                            </Button>
                          )}

                          {!isBorrower && ['PENDING_VERIFICATION', 'UNPAID', 'DOWN_PAYMENT'].includes(r.payStatus) && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                style={{ background: 'var(--color-success)', color: '#FFFFFF' }}
                                isLoading={confirmingId === r.id}
                                onClick={async () => {
                                  try {
                                    setConfirmingId(r.id);
                                    const res = await fetch(`/api/rentals/${r.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ payStatus: 'PAID' }),
                                    });
                                    if (res.ok) {
                                      showToast('Pembayaran sewa aset berhasil diverifikasi!', 'success');
                                      fetchAllBookings();
                                    } else {
                                      showToast('Gagal memverifikasi pembayaran', 'error');
                                    }
                                  } catch {
                                    showToast('Kesalahan koneksi', 'error');
                                  } finally {
                                    setConfirmingId(null);
                                  }
                                }}
                              >
                                ✅ Terima Struk
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                                isLoading={confirmingId === r.id}
                                onClick={async () => {
                                  if (!confirm('Yakin ingin menolak struk ini? Status akan berubah menjadi Ditolak.')) return;
                                  try {
                                    setConfirmingId(r.id);
                                    const res = await fetch(`/api/rentals/${r.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ payStatus: 'REJECTED', notes: 'Ditolak: Bukti transfer tidak valid/salah.' }),
                                    });
                                    if (res.ok) {
                                      showToast('Struk berhasil ditolak', 'warning');
                                      fetchAllBookings();
                                    } else showToast('Gagal menolak struk', 'error');
                                  } catch (e) {
                                    console.error(e);
                                    showToast('Gagal menolak struk', 'error');
                                  } finally {
                                    setConfirmingId(null);
                                  }
                                }}
                              >
                                ❌ Tolak
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                      Belum ada data penyewaan aset bergerak.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── MODAL: PREVIEW DOKUMEN IN-APP (SOP LANGKAH 2) ── */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Verifikasi Dokumen Pendukung Sarpras"
      >
        {(() => {
          let docList: string[] = [];
          if (previewDocUrl) {
            try {
              const parsed = JSON.parse(previewDocUrl);
              if (Array.isArray(parsed)) {
                docList = parsed.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
              } else if (typeof parsed === 'string') {
                docList = [parsed];
              }
            } catch {
              docList = [previewDocUrl];
            }
          }
          const activeUrl = docList[previewDocIndex] || docList[0] || '';
          const isImage = /\.(png|jpe?g|webp|gif|bmp)(\?.*)?$/i.test(activeUrl);
          const docLabels = ['KTP / KTM', 'Surat Kegiatan'];

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                Periksa keabsahan dan keaslian dokumen pendukung di bawah secara langsung.
              </p>
              {docList.length > 1 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {docList.map((url, idx) => (
                    <Button
                      key={`${url}-${idx}`}
                      variant={previewDocIndex === idx ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPreviewDocIndex(idx)}
                    >
                      {docLabels[idx] || `Dokumen ${idx + 1}`}
                    </Button>
                  ))}
                </div>
              )}
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  height: '450px',
                  background: 'var(--color-surface2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {!activeUrl ? (
                  <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Dokumen tidak tersedia.</div>
                ) : isImage ? (
                  <img
                    src={activeUrl}
                    alt="Pratinjau Dokumen Pendukung"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <iframe
                    src={activeUrl}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Pratinjau Dokumen BAST/Permit"
                  />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {activeUrl ? (
                  <a href={activeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                    Buka di Tab Baru ↗
                  </a>
                ) : <span />}
                <Button variant="secondary" onClick={() => setPreviewModalOpen(false)}>
                  Tutup Pratinjau
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── MODAL: ALASAN PENOLAKAN WAJIB (SOP LANGKAH 2) ── */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={rejectType === 'BOOKING' ? 'Konfirmasi Penolakan Pengajuan Booking' : 'Konfirmasi Penolakan Struk Pembayaran'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.85rem' }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-danger)', fontWeight: 700 }}>
            <AlertCircle size={18} /> Perhatian: Catatan alasan penolakan wajib dicantumkan!
          </p>
          
          <div>
            <label className="input-label">Alasan Penolakan *</label>
            <textarea
              className="input-field"
              rows={4}
              placeholder={rejectType === 'BOOKING' ? 'Masukkan alasan pengajuan sewa ditolak...' : 'Masukkan alasan mengapa bukti bayar/transfer ini ditolak...'}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleRejectAction}
              disabled={!rejectNotes.trim() || confirmingId === rejectBookingId}
              style={{ background: 'var(--color-danger)', color: '#fff', border: 'none' }}
            >
              Ya, Kirim Penolakan
            </Button>
          </div>
        </div>
      </Modal>

      {selectedPaymentBooking && (
        <PaymentModal
          isOpen={!!selectedPaymentBooking}
          onClose={() => setSelectedPaymentBooking(null)}
          bookingId={selectedPaymentBooking.id}
          bookingNumber={selectedPaymentBooking.bookingNumber || `RNT-${selectedPaymentBooking.id.substring(0, 6)}`}
          totalAmount={selectedPaymentBooking.totalAmount + (selectedPaymentBooking.depositAmount || 0)}
          renterName={selectedPaymentBooking.renter?.name || selectedPaymentBooking.renterName || 'Penyewa'}
          paymentScheme={selectedPaymentBooking.paymentScheme}
          isAsset={isPaymentAsset}
          isPelunasan={isPaymentPelunasan}
          onPaymentSuccess={fetchAllBookings}
        />
      )}
    </div>
  );
}

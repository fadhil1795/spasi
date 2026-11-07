'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Plus, Search, Receipt, Printer, CheckCircle2, DollarSign,
  Building2, Box, CreditCard, LogIn, LogOut, Ticket, Eye, CalendarCheck
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { PaymentModal } from '@/components/public/PaymentModal';
import { FilterPill } from '@/components/ui/FilterPill';

type StatusFilter = 'SEMUA' | 'PENDING' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export default function DashboardRentalsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  const [activeTab, setActiveTab] = useState<'ROOMS' | 'ASSETS'>('ROOMS');
  const [roomBookings, setRoomBookings] = useState<any[]>([]);
  const [assetRentals, setAssetRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // User Payment Modal State
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState<any | null>(null);
  const [isPaymentAsset, setIsPaymentAsset] = useState(false);
  const [isPaymentPelunasan, setIsPaymentPelunasan] = useState(false);

  // Asset Rental Payment Modal State (Admin Cash / Manual update)
  const [selectedRentalPayment, setSelectedRentalPayment] = useState<any>(null);
  const [payStatus, setPayStatus] = useState('PAID');
  const [payMethod, setPayMethod] = useState('Cash');
  const [depositAmount, setDepositAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Reschedule State
  const [reschedulingBooking, setReschedulingBooking] = useState<any | null>(null);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const userRole = (session?.user as any)?.role || 'BORROWER';
  const isBorrower = userRole === 'BORROWER' || mode === 'my';

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const urlRooms = mode === 'my' ? '/api/room-bookings?my=true' : '/api/room-bookings';
      const urlAssets = mode === 'my' ? '/api/rentals?my=true' : '/api/rentals';
      const [resRooms, resAssets] = await Promise.all([
        fetch(urlRooms),
        fetch(urlAssets),
      ]);
      if (resRooms.ok) setRoomBookings(await resRooms.json());
      if (resAssets.ok) setAssetRentals(await resAssets.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Admin Workflow Actions
  const handleApproveBooking = async (b: any) => {
    try {
      setConfirmingId(b.id);
      const isFree = ((b.totalAmount || 0) + (b.depositAmount || 0)) === 0;
      const targetStatus = isFree ? 'CONFIRMED' : 'APPROVED';
      const toastMessage = isFree
        ? 'Pengajuan sewa gratis berhasil disetujui & otomatis terkonfirmasi!'
        : 'Pengajuan sewa berhasil disetujui! Pemesan sekarang dapat melakukan pembayaran.';

      const res = await fetch(`/api/room-bookings/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingStatus: targetStatus }),
      });
      if (res.ok) {
        showToast(toastMessage, 'success');
        fetchAllData();
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

  const handleVerifyPayment = async (id: string) => {
    try {
      setConfirmingId(id);
      const res = await fetch(`/api/room-bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payStatus: 'PAID', bookingStatus: 'CONFIRMED' }),
      });
      if (res.ok) {
        showToast('Pembayaran berhasil diverifikasi & booking dikonfirmasi!', 'success');
        fetchAllData();
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

  const handleRescheduleSubmit = async () => {
    if (!reschedulingBooking || !newStartTime || !newEndTime) return;
    try {
      setRescheduling(true);
      const res = await fetch(`/api/room-bookings/${reschedulingBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime: newStartTime, endTime: newEndTime }),
      });

      if (res.ok) {
        showToast('Pemesanan ruangan berhasil dijadwalkan ulang!', 'success');
        setReschedulingBooking(null);
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal mengubah jadwal', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan pemesanan ruangan ini?')) return;
    try {
      setConfirmingId(id);
      const res = await fetch(`/api/room-bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingStatus: 'CANCELLED' }),
      });

      if (res.ok) {
        showToast('Pemesanan berhasil dibatalkan', 'success');
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal membatalkan pemesanan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleSaveAssetPayment = async () => {
    if (!selectedRentalPayment) return;
    try {
      setSavingPayment(true);
      const res = await fetch(`/api/rentals/${selectedRentalPayment.id}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payStatus, payMethod, depositAmount, notes }),
      });
      if (res.ok) {
        showToast('Pencatatan pembayaran berhasil disimpan!', 'success');
        setSelectedRentalPayment(null);
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan pembayaran', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSavingPayment(false);
    }
  };

  // Counter calculations for Status Filter Pills (Matching Image 2 Concept)
  const roomCounts = {
    all: roomBookings.length,
    pending: roomBookings.filter((b) => b.bookingStatus === 'PENDING').length,
    approved: roomBookings.filter((b) => ['APPROVED', 'CONFIRMED'].includes(b.bookingStatus) && b.payStatus !== 'PAID').length,
    active: roomBookings.filter((b) => b.bookingStatus === 'ACTIVE').length,
    completed: roomBookings.filter((b) => b.bookingStatus === 'COMPLETED').length,
    cancelled: roomBookings.filter((b) => ['CANCELLED', 'REJECTED'].includes(b.bookingStatus)).length,
  };

  const assetCounts = {
    all: assetRentals.length,
    pending: assetRentals.filter((r) => r.status === 'PENDING' || r.payStatus === 'UNPAID').length,
    approved: assetRentals.filter((r) => r.payStatus === 'DOWN_PAYMENT').length,
    active: assetRentals.filter((r) => r.status === 'ACTIVE' || r.status === 'RENTED').length,
    completed: assetRentals.filter((r) => ['COMPLETED', 'RETURNED'].includes(r.status)).length,
    cancelled: assetRentals.filter((r) => ['CANCELLED', 'REJECTED'].includes(r.status)).length,
  };

  const activeCounts = activeTab === 'ROOMS' ? roomCounts : assetCounts;

  const filteredRooms = roomBookings.filter((b) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      b.bookingNumber.toLowerCase().includes(q) ||
      (b.location?.name || '').toLowerCase().includes(q) ||
      (b.renter?.name || '').toLowerCase().includes(q);
    if (!matchSearch) return false;

    if (statusFilter === 'PENDING') return b.bookingStatus === 'PENDING';
    if (statusFilter === 'APPROVED') return ['APPROVED', 'CONFIRMED'].includes(b.bookingStatus) && b.payStatus !== 'PAID';
    if (statusFilter === 'ACTIVE') return b.bookingStatus === 'ACTIVE';
    if (statusFilter === 'COMPLETED') return b.bookingStatus === 'COMPLETED';
    if (statusFilter === 'CANCELLED') return ['CANCELLED', 'REJECTED'].includes(b.bookingStatus);

    return true;
  });

  const filteredAssets = assetRentals.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      r.bookingNumber.toLowerCase().includes(q) ||
      (r.asset?.name || '').toLowerCase().includes(q) ||
      (r.renter?.name || '').toLowerCase().includes(q);
    if (!matchSearch) return false;

    if (statusFilter === 'PENDING') return r.status === 'PENDING' || r.payStatus === 'UNPAID';
    if (statusFilter === 'APPROVED') return r.payStatus === 'DOWN_PAYMENT';
    if (statusFilter === 'ACTIVE') return r.status === 'ACTIVE' || r.status === 'RENTED';
    if (statusFilter === 'COMPLETED') return ['COMPLETED', 'RETURNED'].includes(r.status);
    if (statusFilter === 'CANCELLED') return ['CANCELLED', 'REJECTED'].includes(r.status);

    return true;
  });

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
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            {isBorrower ? 'Sewa & Booking Saya 🏢' : 'Kelola Penyewaan & Pemesanan 🏢💳'}
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            {isBorrower
              ? 'Kelola semua pemesanan ruangan dan peralatan sewa Anda.'
              : 'Pusat kendali persetujuan pengajuan, verifikasi pembayaran, check-in/out, dan deposit.'}
          </p>
        </div>

        <div className="action-buttons-group" style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/dashboard/room-bookings/new" className="btn btn-secondary">
            <Plus size={18} /> Booking Baru
          </Link>
          {!isBorrower && (
            <Link href="/dashboard/rentals/new" className="btn btn-primary">
              <Plus size={18} /> Sewakan Alat
            </Link>
          )}
        </div>
      </div>

      {/* Status Filter Pills with Counters (Konsep Image 2) */}
      <div className="scrollable-filter-pills" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <FilterPill
          label="Semua"
          active={statusFilter === 'SEMUA'}
          onClick={() => setStatusFilter('SEMUA')}
          count={activeCounts.all}
        />
        <FilterPill
          label="Menunggu"
          active={statusFilter === 'PENDING'}
          onClick={() => setStatusFilter('PENDING')}
          count={activeCounts.pending}
        />
        <FilterPill
          label="Disetujui / Bayar"
          active={statusFilter === 'APPROVED'}
          onClick={() => setStatusFilter('APPROVED')}
          count={activeCounts.approved}
        />
        <FilterPill
          label="Aktif Sesi"
          active={statusFilter === 'ACTIVE'}
          onClick={() => setStatusFilter('ACTIVE')}
          count={activeCounts.active}
        />
        <FilterPill
          label="Selesai"
          active={statusFilter === 'COMPLETED'}
          onClick={() => setStatusFilter('COMPLETED')}
          count={activeCounts.completed}
        />
        <FilterPill
          label="Dibatalkan / Ditolak"
          active={statusFilter === 'CANCELLED'}
          onClick={() => setStatusFilter('CANCELLED')}
          count={activeCounts.cancelled}
        />
      </div>

      {/* Tab Switcher */}
      <div className="dashboard-tab-switcher" style={{ display: 'flex', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '0.25rem', gap: '0.25rem', width: 'fit-content' }}>
        <button
          type="button"
          onClick={() => setActiveTab('ROOMS')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
            background: activeTab === 'ROOMS' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'ROOMS' ? '#fff' : 'var(--color-muted)',
            fontWeight: activeTab === 'ROOMS' ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <Building2 size={18} /> <span className="desktop-nav">Pemesanan </span>Ruangan ({roomBookings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ASSETS')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
            background: activeTab === 'ASSETS' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'ASSETS' ? '#fff' : 'var(--color-muted)',
            fontWeight: activeTab === 'ASSETS' ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <Box size={18} /> <span className="desktop-nav">Penyewaan </span>Alat ({assetRentals.length})
        </button>
      </div>

      {/* Search Filter Bar */}
      <Card style={{ padding: '1.25rem' }}>
        <Input
          placeholder={activeTab === 'ROOMS' ? 'Cari no. booking, ruangan, atau nama pemesan...' : 'Cari no. booking, alat sewa, atau penyewa...'}
          icon={<Search size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginBottom: 0 }}
        />
      </Card>

      {/* TAB 1: Pemesanan Ruangan */}
      {activeTab === 'ROOMS' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  <th style={{ padding: '1rem 1.25rem' }}>No. Booking</th>
                  <th style={{ padding: '1rem' }}>Ruangan</th>
                  <th style={{ padding: '1rem' }}>Penyewa</th>
                  <th style={{ padding: '1rem' }}>Waktu Sesi</th>
                  <th style={{ padding: '1rem' }}>Total Biaya</th>
                  <th style={{ padding: '1rem' }}>Status Bayar</th>
                  <th style={{ padding: '1rem' }}>Status Sesi</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Aksi Tahapan Operasional</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center' }}>
                      <Skeleton height="30px" style={{ marginBottom: '0.5rem' }} />
                      <Skeleton height="30px" />
                    </td>
                  </tr>
                ) : filteredRooms.length > 0 ? (
                  filteredRooms.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                        {b.bookingNumber}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <strong style={{ fontSize: '0.92rem' }}>{b.location?.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{b.location?.building}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600 }}>{b.renter?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{b.renter?.phone}</div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.82rem' }}>
                        {formatDate(b.startTime, 'dd MMM yyyy HH:mm')} - {formatDate(b.endTime, 'HH:mm')}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                        {formatCurrency((b.totalAmount || 0) + (b.depositAmount || 0))}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge" style={payBadgeStyle(b.payStatus)}>{payLabel(b.payStatus)}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {b.bookingStatus === 'CONFIRMED' && new Date(b.startTime) < new Date() ? (
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-pill)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
                            ⚠️ Terlewat Check-In
                          </span>
                        ) : (
                          <Badge status={b.bookingStatus} />
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {/* User Payment Logic: Locked if PENDING approval */}
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

                          {/* Admin Step 1: Request Approval */}
                          {!isBorrower && b.bookingStatus === 'PENDING' && (
                            <>
                              <Button variant="primary" size="sm" style={{ background: 'var(--color-success)', color: '#FFFFFF' }} isLoading={confirmingId === b.id} onClick={() => handleApproveBooking(b)}>
                                ✓ Setujui Pengajuan
                              </Button>
                              <Button variant="secondary" size="sm" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} isLoading={confirmingId === b.id} onClick={async () => {
                                if (!confirm('Yakin ingin menolak pengajuan booking ini?')) return;
                                try {
                                  setConfirmingId(b.id);
                                  await fetch(`/api/room-bookings/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payStatus: 'REJECTED', bookingStatus: 'CANCELLED' }) });
                                  fetchAllData();
                                } finally {
                                  setConfirmingId(null);
                                }
                              }}>
                                ❌ Tolak
                              </Button>
                            </>
                          )}

                          {/* Admin Step 2: Payment Verification */}
                          {!isBorrower && b.payStatus === 'PENDING_VERIFICATION' && (
                            <>
                              <Button variant="primary" size="sm" style={{ background: 'var(--color-success)', color: '#FFFFFF' }} isLoading={confirmingId === b.id} onClick={() => handleVerifyPayment(b.id)}>
                                <CalendarCheck size={14} /> Verifikasi Struk
                              </Button>
                              <Button variant="secondary" size="sm" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} isLoading={confirmingId === b.id} onClick={async () => {
                                if (!confirm('Yakin ingin menolak struk ini?')) return;
                                try {
                                  setConfirmingId(b.id);
                                  await fetch(`/api/room-bookings/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payStatus: 'REJECTED' }) });
                                  fetchAllData();
                                } finally {
                                  setConfirmingId(null);
                                }
                              }}>
                                ❌ Tolak Struk
                              </Button>
                            </>
                          )}

                          {/* Check-In */}
                          {!isBorrower && b.bookingStatus === 'CONFIRMED' && (
                            <Button variant="secondary" size="sm" onClick={() => router.push(`/dashboard/room-bookings/${b.id}/checkin`)}>
                              <LogIn size={14} /> Check-In
                            </Button>
                          )}

                          {/* Overdue Check-In Actions (Reschedule or Cancel) */}
                          {b.bookingStatus === 'CONFIRMED' && new Date(b.startTime) < new Date() && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                style={{ background: 'rgba(79,70,229,0.08)', color: 'var(--color-primary-light)', border: '1px solid rgba(79,70,229,0.2)' }}
                                onClick={() => {
                                  setReschedulingBooking(b);
                                  // Format date to local datetime-local input string format
                                  const localStart = new Date(b.startTime);
                                  localStart.setMinutes(localStart.getMinutes() - localStart.getTimezoneOffset());
                                  setNewStartTime(localStart.toISOString().slice(0, 16));

                                  const localEnd = new Date(b.endTime);
                                  localEnd.setMinutes(localEnd.getMinutes() - localEnd.getTimezoneOffset());
                                  setNewEndTime(localEnd.toISOString().slice(0, 16));
                                }}
                              >
                                ⏳ Reschedule
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', background: 'rgba(239,68,68,0.03)' }}
                                isLoading={confirmingId === b.id}
                                onClick={() => handleCancelBooking(b.id)}
                              >
                                ❌ Batalkan
                              </Button>
                            </>
                          )}

                          {/* Check-Out & Inspection */}
                          {!isBorrower && ['ACTIVE', 'RETURN_REQUESTED'].includes(b.bookingStatus) && (
                            <Button variant="primary" size="sm" onClick={() => router.push(`/dashboard/room-bookings/${b.id}/checkout`)}>
                              <LogOut size={14} /> Inspeksi &amp; Check-Out
                            </Button>
                          )}

                          <Link href={`/dashboard/room-bookings/${b.id}`} className="btn btn-ghost btn-sm">
                            <Eye size={14} /> Detail
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                      Belum ada transaksi pemesanan ruangan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: Penyewaan Alat Komersial */}
      {activeTab === 'ASSETS' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  <th style={{ padding: '1rem 1.25rem' }}>No. Booking</th>
                  <th style={{ padding: '1rem' }}>Alat Sewa</th>
                  <th style={{ padding: '1rem' }}>Penyewa</th>
                  <th style={{ padding: '1rem' }}>Periode Sewa</th>
                  <th style={{ padding: '1rem' }}>Total Biaya</th>
                  <th style={{ padding: '1rem' }}>Status Bayar</th>
                  <th style={{ padding: '1rem' }}>Status Sewa</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Aksi Operasional</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center' }}>
                      <Skeleton height="30px" style={{ marginBottom: '0.5rem' }} />
                      <Skeleton height="30px" />
                    </td>
                  </tr>
                ) : filteredAssets.length > 0 ? (
                  filteredAssets.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                        {r.bookingNumber}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <strong style={{ fontSize: '0.92rem' }}>{r.asset?.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Kode: {r.asset?.code}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600 }}>{r.renter?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{r.renter?.phone}</div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.82rem' }}>
                        {formatDate(r.startDate, 'dd MMM yyyy')} - {formatDate(r.endDate, 'dd MMM yyyy')} ({r.totalDays} Hari)
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                        {formatCurrency((r.totalAmount || 0) + (r.depositAmount || 0))}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge" style={payBadgeStyle(r.payStatus)}>{payLabel(r.payStatus)}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <Badge status={r.status} />
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                           {isBorrower && r.status === 'APPROVED' && ['UNPAID', 'REJECTED'].includes(r.payStatus) && (
                            <Button variant="primary" size="sm" onClick={() => {
                              setIsPaymentAsset(true);
                              setSelectedPaymentBooking(r);
                            }}>
                              <CreditCard size={13} /> Bayar Sekarang
                            </Button>
                          )}
                          {!isBorrower && (
                            <Button variant="secondary" size="sm" onClick={() => {
                              setSelectedRentalPayment(r);
                              setPayStatus(r.payStatus || 'PAID');
                              setPayMethod(r.payMethod || 'Cash');
                              setDepositAmount(r.depositAmount ? String(r.depositAmount) : '0');
                              setNotes(r.notes || '');
                            }}>
                              <DollarSign size={14} /> Pencatatan Bayar
                            </Button>
                          )}
                          <Link href={`/dashboard/rentals/${r.id}`} className="btn btn-ghost btn-sm">
                            <Eye size={14} /> Detail
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                      Belum ada transaksi penyewaan alat komersial.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Payment untuk User Booking Ruangan */}
      {selectedPaymentBooking && (
        <PaymentModal
          isOpen={Boolean(selectedPaymentBooking)}
          onClose={() => setSelectedPaymentBooking(null)}
          bookingId={selectedPaymentBooking.id}
          bookingNumber={selectedPaymentBooking.bookingNumber || `RNT-${selectedPaymentBooking.id.substring(0, 6)}`}
          totalAmount={(selectedPaymentBooking.totalAmount || 0) + (selectedPaymentBooking.depositAmount || 0)}
          renterName={selectedPaymentBooking.renter?.name || 'Penyewa'}
          paymentScheme={selectedPaymentBooking.paymentScheme || 'FULL'}
          isAsset={isPaymentAsset}
          isPelunasan={isPaymentPelunasan}
          onPaymentSuccess={() => {
            showToast('Struk pembayaran berhasil diunggah! Menunggu verifikasi admin.', 'success');
            setSelectedPaymentBooking(null);
            fetchAllData();
          }}
        />
      )}

      {/* Modal Pencatatan Bayar / Cash untuk Admin Asset Rental */}
      <Modal
        isOpen={Boolean(selectedRentalPayment)}
        onClose={() => setSelectedRentalPayment(null)}
        title="Pencatatan Pembayaran &amp; Deposit Sewa Alat"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="input-label">Status Pembayaran</label>
            <select className="input-field" value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
              <option value="PAID">LUNAS (PAID)</option>
              <option value="DOWN_PAYMENT">UANG MUKA (DP)</option>
              <option value="UNPAID">BELUM BAYAR (UNPAID)</option>
            </select>
          </div>

          <div>
            <label className="input-label">Metode Pembayaran</label>
            <select className="input-field" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <option value="Cash">Tunai / Cash (Kasir)</option>
              <option value="Transfer">Transfer Bank</option>
              <option value="QRIS">QRIS Standar</option>
            </select>
          </div>

          <div>
            <label className="input-label">Deposit Jaminan (Rp)</label>
            <Input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="input-label">Catatan Tambahan (Opsional)</label>
            <textarea className="input-field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setSelectedRentalPayment(null)}>
              Batal
            </Button>
            <Button onClick={handleSaveAssetPayment} isLoading={savingPayment}>
              Simpan Pencatatan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Reschedule Booking */}
      <Modal
        isOpen={Boolean(reschedulingBooking)}
        onClose={() => setReschedulingBooking(null)}
        title="Reschedule / Jadwal Ulang Pemesanan Ruangan"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ padding: '0.85rem 1rem', background: 'rgba(79,70,229,0.06)', borderLeft: '3px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Informasi Booking:</div>
            <div>No. Booking: <strong>{reschedulingBooking?.bookingNumber}</strong></div>
            <div>Ruangan: <strong>{reschedulingBooking?.location?.name}</strong></div>
          </div>

          <div>
            <label className="input-label">Tanggal &amp; Waktu Mulai Baru</label>
            <Input
              type="datetime-local"
              value={newStartTime}
              onChange={(e: any) => setNewStartTime(e.target.value)}
            />
          </div>

          <div>
            <label className="input-label">Tanggal &amp; Waktu Selesai Baru</label>
            <Input
              type="datetime-local"
              value={newEndTime}
              onChange={(e: any) => setNewEndTime(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setReschedulingBooking(null)}>
              Batal
            </Button>
            <Button onClick={handleRescheduleSubmit} isLoading={rescheduling} disabled={!newStartTime || !newEndTime}>
              ✓ Simpan Jadwal Baru
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

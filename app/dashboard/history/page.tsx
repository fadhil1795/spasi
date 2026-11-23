'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { RatingModal } from '@/components/ui/RatingModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  FileSpreadsheet, Search, Filter, Ticket, Eye, Calendar,
  Building2, Box, Download, Clock, CheckCircle2, XCircle, Star
} from 'lucide-react';

type TypeFilter = 'ALL' | 'ROOM_BOOKING' | 'ASSET_RENTAL' | 'INTERNAL_LOAN';
type StatusFilter = 'ALL' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export default function HistoryLogPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);

  // Data lists
  const [roomBookings, setRoomBookings] = useState<any[]>([]);
  const [assetRentals, setAssetRentals] = useState<any[]>([]);
  const [internalLoans, setInternalLoans] = useState<any[]>([]);

  // Filter State
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Rating Modal State
  const [ratingModal, setRatingModal] = useState<{ open: boolean; loanId?: string; bookingId?: string; assetName: string } | null>(null);

  const isBorrower = session?.user && (session.user as any).role === 'BORROWER';

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const [resRooms, resRentals, resLoans] = await Promise.all([
        fetch('/api/room-bookings'),
        fetch('/api/rentals'),
        fetch('/api/loans'),
      ]);

      if (resRooms.ok) setRoomBookings(await resRooms.json());
      if (resRentals.ok) setAssetRentals(await resRentals.json());
      if (resLoans.ok) setInternalLoans(await resLoans.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Consolidate into unified read-only history items
  const unifiedHistory: any[] = [];

  // 1. Room Bookings
  roomBookings.forEach((b) => {
    unifiedHistory.push({
      id: b.id,
      ticketNo: b.bookingNumber,
      type: 'ROOM_BOOKING',
      typeLabel: '🏢 Booking Ruangan',
      title: b.location?.name || 'Ruangan',
      subtitle: `${b.location?.building || ''} • ${b.durationHours} Jam`,
      renterName: b.renter?.name || '-',
      dateFormatted: `${formatDate(b.startTime, 'dd MMM yyyy HH:mm')} - ${formatDate(b.endTime, 'HH:mm')}`,
      rawDate: new Date(b.createdAt),
      totalCost: (b.totalAmount || 0) + (b.depositAmount || 0),
      finalStatus: b.bookingStatus,
      voucherUrl: `/api/room-bookings/${b.id}/pdf?type=BAST`,
      detailUrl: `/dashboard/room-bookings/${b.id}`,
      // Rating
      canRate: ['COMPLETED', 'COMPLETED_WITH_CLAIM'].includes(b.bookingStatus),
      existingRating: b.rating?.score || null,
      loanId: undefined,
      bookingId: b.id,
      assetDisplayName: b.location?.name || 'Ruangan',
    });
  });

  // 2. Commercial Asset Rentals
  assetRentals.forEach((r) => {
    unifiedHistory.push({
      id: r.id,
      ticketNo: r.bookingNumber,
      type: 'ASSET_RENTAL',
      typeLabel: '💼 Sewa Aset Komersial',
      title: r.asset?.name || 'Aset Sewa',
      subtitle: `Kode: ${r.asset?.code || '-'} • ${r.totalDays || 1} Hari`,
      renterName: r.renter?.name || '-',
      dateFormatted: `${formatDate(r.startDate, 'dd MMM yyyy')} - ${formatDate(r.endDate, 'dd MMM yyyy')}`,
      rawDate: new Date(r.createdAt),
      totalCost: (r.totalAmount || 0) + (r.depositAmount || 0),
      payStatus: r.payStatus,
      finalStatus: r.status,
      voucherUrl: `/api/rentals/${r.id}/pdf`,
      detailUrl: `/dashboard/rentals/${r.id}`,
    });
  });

  // 3. Internal Asset Loans (grouped by groupCode or ±5s same-transaction fallback)
  const loanGroups: Array<{ groupCode: string | null; items: any[]; createdAtMs: number }> = [];
  const loanGroupMap = new Map<string, { groupCode: string | null; items: any[]; createdAtMs: number }>();

  internalLoans.forEach((l) => {
    if (l.groupCode) {
      const existing = loanGroupMap.get(l.groupCode);
      if (existing) {
        existing.items.push(l);
      } else {
        const g = { groupCode: l.groupCode, items: [l], createdAtMs: new Date(l.createdAt).getTime() };
        loanGroupMap.set(l.groupCode, g);
        loanGroups.push(g);
      }
    } else {
      const createdMs = new Date(l.createdAt).getTime();
      const matchLegacy = loanGroups.find(
        (g) =>
          !g.groupCode &&
          g.items[0]?.userId === l.userId &&
          g.items[0]?.startDate === l.startDate &&
          g.items[0]?.endDate === l.endDate &&
          g.items[0]?.purpose === l.purpose &&
          Math.abs(g.createdAtMs - createdMs) <= 5000
      );
      if (matchLegacy) {
        matchLegacy.items.push(l);
      } else {
        loanGroups.push({ groupCode: null, items: [l], createdAtMs: createdMs });
      }
    }
  });

  loanGroups.forEach((g) => {
    const primary = g.items[0];
    const isMulti = g.items.length > 1;
    const totalUnits = g.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const assetNames = g.items.map((item) => item.asset?.name || 'Aset').join(', ');
    const assetCodes = g.items.map((item) => item.asset?.code || '-').join(', ');

    const timeParts: string[] = [];
    if (primary.checkInTime) timeParts.push(`Ambil: ${formatDate(primary.checkInTime, 'dd MMM yyyy, HH:mm')}`);
    if (primary.checkOutTime) timeParts.push(`Kembali: ${formatDate(primary.checkOutTime, 'dd MMM yyyy, HH:mm')}`);

    unifiedHistory.push({
      id: primary.id,
      ticketNo: g.groupCode || primary.ticketNumber,
      type: 'INTERNAL_LOAN',
      typeLabel: '🛠️ Peminjaman Internal',
      title: isMulti ? `Paket ${g.items.length} Aset: ${assetNames}` : (primary.asset?.name || 'Aset Internal'),
      subtitle: isMulti
        ? `${totalUnits} Unit • ${assetCodes}${timeParts.length ? ` • ${timeParts.join(' | ')}` : ''}`
        : `Kode: ${primary.asset?.code || '-'}${timeParts.length ? ` • ${timeParts.join(' | ')}` : ''}`,
      renterName: primary.user?.name || '-',
      dateFormatted: `${formatDate(primary.startDate, 'dd MMM yyyy')} - ${formatDate(primary.endDate, 'dd MMM yyyy')}`,
      rawDate: new Date(primary.createdAt),
      totalCost: 0,
      payStatus: 'FREE',
      finalStatus: primary.status,
      voucherUrl: `/api/loans/${primary.id}/pdf`,
      detailUrl: `/dashboard/loans/${primary.id}`,
      // Rating
      canRate: ['RETURNED', 'COMPLETED'].includes(primary.status) && isBorrower,
      existingRating: primary.rating?.score || null,
      loanId: primary.id,
      bookingId: undefined as string | undefined,
      assetDisplayName: isMulti ? `Paket ${g.items.length} Aset` : (primary.asset?.name || 'Aset Internal'),
    });
  });

  // Sort descending by rawDate
  unifiedHistory.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

  // Apply filters
  const filtered = unifiedHistory.filter((item) => {
    // Type Filter
    if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;

    // Status Filter
    if (statusFilter !== 'ALL') {
      const isCompleted = ['COMPLETED', 'RETURNED'].includes(item.finalStatus);
      const isRejected = item.finalStatus === 'REJECTED';
      const isCancelled = item.finalStatus === 'CANCELLED';

      if (statusFilter === 'COMPLETED' && !isCompleted) return false;
      if (statusFilter === 'REJECTED' && !isRejected) return false;
      if (statusFilter === 'CANCELLED' && !isCancelled) return false;
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.ticketNo.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.renterName.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Date Range Filter
    if (startDate && new Date(item.rawDate) < new Date(startDate)) return false;
    if (endDate && new Date(item.rawDate) > new Date(endDate + 'T23:59:59')) return false;

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileSpreadsheet size={28} style={{ color: 'var(--color-primary)' }} /> Riwayat &amp; Arsip Transaksi 📜
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Catatan log arsip terpadu (Read-Only) untuk seluruh riwayat peminjaman internal, booking ruangan, dan sewa komersial.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <Input
            placeholder="Cari no. tiket/booking, pemesan, atau unit..."
            icon={<Search size={18} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: 0 }}
          />

          <div>
            <label className="input-label" style={{ fontSize: '0.75rem' }}>Jenis Transaksi</label>
            <select
              className="input-field"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              style={{ cursor: 'pointer', marginBottom: 0 }}
            >
              <option value="ALL">-- Semua Jenis Transaksi --</option>
              <option value="ROOM_BOOKING">🏢 Booking Ruangan</option>
              <option value="ASSET_RENTAL">💼 Sewa Aset Komersial</option>
              <option value="INTERNAL_LOAN">🛠️ Peminjaman Internal</option>
            </select>
          </div>

          <div>
            <label className="input-label" style={{ fontSize: '0.75rem' }}>Status Transaksi</label>
            <select
              className="input-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              style={{ cursor: 'pointer', marginBottom: 0 }}
            >
              <option value="ALL">-- Semua Status Final --</option>
              <option value="COMPLETED">Selesai (Completed / Returned)</option>
              <option value="REJECTED">Ditolak (Rejected)</option>
              <option value="CANCELLED">Dibatalkan (Cancelled)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>Dari Tanggal</label>
              <input
                type="date"
                className="input-field"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', marginBottom: 0 }}
              />
            </div>
            <div>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>Sampai Tanggal</label>
              <input
                type="date"
                className="input-field"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', marginBottom: 0 }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Read-Only History Data Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                <th style={{ padding: '1rem 1.25rem' }}>No. Tiket / Booking</th>
                <th style={{ padding: '1rem' }}>Jenis &amp; Nama Unit</th>
                <th style={{ padding: '1rem' }}>Pemesan / Peminjam</th>
                <th style={{ padding: '1rem' }}>Periode Waktu</th>
                <th style={{ padding: '1rem' }}>Total Biaya</th>
                <th style={{ padding: '1rem' }}>Status Akhir</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Rating</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Arsip Dokumen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>
                    <Skeleton height="30px" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton height="30px" />
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={`${item.type}-${item.id}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                      {item.ticketNo}
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 400, marginTop: '0.15rem' }}>
                        Dibuat: {formatDate(item.rawDate, 'dd/MM/yyyy HH:mm')}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary)', display: 'block' }}>
                        {item.typeLabel}
                      </span>
                      <strong style={{ fontSize: '0.92rem' }}>{item.title}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{item.subtitle}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600 }}>{item.renterName}</div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.82rem' }}>
                      {item.dateFormatted}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 800, color: item.totalCost > 0 ? 'var(--color-primary-light)' : 'var(--color-success)' }}>
                      {item.totalCost > 0 ? formatCurrency(item.totalCost) : 'Gratis (Internal)'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Badge status={item.finalStatus} />
                    </td>
                    {/* Rating Column */}
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {item.canRate ? (
                        item.existingRating ? (
                          // Sudah pernah rating — tampilkan bintang
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} size={14} fill={item.existingRating >= s ? '#f59e0b' : 'transparent'} color={item.existingRating >= s ? '#f59e0b' : 'var(--color-border)'} />
                            ))}
                          </div>
                        ) : (
                          // Belum rating — tombol
                          <button
                            onClick={() => setRatingModal({ open: true, loanId: item.loanId, bookingId: item.bookingId, assetName: item.assetDisplayName || item.title })}
                            style={{ background: 'none', border: '1.5px solid #f59e0b', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.65rem', cursor: 'pointer', color: '#f59e0b', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Star size={13} /> Beri Rating
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        {item.voucherUrl && (
                          <a href={item.voucherUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" title="Unduh E-Voucher / Bukti Resmi">
                            <Ticket size={13} /> Dokumen
                          </a>
                        )}
                        <Link href={item.detailUrl} className="btn btn-ghost btn-sm" title="Lihat Kronologi Detail Log">
                          <Eye size={14} /> Detail
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    Belum ada riwayat transaksi yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Rating Modal */}
      {ratingModal && (
        <RatingModal
          isOpen={ratingModal.open}
          onClose={() => setRatingModal(null)}
          loanId={ratingModal.loanId}
          bookingId={ratingModal.bookingId}
          assetName={ratingModal.assetName}
          onSuccess={fetchHistory}
        />
      )}
    </div>
  );
}

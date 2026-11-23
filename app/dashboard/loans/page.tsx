'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import {
  Plus, Search, QrCode, Eye, RotateCcw, CheckSquare,
  CheckCircle2, XCircle, Clock, CalendarCheck, Box, RefreshCw, AlertCircle, FileText,
  Download, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';

import { useSearchParams } from 'next/navigation';
import { FilterPill } from '@/components/ui/FilterPill';

export default function DashboardLoansPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  const userRole = (session?.user as any)?.role || 'BORROWER';
  const isBorrower = userRole === 'BORROWER' || mode === 'my';
  const isStaffOrAdmin = !isBorrower && ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'APPROVER'].includes(userRole);
  const isApproverL1 = !isBorrower && ['SUPER_ADMIN', 'ADMIN', 'APPROVER'].includes(userRole);
  const isAdminL2 = !isBorrower && ['SUPER_ADMIN', 'ADMIN'].includes(userRole);

  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectLoanIds, setRejectLoanIds] = useState<string[]>([]);
  const [rejectNotes, setRejectNotes] = useState('');

  // Borrower Request Return Modal State
  const [selectedReturnGroup, setSelectedReturnGroup] = useState<{ label: string; loanIds: string[] } | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Expanded multi-item groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Document Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState('');
  const [previewDocIndex, setPreviewDocIndex] = useState(0);

  const fetchLoans = useCallback(async () => {
    try {
      setLoading(true);
      const url = mode === 'my' ? '/api/loans?my=true' : '/api/loans';
      const res = await fetch(url);
      if (res.ok) {
        setLoans(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  // Approval Handlers (supports single or multi-item group)
  const handleApprovalAction = async (loanIds: string[], action: 'APPROVE' | 'REJECT', groupKey?: string) => {
    const notesToSend = action === 'REJECT' ? rejectNotes : '';

    if (action === 'REJECT' && !notesToSend.trim()) {
      showToast('Alasan penolakan wajib diisi', 'error');
      return;
    }

    const activeKey = groupKey || loanIds[0];

    try {
      setProcessingId(activeKey);
      const res =
        loanIds.length > 1
          ? await fetch('/api/loans/group-action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ loanIds, action, notes: notesToSend }),
            })
          : await fetch(`/api/loans/${loanIds[0]}/approve`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action, notes: notesToSend }),
            });

      if (res.ok) {
        showToast(
          action === 'APPROVE'
            ? loanIds.length > 1
              ? `${loanIds.length} item peminjaman berhasil disetujui!`
              : 'Pengajuan peminjaman berhasil disetujui!'
            : loanIds.length > 1
            ? `${loanIds.length} item peminjaman ditolak.`
            : 'Pengajuan peminjaman ditolak.',
          action === 'APPROVE' ? 'success' : 'info'
        );
        setRejectModalOpen(false);
        setRejectNotes('');
        fetchLoans();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memproses persetujuan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRequestReturnSubmit = async () => {
    if (!selectedReturnGroup || selectedReturnGroup.loanIds.length === 0) return;

    try {
      setSubmittingReturn(true);
      const { loanIds } = selectedReturnGroup;
      const res =
        loanIds.length > 1
          ? await fetch('/api/loans/group-action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ loanIds, action: 'REQUEST_RETURN', notes: returnNotes }),
            })
          : await fetch(`/api/loans/${loanIds[0]}/request-return`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ returnNotes }),
            });

      if (res.ok) {
        showToast('Permintaan pengembalian berhasil dikirim!', 'success');
        setSelectedReturnGroup(null);
        setReturnNotes('');
        fetchLoans();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal mengirim permintaan pengembalian', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleCancelLoan = async (loanIds: string[], groupKey?: string) => {
    const confirmMsg =
      loanIds.length > 1
        ? `Batalkan seluruh ${loanIds.length} item dalam pengajuan peminjaman ini?`
        : 'Batalkan pengajuan peminjaman ini?';
    if (!confirm(confirmMsg)) return;

    const activeKey = groupKey || loanIds[0];
    try {
      setProcessingId(activeKey);
      const res =
        loanIds.length > 1
          ? await fetch('/api/loans/group-action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                loanIds,
                action: 'CANCEL',
                notes: 'Dibatalkan oleh pengguna dari daftar peminjaman',
              }),
            })
          : await fetch(`/api/loans/${loanIds[0]}/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason: 'Dibatalkan oleh pengguna dari daftar peminjaman' }),
            });
      const data = await res.json();
      if (res.ok) {
        showToast(
          data.message ||
            (loanIds.length > 1 ? `${loanIds.length} item peminjaman berhasil dibatalkan` : 'Pengajuan berhasil dibatalkan'),
          'success'
        );
        fetchLoans();
      } else {
        showToast(data.error || 'Gagal membatalkan pengajuan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL' && statusFilter !== 'PENDING') {
      params.set('status', statusFilter);
    }
    if (mode === 'my') {
      params.set('my', 'true');
    }
    window.open(`/api/loans/export?${params.toString()}`, '_blank');
  };

  // Filter & Search Logic
  const filteredLoans = (loans || []).filter((loan) => {
    if (!loan) return false;
    const q = (searchQuery || '').toLowerCase();
    const ticketMatch = (loan.ticketNumber || '').toLowerCase().includes(q);
    const assetMatch = (loan.asset?.name || '').toLowerCase().includes(q);
    const userMatch = (loan.user?.name || '').toLowerCase().includes(q);
    const matchesSearch = ticketMatch || assetMatch || userMatch;

    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'PENDING') return matchesSearch && ['PENDING_L1', 'PENDING_L2', 'PENDING'].includes(loan.status);
    return matchesSearch && loan.status === statusFilter;
  });

  // Group loans by groupCode (or fallback for legacy multi-item submissions created together within 5s)
  type LoanGroup = {
    key: string;
    groupCode: string | null;
    items: any[];
    createdAtMs: number;
  };
  const groupedLoans: LoanGroup[] = [];
  const groupMap = new Map<string, LoanGroup>();

  for (const loan of filteredLoans) {
    if (loan.groupCode) {
      const k = `grp:${loan.groupCode}`;
      const existing = groupMap.get(k);
      if (existing) {
        existing.items.push(loan);
      } else {
        const g: LoanGroup = {
          key: k,
          groupCode: loan.groupCode,
          items: [loan],
          createdAtMs: new Date(loan.createdAt).getTime(),
        };
        groupMap.set(k, g);
        groupedLoans.push(g);
      }
    } else {
      const loanCreatedMs = new Date(loan.createdAt).getTime();
      const matchLegacy = groupedLoans.find(
        (g) =>
          !g.groupCode &&
          g.items[0]?.userId === loan.userId &&
          g.items[0]?.startDate === loan.startDate &&
          g.items[0]?.endDate === loan.endDate &&
          g.items[0]?.purpose === loan.purpose &&
          Math.abs(g.createdAtMs - loanCreatedMs) <= 5000
      );
      if (matchLegacy) {
        matchLegacy.items.push(loan);
      } else {
        groupedLoans.push({
          key: `single:${loan.id}`,
          groupCode: null,
          items: [loan],
          createdAtMs: loanCreatedMs,
        });
      }
    }
  }

  const getStatusBadge = (status?: string) => {
    return <Badge status={status || 'PENDING'} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            {isBorrower ? 'Peminjaman Saya 📅' : 'Kelola Peminjaman Aset 🛠️'}
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            {isBorrower 
              ? 'Daftar riwayat serta status pengajuan peminjaman barang Anda.'
              : 'Verifikasi pengajuan peminjaman, antrean serah terima, dan log pengembalian aset.'}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isBorrower && (
            <Link href="/dashboard/loans/new" className="btn btn-primary" style={{ display: 'flex', gap: '0.4rem', padding: '0.65rem 1.25rem' }}>
              <Plus size={16} /> Ajukan Peminjaman
            </Link>
          )}
          <Button variant="secondary" onClick={handleExportCsv} style={{ display: 'flex', gap: '0.4rem' }}>
            <Download size={15} /> Ekspor CSV
          </Button>
          <Button variant="secondary" onClick={fetchLoans} disabled={loading} style={{ display: 'flex', gap: '0.4rem' }}>
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} /> Segarkan
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { value: 'ALL', label: 'Semua' },
            { value: 'PENDING', label: 'Menunggu Approval' },
            { value: 'APPROVED', label: 'Siap Diambil' },
            { value: 'ACTIVE', label: 'Aktif' },
            { value: 'RETURN_REQUESTED', label: 'Ajuan Kembali' },
            { value: 'RETURNED', label: 'Selesai' },
            { value: 'REJECTED', label: 'Ditolak' },
            { value: 'CANCELLED', label: 'Dibatalkan' },
          ].map((pill) => (
            <FilterPill
              key={pill.value}
              label={pill.label}
              active={statusFilter === pill.value}
              onClick={() => setStatusFilter(pill.value)}
            />
          ))}
        </div>

        <div style={{ position: 'relative', width: '300px' }}>
          <Input
            placeholder="Cari nomor tiket, nama aset..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
        </div>
      </div>

      {/* Data Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem' }}><Skeleton height="150px" /></div>
        ) : filteredLoans.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
            <Box size={40} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
            <div style={{ fontWeight: 700 }}>Tidak ada pengajuan peminjaman</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  <th style={{ padding: '1rem 1.25rem' }}>Nomor Tiket</th>
                  <th style={{ padding: '1rem' }}>Peminjam</th>
                  <th style={{ padding: '1rem' }}>Aset / Barang</th>
                  <th style={{ padding: '1rem' }}>Durasi Pinjam</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {groupedLoans.map((group) => {
                  const primary = group.items[0];
                  const isMulti = group.items.length > 1;
                  const isExpanded = !!expandedGroups[group.key];

                  const isOverdue = group.items.some(
                    (l) => ['ACTIVE', 'RETURN_REQUESTED'].includes(l.status) && new Date(l.endDate).getTime() < Date.now()
                  );

                  const cancellableIds = group.items
                    .filter((l) => ['PENDING_L1', 'PENDING_L2', 'APPROVED'].includes(l.status))
                    .map((l) => l.id);
                  const pendingL1Ids = group.items.filter((l) => l.status === 'PENDING_L1').map((l) => l.id);
                  const pendingL2Ids = group.items.filter((l) => l.status === 'PENDING_L2').map((l) => l.id);
                  const approvedIds = group.items.filter((l) => l.status === 'APPROVED').map((l) => l.id);
                  const activeIds = group.items.filter((l) => l.status === 'ACTIVE').map((l) => l.id);
                  const checkoutIds = group.items
                    .filter((l) => ['ACTIVE', 'RETURN_REQUESTED'].includes(l.status))
                    .map((l) => l.id);

                  const uniqueStatuses = Array.from(new Set(group.items.map((l) => l.status)));
                  const allSameStatus = uniqueStatuses.length === 1;
                  const totalUnits = group.items.reduce((sum, l) => sum + (l.quantity || 1), 0);

                  return (
                    <React.Fragment key={group.key}>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          background: isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 800 }}>
                          {isMulti ? (
                            <div>
                              <div>#{group.groupCode || primary.ticketNumber}</div>
                              <span
                                style={{
                                  display: 'inline-block',
                                  marginTop: '0.25rem',
                                  fontFamily: 'sans-serif',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '0.12rem 0.45rem',
                                  borderRadius: '999px',
                                  background: 'rgba(124, 58, 237, 0.16)',
                                  color: '#a78bfa',
                                }}
                              >
                                {group.items.length} Aset ({totalUnits} Unit)
                              </span>
                            </div>
                          ) : (
                            `#${primary.ticketNumber || primary.id?.slice(-8) || '-'}`
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 700 }}>{primary.user?.name || 'Anonim'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{primary.user?.email || '-'}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {isMulti ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {group.items.map((item) => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                                    • {item.asset?.name || 'Aset Tidak Ditemukan'}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                                    ({item.quantity || 1} unit)
                                  </span>
                                  {!allSameStatus && getStatusBadge(item.status)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              <div style={{ fontWeight: 700 }}>{primary.asset?.name || 'Aset Tidak Ditemukan'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Jumlah: {primary.quantity || 1} unit</div>
                            </>
                          )}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.8rem' }}>
                          <div>{formatDate(primary.startDate)}</div>
                          <div style={{ color: isOverdue ? 'var(--color-danger)' : 'var(--color-muted)', fontWeight: isOverdue ? 700 : 400 }}>
                            s.d. {formatDate(primary.endDate)}
                          </div>
                          {primary.checkInTime && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-info)', marginTop: '0.25rem' }}>
                              Ambil: {formatDate(primary.checkInTime, 'dd MMM yyyy, HH:mm')}
                            </div>
                          )}
                          {primary.checkOutTime && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-success)' }}>
                              Kembali: {formatDate(primary.checkOutTime, 'dd MMM yyyy, HH:mm')}
                            </div>
                          )}
                          {isOverdue && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                color: '#ef4444',
                                background: 'rgba(239, 68, 68, 0.14)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                marginTop: '0.2rem',
                              }}
                            >
                              <AlertTriangle size={11} /> TERLAMBAT
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {allSameStatus ? (
                            getStatusBadge(uniqueStatuses[0])
                          ) : (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.25rem 0.55rem',
                                borderRadius: '999px',
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                              }}
                            >
                              SEBAGIAN
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {/* Cancel Action for PENDING / APPROVED */}
                            {cancellableIds.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                style={{ color: 'var(--color-danger)', padding: '0.35rem 0.55rem' }}
                                isLoading={processingId === group.key}
                                onClick={() => handleCancelLoan(cancellableIds, group.key)}
                                title="Batalkan pengajuan peminjaman"
                              >
                                <XCircle size={14} /> Batalkan
                              </Button>
                            )}

                            {/* Approval L1 Action */}
                            {isApproverL1 && pendingL1Ids.length > 0 && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  style={{ background: 'var(--color-success)', color: '#fff', padding: '0.35rem 0.65rem' }}
                                  isLoading={processingId === group.key}
                                  onClick={() => handleApprovalAction(pendingL1Ids, 'APPROVE', group.key)}
                                >
                                  ✓ {isMulti ? `Setujui L1 (${pendingL1Ids.length})` : 'Setujui L1'}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', padding: '0.35rem 0.65rem' }}
                                  onClick={() => {
                                    setRejectLoanIds(pendingL1Ids);
                                    setRejectNotes('');
                                    setRejectModalOpen(true);
                                  }}
                                >
                                  ❌ Tolak
                                </Button>
                              </>
                            )}

                            {/* Approval L2 Action */}
                            {isAdminL2 && pendingL2Ids.length > 0 && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  style={{ background: 'var(--color-success)', color: '#fff', padding: '0.35rem 0.65rem' }}
                                  isLoading={processingId === group.key}
                                  onClick={() => handleApprovalAction(pendingL2Ids, 'APPROVE', group.key)}
                                >
                                  ✓ {isMulti ? `Verifikasi L2 (${pendingL2Ids.length})` : 'Verifikasi L2'}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', padding: '0.35rem 0.65rem' }}
                                  onClick={() => {
                                    setRejectLoanIds(pendingL2Ids);
                                    setRejectNotes('');
                                    setRejectModalOpen(true);
                                  }}
                                >
                                  ❌ Tolak
                                </Button>
                              </>
                            )}

                            {/* SOP Halaman Serah Terima Ambil (Single or Batch) */}
                            {isStaffOrAdmin && approvedIds.length > 0 && (
                              <Link
                                href={
                                  approvedIds.length > 1
                                    ? `/dashboard/handovers/batch?ids=${approvedIds.join(',')}&type=CHECK_IN`
                                    : `/dashboard/handovers/${approvedIds[0]}?type=CHECK_IN`
                                }
                                className="btn btn-primary btn-sm"
                                style={{ padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <CalendarCheck size={14} />{' '}
                                {approvedIds.length > 1 ? `Serah Terima Ambil (${approvedIds.length})` : 'Serah Terima Ambil'}
                              </Link>
                            )}

                            {/* Borrower Action: Request Return */}
                            {isBorrower && activeIds.length > 0 && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setSelectedReturnGroup({
                                    label: isMulti
                                      ? `${activeIds.length} aset dalam pengajuan #${group.groupCode || primary.ticketNumber}`
                                      : primary.asset?.name || 'aset ini',
                                    loanIds: activeIds,
                                  });
                                  setReturnNotes('');
                                }}
                              >
                                <RotateCcw size={14} /> Ajukan Pengembalian
                              </Button>
                            )}

                            {/* Staff Action: Handover Pengembalian (Single or Batch) */}
                            {isStaffOrAdmin && checkoutIds.length > 0 && (
                              <Link
                                href={
                                  checkoutIds.length > 1
                                    ? `/dashboard/handovers/batch?ids=${checkoutIds.join(',')}&type=CHECK_OUT`
                                    : `/dashboard/handovers/${checkoutIds[0]}?type=CHECK_OUT`
                                }
                                className="btn btn-primary btn-sm"
                                style={{ padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <CheckSquare size={14} />{' '}
                                {checkoutIds.length > 1 ? `Serah Terima Kembali (${checkoutIds.length})` : 'Serah Terima Kembali'}
                              </Link>
                            )}

                            {/* Preview Document In-App (BAST/Permit PDF) */}
                            {primary.permitPdfUrl && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setPreviewDocUrl(primary.permitPdfUrl);
                                  setPreviewDocIndex(0);
                                  setPreviewModalOpen(true);
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                              >
                                <FileText size={14} /> Dokumen
                              </Button>
                            )}

                            {isMulti ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setExpandedGroups((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
                                }
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                Rincian ({group.items.length})
                              </Button>
                            ) : (
                              <Link href={`/dashboard/loans/${primary.id}`} className="btn btn-ghost btn-sm">
                                <Eye size={14} /> Detail
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded sub-rows for multi-item group */}
                      {isMulti && isExpanded && group.items.map((item) => (
                        <tr
                          key={item.id}
                          style={{
                            background: 'var(--color-surface2)',
                            borderBottom: '1px solid var(--color-border)',
                            fontSize: '0.82rem',
                          }}
                        >
                          <td style={{ padding: '0.65rem 1.25rem 0.65rem 2.25rem', fontFamily: 'monospace', color: 'var(--color-muted)' }}>
                            ↳ #{item.ticketNumber}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', color: 'var(--color-muted)' }}>
                            {item.asset?.code || '-'}
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <span style={{ fontWeight: 600 }}>{item.asset?.name || '-'}</span>
                            <span style={{ color: 'var(--color-muted)', marginLeft: '0.4rem' }}>({item.quantity || 1} unit)</span>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', color: 'var(--color-muted)' }}>—</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{getStatusBadge(item.status)}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              {isStaffOrAdmin && item.status === 'APPROVED' && (
                                <Link href={`/dashboard/handovers/${item.id}?type=CHECK_IN`} className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <CalendarCheck size={13} /> Serah Terima Ambil
                                </Link>
                              )}
                              {isStaffOrAdmin && ['ACTIVE', 'RETURN_REQUESTED'].includes(item.status) && (
                                <Link href={`/dashboard/handovers/${item.id}?type=CHECK_OUT`} className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <CheckSquare size={13} /> Serah Terima Kembali
                                </Link>
                              )}
                              <Link href={`/dashboard/loans/${item.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
                                <Eye size={13} /> Detail
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── MODAL: PREVIEW DOKUMEN IN-APP (SOP LANGKAH 2) ── */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Verifikasi Pratinjau Dokumen"
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
                  <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                    Dokumen tidak tersedia.
                  </div>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                {activeUrl ? (
                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                  >
                    Buka di Tab Baru ↗
                  </a>
                ) : (
                  <span />
                )}
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
        title="Konfirmasi Penolakan Peminjaman"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.85rem' }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-danger)', fontWeight: 700 }}>
            <AlertCircle size={18} /> Perhatian: Alasan penolakan wajib dicantumkan!
          </p>
          
          <div>
            <label className="input-label">Alasan Penolakan *</label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Berikan alasan mengapa pengajuan peminjaman ditolak agar dikirimkan ke peminjam..."
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
              onClick={() => handleApprovalAction(rejectLoanIds, 'REJECT')}
              disabled={!rejectNotes.trim() || !!processingId}
              style={{ background: 'var(--color-danger)', color: '#fff', border: 'none' }}
            >
              Ya, Tolak Pengajuan{rejectLoanIds.length > 1 ? ` (${rejectLoanIds.length} Item)` : ''}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: BORROWER REQUEST RETURN ── */}
      <Modal
        isOpen={!!selectedReturnGroup}
        onClose={() => setSelectedReturnGroup(null)}
        title="Ajukan Pengembalian Barang"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.85rem' }}>
          <p>
            Anda akan mengajukan pengembalian untuk <strong>{selectedReturnGroup?.label}</strong>.
            Silakan tambahkan catatan kondisi saat ini.
          </p>
          <div>
            <label className="input-label">Catatan Pengembalian</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Contoh: Barang dikembalikan lengkap dan dalam kondisi baik..."
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => setSelectedReturnGroup(null)}>
              Batal
            </Button>
            <Button onClick={handleRequestReturnSubmit} disabled={submittingReturn}>
              {submittingReturn ? 'Mengirim...' : 'Kirim Pengajuan'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

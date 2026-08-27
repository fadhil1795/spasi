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
  CheckCircle2, XCircle, Clock, CalendarCheck, Box, RefreshCw, AlertCircle, FileText
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
  const [rejectLoanId, setRejectLoanId] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  // Borrower Request Return Modal State
  const [selectedReturnLoan, setSelectedReturnLoan] = useState<any>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Document Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState('');

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

  // Approval Handlers
  const handleApprovalAction = async (loanId: string, action: 'APPROVE' | 'REJECT') => {
    const notesToSend = action === 'REJECT' ? rejectNotes : '';
    
    if (action === 'REJECT' && !notesToSend.trim()) {
      showToast('Alasan penolakan wajib diisi', 'error');
      return;
    }

    try {
      setProcessingId(loanId);
      const res = await fetch(`/api/loans/${loanId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notesToSend }),
      });

      if (res.ok) {
        showToast(
          action === 'APPROVE' ? 'Pengajuan peminjaman berhasil disetujui!' : 'Pengajuan peminjaman ditolak.',
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
    if (!selectedReturnLoan) return;

    try {
      setSubmittingReturn(true);
      const res = await fetch(`/api/loans/${selectedReturnLoan.id}/request-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnNotes }),
      });

      if (res.ok) {
        showToast('Permintaan pengembalian berhasil dikirim!', 'success');
        setSelectedReturnLoan(null);
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

  // Filter & Search Logic
  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      loan.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.asset?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.user?.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'PENDING') return matchesSearch && ['PENDING_L1', 'PENDING_L2'].includes(loan.status);
    return matchesSearch && loan.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    return <Badge status={status} />;
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
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isBorrower && (
            <Link href="/dashboard/loans/new" className="btn btn-primary" style={{ display: 'flex', gap: '0.4rem', padding: '0.65rem 1.25rem' }}>
              <Plus size={16} /> Ajukan Peminjaman
            </Link>
          )}
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
            { value: 'RETURNED', label: 'Selesai' },
            { value: 'REJECTED', label: 'Ditolak' },
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
                {filteredLoans.map((loan) => (
                  <tr key={loan.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 800 }}>
                      #{loan.ticketNumber}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700 }}>{loan.user?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{loan.user?.email}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700 }}>{loan.asset?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Jumlah: {loan.quantity} unit</div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.8rem' }}>
                      <div>{formatDate(loan.startDate)}</div>
                      <div style={{ color: 'var(--color-muted)' }}>s.d. {formatDate(loan.endDate)}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>{getStatusBadge(loan.status)}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        
                        {/* Approval L1 Action */}
                        {isApproverL1 && loan.status === 'PENDING_L1' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              style={{ background: 'var(--color-success)', color: '#fff', padding: '0.35rem 0.65rem' }}
                              isLoading={processingId === loan.id}
                              onClick={() => handleApprovalAction(loan.id, 'APPROVE')}
                            >
                              ✓ Setujui L1
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', padding: '0.35rem 0.65rem' }}
                              onClick={() => {
                                setRejectLoanId(loan.id);
                                setRejectNotes('');
                                setRejectModalOpen(true);
                              }}
                            >
                              ❌ Tolak
                            </Button>
                          </>
                        )}

                        {/* Approval L2 Action */}
                        {isAdminL2 && loan.status === 'PENDING_L2' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              style={{ background: 'var(--color-success)', color: '#fff', padding: '0.35rem 0.65rem' }}
                              isLoading={processingId === loan.id}
                              onClick={() => handleApprovalAction(loan.id, 'APPROVE')}
                            >
                              ✓ Verifikasi L2
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', padding: '0.35rem 0.65rem' }}
                              onClick={() => {
                                setRejectLoanId(loan.id);
                                setRejectNotes('');
                                setRejectModalOpen(true);
                              }}
                            >
                              ❌ Tolak
                            </Button>
                          </>
                        )}

                        {/* SOP Halaman Serah Terima (Checklist Handover) */}
                        {isStaffOrAdmin && loan.status === 'APPROVED' && (
                          <Link href={`/dashboard/handovers/${loan.id}?type=CHECK_IN`} className="btn btn-primary btn-sm" style={{ padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CalendarCheck size={14} /> Serah Terima Ambil
                          </Link>
                        )}

                        {/* Borrower Action: Request Return */}
                        {isBorrower && loan.status === 'ACTIVE' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedReturnLoan(loan);
                              setReturnNotes('');
                            }}
                          >
                            <RotateCcw size={14} /> Ajukan Pengembalian
                          </Button>
                        )}

                        {/* Staff Action: Handover Pengembalian */}
                        {isStaffOrAdmin && ['ACTIVE', 'RETURN_REQUESTED'].includes(loan.status) && (
                          <Link href={`/dashboard/handovers/${loan.id}?type=CHECK_OUT`} className="btn btn-primary btn-sm" style={{ padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckSquare size={14} /> Serah Terima Kembali
                          </Link>
                        )}

                        {/* Preview Document In-App (BAST/Permit PDF) */}
                        {loan.permitPdfUrl && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setPreviewDocUrl(loan.permitPdfUrl);
                              setPreviewModalOpen(true);
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                          >
                            <FileText size={14} /> Dokumen
                          </Button>
                        )}

                        <Link href={`/dashboard/loans/${loan.id}`} className="btn btn-ghost btn-sm">
                          <Eye size={14} /> Detail
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── MODAL: PREVIEW DOKUMEN IN-APP (SOP LANGKAH 2) ── */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Verifikasi Pratinjau Dokumen Dokumen"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
            Periksa keabsahan dan keaslian dokumen pendukung di bawah secara langsung.
          </p>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: '450px', background: 'var(--color-surface2)' }}>
            <iframe
              src={previewDocUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Pratinjau Dokumen BAST/Permit"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setPreviewModalOpen(false)}>
              Tutup Pratinjau
            </Button>
          </div>
        </div>
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
              onClick={() => handleApprovalAction(rejectLoanId, 'REJECT')}
              disabled={!rejectNotes.trim() || processingId === rejectLoanId}
              style={{ background: 'var(--color-danger)', color: '#fff', border: 'none' }}
            >
              Ya, Tolak Pengajuan
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: BORROWER REQUEST RETURN ── */}
      <Modal
        isOpen={!!selectedReturnLoan}
        onClose={() => setSelectedReturnLoan(null)}
        title="Ajukan Pengembalian Barang"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.85rem' }}>
          <p>
            Anda akan mengajukan pengembalian untuk aset <strong>{selectedReturnLoan?.asset?.name}</strong>.
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
            <Button variant="secondary" onClick={() => setSelectedReturnLoan(null)}>
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

'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  AlertCircle, CheckCircle, RefreshCw, Upload, Camera, FileText,
  CreditCard, ShieldAlert, CheckSquare, Eye, ShieldCheck, XCircle, Info, Plus, Clock, Search
} from 'lucide-react';

export default function ClaimsPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();

  const userRole = (session?.user as any)?.role || 'BORROWER';
  const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole);

  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Navigation Tab status (Siklus Hidup Klaim)
  const [activeStatusTab, setActiveStatusTab] = useState<'NEW' | 'INVESTIGATING' | 'AWAITING_PAYMENT' | 'PENDING_APPROVAL' | 'REJECTED' | 'RESOLVED'>('NEW');

  // Modal & Form State for User Submit Proof
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [compensationMethod, setCompensationMethod] = useState<'CASH_TRANSFER' | 'REPLACEMENT_UNIT'>('CASH_TRANSFER');
  const [proofUrl, setProofUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Modal & Form State for Admin Approval Review
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Assessment & Billing Form State (for Admin in NEW / INVESTIGATING stage)
  const [claimAmount, setClaimAmount] = useState('');
  const [sourceFunding, setSourceFunding] = useState<'NEW_BILL' | 'DEDUCT_DEPOSIT'>('NEW_BILL');
  const [deactivateAsset, setDeactivateAsset] = useState(true); // default true for damaged assets

  // Insurance States
  const [diajukanAsuransi, setDiajukanAsuransi] = useState(false);
  const [statusAsuransi, setStatusAsuransi] = useState('PENDING_CLAIM');

  // Modal & Form State for Manual Claim Creation
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userLoans, setUserLoans] = useState<any[]>([]);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [createType, setCreateType] = useState<'LOST' | 'DAMAGED'>('LOST');
  const [createAmount, setCreateAmount] = useState('');
  const [incidentNotes, setIncidentNotes] = useState('');
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      // Fetch based on active status filter
      const res = await fetch(`/api/claims?status=${activeStatusTab}`);
      if (res.ok) setClaims(await res.json());
    } catch {
      showToast('Gagal memuat daftar klaim ganti rugi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch('/api/settings/payment');
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(data.bankAccounts?.filter((b: any) => b.isActive) || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/settings/users');
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUserTransactions = async (userId: string) => {
    if (!userId) {
      setUserLoans([]);
      setUserBookings([]);
      return;
    }

    try {
      setLoadingTransactions(true);
      setSelectedLoanId('');
      setSelectedBookingId('');
      
      const [loansRes, bookingsRes] = await Promise.all([
        fetch(`/api/loans?userId=${userId}`),
        fetch(`/api/room-bookings?userId=${userId}`)
      ]);

      if (loansRes.ok) {
        const loansData = await loansRes.json();
        setUserLoans(loansData.filter((l: any) => ['APPROVED', 'ACTIVE', 'RETURNED'].includes(l.status)) || []);
      }
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setUserBookings(bookingsData.filter((b: any) => ['CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(b.bookingStatus)) || []);
      }
    } catch {
      showToast('Gagal memuat data transaksi peminjam', 'error');
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [activeStatusTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAdmin) fetchBankAccounts();
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedUserId(val);
    fetchUserTransactions(val);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const json = await res.json();
        setProofUrl(json.url);
        showToast('Bukti ganti rugi berhasil diunggah', 'success');
      } else {
        showToast('Gagal mengunggah gambar', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan unggah file', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofUrl) {
      showToast('Harap unggah gambar bukti transfer/foto barang pengganti', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/claims/${selectedClaim.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compensationMethod, proofUrl }),
      });

      if (res.ok) {
        showToast('Bukti ganti rugi berhasil diajukan! Menunggu validasi admin.', 'success');
        setUploadModalOpen(false);
        setProofUrl('');
        fetchClaims();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal mengirim bukti', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      showToast('Harap pilih peminjam terlebih dahulu', 'error');
      return;
    }
    if (!createAmount || parseFloat(createAmount) <= 0) {
      showToast('Nominal ganti rugi tidak valid', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          loanId: selectedLoanId || undefined,
          bookingId: selectedBookingId || undefined,
          type: createType,
          amount: parseFloat(createAmount),
          adminNotes: incidentNotes,
        }),
      });

      if (res.ok) {
        showToast('Tiket klaim ganti rugi berhasil diterbitkan!', 'success');
        setCreateModalOpen(false);
        setSelectedUserId('');
        setSelectedLoanId('');
        setSelectedBookingId('');
        setCreateAmount('');
        setIncidentNotes('');
        fetchClaims();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menerbitkan tiket klaim', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin: Tandai Investigasi
  const handleMarkInvestigating = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/claims/${selectedClaim.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INVESTIGATING', adminNotes }),
      });

      if (res.ok) {
        showToast('Klaim berhasil ditandai sedang dalam investigasi', 'success');
        setReviewModalOpen(false);
        fetchClaims();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memproses', 'error');
      }
    } catch {
      showToast('Koneksi bermasalah', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin: Tetapkan Nilai & Kirim ke Peminjam
  const handleBillClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimAmount || parseFloat(claimAmount) <= 0) {
      showToast('Nominal tagihan ganti rugi wajib diisi', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/claims/${selectedClaim.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'AWAITING_PAYMENT',
          amount: parseFloat(claimAmount),
          sourceFunding,
          adminNotes,
          diajukanAsuransi,
          statusAsuransi,
          deactivateAsset,
        }),
      });

      if (res.ok) {
        showToast('Nilai ganti rugi berhasil ditetapkan & dikirim ke peminjam!', 'success');
        setReviewModalOpen(false);
        fetchClaims();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menetapkan tagihan', 'error');
      }
    } catch {
      showToast('Koneksi bermasalah', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin: Validasi Pembayaran Akhir (Setujui / Tolak)
  const handleResolveClaim = async (action: 'RESOLVED' | 'REJECTED') => {
    if (action === 'REJECTED' && !adminNotes.trim()) {
      showToast('Catatan admin (alasan penolakan) wajib diisi', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/claims/${selectedClaim.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, adminNotes }),
      });

      if (res.ok) {
        showToast(
          action === 'RESOLVED' 
            ? 'Klaim ganti rugi berhasil disetujui, lunas, & akun user diaktifkan!' 
            : 'Bukti pembayaran ditolak & dikembalikan ke user.',
          'success'
        );
        setReviewModalOpen(false);
        fetchClaims();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memproses', 'error');
      }
    } catch {
      showToast('Koneksi bermasalah', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <span className="badge badge-available">SELESAI (LUNAS)</span>;
      case 'AWAITING_PAYMENT':
        return <span className="badge badge-borrowed" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>MENUNGGU BAYAR</span>;
      case 'INVESTIGATING':
        return <span className="badge badge-pending">DALAM INVESTIGASI</span>;
      case 'PENDING_APPROVAL':
        return <span className="badge badge-pending" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)' }}>MENUNGGU VERIFIKASI BUKTI</span>;
      case 'REJECTED':
        return <span className="badge badge-borrowed" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>BUKTI DITOLAK</span>;
      default:
        return <span className="badge badge-pending">BARU</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Siklus Hidup Klaim &amp; Ganti Rugi</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            {isAdmin 
              ? 'Kelola alur klaim aset rusak/hilang berdasarkan siklus investigasi, penetapan denda, dan verifikasi bayar.' 
              : 'Daftar tanggung jawab ganti rugi atas aset yang hilang atau rusak berat selama masa pinjam.'}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isAdmin && (
            <Button onClick={() => setCreateModalOpen(true)} style={{ display: 'flex', gap: '0.4rem', padding: '0.65rem 1.25rem' }}>
              <Plus size={16} /> Buat Tiket Klaim
            </Button>
          )}
          <Button variant="secondary" onClick={fetchClaims} disabled={loading} style={{ display: 'flex', gap: '0.4rem' }}>
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} /> Segarkan
          </Button>
        </div>
      </div>

      {/* Warning Alert if User is Suspended */}
      {!isAdmin && claims.some(c => c.status !== 'RESOLVED') && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start'
        }}>
          <ShieldAlert size={24} style={{ color: '#ef4444', flexShrink: 0, marginTop: '0.15rem' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ef4444', marginBottom: '0.2rem' }}>Akun Anda Ditangguhkan Sementara! 🚨</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Mohon maaf, Anda tidak dapat melakukan booking ruangan atau peminjaman sarpras baru selama masih memiliki tagihan ganti rugi aset yang belum lunas (status pending).
              Segera unggah bukti ganti rugi unit baru atau bukti transfer uang tunai di bawah untuk diaktifkan kembali oleh admin.
            </p>
          </div>
        </div>
      )}

      {/* Tab Filter Siklus Hidup Klaim */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {[
          { key: 'NEW', label: '🆕 Klaim Baru' },
          { key: 'INVESTIGATING', label: '🔍 Investigasi' },
          { key: 'AWAITING_PAYMENT', label: '💰 Menunggu Bayar' },
          { key: 'PENDING_APPROVAL', label: '⏳ Menunggu Verifikasi' },
          { key: 'REJECTED', label: '❌ Ditolak' },
          { key: 'RESOLVED', label: '✅ Selesai (Lunas)' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveStatusTab(tab.key as any)}
            style={{
              padding: '0.65rem 1.25rem', border: 'none', background: 'transparent',
              fontSize: '0.9rem', fontWeight: activeStatusTab === tab.key ? 800 : 500,
              color: activeStatusTab === tab.key ? 'var(--color-primary)' : 'var(--color-muted)',
              borderBottom: activeStatusTab === tab.key ? '3px solid var(--color-primary)' : '3px solid transparent',
              cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main List */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem' }}><Skeleton height="150px" /></div>
        ) : claims.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
            <CheckCircle size={48} style={{ color: 'var(--color-success)', marginBottom: '1rem', opacity: 0.8 }} />
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-text)' }}>Tidak Ada Tiket Klaim</div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Belum ada tiket klaim di fase status ini.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  <th style={{ padding: '1rem 1.25rem' }}>Nomor Tiket / Peminjam</th>
                  <th style={{ padding: '1rem' }}>Aset / Sumber Transaksi</th>
                  <th style={{ padding: '1rem' }}>Kasus</th>
                  <th style={{ padding: '1rem' }}>Nominal Denda</th>
                  <th style={{ padding: '1rem' }}>Metode &amp; Bukti</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim, idx) => {
                  let transactionText = '-';
                  let assetName = 'Manual Claim';
                  let assetCode = '';

                  if (claim.loan) {
                    transactionText = `Pinjam #${claim.loan.ticketNumber}`;
                    assetName = claim.loan.asset?.name || '';
                    assetCode = claim.loan.asset?.code || '';
                  } else if (claim.booking) {
                    transactionText = `Sewa #${claim.booking.bookingNumber}`;
                    assetName = claim.booking.location?.name || 'Fasilitas Ruang';
                    const dmg = claim.booking.inspections?.find((i: any) => i.type === 'CHECK_OUT' && (i.isMissing || i.isDamaged));
                    assetCode = dmg ? dmg.assetName : 'Fasilitas';
                  }

                  return (
                    <tr key={claim.id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'transparent' : 'var(--color-surface2)' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800 }}>{claim.claimNumber}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                          👤 {claim.user?.name} | {transactionText}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700 }}>{assetName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                          {assetCode}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800,
                          background: claim.type === 'LOST' ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)',
                          color: claim.type === 'LOST' ? '#ef4444' : '#f97316'
                        }}>
                          {claim.type === 'LOST' ? '🛑 HILANG' : '⚠️ RUSAK'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 800 }}>{formatCurrency(claim.amount)}</td>
                      <td style={{ padding: '1rem', fontSize: '0.8rem' }}>
                        {claim.compensationMethod ? (
                          <div>
                            <div>{claim.compensationMethod === 'CASH_TRANSFER' ? '🏦 Transfer Kas' : '📦 Ganti Unit Baru'}</div>
                            {claim.proofUrl && (
                              <a href={claim.proofUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem', fontWeight: 600 }}>
                                <Eye size={12} /> Lihat Bukti
                              </a>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>{getStatusBadge(claim.status)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {isAdmin ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedClaim(claim);
                              setAdminNotes(claim.adminNotes || '');
                              setClaimAmount(String(claim.amount));
                              setSourceFunding(claim.sourceFunding as any || 'NEW_BILL');
                              setDiajukanAsuransi(claim.diajukanAsuransi || false);
                              setStatusAsuransi(claim.statusAsuransi || 'PENDING_CLAIM');
                              setReviewModalOpen(true);
                            }}
                            style={{ padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <CheckSquare size={14} /> Kelola Klaim
                          </Button>
                        ) : (
                          claim.status !== 'RESOLVED' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedClaim(claim);
                                setCompensationMethod(claim.compensationMethod || 'CASH_TRANSFER');
                                setProofUrl(claim.proofUrl || '');
                                setUploadModalOpen(true);
                              }}
                              style={{ padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <Upload size={14} /> {claim.status === 'REJECTED' ? 'Ajukan Ulang' : 'Kirim Bukti'}
                            </Button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── MODAL: PENGELOLAAN / RECOGNITION KLAIM (ADMIN) ── */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={`Pengelolaan Kasus Klaim — ${selectedClaim?.claimNumber}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.85rem' }}>
          
          {/* Detail Info Ringkas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', background: 'var(--color-surface2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ color: 'var(--color-muted)', fontSize: '0.72rem' }}>Peminjam</div>
              <strong>{selectedClaim?.user?.name}</strong>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{selectedClaim?.user?.email}</div>
            </div>
            <div>
              <div style={{ color: 'var(--color-muted)', fontSize: '0.72rem' }}>Item Aset</div>
              <strong>{selectedClaim?.loan ? selectedClaim.loan.asset?.name : selectedClaim?.booking ? selectedClaim.booking.location?.name : 'Manual Claim'}</strong>
            </div>
            <div>
              <div style={{ color: 'var(--color-muted)', fontSize: '0.72rem' }}>Kasus</div>
              <strong style={{ color: selectedClaim?.type === 'LOST' ? '#ef4444' : '#f97316' }}>
                {selectedClaim?.type === 'LOST' ? '🛑 HILANG / KEHILANGAN' : '⚠️ RUSAK / KERUSAKAN'}
              </strong>
            </div>
            <div>
              <div style={{ color: 'var(--color-muted)', fontSize: '0.72rem' }}>Status Saat Ini</div>
              <strong>{selectedClaim?.status}</strong>
            </div>
          </div>

          {/* Form Assessment Estimasi Denda (Fase NEW atau INVESTIGATING) */}
          {['NEW', 'INVESTIGATING'].includes(selectedClaim?.status) && (
            <form onSubmit={handleBillClaim} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Info size={16} /> 1. Estimasi Nilai Denda &amp; Sumber Pendanaan
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="input-label">Nominal Ganti Rugi (Rp) *</label>
                  <Input
                    type="number"
                    value={claimAmount}
                    onChange={(e: any) => setClaimAmount(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="input-label">Sumber Pendanaan *</label>
                  <select
                    className="input-field"
                    value={sourceFunding}
                    onChange={(e: any) => setSourceFunding(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="NEW_BILL">Tagihan Baru (Kirim Invoice)</option>
                    <option value="DEDUCT_DEPOSIT">Potong dari Deposit Jaminan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Catatan Investigasi / Detail Kerusakan *</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Tambahkan catatan fisik kondisi barang atau status peninjauan di sini..."
                  required
                />
              </div>

              {selectedClaim?.type === 'DAMAGED' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245,158,11,0.06)', padding: '0.75rem', borderRadius: '4px' }}>
                  <input
                    type="checkbox"
                    id="deactivate-asset"
                    checked={deactivateAsset}
                    onChange={(e) => setDeactivateAsset(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="deactivate-asset" style={{ fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                    Nonaktifkan Aset Sementara dari Katalog (Kirim ke Maintenance)
                  </label>
                </div>
              )}

              {/* Panel Asuransi Aset */}
              <div style={{
                background: 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.2)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={diajukanAsuransi}
                    onChange={(e) => {
                      setDiajukanAsuransi(e.target.checked);
                      if (e.target.checked) setStatusAsuransi('PENDING_CLAIM');
                    }}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  🛡️ Ajukan Klaim Ganti Rugi ke Pihak Asuransi Aset
                </label>

                {diajukanAsuransi && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.25rem', borderLeft: '2px solid var(--color-primary)' }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', display: 'block', marginBottom: '0.2rem' }}>Status Klaim Asuransi</span>
                      <select
                        className="input-field"
                        value={statusAsuransi}
                        onChange={(e) => setStatusAsuransi(e.target.value)}
                        style={{ width: '100%' }}
                      >
                        <option value="PENDING_CLAIM">⏳ PENDING_CLAIM (Klaim Sedang Diproses)</option>
                        <option value="APPROVED_BY_INSURANCE">✅ APPROVED_BY_INSURANCE (Diterima - Biaya ditanggung Asuransi)</option>
                        <option value="REJECTED_BY_INSURANCE">❌ REJECTED_BY_INSURANCE (Ditolak oleh Asuransi)</option>
                      </select>
                    </div>
                    <span style={{ fontSize: '0.73rem', color: 'var(--color-muted)' }}>
                      💡 Jika disetujui, tagihan ganti rugi peminjam akan diringankan/dihapuskan otomatis oleh sistem.
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                {selectedClaim?.status === 'NEW' && (
                  <Button type="button" variant="secondary" onClick={handleMarkInvestigating} disabled={submitting}>
                    Tandai Investigasi
                  </Button>
                )}
                <Button type="submit" disabled={submitting}>
                  <ShieldCheck size={16} /> Tetapkan Nilai &amp; Kirim Tagihan
                </Button>
              </div>
            </form>
          )}

          {/* Review & Resolusi Pembayaran (Fase PENDING_APPROVAL) */}
          {selectedClaim?.status === 'PENDING_APPROVAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle size={16} /> 2. Verifikasi Bukti Penyelesaian Ganti Rugi
              </div>

              {selectedClaim?.proofUrl && (
                <div>
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.25rem', width: 'fit-content' }}>
                    <a href={selectedClaim.proofUrl} target="_blank" rel="noopener noreferrer">
                      <img src={selectedClaim.proofUrl} alt="Bukti bayar" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: 'var(--radius-sm)' }} />
                    </a>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', display: 'block', marginTop: '0.25rem' }}>
                    Metode: <strong>{selectedClaim.compensationMethod === 'CASH_TRANSFER' ? 'Transfer Tunai' : 'Ganti Unit Barang Baru'}</strong>
                  </span>
                </div>
              )}

              <div>
                <label className="input-label">Catatan Admin (Wajib diisi jika menolak) *</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Isi catatan kelayakan / alasan penolakan jika ditolak..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => handleResolveClaim('REJECTED')} disabled={submitting} style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
                  <XCircle size={16} /> Tolak Bukti Bayar
                </Button>
                <Button onClick={() => handleResolveClaim('RESOLVED')} disabled={submitting} style={{ background: '#10b981', color: '#fff', border: 'none' }}>
                  <ShieldCheck size={16} /> Setujui (Lunas &amp; Aktifkan Akun)
                </Button>
              </div>
            </div>
          )}

          {/* Menutup Modal */}
          {['AWAITING_PAYMENT', 'RESOLVED', 'REJECTED'].includes(selectedClaim?.status) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <Button variant="secondary" onClick={() => setReviewModalOpen(false)}>
                Tutup
              </Button>
            </div>
          )}

        </div>
      </Modal>

      {/* ── MODAL: BUAT TIKET KLAIM MANUAL (ADMIN) ── */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Penerbitan Tiket Klaim Ganti Rugi Baru"
      >
        <form onSubmit={handleCreateClaim} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.85rem' }}>
          <div>
            <label className="input-label">Pilih Peminjam / Renter *</label>
            <select
              className="input-field"
              value={selectedUserId}
              onChange={handleUserChange}
              required
              style={{ width: '100%' }}
            >
              <option value="">-- Pilih Anggota / User --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email || u.identityNo})
                </option>
              ))}
            </select>
          </div>

          {selectedUserId && (
            <div>
              <label className="input-label">Hubungkan ke Transaksi (Opsional)</label>
              {loadingTransactions ? (
                <div style={{ color: 'var(--color-muted)', fontSize: '0.78rem' }}>Memuat data transaksi...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--color-muted)', display: 'block', marginBottom: '0.25rem' }}>Peminjaman Aset</label>
                    <select
                      className="input-field"
                      value={selectedLoanId}
                      onChange={(e) => {
                        setSelectedLoanId(e.target.value);
                        setSelectedBookingId('');
                      }}
                      style={{ width: '100%' }}
                    >
                      <option value="">-- Pilih Tiket Pinjam --</option>
                      {userLoans.map(l => (
                        <option key={l.id} value={l.id}>
                          #{l.ticketNumber} - {l.asset?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--color-muted)', display: 'block', marginBottom: '0.25rem' }}>Sewa Ruangan</label>
                    <select
                      className="input-field"
                      value={selectedBookingId}
                      onChange={(e) => {
                        setSelectedBookingId(e.target.value);
                        setSelectedLoanId('');
                      }}
                      style={{ width: '100%' }}
                    >
                      <option value="">-- Pilih Booking Ruang --</option>
                      {userBookings.map(b => (
                        <option key={b.id} value={b.id}>
                          #{b.bookingNumber} - {b.location?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="input-label">Tipe Kasus *</label>
              <select
                className="input-field"
                value={createType}
                onChange={(e: any) => setCreateType(e.target.value)}
                required
                style={{ width: '100%' }}
              >
                <option value="LOST">HILANG (LOST)</option>
                <option value="DAMAGED">RUSAK BERAT (DAMAGED)</option>
              </select>
            </div>
            <div>
              <label className="input-label">Nominal Denda (Rp) *</label>
              <Input
                type="number"
                placeholder="1500000"
                value={createAmount}
                onChange={(e: any) => setCreateAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="input-label">Catatan Kejadian &amp; Detail Kerusakan *</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Jelaskan alasan pengenaan denda klaim ganti rugi secara detail..."
              value={incidentNotes}
              onChange={(e) => setIncidentNotes(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting || !selectedUserId}>
              {submitting ? 'Menerbitkan...' : 'Terbitkan Tiket'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: UPLOAD BUKTI (USER) ── */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Pengajuan Ganti Rugi Aset"
      >
        <form onSubmit={handleSubmitProof} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.85rem' }}>
          <div>
            <label className="input-label">Aset yang Hilang/Rusak</label>
            <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>
              {selectedClaim?.loan?.asset?.name || selectedClaim?.booking?.location?.name || 'Fasilitas Terkait'}
            </div>
          </div>

          <div>
            <label className="input-label">Nominal Ganti Rugi yang Dibebankan</label>
            <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '1.05rem', color: '#ef4444' }}>
              {formatCurrency(selectedClaim?.amount || 0)}
            </div>
          </div>

          <div>
            <label className="input-label">Metode Penyelesaian Ganti Rugi *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div 
                onClick={() => setCompensationMethod('CASH_TRANSFER')}
                style={{
                  padding: '1rem', border: `2px solid ${compensationMethod === 'CASH_TRANSFER' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: compensationMethod === 'CASH_TRANSFER' ? 'rgba(99,102,241,0.03)' : 'transparent',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'center'
                }}
              >
                <CreditCard size={20} style={{ color: compensationMethod === 'CASH_TRANSFER' ? 'var(--color-primary)' : 'var(--color-muted)', marginBottom: '0.4rem' }} />
                <div style={{ fontWeight: 700 }}>Transfer Kas (Tunai)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>Membayar nominal denda ganti rugi</div>
              </div>

              <div 
                onClick={() => setCompensationMethod('REPLACEMENT_UNIT')}
                style={{
                  padding: '1rem', border: `2px solid ${compensationMethod === 'REPLACEMENT_UNIT' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: compensationMethod === 'REPLACEMENT_UNIT' ? 'rgba(99,102,241,0.03)' : 'transparent',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'center'
                }}
              >
                <Camera size={20} style={{ color: compensationMethod === 'REPLACEMENT_UNIT' ? 'var(--color-primary)' : 'var(--color-muted)', marginBottom: '0.4rem' }} />
                <div style={{ fontWeight: 700 }}>Ganti Unit Baru</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>Membeli &amp; mengganti dengan alat baru</div>
              </div>
            </div>
          </div>

          {/* Bank Account Info (Visible only for Cash Transfer) */}
          {compensationMethod === 'CASH_TRANSFER' && (
            <div style={{ padding: '1rem', background: 'rgba(99,102,241,0.06)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-primary)' }}>
              <div style={{ fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                <Info size={14} /> Instruksi Pembayaran Transfer
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                Silakan lakukan transfer ganti rugi ke salah satu rekening kas instansi resmi berikut:
              </p>
              {bankAccounts.length === 0 ? (
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Hubungi admin untuk detail rekening.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {bankAccounts.map((b) => (
                    <div key={b.id} style={{ fontSize: '0.78rem' }}>
                      🏦 <strong>{b.bankName}</strong>: {b.accountNo} (a.n. {b.accountName})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload Proof */}
          <div>
            <label className="input-label">
              {compensationMethod === 'CASH_TRANSFER' ? 'Unggah Bukti Struk Transfer *' : 'Unggah Foto Bukti Unit Pengganti *'}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="file"
                  accept="image/*"
                  id="claim-proof-file"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploading}
                  onClick={() => document.getElementById('claim-proof-file')?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.82rem' }}
                >
                  <Upload size={14} /> {uploading ? 'Mengunggah...' : 'Pilih Foto / Gambar'}
                </Button>
                {proofUrl && <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.78rem' }}>✓ Gambar terpilih</span>}
              </div>
              
              {proofUrl && (
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.25rem', width: 'fit-content' }}>
                  <img src={proofUrl} alt="Bukti" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: 'var(--radius-sm)' }} />
                </div>
              )}
            </div>
          </div>

          {selectedClaim?.adminNotes && (
            <div style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)' }}>
              <strong style={{ color: '#ef4444', display: 'block', fontSize: '0.78rem', marginBottom: '0.15rem' }}>Catatan Penolakan Admin Sebelumnya:</strong>
              <p style={{ margin: 0, color: 'var(--color-muted)' }}>{selectedClaim.adminNotes}</p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <Button type="button" variant="secondary" onClick={() => setUploadModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting || !proofUrl}>
              {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

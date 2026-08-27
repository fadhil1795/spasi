'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { TransactionTimeline, buildLoanTimeline } from '@/components/ui/TransactionTimeline';

export default function LoanDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Approval Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentUserRole = (session?.user as any)?.role || 'BORROWER';

  useEffect(() => {
    if (id) fetchLoanDetail();
  }, [id]);

  const fetchLoanDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/loans/${id}`);
      if (res.ok) {
        setLoan(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/loans/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, notes }),
      });

      if (res.ok) {
        showToast(
          actionType === 'APPROVE'
            ? 'Pengajuan berhasil disetujui!'
            : 'Pengajuan telah ditolak.',
          actionType === 'APPROVE' ? 'success' : 'warning'
        );
        setModalOpen(false);
        fetchLoanDetail();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memproses approval', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p style={{ padding: '2rem' }}>Memuat detail peminjaman...</p>;
  }

  if (!loan) {
    return <p style={{ padding: '2rem' }}>Data peminjaman tidak ditemukan.</p>;
  }

  const canApproveL1 = currentUserRole === 'APPROVER' || currentUserRole === 'SUPER_ADMIN';
  const canApproveL2 = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN';

  const showApprovalButton =
    (loan.status === 'PENDING_L1' && canApproveL1) ||
    (loan.status === 'PENDING_L2' && canApproveL2);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Link
        href="/dashboard/loans"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: 'var(--color-muted)',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={16} /> Kembali ke Daftar Peminjaman
      </Link>

      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--color-primary-light)', fontWeight: 700 }}>
            {loan.ticketNumber}
          </span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.2 }}>
            Peminjaman Aset: {loan.asset?.name}
          </h1>
        </div>

        <Badge status={loan.status} />
      </div>

      {/* Main Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {/* Left: Loan Details */}
        <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            Informasi Pengajuan
          </h3>

          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', display: 'block' }}>Pemohon (Peminjam)</span>
            <span style={{ fontWeight: 700 }}>{loan.user?.name}</span> ({loan.user?.email})
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', display: 'block' }}>Tanggal Mulai</span>
              <span style={{ fontWeight: 600 }}>{formatDate(loan.startDate)}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', display: 'block' }}>Tanggal Selesai</span>
              <span style={{ fontWeight: 600 }}>{formatDate(loan.endDate)}</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', display: 'block' }}>Tujuan Keperluan</span>
            <p style={{ fontWeight: 500, fontSize: '0.92rem', lineHeight: 1.5 }}>{loan.purpose}</p>
          </div>

          {/* Render Dokumen Pendukung */}
          {(() => {
            let docs: string[] = [];
            if (loan.permitPdfUrl) {
              try {
                const parsed = JSON.parse(loan.permitPdfUrl);
                if (Array.isArray(parsed)) docs = parsed;
                else docs = [loan.permitPdfUrl];
              } catch {
                docs = [loan.permitPdfUrl];
              }
            }

            if (docs.length === 0) return null;

            return (
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', display: 'block', marginBottom: '0.35rem' }}>Dokumen Pendukung Wajib</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {docs.length >= 2 ? (
                    <>
                      <div style={{ fontSize: '0.82rem' }}>
                        🪪 <strong>Identitas (KTP/KTM):</strong>{' '}
                        <a href={docs[0]} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-light)', textDecoration: 'underline', fontWeight: 600 }}>
                          Lihat Dokumen
                        </a>
                      </div>
                      <div style={{ fontSize: '0.82rem' }}>
                        📄 <strong>Surat Kegiatan:</strong>{' '}
                        <a href={docs[1]} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-light)', textDecoration: 'underline', fontWeight: 600 }}>
                          Lihat Dokumen
                        </a>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.82rem' }}>
                      📄 <strong>Lampiran:</strong>{' '}
                      <a href={docs[0]} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-light)', textDecoration: 'underline', fontWeight: 600 }}>
                        Lihat Dokumen
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {loan.penaltyFee > 0 && (
            <div style={{ padding: '0.75rem', background: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)' }}>
              <strong>Denda Keterlambatan:</strong> {formatCurrency(loan.penaltyFee)}
            </div>
          )}
        </Card>

        {/* Right: Full Transaction Timeline (Expedition-style tracking) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Card style={{ padding: '1.5rem' }}>
            <TransactionTimeline steps={buildLoanTimeline(loan)} />
          </Card>

          {/* Action Buttons — below the timeline, in a separate card */}
          {(['ACTIVE', 'RETURN_REQUESTED', 'UNDER_INSPECTION'].includes(loan.status) || showApprovalButton) && (
            <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
                ⚡ Aksi Tersedia
              </div>

              {loan.status === 'ACTIVE' && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    if (!confirm('Ajukan pengembalian aset ini sekarang?')) return;
                    try {
                      const res = await fetch(`/api/loans/${loan.id}/request-return`, { method: 'POST' });
                      if (res.ok) {
                        showToast('Pengajuan pengembalian berhasil dikirim! Serahkan aset ke petugas.', 'success');
                        fetchLoanDetail();
                      } else {
                        const err = await res.json();
                        showToast(err.error || 'Gagal mengajukan pengembalian', 'error');
                      }
                    } catch { showToast('Terjadi kesalahan koneksi', 'error'); }
                  }}
                >
                  📦 Ajukan Pengembalian Aset
                </Button>
              )}

              {['RETURN_REQUESTED', 'UNDER_INSPECTION'].includes(loan.status) && ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'APPROVER'].includes(currentUserRole) && (
                <Link href={`/dashboard/returns/${loan.id}`} className="btn btn-primary" style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}>
                  🔍 Inspeksi &amp; Persetujuan Pengembalian
                </Link>
              )}

              {showApprovalButton && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Button
                    variant="primary"
                    style={{ flex: 1 }}
                    onClick={() => { setActionType('APPROVE'); setModalOpen(true); }}
                  >
                    ✅ Setujui
                  </Button>
                  <Button
                    variant="danger"
                    style={{ flex: 1 }}
                    onClick={() => { setActionType('REJECT'); setModalOpen(true); }}
                  >
                    ❌ Tolak
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Approval Action Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={actionType === 'APPROVE' ? 'Konfirmasi Setujui Pengajuan' : 'Konfirmasi Penolakan Pengajuan'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant={actionType === 'APPROVE' ? 'primary' : 'danger'}
              isLoading={submitting}
              onClick={handleApprovalAction}
            >
              {actionType === 'APPROVE' ? 'Ya, Setujui' : 'Tolak Pengajuan'}
            </Button>
          </>
        }
      >
        <p style={{ marginBottom: '1rem', color: 'var(--color-muted)' }}>
          {actionType === 'APPROVE'
            ? 'Apakah Anda yakin ingin menyetujui pengajuan peminjaman aset ini?'
            : 'Isikan catatan alasan penolakan pengajuan di bawah ini:'}
        </p>

        <textarea
          className="input-field"
          rows={3}
          placeholder="Catatan / Alasan penolakan..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Modal>
    </div>
  );
}

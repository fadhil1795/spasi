'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  AlertCircle, ShieldAlert, AlertOctagon, XCircle, FileWarning
} from 'lucide-react';

export default function AdminPenaltiesPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [penalties, setPenalties] = useState<any[]>([]);

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPenalties = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/penalties?mode=admin');
      if (res.ok) {
        const data = await res.json();
        
        const unified: any[] = [];
        data.loans?.forEach((l: any) => unified.push({ ...l, txType: 'LOAN', userDetail: l.user }));
        data.rentals?.forEach((r: any) => unified.push({ ...r, txType: 'RENTAL', userDetail: r.renter }));
        
        // Sort descending by created date
        unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPenalties(unified);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPenalties();
  }, [fetchPenalties]);

  const openCancelModal = (p: any) => {
    setSelectedPenalty(p);
    setCancelReason('');
    setErrorMsg('');
    setIsCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setIsCancelModalOpen(false);
    setSelectedPenalty(null);
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedPenalty) return;
    if (!cancelReason.trim()) {
      setErrorMsg('Alasan pembatalan wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/penalties/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: selectedPenalty.txType,
          id: selectedPenalty.id,
          reason: cancelReason,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal membatalkan denda');
      } else {
        closeCancelModal();
        fetchPenalties(); // Refresh
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldAlert size={28} style={{ color: 'var(--color-primary)' }} /> Manajemen Denda
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Pemantauan tagihan denda keterlambatan user dan otorisasi pembatalan denda.
          </p>
        </div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                <th style={{ padding: '1rem 1.25rem' }}>No. Transaksi</th>
                <th style={{ padding: '1rem' }}>User / Peminjam</th>
                <th style={{ padding: '1rem' }}>Aset Terkait</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Total Denda</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Sisa Tagihan</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Aksi</th>
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
              ) : penalties.length > 0 ? (
                penalties.map((item) => {
                  const sisaTagihan = (item.penaltyFee || 0) - (item.penaltyPaidAmount || 0);
                  const isPaid = item.penaltyStatus === 'PAID' || item.penaltyStatus === 'CANCELLED';

                  return (
                    <tr key={`${item.txType}-${item.id}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 700 }}>
                        {item.txType === 'LOAN' ? item.ticketNumber : item.bookingNumber}
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 400, marginTop: '0.15rem' }}>
                          {item.txType === 'LOAN' ? 'Peminjaman Internal' : 'Sewa Alat'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <strong style={{ fontSize: '0.92rem' }}>{item.userDetail?.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{item.userDetail?.email || item.userDetail?.phone}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <strong style={{ fontSize: '0.92rem' }}>{item.asset?.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Kode: {item.asset?.code}</div>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 700, textAlign: 'right', color: 'var(--color-danger)' }}>
                        {formatCurrency(item.penaltyFee)}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 800, textAlign: 'right' }}>
                        {isPaid ? (
                          <span style={{ color: 'var(--color-success)' }}>Rp 0</span>
                        ) : (
                          <span style={{ color: 'var(--color-warning)' }}>{formatCurrency(sisaTagihan)}</span>
                        )}
                        {item.penaltyPaidAmount > 0 && !isPaid && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-success)', marginTop: '0.2rem' }}>
                            (Dibayar: {formatCurrency(item.penaltyPaidAmount)})
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span 
                           className="badge"
                           style={item.penaltyStatus === 'UNPAID' ? { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontWeight: 600 } : 
                                  item.penaltyStatus === 'PARTIAL' ? { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontWeight: 600 } : 
                                  item.penaltyStatus === 'CANCELLED' ? { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontWeight: 600 } :
                                  { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontWeight: 600 }}
                        >
                          {item.penaltyStatus === 'UNPAID' ? 'BELUM LUNAS' : 
                           item.penaltyStatus === 'PARTIAL' ? 'DICICIL' : 
                           item.penaltyStatus === 'CANCELLED' ? 'DIBATALKAN' : 'LUNAS'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        {!isPaid && (
                          <Button 
                            variant="danger" 
                            size="sm" 
                            onClick={() => openCancelModal(item)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: '#fee2e2', color: '#dc2626' }}
                          >
                            <XCircle size={14} /> Batalkan
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    <AlertOctagon size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                    Tidak ada catatan denda di sistem.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cancel Modal */}
      {isCancelModalOpen && selectedPenalty && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--color-surface)', width: '100%', maxWidth: '500px',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', overflow: 'hidden',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }}>
                <FileWarning size={20} /> Batalkan Denda
              </h2>
              <button onClick={closeCancelModal} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1, color: 'var(--color-muted)' }}>&times;</button>
            </div>
            
            <form onSubmit={handleCancel} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                
                <div style={{ background: 'var(--color-surface2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>User: {selectedPenalty.userDetail?.name}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.3rem' }}>{selectedPenalty.asset?.name}</div>
                  <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px dashed var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem' }}>Sisa Denda Dibatalkan:</span>
                    <strong style={{ color: 'var(--color-danger)' }}>{formatCurrency((selectedPenalty.penaltyFee || 0) - (selectedPenalty.penaltyPaidAmount || 0))}</strong>
                  </div>
                </div>

                <div style={{ padding: '0.75rem', background: '#fffbeb', color: '#92400e', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  <strong>Perhatian:</strong> Tindakan ini akan menghanguskan sisa tagihan denda user dan mengubah statusnya menjadi DIBATALKAN. Tindakan ini tidak bisa diurungkan.
                </div>

                {errorMsg && (
                  <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                <div>
                  <label className="input-label">Alasan Pembatalan</label>
                  <textarea 
                    className="input-field"
                    placeholder="Contoh: Force Majeure (Bencana Alam) / Disetujui Kepala Cabang"
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <Button type="button" variant="ghost" onClick={closeCancelModal}>Kembali</Button>
                  <Button type="submit" variant="danger" disabled={isSubmitting}>
                    {isSubmitting ? 'Memproses...' : 'Ya, Batalkan Denda'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

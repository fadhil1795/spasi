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
  AlertCircle, Receipt, AlertOctagon, CheckCircle2, Wallet, HandCoins, ArrowRightCircle
} from 'lucide-react';

export default function UserPenaltiesPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [penalties, setPenalties] = useState<any[]>([]);

  // Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState<any>(null);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [useDeposit, setUseDeposit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPenalties = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/penalties?mode=user');
      if (res.ok) {
        const data = await res.json();
        
        const unified: any[] = [];
        data.loans?.forEach((l: any) => unified.push({ ...l, txType: 'LOAN' }));
        data.rentals?.forEach((r: any) => unified.push({ ...r, txType: 'RENTAL' }));
        
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

  const openPayModal = (p: any) => {
    setSelectedPenalty(p);
    setPayAmount('');
    setUseDeposit(false);
    setErrorMsg('');
    setIsPayModalOpen(true);
  };

  const closePayModal = () => {
    setIsPayModalOpen(false);
    setSelectedPenalty(null);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedPenalty) return;

    if (!payAmount && !useDeposit) {
      setErrorMsg('Masukkan nominal pembayaran atau gunakan deposit.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/penalties/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: selectedPenalty.txType,
          id: selectedPenalty.id,
          amount: Number(payAmount) || 0,
          useDeposit
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal memproses pembayaran');
      } else {
        closePayModal();
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
            <AlertCircle size={28} style={{ color: 'var(--color-danger)' }} /> Tagihan &amp; Denda Keterlambatan
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Kelola dan bayar denda akibat keterlambatan pengembalian peminjaman maupun sewa alat Anda.
          </p>
        </div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                <th style={{ padding: '1rem 1.25rem' }}>No. Transaksi</th>
                <th style={{ padding: '1rem' }}>Aset Terkait</th>
                <th style={{ padding: '1rem' }}>Tgl Keterlambatan</th>
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
                        <strong style={{ fontSize: '0.92rem' }}>{item.asset?.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Kode: {item.asset?.code}</div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.82rem' }}>
                        {formatDate(item.checkOutTime || item.updatedAt, 'dd MMM yyyy HH:mm')}
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
                            variant="primary" 
                            size="sm" 
                            onClick={() => openPayModal(item)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem' }}
                          >
                            <Wallet size={14} /> Bayar
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
                    Wah, hebat! Anda tidak memiliki tagihan denda keterlambatan apa pun.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payment Modal */}
      {isPayModalOpen && selectedPenalty && (
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
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={20} /> Pembayaran Denda
              </h2>
              <button onClick={closePayModal} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1, color: 'var(--color-muted)' }}>&times;</button>
            </div>
            
            <form onSubmit={handlePay} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                
                <div style={{ background: 'var(--color-surface2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>Transaksi: {selectedPenalty.txType === 'LOAN' ? selectedPenalty.ticketNumber : selectedPenalty.bookingNumber}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedPenalty.asset?.name}</div>
                  
                  <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px dashed var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem' }}>Total Denda</span>
                    <strong style={{ color: 'var(--color-danger)' }}>{formatCurrency(selectedPenalty.penaltyFee)}</strong>
                  </div>
                  {selectedPenalty.penaltyPaidAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                      <span style={{ fontSize: '0.85rem' }}>Sudah Dibayar</span>
                      <strong style={{ color: 'var(--color-success)' }}>- {formatCurrency(selectedPenalty.penaltyPaidAmount)}</strong>
                    </div>
                  )}
                  <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.1rem', fontWeight: 800 }}>
                    <span>SISA TAGIHAN</span>
                    <span>{formatCurrency((selectedPenalty.penaltyFee || 0) - (selectedPenalty.penaltyPaidAmount || 0))}</span>
                  </div>
                </div>

                {errorMsg && (
                  <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                <div>
                  <label className="input-label">Nominal Pembayaran (Rp)</label>
                  <Input 
                    type="number" 
                    placeholder="Contoh: 50000" 
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value ? Number(e.target.value) : '')}
                    icon={<HandCoins size={18} />}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Anda dapat membayar sebagian (dicicil) atau lunas.</span>
                </div>

                {selectedPenalty.txType === 'RENTAL' && selectedPenalty.depositAmount > 0 && (
                  <div style={{ 
                    marginTop: '0.5rem', padding: '1rem', border: '1px solid var(--color-primary-light)', 
                    borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.05)',
                    display: 'flex', alignItems: 'flex-start', gap: '0.8rem'
                  }}>
                    <input 
                      type="checkbox" 
                      id="useDeposit" 
                      checked={useDeposit}
                      onChange={(e) => setUseDeposit(e.target.checked)}
                      style={{ marginTop: '0.2rem', width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                    />
                    <div>
                      <label htmlFor="useDeposit" style={{ fontWeight: 700, color: 'var(--color-primary-dark)', cursor: 'pointer', display: 'block', marginBottom: '0.2rem' }}>
                        Gunakan Saldo Deposit
                      </label>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: 0 }}>
                        Anda memiliki deposit sebesar <strong>{formatCurrency(selectedPenalty.depositAmount)}</strong>. Centang ini untuk memotong denda dari deposit tersebut.
                      </p>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <Button type="button" variant="ghost" onClick={closePayModal}>Batal</Button>
                  <Button type="submit" variant="primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Memproses...' : 'Proses Pembayaran'} <ArrowRightCircle size={16} style={{ marginLeft: '0.3rem' }} />
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

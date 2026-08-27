'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, QrCode, Building2, Upload, CheckCircle2, Copy, AlertCircle, ShieldCheck, FileCheck } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  bookingNumber: string;
  totalAmount: number;
  renterName: string;
  paymentScheme?: string; // 'FULL' | 'DOWN_PAYMENT'
  isAsset?: boolean;
  isPelunasan?: boolean;
  onPaymentSuccess: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  bookingId,
  bookingNumber,
  totalAmount,
  renterName,
  paymentScheme = 'FULL',
  isAsset = false,
  isPelunasan = false,
  onPaymentSuccess,
}: PaymentModalProps) {
  const { showToast } = useToast();
  const [method, setMethod] = useState<string>('QRIS');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  const isDP = paymentScheme === 'DOWN_PAYMENT';
  const amountDue = isPelunasan ? totalAmount / 2 : (isDP ? totalAmount / 2 : totalAmount);

  // Dynamic Payment Settings from Admin
  const [paymentSetting, setPaymentSetting] = useState<any>({
    qrisCode: 'SPASI-INSTANSI-QRIS',
    qrisImageUrl: '',
    bankAccounts: [],
  });

  useEffect(() => {
    if (isOpen) {
      fetchPaymentSettings();
    }
  }, [isOpen]);

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch('/api/settings/payment');
      if (res.ok) {
        setPaymentSetting(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyVA = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Nomor Rekening / VA berhasil disalin!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingProof(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setProofUrl(data.url);
        showToast('Bukti transfer berhasil diunggah!', 'success');
      } else {
        showToast('Gagal mengunggah bukti bayar', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan unggah bukti', 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleConfirmPayment = async () => {
    try {
      setSubmitting(true);
      const url = isAsset ? `/api/rentals/${bookingId}` : `/api/room-bookings/${bookingId}`;
      const payload = isAsset
        ? {
            payStatus: 'PENDING_VERIFICATION',
            payMethod: method,
            paymentProofUrl: proofUrl || null,
            notes: proofUrl ? `Bukti Bayar Sewa Aset Terlampir: ${proofUrl}` : `Pembayaran Sewa Aset via ${method} (Menunggu Verifikasi Admin)`,
          }
        : {
            payStatus: isPelunasan ? 'PENDING_VERIFICATION' : (isDP ? 'DOWN_PAYMENT' : 'PENDING_VERIFICATION'),
            payMethod: method,
            paymentProofUrl: proofUrl || null,
            notes: isPelunasan
              ? `[PELUNASAN SISA 50%] Bukti Transfer Terlampir: ${proofUrl || '-'}`
              : (proofUrl ? `Bukti Bayar Terlampir: ${proofUrl}` : `Pembayaran via ${method} (Menunggu Verifikasi Admin)`),
          };

      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('🎉 Pembayaran berhasil dikirim! Menunggu verifikasi dari Admin.', 'success');
        onPaymentSuccess();
        onClose();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memproses konfirmasi pembayaran', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isPelunasan ? "💳 Portal Pelunasan Sisa Pembayaran (50%)" : "💳 Portal Pembayaran & Unggah Bukti Bayar"}
      footer={
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button variant="primary" isLoading={submitting} onClick={handleConfirmPayment}>
            <CheckCircle2 size={16} /> Kirim Pembayaran Ke Admin
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Header Summary */}
        <div style={{ background: 'var(--color-surface2)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Nomor Pemesanan</div>
            <div style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-primary-light)' }}>{bookingNumber}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Penyewa: {renterName}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
              {isPelunasan ? 'Sisa Pelunasan (50%)' : (isDP ? 'Bayar DP Sekarang (50%)' : 'Total Tagihan')}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-success)' }}>
              {formatCurrency(amountDue)}
            </div>
            {isDP && !isPelunasan && (
              <div style={{ fontSize: '0.72rem', color: 'var(--color-warning)', fontWeight: 700, marginTop: '0.2rem' }}>
                Sisa {formatCurrency(totalAmount / 2)} dibayar saat pelunasan
              </div>
            )}
          </div>
        </div>        {/* Unified Payment Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Method 1: Bank Transfer Accounts */}
          <div style={{ background: 'var(--color-surface2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🏦 Pilihan Transfer Rekening Resmi Instansi:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {paymentSetting.bankAccounts?.length > 0 ? (
                paymentSetting.bankAccounts.map((bank: any) => (
                  <div key={bank.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>Bank {bank.bankName}</div>
                      <span style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: 'monospace', color: 'var(--color-primary-light)' }}>{bank.accountNo}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>a.n. {bank.accountName}</div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => handleCopyVA(bank.accountNo)}>
                      <Copy size={13} /> {copied ? 'Tersalin' : 'Salin'}
                    </Button>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Belum ada data rekening bank yang diatur oleh Admin.</div>
              )}
            </div>
          </div>

          {/* Method 2: QRIS Scan */}
          <div style={{ background: 'var(--color-surface2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              📱 Pindai Kode QRIS Resmi Instansi:
            </div>
            <div style={{ background: '#FFFFFF', padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: '0.5rem', boxShadow: 'var(--shadow-sm)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={paymentSetting.qrisImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${paymentSetting.qrisCode}`}
                alt="QRIS Code Resmi"
                style={{ width: '140px', height: '140px', display: 'block', margin: '0 auto' }}
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Mendukung GoPay, OVO, Dana, ShopeePay, BCA Mobile, Livin, BRImo, dll.</div>
          </div>

        </div>

        {/* Payment Method Selector Dropdown */}
        <div style={{ background: 'var(--color-surface2)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
            Metode Pembayaran Yang Anda Gunakan *
          </label>
          <select
            className="input-field"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="Transfer">Transfer Bank</option>
            <option value="QRIS">QRIS / E-Wallet</option>
          </select>
        </div>

        {/* Upload Proof File Section */}
        <div style={{ background: 'var(--color-surface2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-primary-light)' }}>
            <Upload size={18} /> Unggah Struk / Bukti Transfer (Wajib/Sangat Dianjurkan):
          </label>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
            Lampirkan foto struk ATM, screenshot m-Banking, atau nota transfer untuk mempercepat verifikasi oleh Admin.
          </p>

          <input type="file" accept="image/*,.pdf" onChange={handleProofUpload} style={{ fontSize: '0.85rem' }} />
          {uploadingProof && <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>Sedang mengunggah berkas...</div>}
          {proofUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-success)', fontWeight: 700, fontSize: '0.85rem', marginTop: '0.5rem' }}>
              <FileCheck size={16} /> Bukti Transfer Berhasil Terunggah!
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, calculateDaysCount } from '@/lib/utils';
import {
  ArrowLeft, ArrowRight, Save, Calculator, User, CreditCard,
  QrCode, Upload, CheckCircle2, Package, ShieldCheck, Building, ClipboardList
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ color: 'var(--color-primary)' }}>{icon}</span>
      {children}
    </h2>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
      {children}{required && ' *'}
    </label>
  );
}

function NewRentalFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAssetId = searchParams.get('assetId') || '';
  const { showToast } = useToast();

  const [step, setStep] = useState<number>(1);
  const [lockedAsset, setLockedAsset] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Dynamic Payment Settings
  const [paymentSettings, setPaymentSettings] = useState<{
    bankBca?: string;
    bankMandiri?: string;
    qrisImageUrl?: string;
    qrisCode?: string;
    bankAccounts?: any[];
  }>({});

  // Form State – Step 1: Rincian Sewa
  const [selectedAssetId, setSelectedAssetId] = useState(initialAssetId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ratePerDay, setRatePerDay] = useState(0);
  const [depositAmount, setDepositAmount] = useState(50000);
  const [useOperator, setUseOperator] = useState(false);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [operatorFeePerDay, setOperatorFeePerDay] = useState(150000); // Default fee/hari

  // Form State – Step 2: Data Diri
  const [renterName, setRenterName] = useState(searchParams.get('renterName') || '');
  const [renterPhone, setRenterPhone] = useState(searchParams.get('renterPhone') || '');
  const [renterIdCard, setRenterIdCard] = useState('');
  const [renterEmail, setRenterEmail] = useState('');

  // Form State – Step 3: Pembayaran
  const [payScheme, setPayScheme] = useState<'DP' | 'FULL'>('DP');
  const [payMethod, setPayMethod] = useState<'Transfer' | 'QRIS' | 'Cash'>('Transfer');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');

  useEffect(() => {
    fetchPaymentSettings();
    fetchOperators();

    const paramStart = searchParams.get('startDate');
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setStartDate(paramStart || today);
    setEndDate(tomorrow);

    if (initialAssetId) {
      fetchSingleAsset(initialAssetId);
    } else {
      fetchRentableAssets();
    }
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch('/api/settings/payment');
      if (res.ok) setPaymentSettings(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOperators = async () => {
    try {
      const res = await fetch('/api/operators?status=AVAILABLE');
      if (res.ok) setOperators(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSingleAsset = async (assetId: string) => {
    try {
      const res = await fetch(`/api/public/assets/${assetId}`, { cache: 'no-store' });
      if (res.ok) {
        const asset = await res.json();
        setLockedAsset(asset);
        setSelectedAssetId(asset.id);
        setRatePerDay(asset.dailyRentRate || 0);
        if (asset.location?.depositAmount) setDepositAmount(asset.location.depositAmount);
      } else {
        fetchRentableAssets();
      }
    } catch (e) {
      console.error(e);
      fetchRentableAssets();
    }
  };

  const fetchRentableAssets = async () => {
    try {
      const res = await fetch('/api/public/assets?status=AVAILABLE');
      if (res.ok) {
        const list = await res.json();
        const rentable = list.filter((a: any) => a.isRentable && !a.isFixedToRoom);
        setAssets(rentable);
        if (rentable.length > 0) {
          setSelectedAssetId(rentable[0].id);
          setRatePerDay(rentable[0].dailyRentRate || 0);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssetChange = (assetId: string) => {
    setSelectedAssetId(assetId);
    const match = assets.find((a) => a.id === assetId);
    setRatePerDay(match?.dailyRentRate ?? 0);
  };

  const totalDays = startDate && endDate ? calculateDaysCount(startDate, endDate) : 1;
  const operatorTotalFee = useOperator ? (totalDays * operatorFeePerDay) : 0;
  const subtotal = (totalDays * ratePerDay) + operatorTotalFee;
  const totalAmount = subtotal + depositAmount;
  const minimumPayRequired = payScheme === 'DP' ? Math.ceil(subtotal * 0.5) + depositAmount : totalAmount;

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
        setPaymentProofUrl(data.url);
        showToast('Bukti transfer / struk pembayaran berhasil diunggah!', 'success');
      } else {
        showToast('Gagal mengunggah bukti pembayaran', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi unggah', 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !startDate || !endDate) {
      showToast('Mohon lengkapi pilihan aset dan tanggal sewa', 'error');
      return;
    }
    if (useOperator && !selectedOperatorId) {
      showToast('Mohon pilih operator / tenaga ahli', 'error');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renterName || !renterPhone) {
      showToast('Mohon lengkapi data diri pemesan', 'error');
      return;
    }
    setStep(3);
  };

  const handleSubmitFinal = async () => {
    if (!paymentProofUrl && payMethod !== 'Cash') {
      showToast('Mohon lampirkan struk / bukti transfer pembayaran terlebih dahulu', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          renterName,
          renterPhone,
          renterEmail,
          renterIdCard,
          assetId: selectedAssetId,
          startDate,
          endDate,
          ratePerDay,
          depositAmount,
          payStatus: payScheme === 'DP' ? 'DOWN_PAYMENT' : (paymentProofUrl ? 'PENDING_VERIFICATION' : 'UNPAID'),
          payMethod,
          paymentProofUrl,
          operatorId: useOperator ? selectedOperatorId : null,
          operatorFee: useOperator ? operatorTotalFee : 0,
        }),
      });

      if (res.ok) {
        showToast('Pemesanan & pembayaran penyewaan aset berhasil dikirim!', 'success');
        router.push('/dashboard/room-bookings');
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan transaksi penyewaan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedAsset = lockedAsset || assets.find((a) => a.id === selectedAssetId);

  const STEPS = [
    { num: 1, label: 'Aset & Waktu',  icon: <Package size={16} /> },
    { num: 2, label: 'Data Penyewa',  icon: <User size={16} /> },
    { num: 3, label: 'Pembayaran',    icon: <CreditCard size={16} /> },
  ];

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <Link
        href="/dashboard/room-bookings"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-muted)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={16} /> Kembali ke Riwayat Booking
      </Link>

      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>Wizard Booking Aset</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Lengkapi 3 langkah mudah untuk memesan peralatan operasional &amp; menyelesaikan pembayaran.
      </p>

      {/* Step Progress (Adapted from Room Booking) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '19px', left: '38px', right: '38px', height: '2px', background: 'var(--color-border)', zIndex: 1 }} />
        {STEPS.map((s) => {
          const isDone    = step > s.num;
          const isCurrent = step === s.num;
          return (
            <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', zIndex: 2 }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.9rem',
                background: isDone || isCurrent ? 'var(--grad-primary)' : 'var(--color-surface2)',
                color: isDone || isCurrent ? '#FFFFFF' : 'var(--color-muted)',
                border: isCurrent ? '2px solid var(--color-primary-light)' : '1px solid var(--color-border)',
                boxShadow: isCurrent ? 'var(--shadow-glow)' : 'none',
              }}>
                {isDone ? <CheckCircle2 size={20} /> : s.num}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--color-primary-light)' : 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: Pilih Aset & Durasi ── */}
      {step === 1 && (
        <form onSubmit={handleNextStep1}>
          <Card className="animate-fade-in" style={{ padding: '1.75rem' }}>
            <SectionTitle icon={<Package size={20} />}>Langkah 1: Pilih Aset &amp; Waktu Sewa</SectionTitle>

            <div style={{ marginBottom: '1.25rem' }}>
              <FieldLabel required>Aset Terpilih</FieldLabel>
              {lockedAsset ? (
                <div style={{
                  background: 'var(--color-surface2)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', background: 'var(--color-primary)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                        🔒 TERKUNCI
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-muted)' }}>{lockedAsset.code}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-text)' }}>{lockedAsset.name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                      Kategori: {lockedAsset.category?.name || 'Aset Moving'} • Tarif: <strong>{formatCurrency(ratePerDay)}/hari</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <select
                  className="input-field"
                  value={selectedAssetId}
                  onChange={(e) => handleAssetChange(e.target.value)}
                  required
                >
                  <option value="">— Pilih Aset —</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code}) — {formatCurrency(a.dailyRentRate || 0)}/hari
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedAssetId && ratePerDay === 0 && (
              <div style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid var(--color-warning)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--color-warning)', fontWeight: 600, display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                ⚠️ Aset ini belum memiliki tarif sewa harian. Harap isi <strong>Daily Rent Rate</strong> pada halaman edit aset terlebih dahulu.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <Input
                label="Tanggal Mulai *"
                type="date"
                value={startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <Input
                label="Tanggal Selesai *"
                type="date"
                value={endDate}
                min={startDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            {/* Operator Selection */}
            <div style={{ marginBottom: '1.5rem', background: 'var(--color-surface2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: useOperator ? '1rem' : '0' }}>
                <input 
                  type="checkbox" 
                  id="useOperator" 
                  checked={useOperator} 
                  onChange={(e) => setUseOperator(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="useOperator" style={{ fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                  Gunakan Operator / Tenaga Ahli (Sopir/Teknisi)
                </label>
              </div>

              {useOperator && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <FieldLabel required>Pilih Tenaga Ahli</FieldLabel>
                    <select
                      className="input-field"
                      value={selectedOperatorId}
                      onChange={(e) => setSelectedOperatorId(e.target.value)}
                      required={useOperator}
                    >
                      <option value="">— Pilih Operator —</option>
                      {operators.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.name} ({op.skills || 'Umum'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Input
                      label="Tarif Operator (Per Hari)"
                      type="number"
                      value={operatorFeePerDay}
                      onChange={(e) => setOperatorFeePerDay(Number(e.target.value))}
                      required={useOperator}
                    />
                  </div>
                </div>
              )}
            </div>

            {totalDays > 0 && selectedAssetId && (
              <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Durasi</span>
                  <strong>{totalDays} Hari</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Tarif Terpilih</span>
                  <strong>{formatCurrency(ratePerDay)} / hari</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Subtotal Aset</span>
                  <strong style={{ color: 'var(--color-text)' }}>{formatCurrency(totalDays * ratePerDay)}</strong>
                </div>
                {useOperator && (
                  <div>
                    <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Total Biaya Operator</span>
                    <strong style={{ color: 'var(--color-text)' }}>{formatCurrency(operatorTotalFee)}</strong>
                  </div>
                )}
                <div>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Grand Subtotal</span>
                  <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(subtotal)}</strong>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="primary">
                Lanjut ke Data Penyewa <ArrowRight size={16} />
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* ── STEP 2: Data Penyewa ── */}
      {step === 2 && (
        <form onSubmit={handleNextStep2}>
          <Card className="animate-fade-in" style={{ padding: '1.75rem' }}>
            <SectionTitle icon={<User size={20} />}>Langkah 2: Data Diri Penyewa</SectionTitle>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <Input
                label="Nama Lengkap Penyewa *"
                placeholder="Contoh: Hendra Wijaya"
                value={renterName}
                onChange={(e) => setRenterName(e.target.value)}
                required
              />
              <Input
                label="Nomor WhatsApp / HP *"
                placeholder="081234567890"
                value={renterPhone}
                onChange={(e) => setRenterPhone(e.target.value)}
                required
              />
              <Input
                label="Nomor NIK / KTP"
                placeholder="3301020304050001"
                value={renterIdCard}
                onChange={(e) => setRenterIdCard(e.target.value)}
              />
              <Input
                label="Email (Opsional)"
                type="email"
                placeholder="hendra@gmail.com"
                value={renterEmail}
                onChange={(e) => setRenterEmail(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Kembali ke Langkah 1
              </Button>
              <Button type="submit" variant="primary">
                Lanjut ke Pembayaran <ArrowRight size={16} />
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* ── STEP 3: Pembayaran & Konfirmasi ── */}
      {step === 3 && (
        <Card className="animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SectionTitle icon={<CreditCard size={22} />}>Langkah 3: Pembayaran &amp; Konfirmasi</SectionTitle>

          <div>
            <FieldLabel required>Skema Pembayaran</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div
                onClick={() => setPayScheme('DP')}
                style={{
                  padding: '1rem', borderRadius: 'var(--radius-md)',
                  border: payScheme === 'DP' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: payScheme === 'DP' ? 'var(--color-surface2)' : 'transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: payScheme === 'DP' ? 'var(--color-primary-light)' : 'var(--color-text)' }}>💵 DP (Uang Muka 50%)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                  Bayar minimal DP dulu: <strong>{formatCurrency(totalAmount * 0.5)}</strong>
                </div>
              </div>

              <div
                onClick={() => setPayScheme('FULL')}
                style={{
                  padding: '1rem', borderRadius: 'var(--radius-md)',
                  border: payScheme === 'FULL' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: payScheme === 'FULL' ? 'var(--color-surface2)' : 'transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: payScheme === 'FULL' ? 'var(--color-primary-light)' : 'var(--color-text)' }}>💳 Pelunasan (100%)</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                  Bayar lunas seluruh tagihan: <strong>{formatCurrency(totalAmount)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div>
            <FieldLabel required>Metode Pembayaran</FieldLabel>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {(['Transfer', 'QRIS', 'Cash'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPayMethod(method)}
                  style={{
                    padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)',
                    border: payMethod === method ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: payMethod === method ? 'var(--color-primary)' : 'var(--color-surface2)',
                    color: payMethod === method ? '#FFFFFF' : 'var(--color-text)',
                    fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                  }}
                >
                  {method === 'Transfer' && '🏦 Transfer Bank'}
                  {method === 'QRIS' && '📱 Scan QRIS'}
                  {method === 'Cash' && '💵 Tunai di Lokasi'}
                </button>
              ))}
            </div>
          </div>

          {payMethod === 'Transfer' && (
            <div style={{ background: 'var(--color-surface2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Building size={16} style={{ color: 'var(--color-primary)' }} /> Rekening Resmi Instansi SPASI:
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--color-text)', lineHeight: 1.6 }}>
                {(paymentSettings.bankAccounts?.length ?? 0) > 0 ? (
                  (paymentSettings.bankAccounts || []).map((bank: any) => (
                    <div key={bank.id}>• <strong>Bank {bank.bankName}:</strong> {bank.accountNo} a.n. {bank.accountName}</div>
                  ))
                ) : (
                  <div style={{ color: 'var(--color-muted)' }}>Belum ada data rekening bank yang diatur.</div>
                )}
              </div>
            </div>
          )}

          {payMethod === 'QRIS' && (
            <div style={{ background: 'var(--color-surface2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <QrCode size={18} style={{ color: 'var(--color-primary)' }} /> Scan Kode QRIS Resmi:
              </div>
              {paymentSettings.qrisImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={paymentSettings.qrisImageUrl} alt="QRIS Code" style={{ width: '180px', height: '180px', objectFit: 'contain', margin: '0 auto 0.5rem', background: '#FFFFFF', padding: '0.5rem', borderRadius: 'var(--radius-md)' }} />
              ) : (
                <div style={{ background: '#FFFFFF', padding: '1rem', width: '160px', margin: '0 auto 0.5rem', borderRadius: 'var(--radius-md)', color: '#000', fontWeight: 800, fontSize: '0.85rem' }}>[KODE QRIS INSTANSI]</div>
              )}
              <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>NMID / Kode QRIS: {paymentSettings.qrisCode || 'ID102030405060'}</div>
            </div>
          )}

          {payMethod !== 'Cash' && (
            <div>
              <FieldLabel required>Unggah Bukti Transfer / Struk Pembayaran</FieldLabel>
              <div style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', textAlign: 'center', background: 'var(--color-surface2)' }}>
                {paymentProofUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={paymentProofUrl} alt="Struk Transfer" style={{ maxHeight: '180px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                    <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><CheckCircle2 size={16} /> Struk Terlampir</span>
                  </div>
                ) : (
                  <div>
                    <Upload size={28} style={{ color: 'var(--color-primary)', margin: '0 auto 0.5rem' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>Pilih foto struk / resi transfer dari HP / Komputer</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>Format JPG, PNG, atau PDF (Maks 5MB)</div>
                  </div>
                )}
                <input type="file" accept="image/*,.pdf" onChange={handleProofUpload} style={{ display: 'none' }} id="proof-file-input" />
                <label htmlFor="proof-file-input" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.5rem' }}>
                  <Upload size={14} /> {uploadingProof ? 'Mengunggah...' : paymentProofUrl ? 'Ganti File Bukti' : 'Pilih File Struk'}
                </label>
              </div>
            </div>
          )}

          {/* Order Final Summary */}
          <div style={{ background: 'var(--color-surface2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.88rem' }}>
            <div style={{ fontWeight: 800, marginBottom: '0.5rem', color: 'var(--color-primary-light)' }}>Ringkasan Tagihan &amp; Pembayaran:</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span>Subtotal Aset ({totalDays} Hari):</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span>Deposit Jaminan:</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(depositAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span>Total Tagihan:</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(totalAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 900, color: 'var(--color-success)', borderTop: '1px dashed var(--color-border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
              <span>Wajib Dibayar Sekarang ({payScheme}):</span>
              <span>{formatCurrency(minimumPayRequired)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setStep(2)}>
              <ArrowLeft size={16} /> Kembali ke Langkah 2
            </Button>
            <Button type="button" variant="primary" isLoading={loading} onClick={handleSubmitFinal} style={{ background: 'var(--grad-primary)', padding: '0.8rem 1.5rem', fontWeight: 800 }}>
              <Save size={18} /> Kirim Pesanan &amp; Pembayaran
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function NewRentalPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem' }}>Memuat form pemesanan...</p>}>
      <NewRentalFormContent />
    </Suspense>
  );
}

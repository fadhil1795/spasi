'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft, ArrowRight, CheckCircle2,
  Building2, Package, User, ClipboardList, Send, CalendarClock, Upload, CheckCircle, AlertCircle
} from 'lucide-react';

interface Room { id: string; name: string; code: string; building?: string; pricePerHour: number; pricePerDay?: number; capacity: number; depositAmount?: number; isRentable?: boolean; isLoanable?: boolean; requiresDepositForInternal?: boolean; }
interface AddOnAsset { id: string; name: string; code: string; sessionRentRate: number; imageUrl?: string; }
interface AddOnItem { asset: AddOnAsset; qty: number; }

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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function RoomBookingWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdParam = searchParams.get('roomId');
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  const { data: session } = useSession();
  const { showToast } = useToast();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 – Pilih Ruangan, Tipe Sewa & Waktu
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [rentalType, setRentalType] = useState<'HOURLY' | 'DAILY'>('HOURLY');
  const [bookingDate, setBookingDate] = useState(() => {
    if (startParam) {
      return startParam.split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    if (endParam) {
      return endParam.split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState(() => {
    if (startParam && startParam.includes('T')) {
      return startParam.split('T')[1].substring(0, 5);
    }
    return '08:00';
  });
  const [endTime, setEndTime] = useState(() => {
    if (endParam && endParam.includes('T')) {
      return endParam.split('T')[1].substring(0, 5);
    }
    return '17:00';
  });
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [availabilityOk, setAvailabilityOk] = useState(false);
  const [checkingAvail, setCheckingAvail] = useState(false);

  // Step 2 – Add-On
  const [addOnAssets, setAddOnAssets] = useState<AddOnAsset[]>([]);
  const [loadingAddOns, setLoadingAddOns] = useState(false);
  const [addOns, setAddOns] = useState<AddOnItem[]>([]);

  // Step 3 – Data Penyewa & Dokumen Pendukung
  const [renterName, setRenterName] = useState(session?.user?.name || '');
  const [renterPhone, setRenterPhone] = useState('');
  const [renterEmail, setRenterEmail] = useState(session?.user?.email || '');
  const [renterNik, setRenterNik] = useState('');
  const [identityDocUrl, setIdentityDocUrl] = useState('');
  const [permitDocUrl, setPermitDocUrl] = useState('');
  const [uploadingIdentity, setUploadingIdentity] = useState(false);
  const [uploadingPermit, setUploadingPermit] = useState(false);
  const [paymentType, setPaymentType] = useState<'DP' | 'LUNAS'>('LUNAS');
  const [payMethod, setPayMethod] = useState('Transfer');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<any>({});
  const [notes, setNotes] = useState('');

  const [renterCategory, setRenterCategory] = useState<'MAHASISWA' | 'EXTERNAL_PINJAM' | 'EXTERNAL_SEWA'>('MAHASISWA');

  // Policy & Legality state
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [maxQuota, setMaxQuota] = useState(3);
  const [activityType, setActivityType] = useState('PERSONAL');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // ── calculations ──
  const calculateDuration = () => {
    if (rentalType === 'HOURLY') {
      if (!startTime || !endTime) return 0;
      const [h1, m1] = startTime.split(':').map(Number);
      const [h2, m2] = endTime.split(':').map(Number);
      let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
      return diff > 0 ? diff : 0;
    } else {
      if (!bookingDate || !endDate) return 1;
      const d1 = new Date(bookingDate).getTime();
      const d2 = new Date(endDate).getTime();
      const diffDays = Math.ceil((d2 - d1) / (1000 * 3600 * 24));
      return Math.max(1, diffDays);
    }
  };

  const duration = calculateDuration();
  const roomRate = selectedRoom ? (rentalType === 'HOURLY' ? selectedRoom.pricePerHour : (selectedRoom.pricePerDay || selectedRoom.pricePerHour * 8)) : 0;
  
  const isFreeForInternal = selectedRoom ? selectedRoom.isLoanable !== false : true;

  const roomSubtotal = renterCategory === 'MAHASISWA'
    ? (isFreeForInternal ? 0 : roomRate * duration)
    : (renterCategory === 'EXTERNAL_PINJAM' ? 0 : roomRate * duration);

  const addOnSubtotal = renterCategory === 'MAHASISWA'
    ? (isFreeForInternal ? 0 : addOns.reduce((acc, a) => acc + a.asset.sessionRentRate * a.qty, 0))
    : (renterCategory === 'EXTERNAL_PINJAM' ? 0 : addOns.reduce((acc, a) => acc + a.asset.sessionRentRate * a.qty, 0));

  const roomDeposit = renterCategory === 'MAHASISWA'
    ? (selectedRoom?.requiresDepositForInternal ? (selectedRoom?.depositAmount || 0) : 0)
    : (renterCategory === 'EXTERNAL_SEWA' ? 0 : (selectedRoom?.depositAmount || 0));
  
  const grandTotal = roomSubtotal + addOnSubtotal + roomDeposit;
  const depositToPay = renterCategory === 'EXTERNAL_SEWA' && paymentType === 'DP'
    ? Math.ceil((roomSubtotal + addOnSubtotal) * 0.5) 
    : grandTotal;

  const checkUserQuota = async () => {
    try {
      setQuotaLoading(true);
      const res = await fetch('/api/policies/quota?checkActive=true');
      if (res.ok) {
        const data = await res.json();
        setActiveCount(data.activeCount);
        setMaxQuota(data.maxQuota);
        if (data.status === 'EXCEEDED') {
          setQuotaExceeded(true);
        }
      }
    } catch (e) {
      console.error('Error checking quota:', e);
    } finally {
      setQuotaLoading(false);
    }
  };

  useEffect(() => {
    checkUserQuota();
    (async () => {
      try {
        setLoadingRooms(true);
        const [resRooms, resPay] = await Promise.all([
          fetch('/api/rooms?status=AVAILABLE'),
          fetch('/api/settings/payment'),
        ]);
        if (resRooms.ok) {
          const list = await resRooms.json();
          
          // Filter rooms based on the active user role and category
          const userRole = session?.user && (session.user as any).role || 'BORROWER';
          const userCategory = session?.user && (session.user as any).renterCategory || 'EXTERNAL';

          let filteredList = list;
          if (userRole === 'BORROWER') {
            if (userCategory === 'EXTERNAL') {
              filteredList = list.filter((r: any) => r.isRentable);
            } else {
              filteredList = list.filter((r: any) => r.isLoanable || r.isRentable);
            }
          }
          
          setRooms(filteredList);
          if (roomIdParam) {
            const matched = filteredList.find((r: Room) => r.id === roomIdParam);
            if (matched) {
              setSelectedRoom(matched);
              setAvailabilityChecked(true);
              setAvailabilityOk(true);
            }
          }
        }
        if (resPay.ok) setPaymentSettings(await resPay.json());
      } catch (e) { console.error(e); }
      finally { setLoadingRooms(false); }
    })();
  }, [roomIdParam, session]);

  useEffect(() => {
    if (step !== 2) return;
    (async () => {
      try {
        setLoadingAddOns(true);
        const res = await fetch('/api/public/assets?isFixedToRoom=false&isRentable=true&status=AVAILABLE');
        if (res.ok) setAddOnAssets(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoadingAddOns(false); }
    })();
  }, [step]);

  const handleCheckAvailability = async () => {
    if (!selectedRoom || !bookingDate) {
      showToast('Lengkapi ruangan dan tanggal terlebih dahulu', 'error');
      return;
    }

    let startISO = '';
    let endISO = '';

    if (rentalType === 'HOURLY') {
      if (!startTime || !endTime) {
        showToast('Lengkapi jam mulai dan selesai', 'error');
        return;
      }
      startISO = `${bookingDate}T${startTime}:00`;
      endISO   = `${bookingDate}T${endTime}:00`;
    } else {
      const targetEndDate = endDate || bookingDate;
      startISO = `${bookingDate}T08:00:00`;
      endISO   = `${targetEndDate}T17:00:00`;
    }

    try {
      setCheckingAvail(true);
      const res = await fetch(
        `/api/rooms/${selectedRoom.id}/availability?startTime=${encodeURIComponent(startISO)}&endTime=${encodeURIComponent(endISO)}`
      );
      const data = await res.json();
      setAvailabilityChecked(true);
      const ok = data.isAvailable || data.available === true;
      setAvailabilityOk(ok);
      if (ok) {
        showToast('Ruangan tersedia pada jadwal yang dipilih!', 'success');
      } else {
        showToast(data.reason || 'Ruangan tidak tersedia pada jadwal tersebut', 'error');
      }
    } catch {
      showToast('Gagal mengecek ketersediaan', 'error');
    } finally {
      setCheckingAvail(false);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'identity' | 'permit') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (type === 'identity') setUploadingIdentity(true);
      else setUploadingPermit(true);

      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        if (type === 'identity') {
          setIdentityDocUrl(data.url);
          showToast('Identitas (KTP/KTM) berhasil diunggah!', 'success');
        } else {
          setPermitDocUrl(data.url);
          showToast('Surat Kegiatan berhasil diunggah!', 'success');
        }
      } else {
        showToast('Gagal mengunggah berkas', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi unggah', 'error');
    } finally {
      if (type === 'identity') setUploadingIdentity(false);
      else setUploadingPermit(false);
    }
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
        setPaymentProofUrl(data.url);
        showToast('Struk / bukti pembayaran berhasil diunggah!', 'success');
      } else {
        showToast('Gagal mengunggah bukti pembayaran', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi unggah', 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  const changeAddOnQty = (asset: AddOnAsset, delta: number) => {
    setAddOns((prev) => {
      const existing = prev.find((a) => a.asset.id === asset.id);
      if (!existing) {
        if (delta <= 0) return prev;
        return [...prev, { asset, qty: delta }];
      }
      const newQty = existing.qty + delta;
      if (newQty <= 0) return prev.filter((a) => a.asset.id !== asset.id);
      return prev.map((a) => a.asset.id === asset.id ? { ...a, qty: newQty } : a);
    });
  };

  const getAddOnQty = (id: string) => addOns.find((a) => a.asset.id === id)?.qty || 0;

  const handleNextStep = () => {
    if (step === 1) {
      if (!selectedRoom) { showToast('Pilih ruangan terlebih dahulu', 'error'); return; }
      if (!bookingDate) { showToast('Lengkapi tanggal sewa', 'error'); return; }
      if (rentalType === 'HOURLY' && duration <= 0) { showToast('Waktu selesai harus setelah waktu mulai', 'error'); return; }
      if (!availabilityOk) { showToast('Cek ketersediaan ruangan terlebih dahulu', 'error'); return; }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (!renterName.trim()) { showToast('Nama / Instansi penyewa wajib diisi', 'error'); return; }
      if (!renterPhone.trim()) { showToast('No. WhatsApp penyewa wajib diisi', 'error'); return; }
      if (!identityDocUrl) { showToast('Harap unggah berkas KTP / KTM terlebih dahulu', 'error'); return; }
      if (!permitDocUrl) { showToast('Harap unggah Surat Kegiatan (tanda tangan Rektor/Dekan) terlebih dahulu', 'error'); return; }
      setStep(4);
    }
  };

  const handleSubmit = async () => {
    if (!agreedToTerms) {
      showToast('Anda harus menyetujui syarat & ketentuan penggunaan elektronik sebelum melanjutkan', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const consentTextContent = renterCategory === 'EXTERNAL_SEWA'
        ? "Dengan melakukan booking sewa ini, saya menyatakan setuju atas ketentuan denda keterlambatan check-out, biaya deposit jaminan, dan kebijakan refund pembatalan yang berlaku di instansi."
        : "Dengan melakukan booking ruangan ini, saya menyatakan bertanggung jawab penuh atas keselamatan fisik gedung dan fasilitas di dalam ruangan yang saya pinjam. Saya bersedia mengganti rugi kerusakan yang timbul.";

      let startISO = '';
      let endISO = '';

      if (rentalType === 'HOURLY') {
        startISO = `${bookingDate}T${startTime}:00`;
        endISO   = `${bookingDate}T${endTime}:00`;
      } else {
        const targetEndDate = endDate || bookingDate;
        startISO = `${bookingDate}T08:00:00`;
        endISO   = `${targetEndDate}T17:00:00`;
      }

      const finalPayStatus = renterCategory === 'MAHASISWA'
        ? 'PAID'
        : renterCategory === 'EXTERNAL_PINJAM'
          ? (roomDeposit > 0 ? 'UNPAID' : 'PAID')
          : (paymentType === 'DP' ? 'DOWN_PAYMENT' : 'UNPAID');

      const res = await fetch('/api/room-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedRoom!.id,
          startTime: startISO,
          endTime: endISO,
          rentalType,
          renterName,
          renterPhone,
          renterEmail: renterEmail || undefined,
          renterIdCard: renterNik || undefined,
          supportingDocUrl: JSON.stringify([identityDocUrl, permitDocUrl]),
          paymentProofUrl: paymentProofUrl || undefined,
          payStatus: finalPayStatus,
          payMethod: renterCategory === 'MAHASISWA' ? 'Cash' : payMethod,
          notes: notes || undefined,
          depositAmount: roomDeposit,
          renterCategory,
          activityType,
          consentText: consentTextContent,
          addonAssets: addOns.map((a) => ({
            assetId: a.asset.id,
            assetName: a.asset.name,
            quantity: a.qty,
            ratePerSession: a.asset.sessionRentRate || 0,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Booking berhasil dibuat! No: ${data.bookingNumber}`, 'success');
        router.push(`/bookings/${data.bookingNumber}`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal membuat booking', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = [
    { num: 1, label: 'Ruangan & Waktu', icon: <Building2 size={16} /> },
    { num: 2, label: 'Add-On Alat',     icon: <Package size={16} /> },
    { num: 3, label: 'Data & Dokumen',  icon: <User size={16} /> },
    { num: 4, label: 'Konfirmasi',       icon: <ClipboardList size={16} /> },
  ];

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <Link
        href="/dashboard/room-bookings"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-muted)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={16} /> Kembali ke Riwayat Booking Saya
      </Link>

      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>Wizard Booking Ruangan</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Lengkapi 4 langkah sederhana untuk memesan ruangan &amp; memilih peralatan tambahan.
      </p>

      {/* Banner Warning Kuota Penuh */}
      {quotaExceeded && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
        }}>
          <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ef4444', marginBottom: '0.2rem' }}>Kuota Pemesanan Aktif Penuh</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Anda memiliki **{activeCount}** booking/peminjaman yang sedang aktif. Batas maksimal peran Anda adalah **{maxQuota}** booking aktif. Silakan selesaikan pengembalian inventaris atau tunggu booking aktif Anda selesai sebelum mengajukan kembali.
            </p>
          </div>
        </div>
      )}

      {/* Step Progress */}
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

      {/* ── STEP 1: Pilih Ruangan, Tipe Sewa & Waktu ── */}
      {step === 1 && (
        <Card className="animate-fade-in" style={{ padding: '1.75rem' }}>
          <SectionTitle icon={<Building2 size={20} />}>Langkah 1: Pilih Ruangan &amp; Waktu Sewa</SectionTitle>

          {/* Rental Type Segmented Toggle */}
          <div style={{ display: 'flex', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '0.25rem', marginBottom: '1.5rem', width: 'fit-content' }}>
            <button
              type="button"
              onClick={() => { setRentalType('HOURLY'); setAvailabilityChecked(false); }}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
                background: rentalType === 'HOURLY' ? 'var(--color-surface)' : 'transparent',
                color: rentalType === 'HOURLY' ? 'var(--color-primary)' : 'var(--color-muted)',
                fontWeight: rentalType === 'HOURLY' ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              Sewa Per Jam
            </button>
            <button
              type="button"
              onClick={() => { setRentalType('DAILY'); setAvailabilityChecked(false); }}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
                background: rentalType === 'DAILY' ? 'var(--color-primary)' : 'transparent',
                color: rentalType === 'DAILY' ? '#fff' : 'var(--color-muted)',
                fontWeight: rentalType === 'DAILY' ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              Sewa Per Hari
            </button>
          </div>

          {/* Room selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <FieldLabel required>Ruangan Terpilih</FieldLabel>
            {loadingRooms ? (
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Memuat daftar ruangan…</p>
            ) : roomIdParam && selectedRoom ? (
              <div
                style={{
                  background: 'var(--color-surface2)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', background: 'var(--color-primary)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                      🔒 TERKUNCI
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-muted)' }}>{selectedRoom.code}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-text)' }}>{selectedRoom.name}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                    Gedung: {selectedRoom.building} • Kapasitas: {selectedRoom.capacity || '-'} Org • Tarif: <strong>{formatCurrency(rentalType === 'HOURLY' ? selectedRoom.pricePerHour : (selectedRoom.pricePerDay || selectedRoom.pricePerHour * 8))}/{rentalType === 'HOURLY' ? 'jam' : 'hari'}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <select
                className="input-field"
                value={selectedRoom?.id || ''}
                onChange={(e) => {
                  const r = rooms.find((rm) => rm.id === e.target.value) || null;
                  setSelectedRoom(r);
                  setAvailabilityChecked(false);
                  setAvailabilityOk(false);
                }}
              >
                <option value="">— Pilih Ruangan —</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code}) — {formatCurrency(rentalType === 'HOURLY' ? r.pricePerHour : (r.pricePerDay || r.pricePerHour * 8))}/{rentalType === 'HOURLY' ? 'jam' : 'hari'}, Kapasitas {r.capacity} org
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date & Time depending on Rental Type */}
          {rentalType === 'HOURLY' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <Input
                label="Tanggal Sewa *"
                type="date"
                value={bookingDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => { setBookingDate(e.target.value); setAvailabilityChecked(false); setAvailabilityOk(false); }}
              />
              <Input
                label="Jam Mulai *"
                type="time"
                value={startTime}
                onChange={(e) => { setStartTime(e.target.value); setAvailabilityChecked(false); setAvailabilityOk(false); }}
              />
              <Input
                label="Jam Selesai *"
                type="time"
                value={endTime}
                onChange={(e) => { setEndTime(e.target.value); setAvailabilityChecked(false); setAvailabilityOk(false); }}
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <Input
                label="Tanggal Mulai (Sewa) *"
                type="date"
                value={bookingDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => { setBookingDate(e.target.value); setAvailabilityChecked(false); setAvailabilityOk(false); }}
              />
              <Input
                label="Sampai Tanggal (Selesai) *"
                type="date"
                value={endDate}
                min={bookingDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => { setEndDate(e.target.value); setAvailabilityChecked(false); setAvailabilityOk(false); }}
              />
            </div>
          )}

          {/* Duration & Cost preview */}
          {duration > 0 && selectedRoom && (
            <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Durasi</span>
                <strong>{duration.toFixed(1)} {rentalType === 'HOURLY' ? 'Jam' : 'Hari'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Tarif Terpilih</span>
                <strong>{formatCurrency(roomRate)} / {rentalType === 'HOURLY' ? 'jam' : 'hari'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem', display: 'block' }}>Subtotal Ruangan</span>
                <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(roomSubtotal)}</strong>
              </div>
            </div>
          )}

          {/* Availability check */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <Button variant="secondary" isLoading={checkingAvail} onClick={handleCheckAvailability}>
              Cek Ketersediaan
            </Button>
            {availabilityChecked && (
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: availabilityOk ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {availabilityOk ? '✓ Tersedia' : '✗ Tidak tersedia'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={handleNextStep} disabled={quotaExceeded || quotaLoading}>
              Lanjut ke Add-On Alat <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 2: Tambah Add-On Alat ── */}
      {step === 2 && (
        <Card className="animate-fade-in" style={{ padding: '1.75rem' }}>
          <SectionTitle icon={<Package size={20} />}>Langkah 2: Tambah Peralatan Tambahan (Add-On)</SectionTitle>

          {loadingAddOns ? (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Memuat daftar alat…</p>
          ) : addOnAssets.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Tidak ada alat yang tersedia sebagai add-on.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '420px', overflowY: 'auto' }}>
              {addOnAssets.map((asset) => {
                const qty = getAddOnQty(asset.id);
                return (
                  <div key={asset.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1rem', borderRadius: 'var(--radius-md)',
                    background: qty > 0 ? 'rgba(79, 70, 229, 0.08)' : 'var(--color-surface2)',
                    border: qty > 0 ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    gap: '1rem',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{asset.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{asset.code}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-primary-light)', fontWeight: 600, marginTop: '0.2rem' }}>
                        {formatCurrency(asset.sessionRentRate)}/sesi
                      </div>
                    </div>
                    {/* Qty controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => changeAddOnQty(asset, -1)}
                        style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >−</button>
                      <span style={{ width: '28px', textAlign: 'center', fontWeight: 700 }}>{qty}</span>
                      <button
                        onClick={() => changeAddOnQty(asset, 1)}
                        style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--grad-primary)', color: '#FFF', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >+</button>
                    </div>
                    {qty > 0 && (
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)', minWidth: '80px', textAlign: 'right' }}>
                        {formatCurrency(asset.sessionRentRate * qty)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Running total */}
          <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>Subtotal Add-On Alat</span>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-success)' }}>{formatCurrency(addOnSubtotal)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="secondary" onClick={() => setStep(1)}>← Kembali</Button>
            <Button variant="primary" onClick={handleNextStep}>
              Lanjut ke Data &amp; Dokumen <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 3: Data Penyewa & Dokumen ── */}
      {step === 3 && (
        <Card className="animate-fade-in" style={{ padding: '1.75rem' }}>
          <SectionTitle icon={<User size={20} />}>Langkah 3: Data Penyewa &amp; Unggah Dokumen Pendukung</SectionTitle>

          {/* Kategori Penyewa */}
          <div style={{ background: 'rgba(79,70,229,0.05)', border: '1px solid rgba(79,70,229,0.2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
            <FieldLabel required>Kategori Penyewa / Peminjam</FieldLabel>
            <select className="input-field" value={renterCategory} onChange={(e) => setRenterCategory(e.target.value as any)} style={{ width: '100%', fontWeight: 700 }}>
              <option value="MAHASISWA">🎓 Mahasiswa / Internal Kampus (Gratis Sewa & Bebas Deposit)</option>
              <option value="EXTERNAL_PINJAM">🤝 Eksternal Pinjam - Peminjaman Lembaga (Bebas Sewa, Dikenakan Deposit Jaminan)</option>
              <option value="EXTERNAL_SEWA">💼 Eksternal Sewa - Komersial Umum (Dikenakan Tarif Sewa, Bebas Deposit)</option>
            </select>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.4rem', lineHeight: 1.4 }}>
              * Sistem akan otomatis menyesuaikan aturan biaya sewa ruangan/alat dan nominal deposit sesuai kategori yang dipilih.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <Input label="Nama Lengkap / Instansi *" placeholder="PT. Contoh / Budi Santoso" value={renterName} onChange={(e) => setRenterName(e.target.value)} required />
            <Input label="No. WhatsApp *" type="tel" placeholder="08xxxxxxxxxx" value={renterPhone} onChange={(e) => setRenterPhone(e.target.value)} required />
            <Input label="Email Akun" type="email" placeholder="email@domain.com" value={renterEmail} onChange={(e) => setRenterEmail(e.target.value)} />
            <Input label="NIK / NIP / KTP (Opsional)" placeholder="3201xxxxxxxxxxxx" value={renterNik} onChange={(e) => setRenterNik(e.target.value)} />
          </div>

          {/* Double File Uploader Pendukung */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Uploader 1: KTP / KTM */}
            <div style={{
              background: 'var(--color-surface2)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: `1px ${identityDocUrl ? 'solid var(--color-success)' : 'dashed var(--color-border)'}`,
            }}>
              <FieldLabel required>Unggah KTP / KTM Pemohon</FieldLabel>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="input-field"
                style={{ width: '100%' }}
                onChange={(e) => handleUploadFile(e, 'identity')}
              />
              {uploadingIdentity && <div style={{ fontSize: '0.73rem', color: 'var(--color-primary)', marginTop: '0.3rem' }}>Sedang mengunggah...</div>}
              {identityDocUrl && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <CheckCircle size={14} /> Berhasil diunggah! (<a href={identityDocUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Lihat File</a>)
                </div>
              )}
            </div>

            {/* Uploader 2: Surat Kegiatan */}
            <div style={{
              background: 'var(--color-surface2)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: `1px ${permitDocUrl ? 'solid var(--color-success)' : 'dashed var(--color-border)'}`,
            }}>
              <FieldLabel required>Surat Kegiatan (Tanda Tangan Dekan/Rektor)</FieldLabel>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="input-field"
                style={{ width: '100%' }}
                onChange={(e) => handleUploadFile(e, 'permit')}
              />
              {uploadingPermit && <div style={{ fontSize: '0.73rem', color: 'var(--color-primary)', marginTop: '0.3rem' }}>Sedang mengunggah...</div>}
              {permitDocUrl && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <CheckCircle size={14} /> Berhasil diunggah! (<a href={permitDocUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Lihat File</a>)
                </div>
              )}
            </div>
          </div>

          {renterCategory !== 'MAHASISWA' && (
            <div style={{ display: 'grid', gridTemplateColumns: renterCategory === 'EXTERNAL_SEWA' ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              {renterCategory === 'EXTERNAL_SEWA' && (
                <div>
                  <FieldLabel required>Skema Pembayaran</FieldLabel>
                  <select className="input-field" value={paymentType} onChange={(e) => setPaymentType(e.target.value as 'DP' | 'LUNAS')}>
                    <option value="LUNAS">Lunas (100%) — {formatCurrency(grandTotal)}</option>
                    <option value="DP">DP 50% — {formatCurrency(Math.ceil(grandTotal * 0.5))}</option>
                  </select>
                </div>
              )}
              <div>
                <FieldLabel required>Cara Bayar</FieldLabel>
                <select className="input-field" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="Transfer">Transfer Bank</option>
                  <option value="QRIS">QRIS / E-Wallet</option>
                  <option value="Cash">Tunai / Cash</option>
                </select>
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <FieldLabel>Catatan Tambahan (Opsional)</FieldLabel>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Keperluan acara, request layout ruangan, atau catatan khusus..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ height: '42px', resize: 'none' }}
              />
            </div>
            <div>
              <FieldLabel required>Prioritas Jenis Kegiatan</FieldLabel>
              <select
                className="input-field"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="PERSONAL">Personal / Mandiri / Umum</option>
                <option value="ORGANIZATION">Organisasi Mahasiswa / UKM / Ormawa</option>
                <option value="INSTITUTION">Resmi Institusi / Kegiatan Kampus / Dinas</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="secondary" onClick={() => setStep(2)}>← Kembali</Button>
            <Button variant="primary" onClick={handleNextStep}>
              Lanjut ke Ringkasan <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 4: Ringkasan & Konfirmasi ── */}
      {step === 4 && (
        <Card className="animate-fade-in" style={{ padding: '1.75rem' }}>
          <SectionTitle icon={<ClipboardList size={20} />}>Langkah 4: Ringkasan &amp; Konfirmasi</SectionTitle>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {/* Room block */}
            <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.78rem', marginBottom: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detail Ruangan</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.85rem' }}>
                <InfoRow label="Ruangan" value={`${selectedRoom?.name} (${selectedRoom?.code})`} />
                <InfoRow label="Tipe Sewa" value={rentalType === 'HOURLY' ? 'Per Jam' : 'Per Hari'} />
                <InfoRow label="Jadwal Sewa" value={rentalType === 'HOURLY' ? `${bookingDate} (${startTime} - ${endTime})` : `${bookingDate} s.d ${endDate || bookingDate}`} />
                <InfoRow label="Durasi" value={`${duration.toFixed(1)} ${rentalType === 'HOURLY' ? 'jam' : 'hari'}`} />
                <InfoRow label="Subtotal Ruangan" value={<span style={{ color: 'var(--color-success)' }}>{formatCurrency(roomSubtotal)}</span>} />
              </div>
            </div>

            {/* Add-ons block */}
            {addOns.length > 0 && (
              <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.78rem', marginBottom: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add-On Peralatan</p>
                {addOns.map((a) => (
                  <div key={a.asset.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <span>{a.asset.name} × {a.qty}</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(a.asset.sessionRentRate * a.qty)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Subtotal Add-On</span>
                  <span style={{ color: 'var(--color-success)' }}>{formatCurrency(addOnSubtotal)}</span>
                </div>
              </div>
            )}

            {/* Renter & payment block */}
            <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.78rem', marginBottom: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data Penyewa & Pembayaran</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.85rem' }}>
                <InfoRow label="Nama / Instansi" value={renterName} />
                <InfoRow label="No. WhatsApp" value={renterPhone} />
                {renterEmail && <InfoRow label="Email" value={renterEmail} />}
                <InfoRow label="Dokumen Resmi" value={identityDocUrl && permitDocUrl ? '✓ Lengkap (2 Berkas)' : 'Tidak Lengkap'} />
                <InfoRow label="Skema Pembayaran" value={paymentType === 'DP' ? 'DP 50%' : 'Lunas (100%)'} />
                <InfoRow label="Metode" value={payMethod} />
              </div>
            </div>

            {/* Grand total */}
            <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span>Subtotal Ruangan + Add-On</span>
                <span style={{ fontWeight: 700 }}>{formatCurrency(roomSubtotal + addOnSubtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span>Deposit Jaminan (Dikembalikan saat Check-Out)</span>
                <span style={{ fontWeight: 700 }}>{formatCurrency(roomDeposit)}</span>
              </div>
              <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
                <span>Total Tagihan ({paymentType === 'DP' ? 'DP 50%' : '100%'})</span>
                <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(depositToPay)}</span>
              </div>
            </div>
          </div>

          {/* T&C Scrollable Box */}
          <div style={{ marginBottom: '1.5rem' }}>
            <FieldLabel required>Pernyataan Syarat &amp; Ketentuan Penggunaan Elektronik</FieldLabel>
            <div style={{
              background: 'var(--color-surface2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              fontSize: '0.78rem',
              color: 'var(--color-muted)',
              maxHeight: '90px',
              overflowY: 'auto',
              lineHeight: 1.5,
              marginBottom: '0.75rem'
            }}>
              {renterCategory === 'EXTERNAL_SEWA'
                ? "Dengan melakukan booking sewa ini, saya menyatakan setuju atas ketentuan denda keterlambatan check-out, biaya deposit jaminan, dan kebijakan refund pembatalan yang berlaku di instansi."
                : "Dengan melakukan booking ruangan ini, saya menyatakan bertanggung jawab penuh atas keselamatan fisik gedung dan fasilitas di dalam ruangan yang saya pinjam. Saya bersedia mengganti rugi kerusakan yang timbul."}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Saya menyatakan setuju dan tunduk pada aturan penggunaan fasilitas di atas.
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="secondary" onClick={() => setStep(3)}>← Kembali</Button>
            <Button variant="primary" isLoading={submitting} onClick={handleSubmit} disabled={!agreedToTerms}>
              <Send size={18} /> Konfirmasi &amp; Terbitkan E-Voucher
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function NewRoomBookingPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem' }}>Memuat form wizard…</p>}>
      <RoomBookingWizardContent />
    </Suspense>
  );
}

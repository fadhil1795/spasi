'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  CheckCircle2,
  Building2,
  Package,
  User,
  ClipboardList,
  Send,
  CalendarClock,
  Upload,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';

interface Room {
  id: string;
  name: string;
  code: string;
  building?: string;
  pricePerHour: number;
  pricePerDay?: number;
  capacity: number;
  depositAmount?: number;
  isRentable?: boolean;
  isLoanable?: boolean;
  requiresDepositForInternal?: boolean;
}

interface CategoryNode {
  id: string;
  name: string;
  parentId?: string | null;
}

interface AddOnAsset {
  id: string;
  name: string;
  code: string;
  sessionRentRate: number;
  availableQty?: number;
  quantity?: number;
  isFixedToRoom?: boolean;
  isRentable?: boolean;
  isLoanable?: boolean;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    parentId?: string | null;
    parent?: { id: string; name: string } | null;
  } | null;
}

interface AddOnItem {
  asset: AddOnAsset;
  qty: number;
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

function SinglePageSarprasBookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdParam = searchParams.get('roomId');
  const editIdParam = searchParams.get('editId');
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  const { data: session } = useSession();
  const { showToast } = useToast();

  const [submitting, setSubmitting] = useState(false);

  // 1. Ruangan & Jadwal
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [assetOnlyMode, setAssetOnlyMode] = useState(false);
  const [rentalType, setRentalType] = useState<'HOURLY' | 'DAILY'>('HOURLY');
  const [bookingDate, setBookingDate] = useState(() => {
    if (startParam) return startParam.split('T')[0];
    return new Date().toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    if (endParam) return endParam.split('T')[0];
    return new Date().toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState(() => {
    if (startParam && startParam.includes('T')) return startParam.split('T')[1].substring(0, 5);
    return '08:00';
  });
  const [endTime, setEndTime] = useState(() => {
    if (endParam && endParam.includes('T')) return endParam.split('T')[1].substring(0, 5);
    return '17:00';
  });
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [availabilityOk, setAvailabilityOk] = useState(false);
  const [checkingAvail, setCheckingAvail] = useState(false);

  // 2. Peralatan / Add-On Multi-Aset (Kategori -> Sub Kategori -> Aset)
  const [allAssets, setAllAssets] = useState<AddOnAsset[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loadingAddOns, setLoadingAddOns] = useState(false);
  const [selectedParentCat, setSelectedParentCat] = useState<string>('ALL');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('ALL');
  const [assetSearch, setAssetSearch] = useState('');
  const [pickerAssetId, setPickerAssetId] = useState('');
  const [pickerQty, setPickerQty] = useState<number>(1);
  const [addOns, setAddOns] = useState<AddOnItem[]>([]);

  // 3. Data Pemohon & Berkas
  const [renterName, setRenterName] = useState(session?.user?.name || '');
  const [renterPhone, setRenterPhone] = useState('');
  const [renterEmail, setRenterEmail] = useState(session?.user?.email || '');
  const [renterNik, setRenterNik] = useState('');
  const [identityDocUrl, setIdentityDocUrl] = useState('');
  const [permitDocUrl, setPermitDocUrl] = useState('');
  const [uploadingIdentity, setUploadingIdentity] = useState(false);
  const [uploadingPermit, setUploadingPermit] = useState(false);
  const [activityType, setActivityType] = useState<'AKADEMIK' | 'KEMAHASISWAAN' | 'PERSONAL'>('AKADEMIK');
  const [notes, setNotes] = useState('');

  // 4. Pembayaran & Konfirmasi
  const [renterCategory, setRenterCategory] = useState<'MAHASISWA' | 'EXTERNAL_PINJAM' | 'EXTERNAL_SEWA'>('MAHASISWA');
  const [paymentType, setPaymentType] = useState<'FULL' | 'DOWN_PAYMENT'>('FULL');
  const [payMethod, setPayMethod] = useState<'Transfer' | 'QRIS' | 'Cash'>('Transfer');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Quota
  const [activeCount, setActiveCount] = useState<number>(0);
  const [maxQuota, setMaxQuota] = useState<number>(2);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const userRole = (session?.user as any)?.role || 'BORROWER';
  const isAdminOrStaff = ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(userRole);

  // Durasi & Biaya
  const duration = useMemo(() => {
    if (rentalType === 'HOURLY') {
      if (!startTime || !endTime) return 0;
      const [h1, m1] = startTime.split(':').map(Number);
      const [h2, m2] = endTime.split(':').map(Number);
      const diff = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
      return diff > 0 ? Math.round(diff * 10) / 10 : 0;
    } else {
      if (!bookingDate || !endDate) return 1;
      const d1 = new Date(bookingDate);
      const d2 = new Date(endDate);
      const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 1;
    }
  }, [rentalType, startTime, endTime, bookingDate, endDate]);

  const roomRate = assetOnlyMode
    ? 0
    : rentalType === 'HOURLY'
    ? (selectedRoom?.pricePerHour || 0)
    : (selectedRoom?.pricePerDay || (selectedRoom?.pricePerHour || 0) * 8);

  const isFreeForInternal = selectedRoom ? selectedRoom.isLoanable !== false : true;

  const roomSubtotal = assetOnlyMode
    ? 0
    : renterCategory === 'MAHASISWA'
    ? isFreeForInternal
      ? 0
      : roomRate * duration
    : renterCategory === 'EXTERNAL_PINJAM'
    ? 0
    : roomRate * duration;

  const addOnSubtotal =
    renterCategory === 'MAHASISWA'
      ? isFreeForInternal
        ? 0
        : addOns.reduce((acc, a) => acc + (a.asset.sessionRentRate || 0) * a.qty, 0)
      : renterCategory === 'EXTERNAL_PINJAM'
      ? 0
      : addOns.reduce((acc, a) => acc + (a.asset.sessionRentRate || 0) * a.qty, 0);

  const roomDeposit =
    renterCategory === 'MAHASISWA'
      ? selectedRoom?.requiresDepositForInternal
        ? selectedRoom?.depositAmount || 0
        : 0
      : selectedRoom?.depositAmount || 0;

  const grandTotal = roomSubtotal + addOnSubtotal + roomDeposit;
  const depositToPay =
    renterCategory === 'EXTERNAL_SEWA' && paymentType === 'DOWN_PAYMENT'
      ? Math.ceil(grandTotal * 0.5)
      : grandTotal;

  // Load Quota, Rooms, Payment Settings, Categories & Assets once
  useEffect(() => {
    (async () => {
      try {
        setLoadingRooms(true);
        setLoadingAddOns(true);
        const [resQuota, resRooms, resPay, resCats, resAssets] = await Promise.all([
          fetch('/api/policies/quota?checkActive=true'),
          fetch('/api/rooms?status=AVAILABLE'),
          fetch('/api/settings/payment'),
          fetch('/api/categories'),
          fetch('/api/public/assets?status=AVAILABLE'),
        ]);

        if (resQuota.ok) {
          const qData = await resQuota.json();
          setActiveCount(qData.activeCount || 0);
          setMaxQuota(qData.maxQuota || 2);
          if (qData.status === 'EXCEEDED') setQuotaExceeded(true);
        }

        if (resRooms.ok) {
          const list = await resRooms.json();
          const role = (session?.user as any)?.role || 'BORROWER';
          const cat = (session?.user as any)?.renterCategory || 'EXTERNAL';
          let filteredList = list;
          if (role === 'BORROWER') {
            filteredList =
              cat === 'EXTERNAL'
                ? list.filter((r: any) => r.isRentable)
                : list.filter((r: any) => r.isLoanable || r.isRentable);
          }
          setRooms(filteredList);
          if (roomIdParam) {
            const matched = filteredList.find((r: Room) => r.id === roomIdParam);
            if (matched) setSelectedRoom(matched);
          }
        }

        if (resPay.ok) setPaymentSettings(await resPay.json());
        if (resCats.ok) {
          const catData = await resCats.json();
          setCategories(Array.isArray(catData) ? catData : []);
        }
        if (resAssets.ok) {
          const aData = await resAssets.json();
          const portable = (Array.isArray(aData) ? aData : []).filter(
            (a: AddOnAsset) => !a.isFixedToRoom && (a.availableQty ?? a.quantity ?? 1) > 0
          );
          setAllAssets(portable);

          // Prefill jika sedang mode Edit Pesanan (?editId=...)
          if (editIdParam) {
            const resEdit = await fetch(`/api/room-bookings/${editIdParam}`);
            if (resEdit.ok) {
              const b = await resEdit.json();
              if (!['PENDING', 'PENDING_L1', 'PENDING_L2'].includes(b.bookingStatus)) {
                showToast('Pesanan sudah disetujui/diproses sehingga tidak dapat diedit lagi.', 'error');
                router.replace(`/dashboard/room-bookings/${b.id}`);
                return;
              }
              if (b.locationId && b.location) {
                setAssetOnlyMode(false);
                setSelectedRoom(b.location);
                setAvailabilityChecked(true);
                setAvailabilityOk(true);
              } else {
                setAssetOnlyMode(true);
                setSelectedRoom(null);
              }
              setRentalType(b.rentalType === 'DAILY' ? 'DAILY' : 'HOURLY');
              const sDate = new Date(b.startTime);
              const eDate = new Date(b.endTime);
              setBookingDate(sDate.toISOString().split('T')[0]);
              setEndDate(eDate.toISOString().split('T')[0]);
              setStartTime(sDate.toTimeString().slice(0, 5));
              setEndTime(eDate.toTimeString().slice(0, 5));
              if (b.renter) {
                setRenterName(b.renter.name || '');
                setRenterPhone(b.renter.phone || '');
                setRenterEmail(b.renter.email || '');
                setRenterNik(b.renter.idCardNo || '');
              }
              if (b.renterCategory) setRenterCategory(b.renterCategory);
              if (b.activityType) setActivityType(b.activityType);
              if (b.notes) setNotes(b.notes);
              if (b.paymentScheme) {
                setPaymentType(b.paymentScheme === 'DOWN_PAYMENT' || b.paymentScheme === 'DP' ? 'DOWN_PAYMENT' : 'FULL');
              }
              if (b.payMethod) setPayMethod(b.payMethod);
              if (b.paymentProofUrl) setPaymentProofUrl(b.paymentProofUrl);
              if (b.supportingDocUrl) {
                try {
                  const docs = JSON.parse(b.supportingDocUrl);
                  if (Array.isArray(docs)) {
                    if (docs[0]) setIdentityDocUrl(docs[0]);
                    if (docs[1]) setPermitDocUrl(docs[1]);
                  }
                } catch {}
              }
              if (Array.isArray(b.addonAssets) && b.addonAssets.length > 0) {
                setAddOns(
                  b.addonAssets.map((ad: any) => {
                    const found = portable.find((p: AddOnAsset) => p.id === ad.assetId);
                    return {
                      asset: found || {
                        id: ad.assetId,
                        name: ad.assetName || 'Aset',
                        code: '-',
                        sessionRentRate: ad.ratePerSession || 0,
                      },
                      qty: ad.quantity || 1,
                    };
                  })
                );
              }
              setAgreedToTerms(true);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingRooms(false);
        setLoadingAddOns(false);
      }
    })();
  }, [roomIdParam, editIdParam, session, router, showToast]);

  useEffect(() => {
    if (session?.user) {
      if (session.user.name && !renterName) setRenterName(session.user.name);
      if (session.user.email && !renterEmail) setRenterEmail(session.user.email);
      const userPhone = (session.user as any).phone;
      if (userPhone && !renterPhone) setRenterPhone(userPhone);
      const userNik = (session.user as any).identityNo;
      if (userNik && !renterNik) setRenterNik(userNik);

      const cat = (session.user as any).renterCategory;
      const role = (session.user as any).role;
      if (cat === 'MAHASISWA' || cat === 'INTERNAL' || cat === 'INTERNAL_KAMPUS' || role === 'STAFF') {
        setRenterCategory('MAHASISWA');
      } else if (cat === 'EXTERNAL') {
        setRenterCategory('EXTERNAL_SEWA');
      }
    }
  }, [session, renterName, renterEmail, renterPhone, renterNik]);

  // Derived Category & Sub-Category lists
  const parentCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  );

  const subCategories = useMemo(() => {
    if (selectedParentCat === 'ALL') return categories.filter((c) => !!c.parentId);
    return categories.filter((c) => c.parentId === selectedParentCat);
  }, [categories, selectedParentCat]);

  const filteredPickerAssets = useMemo(() => {
    return allAssets.filter((a) => {
      if (selectedSubCat !== 'ALL') {
        if (a.categoryId !== selectedSubCat && a.category?.id !== selectedSubCat) return false;
      } else if (selectedParentCat !== 'ALL') {
        const matchParent =
          a.categoryId === selectedParentCat ||
          a.category?.id === selectedParentCat ||
          a.category?.parentId === selectedParentCat ||
          a.category?.parent?.id === selectedParentCat;
        if (!matchParent) return false;
      }
      if (assetSearch.trim()) {
        const q = assetSearch.toLowerCase();
        if (!a.name.toLowerCase().includes(q) && !a.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allAssets, selectedParentCat, selectedSubCat, assetSearch]);

  const handleCheckAvailability = async () => {
    if (!selectedRoom || !bookingDate) {
      showToast('Lengkapi ruangan dan tanggal terlebih dahulu', 'error');
      return;
    }

    let startISO = '';
    let endISO = '';
    if (rentalType === 'HOURLY') {
      if (!startTime || !endTime || duration <= 0) {
        showToast('Waktu selesai harus setelah waktu mulai', 'error');
        return;
      }
      startISO = `${bookingDate}T${startTime}:00`;
      endISO = `${bookingDate}T${endTime}:00`;
    } else {
      const targetEndDate = endDate || bookingDate;
      startISO = `${bookingDate}T08:00:00`;
      endISO = `${targetEndDate}T17:00:00`;
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

  const handleAddAssetToList = () => {
    if (!pickerAssetId) {
      showToast('Pilih peralatan/aset terlebih dahulu', 'error');
      return;
    }
    const target = allAssets.find((a) => a.id === pickerAssetId);
    if (!target) return;
    const maxAvail = target.availableQty ?? target.quantity ?? 1;
    const reqQty = Math.max(1, Math.min(maxAvail, pickerQty || 1));

    setAddOns((prev) => {
      const existing = prev.find((p) => p.asset.id === target.id);
      if (existing) {
        const nextQty = Math.min(maxAvail, existing.qty + reqQty);
        return prev.map((p) => (p.asset.id === target.id ? { ...p, qty: nextQty } : p));
      }
      return [...prev, { asset: target, qty: reqQty }];
    });
    setPickerAssetId('');
    setPickerQty(1);
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

  const handleSubmit = async () => {
    if (!assetOnlyMode && !selectedRoom) {
      showToast('Pilih ruangan terlebih dahulu atau aktifkan mode Peralatan Saja', 'error');
      return;
    }
    if (assetOnlyMode && addOns.length === 0) {
      showToast('Tambahkan minimal 1 peralatan Sarpras ke dalam daftar', 'error');
      return;
    }
    if (!bookingDate) {
      showToast('Lengkapi tanggal sewa/pinjam', 'error');
      return;
    }
    if (rentalType === 'HOURLY' && duration <= 0) {
      showToast('Waktu selesai harus setelah waktu mulai', 'error');
      return;
    }
    if (!assetOnlyMode && !availabilityOk) {
      showToast('Klik "Cek Ketersediaan" ruangan terlebih dahulu hingga berstatus Tersedia', 'error');
      return;
    }
    if (!renterName.trim() || !renterPhone.trim()) {
      showToast('Nama pemohon dan No. WhatsApp wajib diisi', 'error');
      return;
    }
    if (!identityDocUrl || !permitDocUrl) {
      showToast('Harap unggah KTP/KTM dan Surat Kegiatan terlebih dahulu', 'error');
      return;
    }
    if (!agreedToTerms) {
      showToast('Centang persetujuan syarat & ketentuan elektronik terlebih dahulu', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const consentTextContent =
        renterCategory === 'EXTERNAL_SEWA'
          ? 'Dengan melakukan booking sewa ini, saya menyatakan setuju atas ketentuan denda keterlambatan check-out, biaya deposit jaminan, dan kebijakan refund pembatalan yang berlaku di instansi.'
          : 'Dengan melakukan booking Sarpras ini, saya menyatakan bertanggung jawab penuh atas keselamatan fisik gedung dan fasilitas/peralatan yang saya pinjam. Saya bersedia mengganti rugi kerusakan yang timbul.';

      const startISO =
        rentalType === 'HOURLY' ? `${bookingDate}T${startTime}:00` : `${bookingDate}T08:00:00`;
      const endISO =
        rentalType === 'HOURLY' ? `${bookingDate}T${endTime}:00` : `${endDate || bookingDate}T17:00:00`;

      const finalPayStatus =
        grandTotal === 0
          ? 'PAID'
          : paymentProofUrl
          ? 'PENDING_VERIFICATION'
          : 'UNPAID';

      const endpoint = editIdParam ? `/api/room-bookings/${editIdParam}` : '/api/room-bookings';
      const method = editIdParam ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: assetOnlyMode ? null : selectedRoom?.id || null,
          startTime: startISO,
          endTime: endISO,
          rentalType,
          ...(editIdParam
            ? {}
            : {
                renterName,
                renterPhone,
                renterEmail: renterEmail || undefined,
                renterIdCard: renterNik || undefined,
                depositAmount: roomDeposit,
                renterCategory,
                consentText: consentTextContent,
              }),
          supportingDocUrl: JSON.stringify([identityDocUrl, permitDocUrl]),
          paymentProofUrl: paymentProofUrl || undefined,
          payStatus: editIdParam ? undefined : finalPayStatus,
          payMethod: renterCategory === 'MAHASISWA' ? 'Cash' : payMethod,
          paymentScheme: paymentType,
          notes: notes || undefined,
          activityType,
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
        showToast(
          editIdParam
            ? `Perubahan pesanan #${data.bookingNumber} berhasil disimpan!`
            : `Pengajuan Sarpras berhasil dibuat! No: ${data.bookingNumber}`,
          'success'
        );
        router.push(`/dashboard/room-bookings/${data.id}`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan pengajuan Sarpras', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Link
        href="/dashboard/room-bookings"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-muted)', fontSize: '0.9rem', fontWeight: 600 }}
      >
        <ArrowLeft size={16} /> Kembali ke Daftar Sewa &amp; Booking
      </Link>

      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
          {editIdParam ? 'Edit Pengajuan Sewa & Booking Sarpras' : 'Pengajuan Sewa & Booking Sarpras'}
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          {editIdParam
            ? 'Perbarui jadwal, ruangan, peralatan, atau berkas selama pesanan belum disetujui admin.'
            : 'Lengkapi formulir satu halaman ini untuk memesan ruangan sekaligus peralatan, atau peralatan Sarpras saja.'}
        </p>
      </div>

      {quotaExceeded && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={20} />
          Kuota aktif Anda ({activeCount}/{maxQuota}) telah mencapai batas maksimal. Selesaikan transaksi berjalan sebelum mengajukan baru.
        </div>
      )}

      {/* ── BAGIAN 1: RUANGAN & JADWAL ── */}
      <Card style={{ padding: '1.5rem' }}>
        <SectionTitle icon={<Building2 size={20} />}>1. Ruangan &amp; Jadwal Pemakaian</SectionTitle>

        {/* Toggle Tipe Sewa */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => { setRentalType('HOURLY'); setAvailabilityChecked(false); setAvailabilityOk(false); }}
            className={rentalType === 'HOURLY' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          >
            Sewa / Pinjam Per Jam
          </button>
          <button
            type="button"
            onClick={() => { setRentalType('DAILY'); setAvailabilityChecked(false); setAvailabilityOk(false); }}
            className={rentalType === 'DAILY' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          >
            Sewa / Pinjam Per Hari
          </button>
        </div>

        {/* Pilihan Ruangan */}
        <div style={{ marginBottom: '1rem' }}>
          <FieldLabel required={!assetOnlyMode}>Pilih Ruangan / Venue</FieldLabel>
          {roomIdParam && selectedRoom ? (
            <div style={{ background: 'var(--color-surface2)', padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary-light)' }}>
              <div style={{ fontWeight: 800 }}>{selectedRoom.name} ({selectedRoom.code})</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                Gedung: {selectedRoom.building || '-'} • Kapasitas: {selectedRoom.capacity || '-'} Org • Tarif:{' '}
                <strong>{formatCurrency(roomRate)}/{rentalType === 'HOURLY' ? 'jam' : 'hari'}</strong>
              </div>
            </div>
          ) : (
            <select
              className="input-field"
              disabled={assetOnlyMode || loadingRooms}
              value={selectedRoom?.id || ''}
              onChange={(e) => {
                const r = rooms.find((rm) => rm.id === e.target.value) || null;
                setSelectedRoom(r);
                setAvailabilityChecked(false);
                setAvailabilityOk(false);
              }}
            >
              <option value="">{loadingRooms ? 'Memuat ruangan...' : '— Pilih Ruangan —'}</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code}) — {formatCurrency(rentalType === 'HOURLY' ? r.pricePerHour : (r.pricePerDay || r.pricePerHour * 8))}/{rentalType === 'HOURLY' ? 'jam' : 'hari'}
                </option>
              ))}
            </select>
          )}

          {!roomIdParam && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem', fontSize: '0.84rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={assetOnlyMode}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAssetOnlyMode(checked);
                  if (checked) {
                    setSelectedRoom(null);
                    setAvailabilityChecked(false);
                    setAvailabilityOk(false);
                  }
                }}
              />
              Sewa / Pinjam Peralatan Sarpras Saja (Tanpa Ruangan)
            </label>
          )}
        </div>

        {/* Tanggal & Jam */}
        {rentalType === 'HOURLY' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <Input
              label="Tanggal Pemakaian *"
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <Input
              label="Tanggal Mulai *"
              type="date"
              value={bookingDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => { setBookingDate(e.target.value); setAvailabilityChecked(false); setAvailabilityOk(false); }}
            />
            <Input
              label="Tanggal Selesai *"
              type="date"
              value={endDate}
              min={bookingDate}
              onChange={(e) => { setEndDate(e.target.value); setAvailabilityChecked(false); setAvailabilityOk(false); }}
            />
          </div>
        )}

        {/* Info Durasi & Cek Ketersediaan */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '0.85rem 1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.86rem' }}>
            <div>
              <span style={{ color: 'var(--color-muted)' }}>Durasi: </span>
              <strong>{duration} {rentalType === 'HOURLY' ? 'Jam' : 'Hari'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-muted)' }}>Subtotal Ruangan: </span>
              <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(roomSubtotal)}</strong>
            </div>
          </div>

          {!assetOnlyMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Button type="button" variant="secondary" size="sm" onClick={handleCheckAvailability} isLoading={checkingAvail}>
                <CalendarClock size={14} /> Cek Ketersediaan
              </Button>
              {availabilityChecked && (
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: availabilityOk ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {availabilityOk ? '✓ Tersedia' : '✗ Tidak Tersedia'}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ── BAGIAN 2: PILIH PERALATAN / SARPRAS (MULTI-ASET) ── */}
      <Card style={{ padding: '1.5rem' }}>
        <SectionTitle icon={<Package size={20} />}>
          2. Pilih Peralatan / Sarana {assetOnlyMode ? '(Wajib Minimal 1 Aset)' : '(Opsional — Bisa Tambah Banyak)'}
        </SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <FieldLabel>Master Kategori Aset</FieldLabel>
            <select
              className="input-field"
              value={selectedParentCat}
              onChange={(e) => {
                setSelectedParentCat(e.target.value);
                setSelectedSubCat('ALL');
                setPickerAssetId('');
              }}
            >
              <option value="ALL">— Semua Kategori —</option>
              {parentCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Sub Kategori</FieldLabel>
            <select
              className="input-field"
              value={selectedSubCat}
              onChange={(e) => {
                setSelectedSubCat(e.target.value);
                setPickerAssetId('');
              }}
            >
              <option value="ALL">— Semua Sub Kategori —</option>
              {subCategories.map((sc) => (
                <option key={sc.id} value={sc.id}>{sc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Cari Nama / Kode Aset</FieldLabel>
            <input
              type="text"
              className="input-field"
              placeholder="Ketik nama / kode..."
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: '0.75rem', alignItems: 'end', marginBottom: '1.25rem' }}>
          <div>
            <FieldLabel>Pilih Aset</FieldLabel>
            <select
              className="input-field"
              disabled={loadingAddOns}
              value={pickerAssetId}
              onChange={(e) => setPickerAssetId(e.target.value)}
            >
              <option value="">
                {loadingAddOns ? 'Memuat daftar aset...' : `— Pilih Aset (${filteredPickerAssets.length} tersedia) —`}
              </option>
              {filteredPickerAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.code}] {a.name} — Stok: {a.availableQty ?? a.quantity ?? 1} Unit
                  {a.sessionRentRate ? ` (${formatCurrency(a.sessionRentRate)}/sesi)` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Jumlah</FieldLabel>
            <input
              type="number"
              min={1}
              className="input-field"
              value={pickerQty}
              onChange={(e) => setPickerQty(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <Button type="button" variant="primary" onClick={handleAddAssetToList} style={{ height: '42px' }}>
            <Plus size={16} /> Tambah
          </Button>
        </div>

        {addOns.length > 0 ? (
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  <th style={{ padding: '0.7rem', width: '40px' }}>No</th>
                  <th style={{ padding: '0.7rem' }}>Kode &amp; Nama Aset</th>
                  <th style={{ padding: '0.7rem' }}>Tarif/Sesi</th>
                  <th style={{ padding: '0.7rem', width: '110px' }}>Jumlah</th>
                  <th style={{ padding: '0.7rem' }}>Subtotal</th>
                  <th style={{ padding: '0.7rem', textAlign: 'right', width: '70px' }}>Hapus</th>
                </tr>
              </thead>
              <tbody>
                {addOns.map((item, idx) => {
                  const maxQty = item.asset.availableQty ?? item.asset.quantity ?? 99;
                  const itemRate = renterCategory === 'EXTERNAL_SEWA' || !isFreeForInternal ? item.asset.sessionRentRate || 0 : 0;
                  return (
                    <tr key={item.asset.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.7rem' }}>{idx + 1}</td>
                      <td style={{ padding: '0.7rem' }}>
                        <div style={{ fontWeight: 700 }}>{item.asset.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                          {item.asset.code}
                        </div>
                      </td>
                      <td style={{ padding: '0.7rem' }}>{formatCurrency(itemRate)}</td>
                      <td style={{ padding: '0.7rem' }}>
                        <input
                          type="number"
                          min={1}
                          max={maxQty}
                          className="input-field"
                          value={item.qty}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1));
                            setAddOns((prev) =>
                              prev.map((p) => (p.asset.id === item.asset.id ? { ...p, qty: val } : p))
                            );
                          }}
                          style={{ padding: '0.35rem 0.5rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.7rem', fontWeight: 700 }}>
                        {formatCurrency(itemRate * item.qty)}
                      </td>
                      <td style={{ padding: '0.7rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setAddOns((prev) => prev.filter((p) => p.asset.id !== item.asset.id))}
                          style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                          title="Hapus item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.85rem', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            Belum ada peralatan Sarpras ditambahkan. Pilih kategori &amp; aset di atas lalu klik <strong>+ Tambah</strong>.
          </div>
        )}
      </Card>

      {/* ── BAGIAN 3: DATA PEMOHON, KEPERLUAN & BERKAS ── */}
      <Card style={{ padding: '1.5rem' }}>
        <SectionTitle icon={<User size={20} />}>3. Data Pemohon, Keperluan &amp; Berkas</SectionTitle>

        {isAdminOrStaff && (
          <div style={{ marginBottom: '1rem' }}>
            <FieldLabel>Kategori Pemohon / Tarif</FieldLabel>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { val: 'MAHASISWA', label: 'Internal (Mahasiswa/Unit)' },
                { val: 'EXTERNAL_PINJAM', label: 'Eksternal (Pinjam Gratis)' },
                { val: 'EXTERNAL_SEWA', label: 'Eksternal (Sewa Berbayar)' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setRenterCategory(opt.val as any)}
                  className={renterCategory === opt.val ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <Input label="Nama Lengkap / Instansi *" value={renterName} onChange={(e) => setRenterName(e.target.value)} />
          <Input label="No. WhatsApp *" value={renterPhone} onChange={(e) => setRenterPhone(e.target.value)} placeholder="0812..." />
          <Input label="Email" type="email" value={renterEmail} onChange={(e) => setRenterEmail(e.target.value)} />
          <Input label="NIK / NIM / NIP" value={renterNik} onChange={(e) => setRenterNik(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <FieldLabel>Jenis Kegiatan</FieldLabel>
            <select
              className="input-field"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as any)}
            >
              <option value="AKADEMIK">Akademik / Perkuliahan</option>
              <option value="KEMAHASISWAAN">Kemahasiswaan / Organisasi</option>
              <option value="PERSONAL">Kegiatan Umum / Lainnya</option>
            </select>
          </div>
          <div>
            <FieldLabel>Tujuan / Catatan Keperluan</FieldLabel>
            <input
              type="text"
              className="input-field"
              placeholder="Contoh: Seminar Nasional / Rapat Koordinasi..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <FieldLabel required>Unggah Identitas (KTP / KTM)</FieldLabel>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Upload size={14} /> {uploadingIdentity ? 'Mengunggah...' : 'Pilih Berkas KTP/KTM'}
              <input type="file" accept="image/*,.pdf" onChange={(e) => handleUploadFile(e, 'identity')} style={{ display: 'none' }} disabled={uploadingIdentity} />
            </label>
            {identityDocUrl && (
              <div style={{ marginTop: '0.45rem', fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle2 size={14} /> KTP/KTM Terunggah
              </div>
            )}
          </div>

          <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <FieldLabel required>Unggah Surat Kegiatan / Izin</FieldLabel>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Upload size={14} /> {uploadingPermit ? 'Mengunggah...' : 'Pilih Berkas Surat'}
              <input type="file" accept="image/*,.pdf" onChange={(e) => handleUploadFile(e, 'permit')} style={{ display: 'none' }} disabled={uploadingPermit} />
            </label>
            {permitDocUrl && (
              <div style={{ marginTop: '0.45rem', fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle2 size={14} /> Surat Kegiatan Terunggah
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── BAGIAN 4: RINCIAN BIAYA & KONFIRMASI ── */}
      <Card style={{ padding: '1.5rem' }}>
        <SectionTitle icon={<ClipboardList size={20} />}>4. Ringkasan Biaya &amp; Konfirmasi Pengajuan</SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', padding: '1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.88rem' }}>
          <div>
            <div style={{ color: 'var(--color-muted)', fontSize: '0.76rem' }}>Subtotal Ruangan</div>
            <div style={{ fontWeight: 700 }}>{formatCurrency(roomSubtotal)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-muted)', fontSize: '0.76rem' }}>Subtotal Peralatan ({addOns.length} Item)</div>
            <div style={{ fontWeight: 700 }}>{formatCurrency(addOnSubtotal)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-muted)', fontSize: '0.76rem' }}>Deposit Jaminan</div>
            <div style={{ fontWeight: 700 }}>{formatCurrency(roomDeposit)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-muted)', fontSize: '0.76rem' }}>Total Tagihan</div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-primary-light)' }}>
              {formatCurrency(grandTotal)}
            </div>
          </div>
        </div>

        {renterCategory === 'EXTERNAL_SEWA' && grandTotal > 0 && (
          <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <FieldLabel>Skema Pembayaran</FieldLabel>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setPaymentType('FULL')} className={paymentType === 'FULL' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>
                    Bayar Lunas ({formatCurrency(grandTotal)})
                  </button>
                  <button type="button" onClick={() => setPaymentType('DOWN_PAYMENT')} className={paymentType === 'DOWN_PAYMENT' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>
                    DP 50% ({formatCurrency(Math.ceil(grandTotal * 0.5))})
                  </button>
                </div>
              </div>
              <div>
                <FieldLabel>Metode Pembayaran</FieldLabel>
                <select className="input-field" value={payMethod} onChange={(e) => setPayMethod(e.target.value as any)}>
                  <option value="Transfer">Transfer Bank</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Cash">Tunai (Loket Sarpras)</option>
                </select>
              </div>
            </div>

            {paymentSettings?.bankName && payMethod === 'Transfer' && (
              <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                Rekening Tujuan: <strong>{paymentSettings.bankName}</strong> • No: <strong>{paymentSettings.bankAccountNumber}</strong> a.n. <strong>{paymentSettings.bankAccountHolder}</strong>
              </div>
            )}

            <div>
              <FieldLabel>Unggah Bukti Transfer (Opsional — dapat diunggah menyusul)</FieldLabel>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Upload size={14} /> {uploadingProof ? 'Mengunggah...' : 'Pilih Bukti Bayar'}
                <input type="file" accept="image/*,.pdf" onChange={handleProofUpload} style={{ display: 'none' }} disabled={uploadingProof} />
              </label>
              {paymentProofUrl && (
                <span style={{ marginLeft: '0.75rem', fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 700 }}>
                  <CheckCircle size={13} style={{ display: 'inline', marginRight: '0.2rem' }} /> Bukti Terunggah
                </span>
              )}
            </div>
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '1.25rem' }}>
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            style={{ marginTop: '0.2rem', width: '16px', height: '16px' }}
          />
          <span>
            Saya menyatakan data yang diisi benar serta bertanggung jawab penuh atas penggunaan ruangan, kelengkapan peralatan Sarpras, dan bersedia menaati ketentuan pengembalian maupun ganti rugi yang berlaku.
          </span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Link href="/dashboard/room-bookings" className="btn btn-secondary">
            Batal
          </Link>
          <Button type="button" onClick={handleSubmit} isLoading={submitting} disabled={submitting || (!editIdParam && quotaExceeded)}>
            <Send size={16} /> {editIdParam ? 'Simpan Perubahan Pesanan' : 'Kirim Pengajuan Sarpras'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function NewRoomBookingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Memuat formulir pengajuan Sarpras...</div>}>
      <SinglePageSarprasBookingContent />
    </Suspense>
  );
}

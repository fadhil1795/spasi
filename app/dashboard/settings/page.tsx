'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { User, Lock, Users, Save, Shield, Plus, KeyRound, Upload, CreditCard, Building2, QrCode, FileText, HardDrive, FolderOpen, Eye, EyeOff, Link2, CheckCircle, XCircle, RefreshCw, AlertCircle, ShieldAlert, Calendar, Trash2, MessageSquare } from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const router = useRouter();
  const userRole = (session?.user as any)?.role || 'BORROWER';
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);

  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'payment' | 'system' | 'template' | 'storage' | 'sanctions' | 'policies' | 'whatsapp'>('profile');

  // WhatsApp settings state
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [whatsappTestLoading, setWhatsappTestLoading] = useState(false);
  const [showTestWaModal, setShowTestWaModal] = useState(false);
  const [testWaPhone, setTestWaPhone] = useState('');
  const [whatsappForm, setWhatsappForm] = useState({
    provider: 'EVOLUTION',
    apiUrl: '',
    apiKey: '',
    instanceName: '',
    payloadTemplate: '',
    headers: '',
  });
  
  // Profile state
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    role: '',
    phone: '',
    identityNo: '',
    avatarUrl: '',
    address: '',
    gender: 'Laki-laki',
    birthDate: '',
    birthPlace: '',
    residence: '',
    hasPassword: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });


  const [violations, setViolations] = useState<any[]>([]);

  // Payment settings state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState<{
    qrisCode: string;
    qrisImageUrl: string;
    bankAccounts: { id: string; bankName: string; accountNo: string; accountName: string; isActive: boolean }[];
  }>({
    qrisCode: '',
    qrisImageUrl: '',
    bankAccounts: [],
  });

  // System settings state
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemSaving, setSystemSaving] = useState(false);
  const [systemForm, setSystemForm] = useState({
    autoCancelHours: 24,
  });

  // Document template state
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    institutionName: '',
    institutionSubtitle: '',
    institutionLogoUrl: '',
    signerName: '',
    signerTitle: '',
    signerNip: '',
    receiptFooterNote: '',
    emailSignature: '',
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Storage settings state
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageSaving, setStorageSaving] = useState(false);
  const [storageTestLoading, setStorageTestLoading] = useState(false);
  const [storageTestResult, setStorageTestResult] = useState<null | 'ok' | 'fail'>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [storageForm, setStorageForm] = useState({
    endpoint: '',
    baseUrl: '',
    bucket: 'spasi',
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    forcePathStyle: true,
    isActive: false,
  });

  // Policies settings state
  const [quotaRules, setQuotaRules] = useState<any[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<any[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [quotaForm, setQuotaForm] = useState({
    targetType: 'ROLE',
    targetId: 'BORROWER',
    maxActiveBookings: '3',
    maxDurationDays: '3',
    applicableCategory: '',
  });
  const [blockForm, setBlockForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    scope: 'GLOBAL',
    scopeTarget: '',
  });
  const [conflictWarning, setConflictWarning] = useState<any>(null);
  const [roomsList, setRoomsList] = useState<any[]>([]);

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    fetchProfile();
    if (isAdmin) {
      fetchSystemSettings();
      fetchTemplateSettings();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (tabParam && ['profile', 'payment', 'system', 'template', 'storage', 'sanctions', 'policies', 'whatsapp'].includes(tabParam)) {
      setActiveTab(tabParam as any);
      if (tabParam === 'payment' && isAdmin) fetchPaymentSettings();
      if (tabParam === 'system' && isAdmin) fetchSystemSettings();
      if (tabParam === 'template' && isAdmin) fetchTemplateSettings();
      if (tabParam === 'storage' && isAdmin) fetchStorageSettings();
      if (tabParam === 'policies' && isAdmin) fetchPoliciesData();
      if (tabParam === 'whatsapp' && isAdmin) fetchWhatsAppSettings();
    }
  }, [tabParam, isAdmin]);

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setProfileForm({
          name: data.name || '',
          email: data.email || '',
          role: data.role || '',
          phone: data.phone || '',
          identityNo: data.identityNo || '',
          avatarUrl: data.avatarUrl || '',
          address: data.address || '',
          gender: data.gender || 'Laki-laki',
          birthDate: data.birthDate ? data.birthDate.split('T')[0] : '',
          birthPlace: data.birthPlace || '',
          residence: data.residence || '',
          hasPassword: data.hasPassword !== false,
        });
        if (data.violations) {
          setViolations(data.violations);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProfileLoading(false);
    }
  };



  const fetchPaymentSettings = async () => {
    try {
      setPaymentLoading(true);
      const res = await fetch('/api/settings/payment');
      if (res.ok) {
        const data = await res.json();
        setPaymentForm({
          qrisCode: data.qrisCode || '',
          qrisImageUrl: data.qrisImageUrl || '',
          bankAccounts: data.bankAccounts || [],
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPaymentLoading(false);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      setSystemLoading(true);
      const res = await fetch('/api/settings/system');
      if (res.ok) {
        const data = await res.json();
        setSystemForm({ autoCancelHours: data.autoCancelHours || 24 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSystemLoading(false);
    }
  };

  const saveSystemSettings = async () => {
    try {
      setSystemSaving(true);
      const res = await fetch('/api/settings/system', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemForm),
      });
      if (res.ok) {
        showToast('Pengaturan sistem berhasil disimpan!', 'success');
      } else {
        showToast('Gagal menyimpan pengaturan sistem', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSystemSaving(false);
    }
  };

  const fetchTemplateSettings = async () => {
    try {
      setTemplateLoading(true);
      const res = await fetch('/api/settings/template');
      if (res.ok) {
        const d = await res.json();
        setTemplateForm({
          institutionName: d.institutionName || '',
          institutionSubtitle: d.institutionSubtitle || '',
          institutionLogoUrl: d.institutionLogoUrl || '',
          signerName: d.signerName || '',
          signerTitle: d.signerTitle || '',
          signerNip: d.signerNip || '',
          receiptFooterNote: d.receiptFooterNote || '',
          emailSignature: d.emailSignature || '',
        });
      }
    } catch (e) { console.error(e); }
  finally { setTemplateLoading(false); }
  };

  const fetchStorageSettings = async () => {
    try {
      setStorageLoading(true);
      const res = await fetch('/api/settings/storage');
      if (res.ok) {
        const data = await res.json();
        setStorageForm({
          endpoint: data.endpoint || '',
          baseUrl: data.baseUrl || '',
          bucket: data.bucket || 'spasi',
          accessKeyId: data.accessKeyId || '',
          secretAccessKey: data.secretAccessKey || '',
          region: data.region || 'us-east-1',
          forcePathStyle: data.forcePathStyle ?? true,
          isActive: data.isActive ?? false,
        });
      }
    } catch (e) {
      showToast('Gagal memuat pengaturan storage', 'error');
    } finally {
      setStorageLoading(false);
    }
  };

  const fetchWhatsAppSettings = async () => {
    try {
      setWhatsappLoading(true);
      const res = await fetch('/api/settings/whatsapp');
      if (res.ok) {
        const data = await res.json();
        setWhatsappForm({
          provider: data.provider || 'EVOLUTION',
          apiUrl: data.apiUrl || '',
          apiKey: data.apiKey || '',
          instanceName: data.instanceName || '',
          payloadTemplate: data.payloadTemplate || '',
          headers: data.headers || '',
        });
      }
    } catch (e) {
      showToast('Gagal memuat pengaturan WhatsApp', 'error');
    } finally {
      setWhatsappLoading(false);
    }
  };

  const fetchPoliciesData = async () => {
    try {
      setPoliciesLoading(true);
      const [resQ, resB, resR] = await Promise.all([
        fetch('/api/policies/quota'),
        fetch('/api/policies/blocked'),
        fetch('/api/rooms')
      ]);
      if (resQ.ok) setQuotaRules(await resQ.json());
      if (resB.ok) setBlockedPeriods(await resB.json());
      if (resR.ok) setRoomsList(await resR.json());
    } catch {
      showToast('Gagal memuat data kebijakan', 'error');
    } finally {
      setPoliciesLoading(false);
    }
  };

  const handleAddQuotaRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPolicy(true);
      const res = await fetch('/api/policies/quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotaForm)
      });
      if (res.ok) {
        showToast('Aturan batas kuota berhasil disimpan', 'success');
        fetchPoliciesData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan aturan', 'error');
      }
    } catch {
      showToast('Koneksi bermasalah', 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleDeleteQuotaRule = async (id: string) => {
    if (!confirm('Hapus aturan kuota ini?')) return;
    try {
      const res = await fetch(`/api/policies/quota/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Aturan kuota berhasil dihapus', 'success');
        fetchPoliciesData();
      }
    } catch {
      showToast('Gagal menghapus', 'error');
    }
  };

  const handleAddBlockedPeriod = async (e: React.FormEvent | null, force = false) => {
    if (e) e.preventDefault();
    try {
      setSavingPolicy(true);
      const res = await fetch('/api/policies/blocked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...blockForm, forceSave: force })
      });
      const data = await res.json();

      if (res.ok) {
        if (data.warning) {
          // Ada tabrakan dengan booking terkonfirmasi!
          setConflictWarning(data);
        } else {
          showToast('Periode pemblokiran tanggal berhasil diterapkan', 'success');
          setBlockForm({
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            reason: '',
            scope: 'GLOBAL',
            scopeTarget: '',
          });
          setConflictWarning(null);
          fetchPoliciesData();
        }
      } else {
        showToast(data.error || 'Gagal menerapkan pemblokiran', 'error');
      }
    } catch {
      showToast('Koneksi bermasalah', 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleDeleteBlockedPeriod = async (id: string) => {
    if (!confirm('Batalkan pemblokiran tanggal ini?')) return;
    try {
      const res = await fetch(`/api/policies/blocked/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Blokir periode berhasil dihapus', 'success');
        fetchPoliciesData();
      }
    } catch {
      showToast('Gagal menghapus', 'error');
    }
  };

  const handleSaveStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStorageSaving(true);
      const res = await fetch('/api/settings/storage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storageForm),
      });
      if (res.ok) {
        showToast('Konfigurasi S3 Storage berhasil disimpan!', 'success');
        fetchStorageSettings();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setStorageSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setStorageTestLoading(true);
      setStorageTestResult(null);
      const res = await fetch('/api/settings/storage/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storageForm),
      });
      setStorageTestResult(res.ok ? 'ok' : 'fail');
    } catch {
      setStorageTestResult('fail');
    } finally {
      setStorageTestLoading(false);
    }
  };

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setWhatsappSaving(true);
      const res = await fetch('/api/settings/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsappForm),
      });
      if (res.ok) {
        showToast('Konfigurasi WhatsApp Gateway berhasil disimpan!', 'success');
        fetchWhatsAppSettings();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setWhatsappSaving(false);
    }
  };

  const handleTestWhatsAppConnection = async () => {
    if (!testWaPhone.trim()) {
      showToast('Masukkan nomor HP penerima terlebih dahulu', 'error');
      return;
    }
    try {
      setWhatsappTestLoading(true);
      const res = await fetch('/api/settings/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testWaPhone,
          ...whatsappForm,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Tes pengiriman WhatsApp sukses dikirim!', 'success');
        setShowTestWaModal(false);
        setTestWaPhone('');
      } else {
        showToast(data.error || 'Gagal melakukan tes koneksi', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan saat menghubungi server', 'error');
    } finally {
      setWhatsappTestLoading(false);
    }
  };

  const saveTemplateSettings = async () => {
    try {
      setTemplateSaving(true);
      const res = await fetch('/api/settings/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      });
      if (res.ok) {
        showToast('Template dokumen berhasil disimpan!', 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'Gagal menyimpan template', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setTemplateForm((prev) => ({ ...prev, institutionLogoUrl: data.url }));
        showToast('Logo instansi berhasil diunggah!', 'success');
      } else {
        showToast('Gagal mengunggah logo', 'error');
      }
    } catch { showToast('Terjadi kesalahan unggah logo', 'error'); }
    finally { setUploadingLogo(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setProfileForm((prev) => ({ ...prev, avatarUrl: data.url }));
        showToast('Foto profil berhasil diunggah!', 'success');
      } else {
        showToast('Gagal mengunggah foto profil', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan unggah foto', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setPaymentForm((prev) => ({ ...prev, qrisImageUrl: data.url }));
        showToast('Foto QRIS berhasil diunggah!', 'success');
      }
    } catch {
      showToast('Gagal mengunggah foto QRIS', 'error');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });

      if (res.ok) {
        showToast('Profil berhasil diperbarui!', 'success');
        fetchProfile();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memperbarui profil', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPaymentSaving(true);
      const res = await fetch('/api/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm),
      });

      if (res.ok) {
        showToast('Pengaturan pembayaran & rekening berhasil disimpan!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan pengaturan pembayaran', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Konfirmasi password baru tidak cocok', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast('Password baru minimal 6 karakter', 'error');
      return;
    }

    try {
      setPasswordSaving(true);
      const payload: any = { newPassword: passwordForm.newPassword };
      if (profileForm.hasPassword) {
        payload.oldPassword = passwordForm.oldPassword;
      }

      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Password berhasil diubah!', 'success');
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal mengubah password', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Pengaturan Akun &amp; Sistem</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Kelola informasi profil pribadi, kata sandi, rekening pembayaran instansi, dan manajemen hak akses pengguna.
        </p>
      </div>

      {/* Segmented Tab Navigation */}
      <div style={{ display: 'flex', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '0.25rem', gap: '0.25rem', width: 'fit-content', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => router.push('/dashboard/settings?tab=profile')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
            background: activeTab === 'profile' ? 'var(--color-surface)' : 'transparent',
            color: activeTab === 'profile' ? 'var(--color-primary)' : 'var(--color-muted)',
            fontWeight: activeTab === 'profile' ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <User size={18} /> Profil Saya &amp; Keamanan
        </button>

        <button
          type="button"
          onClick={() => router.push('/dashboard/settings?tab=sanctions')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-md)', border: 'none',
            background: activeTab === 'sanctions' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'sanctions' ? '#fff' : 'var(--color-muted)',
            fontWeight: activeTab === 'sanctions' ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <AlertCircle size={18} /> Riwayat Sanksi Anda {violations.length > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', padding: '0.05rem 0.4rem', fontSize: '0.72rem', fontWeight: 800 }}>{violations.length}</span>}
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => router.push('/dashboard/settings?tab=payment')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
              background: activeTab === 'payment' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'payment' ? '#fff' : 'var(--color-muted)',
              fontWeight: activeTab === 'payment' ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <CreditCard size={18} /> Pengaturan Rekening &amp; QRIS
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => router.push('/dashboard/settings?tab=system')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
              background: activeTab === 'system' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'system' ? '#fff' : 'var(--color-muted)',
              fontWeight: activeTab === 'system' ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Shield size={18} /> Sistem &amp; Otomatisasi
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => router.push('/dashboard/settings?tab=storage')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
              background: activeTab === 'storage' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'storage' ? '#fff' : 'var(--color-muted)',
              fontWeight: activeTab === 'storage' ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <HardDrive size={18} /> Penyimpanan S3 / MinIO
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => router.push('/dashboard/settings?tab=whatsapp')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
              background: activeTab === 'whatsapp' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'whatsapp' ? '#fff' : 'var(--color-muted)',
              fontWeight: activeTab === 'whatsapp' ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <MessageSquare size={18} /> WhatsApp Gateway
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => router.push('/dashboard/settings?tab=template')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
              background: activeTab === 'template' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'template' ? '#fff' : 'var(--color-muted)',
              fontWeight: activeTab === 'template' ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <FileText size={18} /> Template Dokumen
          </button>
        )}



        {isAdmin && (
          <button
            type="button"
            onClick={() => router.push('/dashboard/settings?tab=policies')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
              background: activeTab === 'policies' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'policies' ? '#fff' : 'var(--color-muted)',
              fontWeight: activeTab === 'policies' ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <ShieldAlert size={18} /> Kelola Kebijakan &amp; Aturan
          </button>
        )}
      </div>

      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Section: Profile Info */}
          <Card style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} style={{ color: 'var(--color-primary)' }} /> Identitas Pribadi &amp; Foto Profil
            </h2>

            {profileLoading ? (
              <Skeleton height="240px" />
            ) : (
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'var(--color-surface2)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: profileForm.avatarUrl ? `url(${profileForm.avatarUrl}) center/cover` : 'var(--grad-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: '2rem',
                      fontWeight: 800,
                      flexShrink: 0,
                      boxShadow: 'var(--shadow-glow)',
                    }}
                  >
                    {!profileForm.avatarUrl && (profileForm.name?.[0] || 'U')}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Foto Profil</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
                      Unggah foto wajah resmi (JPG, PNG, maks 2MB).
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                        <Upload size={14} /> {uploadingAvatar ? 'Mengunggah...' : 'Pilih Foto Baru'}
                        <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label className="input-label">Nama Lengkap *</label>
                    <input
                      className="input-field"
                      style={{ width: '100%' }}
                      placeholder="Masukkan nama lengkap"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="input-label">Alamat Email (Akun)</label>
                    <input
                      className="input-field"
                      style={{ width: '100%', opacity: 0.7 }}
                      value={profileForm.email}
                      disabled
                    />
                  </div>

                  <div>
                    <label className="input-label">Nomor NIP / NIM / NIK *</label>
                    <input
                      className="input-field"
                      style={{ width: '100%' }}
                      placeholder="Contoh: NIP-199208..."
                      value={profileForm.identityNo}
                      onChange={(e) => setProfileForm({ ...profileForm, identityNo: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="input-label">Nomor WhatsApp / Telepon *</label>
                    <input
                      className="input-field"
                      style={{ width: '100%' }}
                      placeholder="081234567890"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="input-label">Jenis Kelamin</label>
                    <select
                      className="input-field"
                      style={{ width: '100%' }}
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="input-label">Tempat Lahir</label>
                    <input
                      className="input-field"
                      style={{ width: '100%' }}
                      placeholder="Kota kelahiran"
                      value={profileForm.birthPlace}
                      onChange={(e) => setProfileForm({ ...profileForm, birthPlace: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="input-label">Tanggal Lahir</label>
                    <input
                      type="date"
                      className="input-field"
                      style={{ width: '100%' }}
                      value={profileForm.birthDate}
                      onChange={(e) => setProfileForm({ ...profileForm, birthDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="input-label">Domisili (Kota Saat Ini)</label>
                    <input
                      className="input-field"
                      style={{ width: '100%' }}
                      placeholder="Contoh: Jakarta Selatan"
                      value={profileForm.residence}
                      onChange={(e) => setProfileForm({ ...profileForm, residence: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label">Alamat Lengkap Tempat Tinggal</label>
                    <textarea
                      className="input-field"
                      style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                      placeholder="Nama jalan, RT/RW, kelurahan, kecamatan..."
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <Button type="submit" variant="primary" isLoading={profileSaving}>
                    <Save size={16} /> Simpan Perubahan Profil
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* Section: Change Password */}
          <Card style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={20} style={{ color: 'var(--color-accent)' }} /> Ubah Password Akun
            </h2>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {profileForm.hasPassword && (
                <div>
                  <label className="input-label">Password Lama *</label>
                  <input
                    type="password"
                    className="input-field"
                    style={{ width: '100%' }}
                    placeholder="Masukkan password saat ini"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label className="input-label">Password Baru *</label>
                  <input
                    type="password"
                    className="input-field"
                    style={{ width: '100%' }}
                    placeholder="Minimal 6 karakter"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="input-label">Konfirmasi Password Baru *</label>
                  <input
                    type="password"
                    className="input-field"
                    style={{ width: '100%' }}
                    placeholder="Ulangi password baru"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <Button type="submit" variant="secondary" isLoading={passwordSaving}>
                  <Lock size={16} /> {profileForm.hasPassword ? 'Perbarui Password' : 'Buat Password Baru'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Tab 1b: SANCTIONS HISTORY */}
      {activeTab === 'sanctions' && (
        <Card style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={22} style={{ color: 'var(--color-danger)' }} /> Catatan Sanksi &amp; Pelanggaran Anda
          </h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Sistem secara otomatis melacak riwayat keterlambatan pengembalian barang dan status penangguhan akun Anda.
          </p>

          {violations.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--color-muted)', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
              <CheckCircle size={40} style={{ color: '#10b981', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>Akun Anda Bersih dari Pelanggaran!</div>
              <p style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>Terima kasih telah mematuhi aturan batas waktu pengembalian sarpras.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ padding: '1rem', background: profileForm.role === 'BORROWER' && violations.some(v => v.type === 'SUSPENSION') ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-md)', borderLeft: '4.5px solid #ef4444', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>Status Akun Saat Ini:</strong>{' '}
                {violations.some(v => v.type === 'SUSPENSION') ? (
                  <span style={{ color: '#ef4444', fontWeight: 900 }}>🚨 DITANGGUHKAN / TERBLOKIR SEMENTARA</span>
                ) : (
                  <span style={{ color: '#10b981', fontWeight: 900 }}>✅ AKTIF &amp; BEBAS PINJAM</span>
                )}
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                  *Jika akun Anda ditangguhkan otomatis (karena 3x telat), silakan hubungi petugas admin sarpras untuk pembukaan blokir manual.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {violations.map((v, i) => (
                  <div key={v.id || i} style={{ padding: '1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', borderLeft: `3.5px solid ${v.type === 'SUSPENSION' ? '#ef4444' : '#f59e0b'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600 }}>
                      <span style={{ textTransform: 'uppercase' }}>Tipe: {v.type}</span>
                      <span>{new Date(v.createdAt).toLocaleString('id-ID')}</span>
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem' }}>{v.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: PAYMENT SETTINGS (Admin Only) */}
      {activeTab === 'payment' && isAdmin && (
        <Card style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={20} style={{ color: 'var(--color-success)' }} /> Pengaturan Rekening Pembayaran Resmi Instansi
          </h2>

          {paymentLoading ? (
            <Skeleton height="200px" />
          ) : (
            <form onSubmit={handleSavePaymentSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Dynamic Bank Accounts Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                    🏦 Daftar Rekening Bank Resmi
                  </h3>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      setPaymentForm({
                        ...paymentForm,
                        bankAccounts: [
                          ...paymentForm.bankAccounts,
                          { id: `new-${Date.now()}`, bankName: '', accountNo: '', accountName: '', isActive: true }
                        ]
                      })
                    }}
                  >
                    <Plus size={14} /> Tambah Rekening
                  </Button>
                </div>

                {paymentForm.bankAccounts.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', color: 'var(--color-muted)' }}>
                    Belum ada rekening bank yang ditambahkan.
                  </div>
                ) : (
                  paymentForm.bankAccounts.map((bank, index) => (
                    <div key={bank.id} style={{ background: 'var(--color-surface2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const newBanks = [...paymentForm.bankAccounts];
                          newBanks.splice(index, 1);
                          setPaymentForm({ ...paymentForm, bankAccounts: newBanks });
                        }}
                        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        Hapus
                      </button>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                        <div>
                          <label className="input-label">Nama Bank (Misal: BCA, BSI, SeaBank) *</label>
                          <input
                            className="input-field"
                            style={{ width: '100%' }}
                            placeholder="Contoh: BCA"
                            value={bank.bankName}
                            onChange={(e) => {
                              const newBanks = [...paymentForm.bankAccounts];
                              newBanks[index].bankName = e.target.value;
                              setPaymentForm({ ...paymentForm, bankAccounts: newBanks });
                            }}
                            required
                          />
                        </div>
                        <div>
                          <label className="input-label">Nomor Rekening *</label>
                          <input
                            className="input-field"
                            style={{ width: '100%' }}
                            placeholder="Contoh: 8830..."
                            value={bank.accountNo}
                            onChange={(e) => {
                              const newBanks = [...paymentForm.bankAccounts];
                              newBanks[index].accountNo = e.target.value;
                              setPaymentForm({ ...paymentForm, bankAccounts: newBanks });
                            }}
                            required
                          />
                        </div>
                        <div>
                          <label className="input-label">Nama Pemilik Rekening *</label>
                          <input
                            className="input-field"
                            style={{ width: '100%' }}
                            placeholder="a.n. Instansi"
                            value={bank.accountName}
                            onChange={(e) => {
                              const newBanks = [...paymentForm.bankAccounts];
                              newBanks[index].accountName = e.target.value;
                              setPaymentForm({ ...paymentForm, bankAccounts: newBanks });
                            }}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Section QRIS */}
              <div style={{ background: 'var(--color-surface2)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.85rem', color: 'var(--color-accent)' }}>
                  📱 Pengaturan Kode QRIS Instansi
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="input-label">Kode String Merchant QRIS</label>
                    <input
                      className="input-field"
                      style={{ width: '100%' }}
                      placeholder="SPASI-INSTANSI-QRIS"
                      value={paymentForm.qrisCode}
                      onChange={(e) => setPaymentForm({ ...paymentForm, qrisCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="input-label">Unggah Gambar QRIS Resmi</label>
                    <input type="file" accept="image/*" onChange={handleQrisUpload} style={{ fontSize: '0.85rem' }} />
                    {paymentForm.qrisImageUrl && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', marginTop: '0.35rem' }}>✓ Gambar QRIS terpasang</div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="primary" isLoading={paymentSaving}>
                  <Save size={16} /> Simpan Pengaturan Rekening &amp; QRIS
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}



      {activeTab === 'system' && (
        <form onSubmit={(e) => { e.preventDefault(); saveSystemSettings(); }}>
          <Card style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Otomatisasi Sistem</h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Atur perilaku otomatis dari sistem, seperti pembatalan pesanan yang melewati batas waktu pembayaran.
              </p>
            </div>

            {systemLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Skeleton style={{ height: '50px', width: '100%' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
                <Input
                  type="number"
                  label="Batas Waktu Pembayaran (Jam)"
                  placeholder="24"
                  value={systemForm.autoCancelHours}
                  onChange={(e) => setSystemForm({ ...systemForm, autoCancelHours: parseInt(e.target.value) || 24 })}
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '-1rem' }}>
                  Pesanan dengan status pembayaran &quot;UNPAID&quot; akan otomatis dibatalkan (CANCELLED) jika melewati batas waktu ini sejak pesanan dibuat. (Bawaan: 24 jam)
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <Button type="submit" disabled={systemSaving}>
                    {systemSaving ? 'Menyimpan...' : (
                      <>
                        <Save size={16} /> Simpan Pengaturan
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </form>
      )}

      {/* ── TAB: TEMPLATE DOKUMEN ───────────────────────────────────── */}
      {activeTab === 'template' && (
        <form onSubmit={(e) => { e.preventDefault(); saveTemplateSettings(); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Kop Surat */}
            <Card style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} style={{ color: 'var(--color-primary)' }} /> Identitas Instansi (Kop Surat)
              </h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Informasi ini akan ditampilkan sebagai kop surat di setiap dokumen resmi (Kuitansi, BAST, Invoice).
              </p>
              {templateLoading ? <Skeleton style={{ height: '200px' }} /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <Input
                    label="Nama Instansi Resmi *"
                    placeholder="Badan Kepegawaian Daerah Kabupaten XYZ"
                    value={templateForm.institutionName}
                    onChange={(e) => setTemplateForm(p => ({ ...p, institutionName: e.target.value }))}
                  />
                  <div>
                    <label className="input-label">Subjudul / Alamat Instansi</label>
                    <textarea
                      className="input-field"
                      rows={2}
                      placeholder="Jl. Raya No. 1, Kota XYZ | Telp. (021) 123-4567"
                      value={templateForm.institutionSubtitle}
                      onChange={(e) => setTemplateForm(p => ({ ...p, institutionSubtitle: e.target.value }))}
                      style={{ resize: 'vertical', minHeight: '64px' }}
                    />
                  </div>
                  <div>
                    <label className="input-label">Logo Instansi</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      {templateForm.institutionLogoUrl && (
                        <div style={{ padding: '0.5rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                          <img src={templateForm.institutionLogoUrl} alt="Logo" style={{ height: '60px', objectFit: 'contain' }} />
                        </div>
                      )}
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-muted)', transition: 'all 0.2s' }}>
                        <Upload size={16} /> {uploadingLogo ? 'Mengunggah...' : 'Unggah Logo (PNG/JPG)'}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                      </label>
                      {templateForm.institutionLogoUrl && (
                        <button type="button" onClick={() => setTemplateForm(p => ({ ...p, institutionLogoUrl: '' }))} style={{ fontSize: '0.8rem', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                          Hapus Logo
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.4rem' }}>Logo akan muncul di pojok kiri kop surat dokumen cetak.</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Penandatangan */}
            <Card style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} style={{ color: 'var(--color-primary)' }} /> Data Penandatangan Dokumen
              </h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Nama dan jabatan pejabat yang bertanda tangan di kolom kanan bawah dokumen kuitansi & BAST.
              </p>
              {templateLoading ? <Skeleton style={{ height: '150px' }} /> : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Input
                    label="Nama Lengkap Penandatangan *"
                    placeholder="Drs. Ahmad Subagyo, M.Si"
                    value={templateForm.signerName}
                    onChange={(e) => setTemplateForm(p => ({ ...p, signerName: e.target.value }))}
                  />
                  <Input
                    label="Jabatan / Gelar *"
                    placeholder="Kepala Sub Bagian Umum"
                    value={templateForm.signerTitle}
                    onChange={(e) => setTemplateForm(p => ({ ...p, signerTitle: e.target.value }))}
                  />
                  <Input
                    label="NIP (Opsional)"
                    placeholder="198501012010011001"
                    value={templateForm.signerNip}
                    onChange={(e) => setTemplateForm(p => ({ ...p, signerNip: e.target.value }))}
                  />
                </div>
              )}
            </Card>

            {/* Catatan Kaki & Email */}
            <Card style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} style={{ color: 'var(--color-primary)' }} /> Catatan Kaki & Tanda Tangan Email
              </h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Teks yang akan muncul di bagian bawah kuitansi dan footer email notifikasi.
              </p>
              {templateLoading ? <Skeleton style={{ height: '150px' }} /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label className="input-label">Catatan Kaki Kuitansi / Disclaimer</label>
                    <textarea
                      className="input-field"
                      rows={3}
                      placeholder="Dokumen ini merupakan bukti sah penyewaan fasilitas. Harap tunjukkan kepada petugas di lokasi. Tidak berlaku jika difotokopi."
                      value={templateForm.receiptFooterNote}
                      onChange={(e) => setTemplateForm(p => ({ ...p, receiptFooterNote: e.target.value }))}
                      style={{ resize: 'vertical', minHeight: '80px' }}
                    />
                  </div>
                  <div>
                    <label className="input-label">Footer Email Notifikasi</label>
                    <textarea
                      className="input-field"
                      rows={2}
                      placeholder="© 2026 SPASI — Sistem Pencatatan Aset & Sewa Instansi. Hubungi kami di spasi@instansi.go.id"
                      value={templateForm.emailSignature}
                      onChange={(e) => setTemplateForm(p => ({ ...p, emailSignature: e.target.value }))}
                      style={{ resize: 'vertical', minHeight: '64px' }}
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Preview & Save */}
            <Card style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Preview Dokumen</div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Simpan terlebih dahulu, lalu buka link di bawah untuk preview dokumen hasil konfigurasi.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <Button type="submit" disabled={templateSaving}>
                    <Save size={16} /> {templateSaving ? 'Menyimpan...' : 'Simpan Template'}
                  </Button>
                </div>
              </div>
            </Card>

          </div>
        </form>
      )}

      {activeTab === 'storage' && isAdmin && (
        <form onSubmit={handleSaveStorage} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(16,185,129,0.08) 100%)',
            border: '1px solid rgba(79,70,229,0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(79,70,229,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HardDrive size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.3rem' }}>Konfigurasi Object Storage (S3 / MinIO)</div>
              <p style={{ fontSize: '0.83rem', color: 'var(--color-muted)', lineHeight: 1.6 }}>
                Hubungkan sistem ke S3-compatible storage self-hosted (MinIO) atau AWS S3. Semua file upload
                (bukti bayar, foto inspeksi, dokumen BAST) akan disimpan ke bucket yang dikonfigurasi di sini.
              </p>
            </div>
          </div>

          {/* Connection Settings */}
          <Card style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <Link2 size={18} style={{ color: 'var(--color-primary)' }} /> Koneksi &amp; Kredensial
            </h2>

            {storageLoading ? <div style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Memuat konfigurasi...</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Active Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: storageForm.isActive ? 'rgba(16,185,129,0.08)' : 'var(--color-surface2)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: `1px solid ${storageForm.isActive ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}` }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {storageForm.isActive ? <CheckCircle size={16} style={{ color: '#10b981' }} /> : <XCircle size={16} style={{ color: 'var(--color-muted)' }} />}
                      {storageForm.isActive ? 'S3 Storage Aktif' : 'Menggunakan Local Storage (Default)'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                      {storageForm.isActive ? 'File akan diunggah ke S3/MinIO bucket' : 'Aktifkan untuk menggunakan S3/MinIO sebagai penyimpanan'}
                    </div>
                  </div>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={storageForm.isActive}
                      onChange={(e) => setStorageForm(p => ({ ...p, isActive: e.target.checked }))}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                    />
                    Aktifkan
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label">Endpoint URL *</label>
                    <Input
                      placeholder="https://s3.your-domain.com atau http://192.168.1.10:9000"
                      value={storageForm.endpoint}
                      onChange={(e: any) => setStorageForm(p => ({ ...p, endpoint: e.target.value }))}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.3rem', display: 'block' }}>URL endpoint S3/MinIO server Anda</span>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label">Base URL Publik *</label>
                    <Input
                      placeholder="https://cdn.your-domain.com atau https://s3.your-domain.com/spasi"
                      value={storageForm.baseUrl}
                      onChange={(e: any) => setStorageForm(p => ({ ...p, baseUrl: e.target.value }))}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.3rem', display: 'block' }}>URL dasar untuk mengakses file secara publik di browser</span>
                  </div>

                  <div>
                    <label className="input-label">Nama Bucket *</label>
                    <Input
                      placeholder="spasi"
                      value={storageForm.bucket}
                      onChange={(e: any) => setStorageForm(p => ({ ...p, bucket: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="input-label">Region</label>
                    <Input
                      placeholder="us-east-1"
                      value={storageForm.region}
                      onChange={(e: any) => setStorageForm(p => ({ ...p, region: e.target.value }))}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.3rem', display: 'block' }}>Untuk MinIO: bisa diisi bebas (mis. id-jkt-1)</span>
                  </div>

                  <div>
                    <label className="input-label">Access Key ID *</label>
                    <Input
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                      value={storageForm.accessKeyId}
                      onChange={(e: any) => setStorageForm(p => ({ ...p, accessKeyId: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="input-label">Secret Access Key *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input-field"
                        type={showSecret ? 'text' : 'password'}
                        placeholder="Masukkan secret key baru untuk mengubah"
                        value={storageForm.secretAccessKey}
                        onChange={(e) => setStorageForm(p => ({ ...p, secretAccessKey: e.target.value }))}
                        style={{ paddingRight: '2.75rem', width: '100%' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 0 }}
                      >
                        {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.3rem', display: 'block' }}>Kosongkan jika tidak ingin mengubah secret yang tersimpan</span>
                  </div>
                </div>

                {/* Force Path Style toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
                  <input
                    type="checkbox"
                    id="forcePathStyle"
                    checked={storageForm.forcePathStyle}
                    onChange={(e) => setStorageForm(p => ({ ...p, forcePathStyle: e.target.checked }))}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="forcePathStyle" style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                    Force Path Style
                    <span style={{ fontWeight: 400, color: 'var(--color-muted)', marginLeft: '0.5rem' }}>(Wajib diaktifkan untuk MinIO)</span>
                  </label>
                </div>

                {/* Test Connection Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={storageTestLoading || !storageForm.endpoint}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <RefreshCw size={16} style={{ animation: storageTestLoading ? 'spin 1s linear infinite' : 'none' }} />
                    {storageTestLoading ? 'Menguji Koneksi...' : 'Test Koneksi'}
                  </button>

                  {storageTestResult === 'ok' && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 700, fontSize: '0.88rem' }}>
                      <CheckCircle size={16} /> Koneksi berhasil!
                    </span>
                  )}
                  {storageTestResult === 'fail' && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-danger)', fontWeight: 700, fontSize: '0.88rem' }}>
                      <XCircle size={16} /> Koneksi gagal. Periksa endpoint &amp; kredensial.
                    </span>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Folder Structure Info */}
          <Card style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <FolderOpen size={18} style={{ color: 'var(--color-warning)' }} /> Struktur Folder Bucket
            </h2>
            <p style={{ fontSize: '0.83rem', color: 'var(--color-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Sistem akan mengorganisir file secara otomatis dalam struktur folder berikut di dalam bucket <code style={{ background: 'var(--color-surface2)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontFamily: 'monospace' }}>{storageForm.bucket || 'spasi'}</code>:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontFamily: 'monospace', fontSize: '0.82rem' }}>
              {[
                { folder: `${storageForm.bucket || 'spasi'}/`, label: 'Root Bucket', color: 'var(--color-primary)', isRoot: true },
                { folder: '  payments/', label: 'Struk & bukti transfer pembayaran (room booking & sewa)', color: '#10b981' },
                { folder: '  inspections/', label: 'Foto kondisi aset saat inspeksi check-in / check-out', color: '#f59e0b' },
                { folder: '    inspections/returns/', label: 'Foto inspeksi pengembalian peminjaman internal', color: '#f59e0b' },
                { folder: '    inspections/checkin/', label: 'Foto check-in ruangan & aset sewa', color: '#f59e0b' },
                { folder: '    inspections/checkout/', label: 'Foto check-out & klaim kerusakan', color: '#f59e0b' },
                { folder: '  documents/', label: 'Dokumen resmi: BAST, kwitansi, surat persetujuan (PDF)', color: '#8b5cf6' },
                { folder: '  avatars/', label: 'Foto profil pengguna sistem', color: '#ec4899' },
                { folder: '  assets/', label: 'Foto catalog aset inventaris', color: '#06b6d4' },
                { folder: '  rooms/', label: 'Foto galeri ruangan (catalog penyewaan)', color: '#06b6d4' },
                { folder: '  logos/', label: 'Logo instansi & aset branding sistem', color: '#6366f1' },
                { folder: '  qris/', label: 'Gambar QR Code QRIS pembayaran', color: '#6366f1' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: item.isRoot ? 'rgba(79,70,229,0.08)' : 'transparent', borderLeft: item.isRoot ? `3px solid ${item.color}` : 'none' }}>
                  <span style={{ color: item.color, minWidth: '220px', fontWeight: item.isRoot ? 800 : 500 }}>{item.folder}</span>
                  <span style={{ color: 'var(--color-muted)', fontFamily: 'sans-serif', fontSize: '0.8rem' }}>← {item.label}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(79,70,229,0.06)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-primary)', fontSize: '0.8rem', color: 'var(--color-muted)', lineHeight: 1.6 }}>
              💡 <strong>Catatan:</strong> File diorganisir otomatis oleh sistem. Nama file menggunakan format
              <code style={{ background: 'var(--color-surface2)', padding: '0.1rem 0.3rem', borderRadius: '3px', margin: '0 0.25rem' }}>[timestamp]-[uuid].[ext]</code>
              untuk menghindari konflik dan memudahkan audit.
            </div>
          </Card>

          {/* Save Button */}
          <Card style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Simpan Konfigurasi S3 Storage</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Perubahan akan berlaku untuk semua upload file berikutnya.</p>
              </div>
              <Button type="submit" disabled={storageSaving}>
                <Save size={16} /> {storageSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </Button>
            </div>
          </Card>

        </form>
      )}

      {activeTab === 'whatsapp' && isAdmin && (
        <form onSubmit={handleSaveWhatsApp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(99,102,241,0.08) 100%)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageSquare size={24} style={{ color: '#10b981' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.3rem' }}>Konfigurasi WhatsApp Gateway</div>
              <p style={{ fontSize: '0.83rem', color: 'var(--color-muted)', lineHeight: 1.6 }}>
                Hubungkan sistem ke layanan WhatsApp Gateway untuk mengirimkan E-Voucher bukti pemesanan otomatis, tagihan denda, dan notifikasi pengembalian aset. Pengaturan di sini akan langsung mengambil prioritas di atas konfigurasi berkas `.env`.
              </p>
            </div>
          </div>

          {/* Connection Settings */}
          <Card style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <Link2 size={18} style={{ color: 'var(--color-primary)' }} /> Kredensial &amp; API Key
            </h2>

            {whatsappLoading ? <div style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Memuat konfigurasi...</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Gateway Provider Selection */}
                <div>
                  <label className="input-label">Provider Gateway WhatsApp *</label>
                  <select
                    className="input-field"
                    value={whatsappForm.provider}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, provider: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem' }}
                  >
                    <option value="EVOLUTION">Evolution API (Self-Hosted)</option>
                    <option value="FONNTE">Fonnte (Cloud API)</option>
                    <option value="GENERIC">Generic HTTP POST (Custom Gateway)</option>
                  </select>
                </div>

                {/* API URL Input */}
                <div>
                  <label className="input-label">
                    {whatsappForm.provider === 'FONNTE' ? 'API URL (Opsional, bawaan: https://api.fonnte.com/send)' : 'API URL Endpoint *'}
                  </label>
                  <Input
                    placeholder={
                      whatsappForm.provider === 'EVOLUTION' ? 'http://localhost:8080' : 
                      whatsappForm.provider === 'FONNTE' ? 'https://api.fonnte.com/send' :
                      'https://custom-gateway.com/api/send'
                    }
                    value={whatsappForm.apiUrl}
                    onChange={(e: any) => setWhatsappForm({ ...whatsappForm, apiUrl: e.target.value })}
                  />
                </div>

                {/* API Key Input */}
                <div>
                  <label className="input-label">
                    {whatsappForm.provider === 'FONNTE' ? 'Fonnte Token / API Key *' : 'API Key / Token Otorisasi'}
                  </label>
                  <Input
                    type="password"
                    placeholder="Masukkan token atau API key baru"
                    value={whatsappForm.apiKey}
                    onChange={(e: any) => setWhatsappForm({ ...whatsappForm, apiKey: e.target.value })}
                  />
                </div>

                {/* Evolution Instance Name Input */}
                {whatsappForm.provider === 'EVOLUTION' && (
                  <div>
                    <label className="input-label">Nama Instance Evolution API *</label>
                    <Input
                      placeholder="SPASI_WA"
                      value={whatsappForm.instanceName}
                      onChange={(e: any) => setWhatsappForm({ ...whatsappForm, instanceName: e.target.value })}
                    />
                  </div>
                )}

                {/* Generic JSON Payload Template Input */}
                {whatsappForm.provider === 'GENERIC' && (
                  <div>
                    <label className="input-label">JSON Payload Template (Opsional)</label>
                    <textarea
                      className="input-field"
                      rows={4}
                      placeholder='{"to": "{{phone}}", "message": "{{message}}", "countryCode": "62"}'
                      value={whatsappForm.payloadTemplate}
                      onChange={(e) => setWhatsappForm({ ...whatsappForm, payloadTemplate: e.target.value })}
                      style={{ fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical', width: '100%', minHeight: '80px' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>
                      Gunakan placeholder <code>{"{{phone}}"}</code> untuk nomor tujuan dan <code>{"{{message}}"}</code> untuk isi pesan WhatsApp.
                    </p>
                  </div>
                )}

                {/* Generic Custom Headers Input */}
                {whatsappForm.provider === 'GENERIC' && (
                  <div>
                    <label className="input-label">Custom HTTP Headers JSON (Opsional)</label>
                    <textarea
                      className="input-field"
                      rows={3}
                      placeholder='{"x-api-key": "secret-token", "Custom-Header": "Value"}'
                      value={whatsappForm.headers}
                      onChange={(e) => setWhatsappForm({ ...whatsappForm, headers: e.target.value })}
                      style={{ fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical', width: '100%', minHeight: '60px' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>
                      Format harus berupa string JSON objek valid untuk header HTTP tambahan (misal menyematkan API key khusus).
                    </p>
                  </div>
                )}

                {/* Test Connection Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowTestWaModal(true)}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <MessageSquare size={16} />
                    Kirim Pesan Uji Coba (Tes Koneksi)
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Save Card */}
          <Card style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Simpan Pengaturan WhatsApp</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Perubahan pengaturan WhatsApp Gateway akan langsung diterapkan pada sistem secara real-time.</p>
              </div>
              <Button type="submit" disabled={whatsappSaving || whatsappLoading}>
                <Save size={16} /> {whatsappSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </Button>
            </div>
          </Card>

        </form>
      )}

      {activeTab === 'policies' && isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Section 1: Batas Kuota Booking Aktif */}
          <Card style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <ShieldAlert size={20} style={{ color: 'var(--color-primary)' }} /> Aturan Batas Kuota Booking Aktif
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Tentukan batas maksimal transaksi peminjaman aset/booking ruangan aktif yang bisa dimiliki user secara bersamaan. Batas ini mencegah monopoli slot penggunaan fasilitas.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', alignItems: 'flex-start' }}>
              {/* Form Tambah Rule */}
              <form onSubmit={handleAddQuotaRule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--color-surface2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>Tambah Aturan Kuota</h3>
                
                <div>
                  <label className="input-label">Tipe Target</label>
                  <select
                    className="input-field"
                    value={quotaForm.targetType}
                    onChange={(e) => setQuotaForm({ ...quotaForm, targetType: e.target.value, targetId: e.target.value === 'ROLE' ? 'BORROWER' : '' })}
                    style={{ width: '100%' }}
                  >
                    <option value="ROLE">Role / Hak Akses</option>
                    <option value="DEPARTMENT">Program Studi / Departemen (Unit)</option>
                    <option value="USER">User Spesifik (NIM/NIP)</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">ID Target / Nilai</label>
                  {quotaForm.targetType === 'ROLE' ? (
                    <select
                      className="input-field"
                      value={quotaForm.targetId}
                      onChange={(e) => setQuotaForm({ ...quotaForm, targetId: e.target.value })}
                      style={{ width: '100%' }}
                    >
                      <option value="BORROWER">Penyewa (Borrower)</option>
                      <option value="STAFF">Staf Instansi (Staff)</option>
                      <option value="APPROVER">Penyetuju (Approver)</option>
                    </select>
                  ) : (
                    <Input
                      placeholder={quotaForm.targetType === 'USER' ? "Masukkan ID User (NIM/NIK)" : "Masukkan ID Departemen"}
                      value={quotaForm.targetId}
                      onChange={(e: any) => setQuotaForm({ ...quotaForm, targetId: e.target.value })}
                      required
                    />
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <Input
                    label="Booking Aktif"
                    type="number"
                    value={quotaForm.maxActiveBookings}
                    onChange={(e: any) => setQuotaForm({ ...quotaForm, maxActiveBookings: e.target.value })}
                    required
                  />
                  <Input
                    label="Durasi Hari"
                    type="number"
                    value={quotaForm.maxDurationDays}
                    onChange={(e: any) => setQuotaForm({ ...quotaForm, maxDurationDays: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" variant="primary" style={{ width: '100%' }} disabled={savingPolicy}>
                  <Plus size={16} /> Simpan Aturan
                </Button>
              </form>

              {/* List Rules */}
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Tipe Target</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>ID Target</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Kuota Booking</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Durasi Hari</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotaRules.length > 0 ? (
                      quotaRules.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{r.targetType}</td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--color-muted)' }}>{r.targetId}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 800 }}>{r.maxActiveBookings} aktif</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{r.maxDurationDays} hari</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <Button variant="ghost" size="sm" style={{ color: 'var(--color-danger)', padding: '0.2rem' }} onClick={() => handleDeleteQuotaRule(r.id)}>
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>Belum ada aturan kuota khusus. Default sistem: 3 booking aktif.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Section 2: Blokir Tanggal Ketersediaan */}
          <Card style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <Calendar size={20} style={{ color: 'var(--color-warning)' }} /> Periode Blokir Tanggal (Kalender Terkunci)
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Kunci rentang tanggal tertentu secara global (seluruh fasilitas) atau per ruangan tertentu (misal saat libur semester, renovasi gedung, atau kegiatan rektorat). Tanggal tersebut otomatis hilang dari opsi booking.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', alignItems: 'flex-start' }}>
              {/* Form Tambah Block */}
              <form onSubmit={(e) => handleAddBlockedPeriod(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--color-surface2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>Kunci Rentang Tanggal</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <Input
                    label="Mulai Tanggal"
                    type="date"
                    value={blockForm.startDate}
                    onChange={(e: any) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                    required
                  />
                  <Input
                    label="Selesai Tanggal"
                    type="date"
                    value={blockForm.endDate}
                    onChange={(e: any) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="input-label">Scope Blokir</label>
                  <select
                    className="input-field"
                    value={blockForm.scope}
                    onChange={(e) => setBlockForm({ ...blockForm, scope: e.target.value, scopeTarget: '' })}
                    style={{ width: '100%' }}
                  >
                    <option value="GLOBAL">Global (Seluruh Kampus)</option>
                    <option value="ITEM">Ruangan Tertentu</option>
                  </select>
                </div>

                {blockForm.scope === 'ITEM' && (
                  <div>
                    <label className="input-label">Pilih Ruangan</label>
                    <select
                      className="input-field"
                      value={blockForm.scopeTarget}
                      onChange={(e) => setBlockForm({ ...blockForm, scopeTarget: e.target.value })}
                      style={{ width: '100%' }}
                      required
                    >
                      <option value="">-- Pilih Ruangan --</option>
                      {roomsList.map((rm: any) => <option key={rm.id} value={rm.id}>{rm.name} ({rm.code})</option>)}
                    </select>
                  </div>
                )}

                <Input
                  label="Alasan Pemblokiran *"
                  placeholder="Contoh: Renovasi kelistrikan studio"
                  value={blockForm.reason}
                  onChange={(e: any) => setBlockForm({ ...blockForm, reason: e.target.value })}
                  required
                />

                <Button type="submit" variant="primary" style={{ width: '100%', background: 'var(--color-warning)', color: '#000' }} disabled={savingPolicy}>
                  🔒 Kunci Tanggal
                </Button>
              </form>

              {/* List Blocked Periods */}
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Rentang Blokir</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Scope</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Alasan / Catatan</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Dibuat Oleh</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedPeriods.length > 0 ? (
                      blockedPeriods.map(b => (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                            {formatDate(b.startDate)} s.d. {formatDate(b.endDate)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span className="badge" style={{ background: b.scope === 'GLOBAL' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: b.scope === 'GLOBAL' ? '#ef4444' : '#f59e0b' }}>
                              {b.scope === 'GLOBAL' ? 'Global' : 'Ruangan'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--color-muted)' }}>{b.reason}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{b.createdBy}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <Button variant="ghost" size="sm" style={{ color: 'var(--color-danger)', padding: '0.2rem' }} onClick={() => handleDeleteBlockedPeriod(b.id)}>
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>Belum ada pemblokiran kalender aktif.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Modal Conflict Warning */}
          <Modal
            isOpen={!!conflictWarning}
            onClose={() => setConflictWarning(null)}
            title="⚠️ Deteksi Tabrakan Jadwal Booking Terkonfirmasi"
            footer={
              <>
                <Button variant="secondary" onClick={() => setConflictWarning(null)}>Batal</Button>
                <Button variant="primary" style={{ background: 'var(--color-danger)', color: '#fff' }} onClick={() => handleAddBlockedPeriod(null, true)}>
                  Tetap Terapkan &amp; Kirim Warning
                </Button>
              </>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem' }}>
              <p style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                Perhatian: Terdapat pemesanan ruangan yang sudah terlanjur disetujui (CONFIRMED/ACTIVE) di dalam tanggal terblokir yang dipilih:
              </p>
              
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', maxHeight: '200px', overflowY: 'auto' }}>
                {conflictWarning?.conflicts?.map((c: any, idx: number) => (
                  <div key={idx} style={{ padding: '0.6rem 0.8rem', borderBottom: idx < conflictWarning.conflicts.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{c.bookingNumber} — {c.roomName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                      Penyewa: {c.renterName} | {formatDate(c.startTime)} s.d. {formatDate(c.endTime)}
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                Menerapkan pemblokiran ini tidak membatalkan pemesanan di atas secara otomatis, tetapi akan memberikan notifikasi warning bagi pengelola. Pastikan Anda berkoordinasi dengan penyewa.
              </p>
            </div>
          </Modal>

          {/* Modal Tes WhatsApp Gateway */}
          <Modal
            isOpen={showTestWaModal}
            onClose={() => {
              setShowTestWaModal(false);
              setTestWaPhone('');
            }}
            title="Tes Koneksi WhatsApp Gateway"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.88rem' }}>
              <p style={{ color: 'var(--color-muted)', margin: 0 }}>
                Masukkan nomor WhatsApp tujuan (dengan kode negara, contoh: 628123456789) untuk mencoba mengirimkan pesan tes uji coba koneksi menggunakan parameter saat ini.
              </p>
              <div>
                <label className="input-label">Nomor WhatsApp Penerima *</label>
                <Input
                  placeholder="Contoh: 628123456789"
                  value={testWaPhone}
                  onChange={(e: any) => setTestWaPhone(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => {
                  setShowTestWaModal(false);
                  setTestWaPhone('');
                }}>
                  Batal
                </button>
                <Button onClick={handleTestWhatsAppConnection} disabled={whatsappTestLoading || !testWaPhone.trim()}>
                  {whatsappTestLoading ? 'Mengirim...' : 'Kirim Uji Coba'}
                </Button>
              </div>
            </div>
          </Modal>

        </div>
      )}
    </div>
  );
}

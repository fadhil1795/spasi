'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  User,
  Lock,
  Save,
  KeyRound,
  Upload,
  AlertCircle,
  CheckCircle,
  Building2,
  ShieldCheck,
} from 'lucide-react';

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'profile' | 'sanctions'>(
    tabParam === 'sanctions' ? 'sanctions' : 'profile'
  );
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [violations, setViolations] = useState<any[]>([]);
  const [departmentName, setDepartmentName] = useState('');
  const [renterCategory, setRenterCategory] = useState('EXTERNAL');

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

  useEffect(() => {
    if (tabParam === 'sanctions') setActiveTab('sanctions');
    else setActiveTab('profile');
  }, [tabParam]);

  useEffect(() => {
    if (session?.user) {
      setProfileForm((prev) => ({
        ...prev,
        name: prev.name || session.user?.name || '',
        email: prev.email || session.user?.email || '',
        role: prev.role || (session.user as any)?.role || '',
      }));
    }
    fetchProfile();
  }, [session?.user?.email]);

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setProfileForm({
          name: data.name || session?.user?.name || '',
          email: data.email || session?.user?.email || '',
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
        setDepartmentName(data.department?.name || '');
        setRenterCategory(data.renterCategory || 'EXTERNAL');
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
        await fetchProfile();
        if (updateSession) {
          await updateSession({ name: profileForm.name });
        }
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memperbarui profil', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setProfileSaving(false);
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
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const displayInitial = (profileForm.name || session?.user?.name || 'U').charAt(0).toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Profil &amp; Akun Saya</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Kelola identitas pribadi, foto profil, keamanan kata sandi, dan catatan kepatuhan akun Anda.
          </p>
        </div>

        {/* Clean 2-tab switcher */}
        <div style={{ display: 'flex', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '0.25rem', gap: '0.25rem' }}>
          <button
            type="button"
            onClick={() => router.push('/dashboard/profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'profile' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'profile' ? '#fff' : 'var(--color-muted)',
              fontWeight: activeTab === 'profile' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <User size={16} /> Profil &amp; Keamanan
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/profile?tab=sanctions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'sanctions' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'sanctions' ? '#fff' : 'var(--color-muted)',
              fontWeight: activeTab === 'sanctions' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <AlertCircle size={16} /> Riwayat Sanksi
            {violations.length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', padding: '0.05rem 0.45rem', fontSize: '0.72rem', fontWeight: 800 }}>
                {violations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Strip */}
          <Card style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
              <ShieldCheck size={17} style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-muted)' }}>Peran:</span>
              <strong>{profileForm.role || (session?.user as any)?.role || 'BORROWER'}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
              <Building2 size={17} style={{ color: 'var(--color-accent)' }} />
              <span style={{ color: 'var(--color-muted)' }}>Unit / Kategori:</span>
              <strong>{departmentName || renterCategory}</strong>
            </div>
          </Card>

          {/* Profile Form */}
          <Card style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    {!profileForm.avatarUrl && displayInitial}
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
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

          {/* Change Password */}
          <Card style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
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
              <div style={{ padding: '1rem', background: violations.some(v => v.type === 'SUSPENSION') ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-md)', borderLeft: '4.5px solid #ef4444', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>Status Akun Saat Ini:</strong>{' '}
                {violations.some(v => v.type === 'SUSPENSION') ? (
                  <span style={{ color: '#ef4444', fontWeight: 900 }}>DITANGGUHKAN / TERBLOKIR SEMENTARA</span>
                ) : (
                  <span style={{ color: '#10b981', fontWeight: 900 }}>AKTIF &amp; BEBAS PINJAM</span>
                )}
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
    </div>
  );
}


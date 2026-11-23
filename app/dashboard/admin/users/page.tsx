'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import {
  Users, Shield, CalendarCheck, Clipboard, FileText,
  KeyRound, Bell, CheckSquare, Search, Plus, Trash2,
  Save, ShieldCheck, ShieldAlert, Sliders, Settings2,
  Lock, Unlock, RefreshCw, AlertCircle, Award, Building2,
  Edit, Check, UserCheck, UserX, Phone, Mail, Eye, ArrowRight, MapPin
} from 'lucide-react';

type Tab = 'users' | 'rbac' | 'approvals' | 'departments' | 'audit' | 'notifications' | 'security';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'users', label: 'Daftar User', icon: Users },
  { id: 'rbac', label: 'Hak Akses (RBAC)', icon: Shield },
  { id: 'approvals', label: 'Konfigurasi Approval', icon: CalendarCheck },
  { id: 'departments', label: 'Unit / Departemen', icon: Building2 },
  { id: 'audit', label: 'Audit Trail', icon: Clipboard },
  { id: 'notifications', label: 'Template Notifikasi', icon: Bell },
  { id: 'security', label: 'Keamanan', icon: KeyRound },
];

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const userRole = (session?.user as any)?.role || '';
  useEffect(() => {
    if (userRole && !['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      router.push('/dashboard');
    }
  }, [userRole, router]);

  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Customer Support states: Reset Password
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [customPassword, setCustomPassword] = useState('User@123');
  const [resetting, setResetting] = useState(false);

  // Customer Support states: Detail User
  const [detailUser, setDetailUser] = useState<any>(null);

  // Customer Support states: Edit User
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    email: '',
    role: 'BORROWER',
    renterCategory: 'MAHASISWA',
    phone: '',
    identityNo: '',
    departmentId: '',
    address: '',
    gender: '',
  });
  const [editing, setEditing] = useState(false);

  // Customer Support states: Add User
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '',
    email: '',
    password: 'User@123',
    role: 'BORROWER',
    renterCategory: 'MAHASISWA',
    phone: '',
    identityNo: '',
    departmentId: '',
  });
  const [adding, setAdding] = useState(false);

  // Approvals & security states
  const [configs, setConfigs] = useState<any[]>([]);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({ departmentId: '', categoryId: '', transactionType: 'LOAN', level: 1, approverId: '', notes: '' });

  // Security policy states
  const [policy, setPolicy] = useState<any>({ minPasswordLength: 8, requireUppercase: false, requireNumber: true, requireSpecialChar: false, sessionTimeoutMins: 480, enable2FA: false });
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Notifications templates state
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // Departments state
  const [departments, setDepartments] = useState<any[]>([]);
  const [deptsLoading, setDeptsLoading] = useState(true);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [deptForm, setDeptForm] = useState({ code: '', name: '', headName: '', description: '' });
  const [savingDept, setSavingDept] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.append('search', search);
      if (roleFilter !== 'ALL') q.append('role', roleFilter);
      if (statusFilter !== 'ALL') q.append('status', statusFilter);
      const res = await fetch(`/api/admin/users?${q.toString()}`);
      const data = await res.json();
      setUsers(data.data || []);
    } catch { }
    finally { setUsersLoading(false); }
  }, [search, roleFilter, statusFilter]);

  const handleResetPassword = async () => {
    if (!targetUser) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: customPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Password berhasil di-reset', 'success');
        setResetModalOpen(false);
      } else {
        showToast(data.error || 'Gagal me-reset password', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleToggleSuspend = async (user: any) => {
    const actionText = user.isSuspended ? 'mengaktifkan kembali' : 'menangguhkan (suspend)';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} akun ${user.name}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended: !user.isSuspended }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Akun ${user.name} berhasil di-${user.isSuspended ? 'aktifkan' : 'tangguhkan'}`, 'success');
        fetchUsers();
      } else {
        showToast(data.error || 'Gagal mengubah status akun', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    }
  };

  const openEditModal = (u: any) => {
    setEditForm({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      renterCategory: u.renterCategory || 'MAHASISWA',
      phone: u.phone || '',
      identityNo: u.identityNo || '',
      departmentId: u.department?.id || u.departmentId || '',
      address: u.address || '',
      gender: u.gender || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    setEditing(true);
    try {
      const res = await fetch(`/api/admin/users/${editForm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Data pengguna berhasil diperbarui', 'success');
        setEditModalOpen(false);
        fetchUsers();
      } else {
        showToast(data.error || 'Gagal memperbarui pengguna', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setEditing(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newForm.name || !newForm.email || !newForm.password) {
      showToast('Nama, Email, dan Password wajib diisi', 'error');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Pengguna baru berhasil ditambahkan', 'success');
        setAddModalOpen(false);
        setNewForm({
          name: '',
          email: '',
          password: 'User@123',
          role: 'BORROWER',
          renterCategory: 'MAHASISWA',
          phone: '',
          identityNo: '',
          departmentId: '',
        });
        fetchUsers();
      } else {
        showToast(data.error || 'Gagal membuat pengguna', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setAdding(false);
    }
  };

  const fetchConfigs = useCallback(async () => {
    setConfigsLoading(true);
    try {
      const res = await fetch('/api/admin/approval-configs');
      setConfigs(await res.json());
    } catch { }
    finally { setConfigsLoading(false); }
  }, []);

  const fetchPolicy = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/security-policy');
      setPolicy(await res.json());
    } catch { }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch('/api/admin/notification-templates');
      setTemplates(await res.json());
    } catch { }
    finally { setTemplatesLoading(false); }
  }, []);

  const fetchDepts = useCallback(async () => {
    setDeptsLoading(true);
    try {
      const res = await fetch('/api/departments');
      setDepartments(await res.json());
    } catch { }
    finally { setDeptsLoading(false); }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      setAuditLogs(await res.json());
    } catch { }
    finally { setAuditLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'approvals') fetchConfigs();
    else if (activeTab === 'security') fetchPolicy();
    else if (activeTab === 'notifications') fetchTemplates();
    else if (activeTab === 'departments') fetchDepts();
    else if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, fetchUsers, fetchConfigs, fetchPolicy, fetchTemplates, fetchDepts, fetchAuditLogs]);

  const handleUpdatePolicy = async () => {
    setSavingPolicy(true);
    try {
      const res = await fetch('/api/admin/security-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy)
      });
      if (!res.ok) throw new Error();
      showToast('Kebijakan keamanan diperbarui', 'success');
    } catch { showToast('Gagal memperbarui kebijakan', 'error'); }
    finally { setSavingPolicy(false); }
  };

  const handleCreateConfig = async () => {
    try {
      const res = await fetch('/api/admin/approval-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...configForm, level: Number(configForm.level) })
      });
      if (!res.ok) throw new Error();
      showToast('Konfigurasi approval disimpan', 'success');
      setShowConfigModal(false);
      fetchConfigs();
    } catch { showToast('Gagal menyimpan konfigurasi', 'error'); }
  };

  if (userRole && !['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
    return null;
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Settings2 size={26} style={{ color: 'var(--color-primary)' }} />
          Manajemen User &amp; Akses
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Kelola otorisasi RBAC, unit organisasi, kebijakan password, template notifikasi, dan approval berjenjang.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--color-surface2)', padding: '0.35rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 1.0rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--color-muted)',
              fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '0.88rem',
              whiteSpace: 'nowrap', transition: 'all 0.2s',
            }}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: USERS */}
      {activeTab === 'users' && (
        <Card style={{ padding: '1.25rem' }}>
          {/* Header Controls & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Cari nama, email, NIM/NIP, HP..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.2rem' }}
                />
              </div>

              <select
                className="input-field"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ fontSize: '0.85rem', fontWeight: 600 }}
              >
                <option value="ALL">Semua Role</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin Sarpras</option>
                <option value="APPROVER">Kepala Unit (Approver)</option>
                <option value="STAFF">Staff Loket</option>
                <option value="BORROWER">Peminjam (Borrower)</option>
              </select>

              <select
                className="input-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ fontSize: '0.85rem', fontWeight: 600 }}
              >
                <option value="ALL">Semua Status</option>
                <option value="active">🟢 Aktif</option>
                <option value="suspended">🔴 Ditangguhkan (Suspended)</option>
              </select>
            </div>

            <button
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.55rem 1rem', fontWeight: 700 }}
              onClick={() => setAddModalOpen(true)}
            >
              <Plus size={16} /> Tambah User Baru
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Nama &amp; Identitas</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Email &amp; Kontak</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Departemen / Unit</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Role</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Kategori Pemohon</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status Akun</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Aksi Bantuan Admin</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-muted)' }}>Memuat data pengguna...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-muted)' }}>Tidak ditemukan data pengguna yang cocok.</td></tr>
                ) : users.map(u => {
                  const roleColors: Record<string, { bg: string; text: string }> = {
                    SUPER_ADMIN: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
                    ADMIN: { bg: 'rgba(99,102,241,0.12)', text: '#6366f1' },
                    APPROVER: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
                    STAFF: { bg: 'rgba(6,182,212,0.12)', text: '#06b6d4' },
                    BORROWER: { bg: 'rgba(107,114,128,0.12)', text: '#6b7280' },
                  };
                  const rCol = roleColors[u.role] || roleColors.BORROWER;

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{u.name}</div>
                        {u.identityNo && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                            NIP/NIM: {u.identityNo}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div>{u.email}</div>
                        {u.phone && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                            WA: {u.phone}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ fontSize: '0.82rem', color: u.department?.name ? 'var(--color-text)' : 'var(--color-muted)' }}>
                          {u.department?.name || 'Pusat Kampus'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{ padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: 800, background: rCol.bg, color: rCol.text }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: u.renterCategory === 'MAHASISWA' ? 'rgba(16,185,129,0.12)' : 'rgba(79,70,229,0.12)',
                          color: u.renterCategory === 'MAHASISWA' ? '#10b981' : '#6366f1'
                        }}>
                          {u.renterCategory === 'MAHASISWA' ? '🎓 Mahasiswa' : (u.renterCategory === 'INTERNAL' ? '🏛️ Internal' : '💼 Eksternal')}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {u.isSuspended ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', fontWeight: 700, fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                            <Lock size={12} /> Suspended
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontWeight: 700, fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                            <Check size={12} /> Aktif
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* Tombol Lihat Detail Profil */}
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Lihat Detail Lengkap Profil Pengguna"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.3rem 0.55rem' }}
                            onClick={() => setDetailUser(u)}
                          >
                            <Eye size={13} />
                            <span>Detail</span>
                          </button>

                          {/* Tombol Reset Password */}
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Reset Password Akun Pengguna"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.3rem 0.55rem' }}
                            onClick={() => {
                              setTargetUser(u);
                              setCustomPassword('User@123');
                              setResetModalOpen(true);
                            }}
                          >
                            <KeyRound size={13} style={{ color: 'var(--color-primary)' }} />
                            <span>Reset PW</span>
                          </button>

                          {/* Tombol Suspend / Unsuspend */}
                          <button
                            className="btn btn-secondary btn-sm"
                            title={u.isSuspended ? 'Buka Blokir (Unsuspend)' : 'Tangguhkan Akun (Suspend)'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              padding: '0.3rem 0.55rem',
                              color: u.isSuspended ? '#10b981' : '#ef4444',
                              borderColor: u.isSuspended ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'
                            }}
                            onClick={() => handleToggleSuspend(u)}
                          >
                            {u.isSuspended ? <Unlock size={13} /> : <Lock size={13} />}
                            <span>{u.isSuspended ? 'Buka Kunci' : 'Suspend'}</span>
                          </button>

                          {/* Tombol Edit User */}
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Ubah Peran, Kategori & Departemen"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.3rem 0.55rem' }}
                            onClick={() => openEditModal(u)}
                          >
                            <Edit size={13} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB: APPROVAL CONFIGS */}
      {activeTab === 'approvals' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => setShowConfigModal(true)}>
              <Plus size={16} /> Buat Konfigurasi Approval
            </button>
          </div>

          <Card style={{ padding: '1.25rem' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '1rem' }}>Rantai Persetujuan Transaksi</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Unit / Departemen</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Transaksi</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Level Approval</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Approver</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {configsLoading ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Memuat...</td></tr>
                  ) : configs.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>Belum ada konfigurasi approval custom. Berjalan dengan level 1 default.</td></tr>
                  ) : configs.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem' }}>{c.departmentId || 'Global (Semua)'}</td>
                      <td style={{ padding: '0.75rem' }}>{c.transactionType}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 800 }}>Level {c.level}</td>
                      <td style={{ padding: '0.75rem' }}>{c.approver?.name || c.approverId}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--color-muted)' }}>{c.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB: SECURITY POLICY */}
      {activeTab === 'security' && (
        <Card style={{ padding: '1.5rem', maxWidth: '600px' }}>
          <h3 style={{ fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Lock size={18} style={{ color: 'var(--color-primary)' }} />
            Kebijakan Kata Sandi &amp; Sesi Login
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="input-label">Panjang Minimal Sandi</label>
              <input type="number" className="input-field" style={{ width: '100%' }} value={policy.minPasswordLength} onChange={e => setPolicy({ ...policy, minPasswordLength: Number(e.target.value) })} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="checkbox" checked={policy.requireUppercase} onChange={e => setPolicy({ ...policy, requireUppercase: e.target.checked })} />
              <label style={{ fontSize: '0.88rem' }}>Wajib menggunakan huruf kapital (A-Z)</label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="checkbox" checked={policy.requireNumber} onChange={e => setPolicy({ ...policy, requireNumber: e.target.checked })} />
              <label style={{ fontSize: '0.88rem' }}>Wajib menggunakan angka (0-9)</label>
            </div>
            <div>
              <label className="input-label">Batas Waktu Sesi Login (Menit)</label>
              <input type="number" className="input-field" style={{ width: '100%' }} value={policy.sessionTimeoutMins} onChange={e => setPolicy({ ...policy, sessionTimeoutMins: Number(e.target.value) })} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
              <input type="checkbox" checked={policy.enable2FA} onChange={e => setPolicy({ ...policy, enable2FA: e.target.checked })} />
              <label style={{ fontSize: '0.88rem', fontWeight: 700 }}>Aktifkan Autentikasi 2 Faktor (2FA)</label>
            </div>
            <button className="btn btn-primary" onClick={handleUpdatePolicy} disabled={savingPolicy} style={{ marginTop: '1rem' }}>
              <Save size={16} /> Simpan Kebijakan
            </button>
          </div>
        </Card>
      )}

      {/* TAB: NOTIFICATION TEMPLATES */}
      {activeTab === 'notifications' && (
        <Card style={{ padding: '1.25rem' }}>
          <h3 style={{ fontWeight: 800, marginBottom: '1rem' }}>Template Notifikasi WhatsApp</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {templatesLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Memuat...</div>
            ) : templates.map(t => (
              <div key={t.id} style={{ padding: '1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.5rem' }}>{t.label} ({t.eventType})</div>
                <textarea className="input-field" style={{ width: '100%', minHeight: '60px', fontFamily: 'monospace', fontSize: '0.82rem' }} defaultValue={t.templateWa || ''} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB: DEPARTMENTS (CRUD Unit Pendidikan / Prodi / Fakultas) */}
      {activeTab === 'departments' && (
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontWeight: 800, margin: 0 }}>Manajemen Unit Pendidikan / Prodi / Fakultas</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                Kelola daftar fakultas, program studi, jurusan, dan biro kerja beserta penanggung jawab unit.
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingDept(null);
                setDeptForm({ code: '', name: '', headName: '', description: '' });
                setDeptModalOpen(true);
              }}
            >
              <Plus size={15} /> Tambah Unit / Fakultas
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Kode</th>
                  <th style={{ padding: '0.75rem' }}>Nama Unit / Prodi / Fakultas</th>
                  <th style={{ padding: '0.75rem' }}>Kepala Unit / PIC</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Jumlah Aset</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Jumlah Ruangan</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Jumlah User</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {deptsLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                      Memuat daftar unit/fakultas...
                    </td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                      Belum ada unit pendidikan/fakultas terdaftar.
                    </td>
                  </tr>
                ) : (
                  departments.map((d: any) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary)' }}>
                        {d.code}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700 }}>{d.name}</div>
                        {d.description && <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{d.description}</div>}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{d.headName || '-'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700 }}>{d._count?.assets || 0}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700 }}>{d._count?.locations || 0}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700 }}>{d._count?.users || 0}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditingDept(d);
                              setDeptForm({
                                code: d.code || '',
                                name: d.name || '',
                                headName: d.headName || '',
                                description: d.description || '',
                              });
                              setDeptModalOpen(true);
                            }}
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={async () => {
                              if (!confirm(`Hapus unit "${d.name}" (${d.code})?`)) return;
                              const res = await fetch(`/api/departments/${d.id}`, { method: 'DELETE' });
                              const data = await res.json();
                              if (res.ok) {
                                showToast('Unit/fakultas berhasil dihapus', 'success');
                                fetchDepts();
                              } else {
                                showToast(data.error || 'Gagal menghapus unit', 'error');
                              }
                            }}
                          >
                            <Trash2 size={14} /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {deptModalOpen && (
            <div style={{ marginBottom: '1.25rem', padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)', border: '1px solid var(--color-primary)' }}>
              <div style={{ fontWeight: 800, marginBottom: '0.85rem' }}>
                {editingDept ? 'Edit Unit Pendidikan / Fakultas' : 'Formulir Tambah Unit Pendidikan / Fakultas'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>Kode Unit / Fakultas *</label>
                  <input
                    className="input-field"
                    placeholder="Contoh: FTI, FEB, PRODI-IF"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>Nama Lengkap Unit / Prodi / Fakultas *</label>
                  <input
                    className="input-field"
                    placeholder="Contoh: Fakultas Teknologi Informasi"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>Kepala Unit / Dekan / Kaprodi (Opsional)</label>
                  <input
                    className="input-field"
                    placeholder="Contoh: Dr. Budi Santoso, M.Kom."
                    value={deptForm.headName}
                    onChange={(e) => setDeptForm({ ...deptForm, headName: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>Keterangan (Opsional)</label>
                  <input
                    className="input-field"
                    placeholder="Deskripsi singkat unit/fakultas..."
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.85rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setDeptModalOpen(false)}>Batal</button>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={savingDept}
                  onClick={async () => {
                    if (!deptForm.code.trim() || !deptForm.name.trim()) {
                      showToast('Kode dan Nama Unit wajib diisi', 'error');
                      return;
                    }
                    try {
                      setSavingDept(true);
                      const url = editingDept ? `/api/departments/${editingDept.id}` : '/api/departments';
                      const method = editingDept ? 'PUT' : 'POST';
                      const res = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(deptForm),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        showToast(editingDept ? 'Unit berhasil diperbarui' : 'Unit baru berhasil ditambahkan', 'success');
                        setDeptModalOpen(false);
                        fetchDepts();
                      } else {
                        showToast(data.error || 'Gagal menyimpan unit', 'error');
                      }
                    } finally {
                      setSavingDept(false);
                    }
                  }}
                >
                  {savingDept ? 'Menyimpan...' : 'Simpan Unit'}
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB: RBAC Placeholder */}
      {activeTab === 'rbac' && (
        <Card style={{ padding: '3rem', textAlign: 'center' }}>
          <Shield size={48} style={{ color: 'var(--color-muted)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Matrix Hak Akses Peran</h3>
          <p style={{ color: 'var(--color-muted)', maxWidth: '400px', margin: '0 auto' }}>
            Fitur kustomisasi matrix RBAC dinamis akan tersedia di fase lanjutan untuk mengatur permission per role.
          </p>
        </Card>
      )}

      {/* TAB: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontWeight: 800, margin: 0 }}>Audit Trail &amp; Log Aktivitas Sistem</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                Rekaman 100 aktivitas dan perubahan data terbaru pada sistem (Dari A → Menjadi B).
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={fetchAuditLogs}>
                <RefreshCw size={14} /> Muat Ulang
              </button>
              <Link href="/dashboard/logs" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                Buka Log Sistem Lengkap <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Waktu</th>
                  <th style={{ padding: '0.75rem' }}>Aktor / User</th>
                  <th style={{ padding: '0.75rem' }}>Aksi</th>
                  <th style={{ padding: '0.75rem' }}>Entitas</th>
                  <th style={{ padding: '0.75rem' }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                      Memuat log audit...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                      Belum ada rekaman log aktivitas.
                    </td>
                  </tr>
                ) : (
                  auditLogs.slice(0, 25).map((l: any) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                        {formatDate(l.timestamp, 'dd MMM yyyy HH:mm')}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700 }}>{l.user?.name || 'Sistem'}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--color-muted)' }}>{l.user?.email || '-'}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.18rem 0.45rem', borderRadius: '4px', background: 'var(--color-surface2)', border: '1px solid var(--color-border)' }}>
                          {l.action}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{l.entity}</td>
                      <td style={{ padding: '0.75rem' }}>{l.details || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL: Buat Konfigurasi Approval */}
      <Modal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} title="Buat Rantai Approval Baru">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="input-label">Unit / Departemen (kosongkan = Global)</label>
            <select
              className="input-field"
              style={{ width: '100%' }}
              value={configForm.departmentId}
              onChange={(e) => setConfigForm({ ...configForm, departmentId: e.target.value })}
            >
              <option value="">-- Global (Semua Unit / Departemen) --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Jenis Transaksi</label>
            <select className="input-field" style={{ width: '100%' }} value={configForm.transactionType} onChange={e => setConfigForm({ ...configForm, transactionType: e.target.value })}>
              <option value="LOAN">LOAN (Peminjaman Ruangan/Aset Gratis)</option>
              <option value="RENTAL">RENTAL (Booking Aset Berbayar)</option>
              <option value="ROOM_BOOKING">ROOM_BOOKING (Booking Ruangan Berbayar)</option>
            </select>
          </div>
          <div>
            <label className="input-label">Level Approval (Urutan)</label>
            <select className="input-field" style={{ width: '100%' }} value={configForm.level} onChange={e => setConfigForm({ ...configForm, level: Number(e.target.value) })}>
              <option value={1}>Level 1 (Persetujuan Pertama)</option>
              <option value={2}>Level 2 (Persetujuan Kedua)</option>
              <option value={3}>Level 3 (Persetujuan Ketiga)</option>
            </select>
          </div>
          <div>
            <label className="input-label">ID User Approver *</label>
            <input className="input-field" style={{ width: '100%' }} placeholder="Masukkan User ID approver" value={configForm.approverId} onChange={e => setConfigForm({ ...configForm, approverId: e.target.value })} />
          </div>
          <div>
            <label className="input-label">Catatan</label>
            <textarea className="input-field" style={{ width: '100%', minHeight: '60px' }} value={configForm.notes} onChange={e => setConfigForm({ ...configForm, notes: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowConfigModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={handleCreateConfig}>Simpan Konfigurasi</button>
          </div>
        </div>
      </Modal>

      {/* MODAL 1: Reset Password Pengguna */}
      <Modal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} title="🔑 Reset Password Pengguna">
        {targetUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--color-surface2)', padding: '0.9rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              <div><span style={{ color: 'var(--color-muted)' }}>Nama:</span> <strong>{targetUser.name}</strong></div>
              <div><span style={{ color: 'var(--color-muted)' }}>Email Akun:</span> <strong>{targetUser.email}</strong></div>
            </div>

            <div>
              <label className="input-label" style={{ fontWeight: 700 }}>
                Password Baru *
              </label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem' }}
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="Masukkan password baru (minimal 6 karakter)"
                required
              />
              <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.35rem' }}>
                💡 Default: <code>User@123</code>. Berikan password ini ke pemohon setelah reset berhasil.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setResetModalOpen(false)}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleResetPassword} disabled={resetting}>
                {resetting ? 'Memproses Reset...' : '✓ Konfirmasi Reset Password'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL DETAIL: Lihat Profil Lengkap Pengguna */}
      <Modal isOpen={!!detailUser} onClose={() => setDetailUser(null)} title="👤 Detail Profil Pengguna" maxWidth="650px">
        {detailUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Profile Header Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', background: 'var(--grad-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.3rem', flexShrink: 0
              }}>
                {(detailUser.name || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-text)' }}>{detailUser.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                  <Mail size={13} /> {detailUser.email}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                    {detailUser.role}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '4px', background: detailUser.isSuspended ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: detailUser.isSuspended ? '#ef4444' : '#10b981' }}>
                    {detailUser.isSuspended ? 'Suspended (Diblokir)' : 'Akun Aktif'}
                  </span>
                </div>
              </div>
            </div>

            {/* Detail Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', fontSize: '0.85rem' }}>
              <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 700 }}>EMAIL LOGIN</div>
                <div style={{ fontWeight: 600, marginTop: '0.2rem', wordBreak: 'break-all' }}>{detailUser.email}</div>
              </div>
              <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 700 }}>NO. WHATSAPP / HP</div>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{detailUser.phone || '-'}</div>
              </div>
              <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 700 }}>NIP / NIM / NIK</div>
                <div style={{ fontWeight: 600, fontFamily: 'monospace', marginTop: '0.2rem' }}>{detailUser.identityNo || '-'}</div>
              </div>
              <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 700 }}>KATEGORI PEMINJAM</div>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{detailUser.renterCategory || '-'}</div>
              </div>
              <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 700 }}>UNIT / DEPARTEMEN</div>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{detailUser.department?.name || 'Pusat Kampus / Umum'}</div>
              </div>
              <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 700 }}>JENIS KELAMIN</div>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{detailUser.gender || '-'}</div>
              </div>
              <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 700 }}>ALAMAT DOMISILI</div>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{detailUser.address || detailUser.residence || '-'}</div>
              </div>
              <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 700 }}>RIWAYAT PEMINJAMAN</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary-light)', marginTop: '0.2rem' }}>
                  {detailUser._count?.loans || 0} Transaksi
                </div>
              </div>
              <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 700 }}>TANGGAL TERDAFTAR</div>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>
                  {detailUser.createdAt ? formatDate(detailUser.createdAt, 'dd MMM yyyy') : '-'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const u = detailUser;
                    setDetailUser(null);
                    openEditModal(u);
                  }}
                >
                  <Edit size={14} /> Edit Profil
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const u = detailUser;
                    setDetailUser(null);
                    setTargetUser(u);
                    setCustomPassword('User@123');
                    setResetModalOpen(true);
                  }}
                >
                  <KeyRound size={14} /> Reset Password
                </button>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setDetailUser(null)}>
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: Edit Data & Peran Pengguna */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="✏️ Edit Profil &amp; Hak Akses Pengguna" maxWidth="650px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="input-label">Nama Lengkap *</label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%' }}
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="input-label">Alamat Email (Login) *</label>
              <input
                type="email"
                className="input-field"
                style={{ width: '100%' }}
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="input-label">No. WhatsApp / HP</label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%' }}
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div>
              <label className="input-label">NIP / NIM / No. Identitas</label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%' }}
                value={editForm.identityNo}
                onChange={(e) => setEditForm({ ...editForm, identityNo: e.target.value })}
                placeholder="NIM / NIP"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="input-label">Role Akses Sistem *</label>
              <select
                className="input-field"
                style={{ width: '100%', fontWeight: 700 }}
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              >
                <option value="BORROWER">BORROWER (Peminjam Umum)</option>
                <option value="STAFF">STAFF (Petugas Loket/Sarpras)</option>
                <option value="APPROVER">APPROVER (Kepala Unit/Lab)</option>
                <option value="ADMIN">ADMIN (Pengelola Aset)</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN (Akses Penuh)</option>
              </select>
            </div>
            <div>
              <label className="input-label">Kategori Pemohon *</label>
              <select
                className="input-field"
                style={{ width: '100%', fontWeight: 700 }}
                value={editForm.renterCategory}
                onChange={(e) => setEditForm({ ...editForm, renterCategory: e.target.value })}
              >
                <option value="MAHASISWA">🎓 Mahasiswa Kampus</option>
                <option value="INTERNAL">🏛️ Dosen / Pegawai Internal</option>
                <option value="EXTERNAL">💼 Eksternal / Mitra Umum</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="input-label">Unit / Departemen</label>
              <select
                className="input-field"
                style={{ width: '100%' }}
                value={editForm.departmentId}
                onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
              >
                <option value="">Pusat Kampus / Tanpa Unit</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Jenis Kelamin</label>
              <select
                className="input-field"
                style={{ width: '100%' }}
                value={editForm.gender}
                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
              >
                <option value="">-- Tidak Ditentukan --</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="input-label">Alamat Domisili</label>
            <textarea
              className="input-field"
              rows={2}
              style={{ width: '100%' }}
              placeholder="Alamat lengkap pengguna..."
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={editing}>
              {editing ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Tambah Pengguna Baru */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="👤 Daftarkan Pengguna Baru">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="input-label">Nama Lengkap *</label>
            <input
              type="text"
              className="input-field"
              style={{ width: '100%' }}
              placeholder="Contoh: Ahmad Dahlan"
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="input-label">Email Akun (Login) *</label>
              <input
                type="email"
                className="input-field"
                style={{ width: '100%' }}
                placeholder="nama@spasi.app"
                value={newForm.email}
                onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="input-label">Password Awal *</label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%', fontFamily: 'monospace' }}
                value={newForm.password}
                onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="input-label">No. WhatsApp / HP</label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%' }}
                placeholder="08xxxxxxxxxx"
                value={newForm.phone}
                onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">NIP / NIM / No. KTP</label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%' }}
                placeholder="3201xxxx / NIM"
                value={newForm.identityNo}
                onChange={(e) => setNewForm({ ...newForm, identityNo: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="input-label">Role Akses *</label>
              <select
                className="input-field"
                style={{ width: '100%', fontWeight: 700 }}
                value={newForm.role}
                onChange={(e) => setNewForm({ ...newForm, role: e.target.value })}
              >
                <option value="BORROWER">BORROWER (Peminjam)</option>
                <option value="STAFF">STAFF (Petugas)</option>
                <option value="APPROVER">APPROVER (Kepala Unit)</option>
                <option value="ADMIN">ADMIN (Pengelola Aset)</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>
            </div>
            <div>
              <label className="input-label">Kategori Pemohon *</label>
              <select
                className="input-field"
                style={{ width: '100%', fontWeight: 700 }}
                value={newForm.renterCategory}
                onChange={(e) => setNewForm({ ...newForm, renterCategory: e.target.value })}
              >
                <option value="MAHASISWA">🎓 Mahasiswa Kampus</option>
                <option value="INTERNAL">🏛️ Dosen / Pegawai Internal</option>
                <option value="EXTERNAL">💼 Eksternal / Mitra Umum</option>
              </select>
            </div>
          </div>

          <div>
            <label className="input-label">Unit / Departemen</label>
            <select
              className="input-field"
              style={{ width: '100%' }}
              value={newForm.departmentId}
              onChange={(e) => setNewForm({ ...newForm, departmentId: e.target.value })}
            >
              <option value="">Pusat Kampus / Tanpa Unit</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setAddModalOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={handleCreateUser} disabled={adding}>
              {adding ? 'Mendaftarkan...' : '+ Daftarkan Pengguna'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

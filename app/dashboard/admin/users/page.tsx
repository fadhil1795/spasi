'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  Lock, RefreshCw, AlertCircle, Award, Building2
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
  if (userRole && userRole !== 'SUPER_ADMIN') {
    router.push('/dashboard');
    return null;
  }

  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/crm/borrowers?type=user');
      const data = await res.json();
      setUsers(data.data || []);
    } catch { }
    finally { setUsersLoading(false); }
  }, []);

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
      const res = await fetch('/api/partners'); // Fallback ke API partner/dept yang sudah ada
      setDepartments(await res.json());
    } catch { }
    finally { setDeptsLoading(false); }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/audit-logs'); // Fallback ke endpoint log audit lama jika ada
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontWeight: 800 }}>Daftar Pengguna Sistem</h3>
            <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Plus size={14} /> Tambah User Baru
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Nama</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Email / Username</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Departemen</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Role</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Memuat...</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700 }}>{u.name}</td>
                    <td style={{ padding: '0.75rem' }}>{u.email}</td>
                    <td style={{ padding: '0.75rem' }}>{u.department || 'Pusat'}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, background: 'var(--color-primary-alpha)', color: 'var(--color-primary)' }}>
                        {u.renterCategory}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {u.isSuspended ? (
                        <span style={{ color: '#ef4444' }}>Suspended</span>
                      ) : <span style={{ color: '#10b981' }}>Active</span>}
                    </td>
                  </tr>
                ))}
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

      {/* TAB: DEPARTMENTS Placeholder */}
      {activeTab === 'departments' && (
        <Card style={{ padding: '3rem', textAlign: 'center' }}>
          <Building2 size={48} style={{ color: 'var(--color-muted)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Manajemen Unit / Fakultas</h3>
          <p style={{ color: 'var(--color-muted)', maxWidth: '400px', margin: '0 auto' }}>
            Manajemen unit dan penanggung jawab admin fakultas dikelola terpusat dari tab master departemen.
          </p>
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

      {/* TAB: AUDIT Placeholder */}
      {activeTab === 'audit' && (
        <Card style={{ padding: '3rem', textAlign: 'center' }}>
          <Clipboard size={48} style={{ color: 'var(--color-muted)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Audit Trail Viewer</h3>
          <p style={{ color: 'var(--color-muted)', maxWidth: '400px', margin: '0 auto' }}>
            Rekaman aktivitas user dan log perubahan data (Log Audit) dapat diakses di menu utama Laporan &gt; Audit.
          </p>
        </Card>
      )}

      {/* MODAL: Buat Konfigurasi Approval */}
      <Modal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} title="Buat Rantai Approval Baru">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="input-label">Unit / Departemen (kosongkan = Global)</label>
            <input className="input-field" style={{ width: '100%' }} placeholder="Salin Department ID" value={configForm.departmentId} onChange={e => setConfigForm({ ...configForm, departmentId: e.target.value })} />
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
    </div>
  );
}

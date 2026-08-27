'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Users, UserX, CreditCard, Building2, MessageSquare,
  Search, Filter, Plus, ShieldAlert, ShieldCheck, Eye,
  Phone, Mail, AlertCircle, CheckCircle, Clock, Trash2,
  UserCheck, Globe, School, ChevronRight, Shield,
} from 'lucide-react';

type Tab = 'borrowers' | 'blacklist' | 'cards' | 'groups' | 'commlogs' | 'users';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'borrowers', label: 'Peminjam', icon: Users },
  { id: 'blacklist', label: 'Blacklist', icon: UserX },
  { id: 'cards', label: 'Kartu Anggota', icon: CreditCard },
  { id: 'groups', label: 'Organisasi', icon: Building2 },
  { id: 'commlogs', label: 'Log Komunikasi', icon: MessageSquare },
  { id: 'users', label: 'Manajemen User & Role', icon: Shield },
];

const BLACKLIST_COLORS: Record<string, string> = {
  SUSPENSION: '#f59e0b', WARNING: '#3b82f6', PERMANENT: '#ef4444',
};

export default function CRMPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const userRole = (session?.user as any)?.role || '';
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);

  const initialTab = (searchParams.get('tab') as Tab) || 'borrowers';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Borrowers state
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [borrowersLoading, setBorrowersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Blacklist state
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [blacklistLoading, setBlacklistLoading] = useState(true);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [blacklistForm, setBlacklistForm] = useState({ userId: '', reason: '', type: 'SUSPENSION', endDate: '' });
  const [liftModal, setLiftModal] = useState<{ id: string; name: string } | null>(null);
  const [liftReason, setLiftReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Groups state
  const [groups, setGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', code: '', type: 'ORGANIZATION', description: '' });

  // CommLogs state
  const [commLogs, setCommLogs] = useState<any[]>([]);
  const [commLogsLoading, setCommLogsLoading] = useState(true);

  // System users management state (moved from settings)
  const [sysUsers, setSysUsers] = useState<any[]>([]);
  const [sysUsersLoading, setSysUsersLoading] = useState(false);
  const [violationModalOpen, setViolationModalOpen] = useState(false);
  const [selectedUserViolations, setSelectedUserViolations] = useState<any>(null);

  const fetchBorrowers = useCallback(async () => {
    setBorrowersLoading(true);
    try {
      const params = new URLSearchParams({ type: typeFilter, status: statusFilter, ...(search ? { search } : {}) });
      const res = await fetch(`/api/crm/borrowers?${params}`);
      const data = await res.json();
      setBorrowers(data.data || []);
    } catch { showToast('Gagal memuat data peminjam', 'error'); }
    finally { setBorrowersLoading(false); }
  }, [typeFilter, statusFilter, search, showToast]);

  const fetchBlacklist = useCallback(async () => {
    setBlacklistLoading(true);
    try {
      const res = await fetch('/api/crm/blacklist');
      setBlacklist(await res.json());
    } catch { }
    finally { setBlacklistLoading(false); }
  }, []);

  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await fetch('/api/crm/groups');
      setGroups(await res.json());
    } catch { }
    finally { setGroupsLoading(false); }
  }, []);

  const fetchCommLogs = useCallback(async () => {
    setCommLogsLoading(true);
    try {
      const res = await fetch('/api/crm/communication-logs');
      setCommLogs(await res.json());
    } catch { }
    finally { setCommLogsLoading(false); }
  }, []);

  const fetchSysUsers = useCallback(async () => {
    setSysUsersLoading(true);
    try {
      const res = await fetch('/api/settings/users');
      if (res.ok) setSysUsers(await res.json());
    } catch {
      showToast('Gagal memuat data user', 'error');
    } finally {
      setSysUsersLoading(false);
    }
  }, [showToast]);

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        showToast('Peran pengguna berhasil diperbarui', 'success');
        fetchSysUsers();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal mengubah peran', 'error');
      }
    } catch {
      showToast('Kesalahan koneksi', 'error');
    }
  };

  const handleToggleSuspend = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended: !currentStatus })
      });
      if (res.ok) {
        showToast(`Pengguna berhasil ${!currentStatus ? 'ditangguhkan' : 'diaktifkan kembali'}`, 'success');
        fetchSysUsers();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal mengubah status', 'error');
      }
    } catch {
      showToast('Kesalahan koneksi', 'error');
    }
  };

  useEffect(() => {
    if (activeTab === 'borrowers') fetchBorrowers();
    else if (activeTab === 'blacklist') fetchBlacklist();
    else if (activeTab === 'groups') fetchGroups();
    else if (activeTab === 'commlogs') fetchCommLogs();
    else if (activeTab === 'users' && isAdmin) fetchSysUsers();
  }, [activeTab, fetchBorrowers, fetchBlacklist, fetchGroups, fetchCommLogs, fetchSysUsers, isAdmin]);

  const handleSuspend = async () => {
    if (!blacklistForm.userId || !blacklistForm.reason) return showToast('Pilih user dan isi alasan', 'error');
    setSaving(true);
    try {
      const res = await fetch('/api/crm/blacklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(blacklistForm) });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Peminjam berhasil ditangguhkan', 'success');
      setShowBlacklistModal(false);
      setBlacklistForm({ userId: '', reason: '', type: 'SUSPENSION', endDate: '' });
      fetchBlacklist();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleLift = async () => {
    if (!liftModal || !liftReason.trim()) return showToast('Isi alasan pencabutan', 'error');
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/blacklist/${liftModal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ liftReason }) });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Penangguhan berhasil dicabut', 'success');
      setLiftModal(null);
      setLiftReason('');
      fetchBlacklist();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleCreateGroup = async () => {
    if (!groupForm.name) return showToast('Nama grup wajib diisi', 'error');
    setSaving(true);
    try {
      const res = await fetch('/api/crm/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(groupForm) });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Grup berhasil dibuat', 'success');
      setShowGroupModal(false);
      setGroupForm({ name: '', code: '', type: 'ORGANIZATION', description: '' });
      fetchGroups();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const totalSuspended = blacklist.length;
  const totalExternal = borrowers.filter(b => b._type === 'renter').length;
  const totalInternal = borrowers.filter(b => b._type === 'user').length;

  const allowedTabs = TABS.filter(tab => {
    if (tab.id === 'users') return isAdmin;
    return true;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Users size={26} style={{ color: 'var(--color-primary)' }} />
          Peminjam &amp; Relasi
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Kelola data peminjam, riwayat, blacklist, organisasi, dan log komunikasi secara terpadu.
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Peminjam', value: borrowers.length, icon: Users, color: 'var(--color-primary)' },
          { label: 'Internal (Civitas)', value: totalInternal, icon: School, color: '#6366f1' },
          { label: 'Eksternal', value: totalExternal, icon: Globe, color: '#f59e0b' },
          { label: 'Ditangguhkan', value: totalSuspended, icon: UserX, color: '#ef4444' },
          { label: 'Organisasi', value: groups.length, icon: Building2, color: '#10b981' },
        ].map((stat) => (
          <Card key={stat.label} style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ background: `${stat.color}20`, padding: '0.65rem', borderRadius: 'var(--radius-md)' }}>
              <stat.icon size={20} style={{ color: stat.color }} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>{stat.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--color-surface2)', padding: '0.35rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', overflowX: 'auto' }}>
        {allowedTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 1rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
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

      {/* ── TAB: BORROWERS ── */}
      {activeTab === 'borrowers' && (
        <div>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.85rem', flex: 1, minWidth: '220px' }}>
              <Search size={15} style={{ color: 'var(--color-muted)' }} />
              <input
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.88rem' }}
                placeholder="Cari nama, email, NIM/NIP, telepon..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchBorrowers()}
              />
            </div>
            <select className="input-field" style={{ minWidth: '140px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">Semua Tipe</option>
              <option value="user">Internal (User)</option>
              <option value="renter">Eksternal (Renter)</option>
            </select>
            <select className="input-field" style={{ minWidth: '140px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="suspended">Ditangguhkan</option>
            </select>
            <button className="btn btn-secondary btn-sm" onClick={fetchBorrowers}>
              <Filter size={14} /> Terapkan
            </button>
          </div>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                    <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left', fontWeight: 600 }}>Nama</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 600 }}>Kontak</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 600 }}>Tipe / Kategori</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600 }}>Transaksi</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600 }}>Total Denda</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowersLoading ? (
                    <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>Memuat data...</td></tr>
                  ) : borrowers.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>Tidak ada data peminjam</td></tr>
                  ) : borrowers.map((b, i) => (
                    <tr key={b.id + b._type} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-surface2)' }}>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: b._type === 'user' ? 'var(--grad-primary)' : 'var(--grad-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                            {b.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{b.name}</div>
                            {b.identityNo && <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{b.identityNo}</div>}
                            {b.department && <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{b.department}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '0.82rem' }}>{b.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={12} style={{ color: 'var(--color-muted)' }} />{b.phone}</div>}</div>
                        <div style={{ fontSize: '0.82rem' }}>{b.email && <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-muted)' }}><Mail size={12} />{b.email}</div>}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, background: `${b._type === 'user' ? '#6366f1' : '#f59e0b'}20`, color: b._type === 'user' ? '#6366f1' : '#f59e0b' }}>
                          {b._type === 'user' ? 'Internal' : 'Eksternal'}
                        </span>
                        {b.renterCategory && <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>{b.renterCategory}</div>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700 }}>{(b.totalLoans || 0) + (b.totalRentals || 0) + (b.totalBookings || 0)}</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>transaksi</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        {b.totalDenda > 0 ? (
                          <span style={{ color: b.dendaOutstanding > 0 ? '#ef4444' : '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>
                            {formatCurrency(b.totalDenda)}
                          </span>
                        ) : <span style={{ color: 'var(--color-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {b.isSuspended ? (
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, background: '#ef444420', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                            <ShieldAlert size={12} /> Ditangguhkan
                          </span>
                        ) : (
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, background: '#10b98120', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                            <ShieldCheck size={12} /> Aktif
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => router.push(`/dashboard/crm/borrowers/${b._type}/${b.id}`)}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                        >
                          <Eye size={13} /> Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB: BLACKLIST ── */}
      {activeTab === 'blacklist' && (
        <div>
          {isAdmin && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => setShowBlacklistModal(true)}>
                <Plus size={16} /> Tangguhkan Peminjam
              </button>
            </div>
          )}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                    <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left', fontWeight: 600 }}>Peminjam</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 600 }}>Jenis</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 600 }}>Alasan</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600 }}>Mulai</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600 }}>Berakhir</th>
                    {isAdmin && <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600 }}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {blacklistLoading ? (
                    <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>Memuat...</td></tr>
                  ) : blacklist.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>Tidak ada penangguhan aktif</td></tr>
                  ) : blacklist.map((bl, i) => (
                    <tr key={bl.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-surface2)' }}>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 700 }}>{bl.user?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{bl.user?.email}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, background: `${BLACKLIST_COLORS[bl.type] || '#94a3b8'}20`, color: BLACKLIST_COLORS[bl.type] || '#94a3b8' }}>
                          {bl.type}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', maxWidth: '260px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bl.reason}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.82rem' }}>{formatDate(bl.startDate)}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: bl.endDate ? 'var(--color-text)' : 'var(--color-muted)' }}>
                        {bl.endDate ? formatDate(bl.endDate) : <span style={{ fontStyle: 'italic' }}>Permanen</span>}
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => { setLiftModal({ id: bl.id, name: bl.user?.name }); setLiftReason(''); }}
                            style={{ fontSize: '0.78rem', color: '#10b981', borderColor: '#10b981' }}
                          >
                            <ShieldCheck size={13} /> Cabut
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB: GROUPS ── */}
      {activeTab === 'groups' && (
        <div>
          {isAdmin && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => setShowGroupModal(true)}>
                <Plus size={16} /> Buat Organisasi Baru
              </button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {groupsLoading ? (
              <Card style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', gridColumn: '1/-1' }}>Memuat...</Card>
            ) : groups.length === 0 ? (
              <Card style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', gridColumn: '1/-1' }}>Belum ada data organisasi peminjam</Card>
            ) : groups.map(g => (
              <Card key={g.id} style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem' }}>{g.name}</div>
                    {g.code && <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Kode: {g.code}</div>}
                  </div>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: 700, background: 'var(--color-primary-alpha)', color: 'var(--color-primary)' }}>
                    {g.type}
                  </span>
                </div>
                {g.description && <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>{g.description}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                    <Users size={13} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    {g.members?.length || 0} anggota
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => router.push(`/dashboard/crm?tab=groups&id=${g.id}`)}>
                    Kelola <ChevronRight size={13} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: COMM LOGS ── */}
      {activeTab === 'commlogs' && (
        <Card style={{ padding: '1.25rem' }}>
          <h3 style={{ fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={18} style={{ color: 'var(--color-primary)' }} /> Riwayat Log Komunikasi
          </h3>
          {commLogsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>Memuat...</div>
          ) : commLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>Belum ada log komunikasi tercatat</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {commLogs.map(log => {
                const channelColors: Record<string, string> = { WHATSAPP: '#25d366', EMAIL: '#6366f1', IN_APP: '#3b82f6', MANUAL_CALL: '#f59e0b', MANUAL_NOTE: '#94a3b8' };
                const color = channelColors[log.channel] || '#94a3b8';
                return (
                  <div key={log.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${color}` }}>
                    <div style={{ background: `${color}20`, padding: '0.5rem', borderRadius: 'var(--radius-sm)', alignSelf: 'flex-start' }}>
                      <MessageSquare size={16} style={{ color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{log.subject}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{formatDate(log.sentAt)}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '0.35rem' }}>{log.body}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7, fontWeight: 700', background: `${color}20`, color }}>{log.channel}</span>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', background: log.status === 'SENT' ? '#10b98120' : '#ef444420', color: log.status === 'SENT' ? '#10b981' : '#ef4444' }}>{log.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── TAB: CARDS ── */}
      {activeTab === 'cards' && (
        <Card style={{ padding: '3rem', textAlign: 'center' }}>
          <CreditCard size={48} style={{ color: 'var(--color-muted)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Kartu Keanggotaan Digital</h3>
          <p style={{ color: 'var(--color-muted)', maxWidth: '400px', margin: '0 auto' }}>
            Fitur kartu keanggotaan digital akan tersedia di fase berikutnya. Kartu ini memungkinkan verifikasi cepat peminjam via QR saat serah terima aset.
          </p>
        </Card>
      )}

      {/* ── TAB: USERS ── */}
      {activeTab === 'users' && isAdmin && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                <th style={{ padding: '1rem 1.25rem' }}>Nama &amp; Email</th>
                <th style={{ padding: '1rem' }}>NIP / NIM / NIK</th>
                <th style={{ padding: '1rem' }}>Role Level</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sysUsersLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    Memuat...
                  </td>
                </tr>
              ) : sysUsers.length > 0 ? (
                sysUsers.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 700 }}>{u.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{u.identityNo || '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      <select 
                        value={u.role}
                        onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                        style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface2)', fontSize: '0.8rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                        disabled={session?.user?.email === u.email}
                      >
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="STAFF">STAFF</option>
                        <option value="APPROVER">APPROVER</option>
                        <option value="BORROWER">BORROWER</option>
                      </select>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                        {u.isSuspended ? (
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, background: '#ef444420', color: '#ef4444' }}>TERBLOKIR (SUSPENDED)</span>
                        ) : (
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, background: '#10b98120', color: '#10b981' }}>AKTIF</span>
                        )}
                        {u.violations && u.violations.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserViolations(u);
                              setViolationModalOpen(true);
                            }}
                            style={{
                              padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #f59e0b',
                              background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: '0.7rem',
                              fontWeight: 700, cursor: 'pointer', outline: 'none'
                            }}
                          >
                            ⚠️ {u.violations.length} Pelanggaran
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleSuspend(u.id, u.isSuspended)}
                        disabled={session?.user?.email === u.email}
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '4px',
                          border: `1px solid ${u.isSuspended ? 'var(--color-success)' : 'var(--color-danger)'}`,
                          background: u.isSuspended ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          color: u.isSuspended ? 'var(--color-success)' : 'var(--color-danger)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: session?.user?.email === u.email ? 'not-allowed' : 'pointer',
                          opacity: session?.user?.email === u.email ? 0.5 : 1
                        }}
                      >
                        {u.isSuspended ? 'Buka Blokir' : 'Suspend / Blokir'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    Belum ada data user terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── MODAL: Tangguhkan Peminjam ── */}
      <Modal isOpen={showBlacklistModal} onClose={() => setShowBlacklistModal(false)} title="Tangguhkan Peminjam">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label className="input-label">ID User yang Ditangguhkan *</label>
            <input className="input-field" style={{ width: '100%' }} placeholder="Salin User ID dari halaman detail peminjam" value={blacklistForm.userId} onChange={e => setBlacklistForm({ ...blacklistForm, userId: e.target.value })} />
          </div>
          <div>
            <label className="input-label">Jenis Penangguhan *</label>
            <select className="input-field" style={{ width: '100%' }} value={blacklistForm.type} onChange={e => setBlacklistForm({ ...blacklistForm, type: e.target.value })}>
              <option value="WARNING">Peringatan (Warning)</option>
              <option value="SUSPENSION">Penangguhan Sementara</option>
              <option value="PERMANENT">Penangguhan Permanen</option>
            </select>
          </div>
          {blacklistForm.type === 'SUSPENSION' && (
            <div>
              <label className="input-label">Berlaku Hingga</label>
              <input className="input-field" style={{ width: '100%' }} type="date" value={blacklistForm.endDate} onChange={e => setBlacklistForm({ ...blacklistForm, endDate: e.target.value })} />
            </div>
          )}
          <div>
            <label className="input-label">Alasan Penangguhan *</label>
            <textarea className="input-field" style={{ width: '100%', minHeight: '90px', resize: 'vertical' }} placeholder="Jelaskan alasan penangguhan..." value={blacklistForm.reason} onChange={e => setBlacklistForm({ ...blacklistForm, reason: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowBlacklistModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSuspend} disabled={saving} style={{ background: '#ef4444', borderColor: '#ef4444' }}>
              {saving ? 'Menyimpan...' : 'Tangguhkan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: Cabut Penangguhan ── */}
      <Modal isOpen={!!liftModal} onClose={() => setLiftModal(null)} title={`Cabut Penangguhan — ${liftModal?.name}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="input-label">Alasan Pencabutan *</label>
            <textarea className="input-field" style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} placeholder="Jelaskan mengapa penangguhan dicabut..." value={liftReason} onChange={e => setLiftReason(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setLiftModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={handleLift} disabled={saving} style={{ background: '#10b981', borderColor: '#10b981' }}>
              {saving ? 'Menyimpan...' : 'Cabut Penangguhan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: Buat Grup ── */}
      <Modal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} title="Buat Organisasi / Grup Baru">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="input-label">Nama Organisasi *</label>
              <input className="input-field" style={{ width: '100%' }} placeholder="Contoh: BEM Fakultas Teknik" value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Kode</label>
              <input className="input-field" style={{ width: '100%' }} placeholder="BEM-FT" value={groupForm.code} onChange={e => setGroupForm({ ...groupForm, code: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Tipe</label>
              <select className="input-field" style={{ width: '100%' }} value={groupForm.type} onChange={e => setGroupForm({ ...groupForm, type: e.target.value })}>
                <option value="ORGANIZATION">Organisasi Kemahasiswaan</option>
                <option value="COMMITTEE">Kepanitiaan</option>
                <option value="UNIT">Unit Kerja / Fakultas</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="input-label">Deskripsi</label>
              <textarea className="input-field" style={{ width: '100%', minHeight: '70px', resize: 'vertical' }} value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowGroupModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={handleCreateGroup} disabled={saving}>Buat Organisasi</button>
          </div>
        </div>
      </Modal>

      {/* Modal Riwayat Pelanggaran */}
      <Modal
        isOpen={violationModalOpen}
        onClose={() => {
          setViolationModalOpen(false);
          setSelectedUserViolations(null);
        }}
        title={`Riwayat Kasus Sanksi & Pelanggaran — ${selectedUserViolations?.name || ''}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
          <p style={{ color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
            Berikut adalah rekapitulasi pelanggaran aturan peminjaman/sewa yang dilakukan oleh user ini:
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
            {selectedUserViolations?.violations?.map((v: any, idx: number) => (
              <div key={v.id || idx} style={{ padding: '0.85rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${v.type === 'SUSPENSION' ? '#ef4444' : '#f59e0b'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>
                  <span style={{ textTransform: 'uppercase' }}>Type: {v.type}</span>
                  <span>{formatDate(v.createdAt)}</span>
                </div>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-text)' }}>{v.description}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => {
              setViolationModalOpen(false);
              setSelectedUserViolations(null);
            }}>
              Tutup
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

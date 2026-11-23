'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Wrench, Calendar, ClipboardList, CheckCircle2, AlertCircle, Trash2, ShieldAlert, Check, X, ShieldX } from 'lucide-react';

export default function PremiumMaintenancePage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'ongoing' | 'schedule' | 'history'>('ongoing');

  // Core Data State
  const [records, setRecords] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State - New Record
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [targetType, setTargetType] = useState<'ASSET' | 'ROOM'>('ASSET');
  const [newForm, setNewForm] = useState({
    assetId: '',
    locationId: '',
    type: 'PREVENTIVE',
    description: '',
    cost: '',
    startDate: new Date().toISOString().split('T')[0],
    status: 'ONGOING',
    vendor: '',
    notes: '',
  });

  // Modal State - New Schedule
  const [schedModalOpen, setSchedModalOpen] = useState(false);
  const [schedTargetType, setSchedTargetType] = useState<'ASSET' | 'ROOM' | 'CATEGORY'>('ASSET');
  const [schedForm, setSchedForm] = useState({
    assetId: '',
    locationId: '',
    categoryId: '',
    intervalDays: '90',
    isActive: true,
  });

  // Modal State - Update Status
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [updateForm, setUpdateForm] = useState({
    status: 'COMPLETED',
    cost: '',
    endDate: new Date().toISOString().split('T')[0],
    vendor: '',
    notes: '',
    resultingAssetStatus: 'AVAILABLE', // AVAILABLE, DAMAGED, DISPOSED
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const urlAssetId = sp.get('assetId');
      const isNew = sp.get('new');
      if (urlAssetId) {
        setTargetType('ASSET');
        setNewForm((p) => ({ ...p, assetId: urlAssetId }));
        if (isNew === 'true') {
          setNewModalOpen(true);
        }
      }
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resM, resS, resA, resR, resC] = await Promise.all([
        fetch('/api/maintenance'),
        fetch('/api/maintenance/schedules'),
        fetch('/api/public/assets?includeInternal=true'),
        fetch('/api/rooms'),
        fetch('/api/categories'),
      ]);

      if (resM.ok) setRecords(await resM.json());
      if (resS.ok) setSchedules(await resS.json());
      if (resA.ok) {
        const asts = await resA.json();
        setAssets(asts);
        if (asts.length > 0) {
          setNewForm((p) => ({ ...p, assetId: p.assetId || asts[0].id }));
          setSchedForm((p) => ({ ...p, assetId: p.assetId || asts[0].id }));
        }
      }
      if (resR.ok) {
        const rms = await resR.json();
        setRooms(rms);
        if (rms.length > 0) {
          setNewForm(p => ({ ...p, locationId: rms[0].id }));
          setSchedForm(p => ({ ...p, locationId: rms[0].id }));
        }
      }
      if (resC.ok) {
        const cats = await resC.json();
        setCategories(cats);
        if (cats.length > 0) setSchedForm(p => ({ ...p, categoryId: cats[0].id }));
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data maintenance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.description) {
      showToast('Deskripsi perbaikan wajib diisi', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...newForm,
        assetId: targetType === 'ASSET' ? newForm.assetId : undefined,
        locationId: targetType === 'ROOM' ? newForm.locationId : undefined,
      };

      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Record perbaikan baru berhasil dibuat!', 'success');
        setNewModalOpen(false);
        setNewForm({
          assetId: assets[0]?.id || '',
          locationId: rooms[0]?.id || '',
          type: 'PREVENTIVE',
          description: '',
          cost: '',
          startDate: new Date().toISOString().split('T')[0],
          status: 'ONGOING',
          vendor: '',
          notes: '',
        });
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedForm.intervalDays) {
      showToast('Interval hari wajib ditentukan', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...schedForm,
        assetId: schedTargetType === 'ASSET' ? schedForm.assetId : undefined,
        locationId: schedTargetType === 'ROOM' ? schedForm.locationId : undefined,
        categoryId: schedTargetType === 'CATEGORY' ? schedForm.categoryId : undefined,
      };

      const res = await fetch('/api/maintenance/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Jadwal servis preventif rutin berhasil ditambahkan!', 'success');
        setSchedModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan jadwal', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`/api/maintenance/${selectedRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateForm),
      });

      if (res.ok) {
        showToast('Pembaruan status maintenance berhasil disimpan!', 'success');
        setUpdateModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memperbarui', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal interval servis rutin ini?')) return;

    try {
      const res = await fetch(`/api/maintenance/schedules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Jadwal servis berhasil dihapus', 'success');
        fetchData();
      } else {
        showToast('Gagal menghapus jadwal', 'error');
      }
    } catch {
      showToast('Koneksi bermasalah', 'error');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus arsip record maintenance ini?')) return;

    try {
      const res = await fetch(`/api/maintenance/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Arsip record berhasil dihapus', 'success');
        fetchData();
      } else {
        showToast('Gagal menghapus record', 'error');
      }
    } catch {
      showToast('Koneksi bermasalah', 'error');
    }
  };

  const ongoingRecords = records.filter(r => ['ONGOING', 'SCHEDULED'].includes(r.status));
  const historyRecords = records.filter(r => ['COMPLETED', 'FAILED'].includes(r.status));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Perawatan &amp; Maintenance</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Kelola perawatan preventif berkala dan perbaikan korektif reaktif aset &amp; ruangan.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => setSchedModalOpen(true)}>
            <Calendar size={18} /> Atur Interval Servis
          </Button>
          <Button variant="primary" onClick={() => setNewModalOpen(true)}>
            <Plus size={18} /> Catat Pekerjaan Baru
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'ongoing', label: 'Aktif & Terjadwal', count: ongoingRecords.length, icon: <Wrench size={16} /> },
          { id: 'schedule', label: 'Jadwal Preventif', count: schedules.length, icon: <Calendar size={16} /> },
          { id: 'history', label: 'Riwayat Selesai', count: historyRecords.length, icon: <ClipboardList size={16} /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
              background: activeTab === t.id ? 'var(--color-primary)' : 'transparent',
              color: activeTab === t.id ? '#fff' : 'var(--color-muted)',
              fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {t.icon}
            {t.label}
            <span style={{
              fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '999px',
              background: activeTab === t.id ? 'rgba(255,255,255,0.2)' : 'var(--color-surface2)',
              color: activeTab === t.id ? '#fff' : 'var(--color-muted)',
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      {loading ? (
        <Card style={{ padding: '2rem' }}><Skeleton height="150px" /></Card>
      ) : (
        <>
          {/* TAB 1: ONGOING & SCHEDULED */}
          {activeTab === 'ongoing' && (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                    <th style={{ padding: '1rem 1.25rem' }}>Mulai Perawatan</th>
                    <th style={{ padding: '1rem' }}>Target Objek</th>
                    <th style={{ padding: '1rem' }}>Tipe</th>
                    <th style={{ padding: '1rem' }}>Deskripsi Perawatan</th>
                    <th style={{ padding: '1rem' }}>Status Pekerjaan</th>
                    <th style={{ padding: '1rem' }}>Vendor / Teknisi</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {ongoingRecords.length > 0 ? (
                    ongoingRecords.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '1rem 1.25rem' }}>{formatDate(r.startDate)}</td>
                        <td style={{ padding: '1rem' }}>
                          {r.asset ? (
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>🛠️ {r.asset.name}</span>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'monospace', marginTop: '0.15rem' }}>Kode: {r.asset.code}</div>
                            </div>
                          ) : (
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>🏢 {r.location.name}</span>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>Gedung: {r.location.building} (Kode: {r.location.code})</div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 800, padding: '0.25rem 0.5rem', borderRadius: '4px',
                            background: r.type === 'PREVENTIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            color: r.type === 'PREVENTIVE' ? '#10b981' : '#ef4444',
                          }}>
                            {r.type === 'PREVENTIVE' ? 'Preventif' : 'Korektif'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--color-text)', maxWidth: '280px' }}>
                          <div style={{ fontWeight: 600 }}>{r.description}</div>
                          {r.claim && <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '0.2rem' }}>⚠️ Dari klaim kerusakan: {r.claim.claimNumber}</div>}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px',
                            background: r.status === 'ONGOING' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
                            color: r.status === 'ONGOING' ? '#f59e0b' : '#6366f1',
                          }}>
                            {r.status === 'ONGOING' ? '⚡ Berlangsung' : '📅 Dijadwalkan'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--color-muted)' }}>{r.vendor || '-'}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <Button
                              variant="primary"
                              size="sm"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                              onClick={() => {
                                setSelectedRecord(r);
                                setUpdateForm({
                                  status: 'COMPLETED',
                                  cost: r.cost ? r.cost.toString() : '',
                                  endDate: new Date().toISOString().split('T')[0],
                                  vendor: r.vendor || '',
                                  notes: r.notes || '',
                                  resultingAssetStatus: 'AVAILABLE',
                                });
                                setUpdateModalOpen(true);
                              }}
                            >
                              Pembaruan Status
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              style={{ color: 'var(--color-danger)', padding: '0.3rem' }}
                              onClick={() => handleDeleteRecord(r.id)}
                            >
                              <Trash2 size={15} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                        Tidak ada pekerjaan maintenance yang sedang berlangsung atau terjadwal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}

          {/* TAB 2: SCHEDULES PREVENTIVE */}
          {activeTab === 'schedule' && (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                    <th style={{ padding: '1rem 1.25rem' }}>Target Objek / Kategori</th>
                    <th style={{ padding: '1rem' }}>Interval Servis</th>
                    <th style={{ padding: '1rem' }}>Servis Terakhir</th>
                    <th style={{ padding: '1rem' }}>Servis Berikutnya</th>
                    <th style={{ padding: '1rem' }}>Status Aktif</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.length > 0 ? (
                    schedules.map(s => {
                      const isOverdue = new Date(s.nextDueDate) < new Date();
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            {s.asset && (
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>🛠️ {s.asset.name}</span>
                                <div style={{ fontSize: '0.73rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}>Aset: {s.asset.code}</div>
                              </div>
                            )}
                            {s.location && (
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>🏢 {s.location.name}</span>
                                <div style={{ fontSize: '0.73rem', color: 'var(--color-muted)' }}>Ruangan: {s.location.building}</div>
                              </div>
                            )}
                            {s.category && (
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--color-muted)' }}>📦 Kategori: {s.category.name}</span>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>Tiap {s.intervalDays} Hari</td>
                          <td style={{ padding: '1rem', color: 'var(--color-muted)' }}>{s.lastMaintenance ? formatDate(s.lastMaintenance) : 'Belum pernah'}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ fontWeight: 700, color: isOverdue ? 'var(--color-danger)' : 'var(--color-text)' }}>
                              {formatDate(s.nextDueDate)} {isOverdue && '⚠️ Overdue'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px',
                              background: s.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                              color: s.isActive ? '#10b981' : '#64748b',
                            }}>
                              {s.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              style={{ color: 'var(--color-danger)' }}
                              onClick={() => handleDeleteSchedule(s.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                        Belum ada interval jadwal servis rutin yang diatur.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}

          {/* TAB 3: HISTORY ARCHIVE */}
          {activeTab === 'history' && (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                    <th style={{ padding: '1rem 1.25rem' }}>Tanggal Selesai</th>
                    <th style={{ padding: '1rem' }}>Target Objek</th>
                    <th style={{ padding: '1rem' }}>Tipe</th>
                    <th style={{ padding: '1rem' }}>Keterangan Perbaikan</th>
                    <th style={{ padding: '1rem' }}>Status Akhir</th>
                    <th style={{ padding: '1rem' }}>Biaya</th>
                    <th style={{ padding: '1rem' }}>Vendor &amp; Catatan</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRecords.length > 0 ? (
                    historyRecords.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '1rem 1.25rem' }}>{r.endDate ? formatDate(r.endDate) : formatDate(r.startDate)}</td>
                        <td style={{ padding: '1rem' }}>
                          {r.asset ? (
                            <div>
                              <span style={{ fontWeight: 700 }}>🛠️ {r.asset.name}</span>
                              <div style={{ fontSize: '0.73rem', color: 'var(--color-muted)' }}>{r.asset.code}</div>
                            </div>
                          ) : (
                            <div>
                              <span style={{ fontWeight: 700 }}>🏢 {r.location.name}</span>
                              <div style={{ fontSize: '0.73rem', color: 'var(--color-muted)' }}>{r.location.building}</div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>{r.type === 'PREVENTIVE' ? 'Preventif' : 'Korektif'}</td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{r.description}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px',
                            background: r.status === 'COMPLETED' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            color: r.status === 'COMPLETED' ? '#10b981' : '#ef4444',
                          }}>
                            {r.status === 'COMPLETED' ? '✓ Berhasil' : '✗ Gagal'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--color-success)' }}>{formatCurrency(r.cost)}</td>
                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--color-muted)', maxWidth: '240px' }}>
                          <div><strong>Vendor:</strong> {r.vendor || '-'}</div>
                          {r.notes && <div style={{ fontStyle: 'italic', marginTop: '0.15rem' }}>&quot;{r.notes}&quot;</div>}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() => handleDeleteRecord(r.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                        Belum ada riwayat perbaikan selesai yang diarsipkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {/* MODAL: CREATE RECORD MANUAL */}
      <Modal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Catat Perawatan / Servis Baru"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewModalOpen(false)}>Batal</Button>
            <Button variant="primary" isLoading={saving} onClick={handleCreateRecord}>Simpan Record</Button>
          </>
        }
      >
        <form onSubmit={handleCreateRecord} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>Target Objek Perawatan</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input type="radio" checked={targetType === 'ASSET'} onChange={() => setTargetType('ASSET')} /> 🛠️ Aset / Inventaris
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input type="radio" checked={targetType === 'ROOM'} onChange={() => setTargetType('ROOM')} /> 🏢 Ruangan / Venue
              </label>
            </div>
          </div>

          {targetType === 'ASSET' ? (
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>Pilih Aset *</label>
              <select className="input-field" value={newForm.assetId} onChange={(e) => setNewForm({ ...newForm, assetId: e.target.value })} style={{ width: '100%' }}>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code}) {a.brand ? `[${a.brand}] ` : ''}{a.category ? `• ${a.category.name} ` : ''}— [{a.status}]
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>Pilih Ruangan / Venue *</label>
              <select className="input-field" value={newForm.locationId} onChange={(e) => setNewForm({ ...newForm, locationId: e.target.value })} style={{ width: '100%' }}>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.code}) — {r.building}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>Tipe Perawatan</label>
              <select className="input-field" value={newForm.type} onChange={(e) => setNewForm({ ...newForm, type: e.target.value })} style={{ width: '100%' }}>
                <option value="PREVENTIVE">PREVENTIF (Servis Rutin)</option>
                <option value="CORRECTIVE">KOREKTIF (Perbaikan Kerusakan)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>Status Kerja Awal</label>
              <select className="input-field" value={newForm.status} onChange={(e) => setNewForm({ ...newForm, status: e.target.value })} style={{ width: '100%' }}>
                <option value="ONGOING">ONGOING (Sedang Dikerjakan)</option>
                <option value="SCHEDULED">SCHEDULED (Dijadwalkan)</option>
              </select>
            </div>
          </div>

          <Input
            label="Deskripsi Pekerjaan *"
            placeholder="Contoh: Kalibrasi sensor lensa & pembersihan lensa jamur"
            value={newForm.description}
            onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Tanggal Mulai Servis"
              type="date"
              value={newForm.startDate}
              onChange={(e) => setNewForm({ ...newForm, startDate: e.target.value })}
            />
            <Input
              label="Vendor / Pihak Servis"
              placeholder="Contoh: CV. Servindo Abadi"
              value={newForm.vendor}
              onChange={(e) => setNewForm({ ...newForm, vendor: e.target.value })}
            />
          </div>

          <Input
            label="Catatan &amp; Diagnosa Masalah (Opsional)"
            placeholder="Catatan komponen yang diganti atau kendala khusus..."
            value={newForm.notes}
            onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
          />
        </form>
      </Modal>

      {/* MODAL: CREATE INTERVAL SCHEDULE */}
      <Modal
        isOpen={schedModalOpen}
        onClose={() => setSchedModalOpen(false)}
        title="Atur Jadwal Servis Preventif Berkala"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSchedModalOpen(false)}>Batal</Button>
            <Button variant="primary" isLoading={saving} onClick={handleCreateSchedule}>Atur Jadwal</Button>
          </>
        }
      >
        <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>Target Jadwal</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input type="radio" checked={schedTargetType === 'ASSET'} onChange={() => setSchedTargetType('ASSET')} /> 🛠️ Aset Spesifik
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input type="radio" checked={schedTargetType === 'ROOM'} onChange={() => setSchedTargetType('ROOM')} /> 🏢 Ruangan Spesifik
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input type="radio" checked={schedTargetType === 'CATEGORY'} onChange={() => setSchedTargetType('CATEGORY')} /> 📦 Kategori Aset
              </label>
            </div>
          </div>

          {schedTargetType === 'ASSET' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>Pilih Aset *</label>
              <select className="input-field" value={schedForm.assetId} onChange={(e) => setSchedForm({ ...schedForm, assetId: e.target.value })} style={{ width: '100%' }}>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code}) {a.brand ? `[${a.brand}] ` : ''}{a.category ? `• ${a.category.name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {schedTargetType === 'ROOM' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>Pilih Ruangan *</label>
              <select className="input-field" value={schedForm.locationId} onChange={(e) => setSchedForm({ ...schedForm, locationId: e.target.value })} style={{ width: '100%' }}>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
              </select>
            </div>
          )}

          {schedTargetType === 'CATEGORY' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>Pilih Kategori Aset *</label>
              <select className="input-field" value={schedForm.categoryId} onChange={(e) => setSchedForm({ ...schedForm, categoryId: e.target.value })} style={{ width: '100%' }}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <Input
            label="Interval Pengulangan Servis (Hari) *"
            type="number"
            placeholder="90"
            value={schedForm.intervalDays}
            onChange={(e) => setSchedForm({ ...schedForm, intervalDays: e.target.value })}
            required
          />
        </form>
      </Modal>

      {/* MODAL: UPDATE WORK STATUS (COMPLETE / FAIL) */}
      <Modal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title={`Pembaruan Pekerjaan: ${selectedRecord?.description}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setUpdateModalOpen(false)}>Batal</Button>
            <Button variant="primary" isLoading={saving} onClick={handleUpdateRecord}>Simpan Pembaruan</Button>
          </>
        }
      >
        <form onSubmit={handleUpdateRecord} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>Hasil Kerja Perawatan *</label>
            <select
              className="input-field"
              value={updateForm.status}
              onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
              style={{ width: '100%', fontWeight: 700 }}
            >
              <option value="COMPLETED">✅ COMPLETED (Perbaikan Berhasil / Selesai)</option>
              <option value="FAILED">❌ FAILED (Gagal Diperbaiki)</option>
              <option value="ONGOING">⚡ ONGOING (Masih Dalam Proses)</option>
            </select>
          </div>

          {updateForm.status === 'FAILED' && selectedRecord?.assetId && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.5rem' }}>
                <ShieldAlert size={16} /> Opsi Pensiun &amp; Status Aset Akhir
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                Karena perbaikan gagal, tentukan status operasional akhir untuk aset <strong>{selectedRecord.asset?.name}</strong>:
              </p>
              <select
                className="input-field"
                value={updateForm.resultingAssetStatus}
                onChange={(e) => setUpdateForm({ ...updateForm, resultingAssetStatus: e.target.value })}
                style={{ width: '100%', fontWeight: 600 }}
              >
                <option value="DAMAGED">🔴 DAMAGED (Rusak Berat - Nonaktifkan)</option>
                <option value="DISPOSED">❌ DISPOSED / RETIRED (Pensiunkan / Hapus dari Inventaris)</option>
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Biaya Realisasi Servis (Rp)"
              type="number"
              placeholder="350000"
              value={updateForm.cost}
              onChange={(e) => setUpdateForm({ ...updateForm, cost: e.target.value })}
            />
            <Input
              label="Tanggal Selesai"
              type="date"
              value={updateForm.endDate}
              onChange={(e) => setUpdateForm({ ...updateForm, endDate: e.target.value })}
            />
          </div>

          <Input
            label="Vendor / Bengkel Rekanan"
            placeholder="Contoh: Bengkel Sinar Utama"
            value={updateForm.vendor}
            onChange={(e) => setUpdateForm({ ...updateForm, vendor: e.target.value })}
          />

          <Input
            label="Catatan Realisasi (Catatan Suku Cadang, dll.)"
            placeholder="Tuliskan jika ada penggantian suku cadang atau garansi servis..."
            value={updateForm.notes}
            onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}

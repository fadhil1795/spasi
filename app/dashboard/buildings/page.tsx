'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Layers,
  MapPin,
  DoorOpen,
  GraduationCap,
  Box,
  Users,
  UserCheck,
  X,
} from 'lucide-react';

interface BuildingItem {
  id: string;
  code: string;
  name: string;
  totalFloors: number;
  campusArea: string | null;
  address: string | null;
  description: string | null;
  _count?: { locations: number };
}

interface DepartmentItem {
  id: string;
  code: string;
  name: string;
  headName: string | null;
  description: string | null;
  _count?: {
    assets: number;
    locations: number;
    users: number;
  };
}

export default function MasterBuildingsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'buildings' | 'departments'>('buildings');

  // Buildings state (Inline Form — Tanpa Popup)
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    totalFloors: '1',
    campusArea: 'Kampus Utama',
    address: '',
    description: '',
  });

  // Departments state (Inline Form — Tanpa Popup)
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [savingDept, setSavingDept] = useState(false);
  const [deptForm, setDeptForm] = useState({
    code: '',
    name: '',
    headName: '',
    description: '',
  });

  useEffect(() => {
    fetchBuildings();
    fetchDepartments();
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('tab') === 'departments') {
        setActiveTab('departments');
      }
    }
  }, []);

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/buildings');
      if (res.ok) setBuildings(await res.json());
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat daftar master gedung', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      setDeptLoading(true);
      const res = await fetch('/api/departments');
      if (res.ok) setDepartments(await res.json());
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat daftar unit/fakultas', 'error');
    } finally {
      setDeptLoading(false);
    }
  };

  const openCreateBuildingForm = () => {
    setEditingId(null);
    setForm({
      code: '',
      name: '',
      totalFloors: '3',
      campusArea: 'Kampus Utama',
      address: '',
      description: '',
    });
    setShowBuildingForm(true);
  };

  const openEditBuildingForm = (b: BuildingItem) => {
    setEditingId(b.id);
    setForm({
      code: b.code,
      name: b.name,
      totalFloors: String(b.totalFloors || 1),
      campusArea: b.campusArea || '',
      address: b.address || '',
      description: b.description || '',
    });
    setShowBuildingForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      showToast('Kode dan Nama Gedung wajib diisi', 'error');
      return;
    }

    try {
      setSaving(true);
      const url = editingId ? `/api/buildings/${editingId}` : '/api/buildings';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          totalFloors: parseInt(form.totalFloors) || 1,
          campusArea: form.campusArea.trim() || null,
          address: form.address.trim() || null,
          description: form.description.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(
          editingId ? 'Data gedung berhasil diperbarui' : 'Master gedung baru berhasil ditambahkan',
          'success'
        );
        setShowBuildingForm(false);
        setEditingId(null);
        fetchBuildings();
      } else {
        showToast(data.error || 'Gagal menyimpan data gedung', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: BuildingItem) => {
    if (!confirm(`Hapus master gedung "${b.name}" (${b.code})?`)) return;
    try {
      const res = await fetch(`/api/buildings/${b.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast('Gedung berhasil dihapus', 'success');
        fetchBuildings();
      } else {
        showToast(data.error || 'Gagal menghapus gedung', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    }
  };

  // Department CRUD handlers (Inline Form)
  const openCreateDeptForm = () => {
    setEditingDeptId(null);
    setDeptForm({ code: '', name: '', headName: '', description: '' });
    setShowDeptForm(true);
  };

  const openEditDeptForm = (d: DepartmentItem) => {
    setEditingDeptId(d.id);
    setDeptForm({
      code: d.code,
      name: d.name,
      headName: d.headName || '',
      description: d.description || '',
    });
    setShowDeptForm(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.code.trim() || !deptForm.name.trim()) {
      showToast('Kode dan Nama Unit/Prodi/Fakultas wajib diisi', 'error');
      return;
    }

    try {
      setSavingDept(true);
      const url = editingDeptId ? `/api/departments/${editingDeptId}` : '/api/departments';
      const method = editingDeptId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: deptForm.code.trim().toUpperCase(),
          name: deptForm.name.trim(),
          headName: deptForm.headName.trim() || null,
          description: deptForm.description.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          editingDeptId ? 'Data unit/fakultas berhasil diperbarui' : 'Unit/fakultas baru berhasil ditambahkan',
          'success'
        );
        setShowDeptForm(false);
        setEditingDeptId(null);
        fetchDepartments();
      } else {
        showToast(data.error || 'Gagal menyimpan unit/fakultas', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSavingDept(false);
    }
  };

  const handleDeleteDept = async (d: DepartmentItem) => {
    if (!confirm(`Hapus unit pendidikan/fakultas "${d.name}" (${d.code})?`)) return;
    try {
      const res = await fetch(`/api/departments/${d.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast('Unit/fakultas berhasil dihapus', 'success');
        fetchDepartments();
      } else {
        showToast(data.error || 'Gagal menghapus unit/fakultas', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Link
        href="/dashboard/rooms"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.85rem',
          color: 'var(--color-muted)',
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={15} /> Kembali ke Manajemen Ruangan
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Building2 size={28} style={{ color: 'var(--color-primary-light)' }} />
            Master Gedung &amp; Unit Pendidikan / Fakultas
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Kelola master gedung fisik kampus serta unit pendidikan (Program Studi, Jurusan, Fakultas, dan Biro).
          </p>
        </div>

        {activeTab === 'buildings' ? (
          <Button variant="primary" onClick={openCreateBuildingForm}>
            <Plus size={18} /> Tambah Gedung Baru
          </Button>
        ) : (
          <Button variant="primary" onClick={openCreateDeptForm}>
            <Plus size={18} /> Tambah Unit / Fakultas Baru
          </Button>
        )}
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('buildings')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: activeTab === 'buildings' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
            background: activeTab === 'buildings' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: activeTab === 'buildings' ? '#FFFFFF' : 'var(--color-text)',
          }}
        >
          <Building2 size={16} /> Master Gedung Kampus ({buildings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: activeTab === 'departments' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
            background: activeTab === 'departments' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: activeTab === 'departments' ? '#FFFFFF' : 'var(--color-text)',
          }}
        >
          <GraduationCap size={16} /> Unit Pendidikan / Prodi / Fakultas ({departments.length})
        </button>
      </div>

      {/* TAB 1: Building Grid + Inline Form */}
      {activeTab === 'buildings' && (
        <>
          {showBuildingForm && (
            <Card style={{ padding: '1.5rem', border: '1px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                  {editingId ? 'Edit Master Gedung' : 'Formulir Tambah Master Gedung Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowBuildingForm(false);
                    setEditingId(null);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  <X size={16} /> Tutup
                </button>
              </div>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  <Input
                    label="Kode Gedung *"
                    placeholder="GKB"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    required
                  />
                  <Input
                    label="Nama Lengkap Gedung *"
                    placeholder="Gedung Kuliah Bersama"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Jumlah Lantai *"
                    type="number"
                    min="1"
                    max="50"
                    value={form.totalFloors}
                    onChange={(e) => setForm({ ...form, totalFloors: e.target.value })}
                    required
                  />
                  <Input
                    label="Wilayah / Area Kampus"
                    placeholder="Kampus Utama / Kampus Timur"
                    value={form.campusArea}
                    onChange={(e) => setForm({ ...form, campusArea: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
                  <Input
                    label="Alamat / Lokasi Blok (Opsional)"
                    placeholder="Jl. Pendidikan No. 1, Blok Utara"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                  <Input
                    label="Keterangan Tambahan"
                    placeholder="Deskripsi singkat fungsi gedung..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <Button type="button" variant="secondary" onClick={() => setShowBuildingForm(false)}>
                    Batal
                  </Button>
                  <Button type="submit" variant="primary" isLoading={saving}>
                    Simpan Gedung
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height="160px" borderRadius="var(--radius-lg)" />
              ))}
            </div>
          ) : buildings.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {buildings.map((b) => (
                <Card key={b.id} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          background: 'rgba(228, 37, 44, 0.12)',
                          color: 'var(--color-primary-light)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(228, 37, 44, 0.25)',
                        }}
                      >
                        {b.code}
                      </span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.45rem', color: 'var(--color-text)' }}>
                        {b.name}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button
                        type="button"
                        onClick={() => openEditBuildingForm(b)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.35rem' }}
                        title="Edit Gedung"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.35rem', color: 'var(--color-danger)' }}
                        title="Hapus Gedung"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.83rem', color: 'var(--color-muted)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Layers size={14} style={{ color: 'var(--color-primary-light)' }} />
                      <strong>{b.totalFloors}</strong> Lantai
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <DoorOpen size={14} style={{ color: 'var(--color-success)' }} />
                      <strong>{b._count?.locations || 0}</strong> Ruangan
                    </span>
                    {b.campusArea && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MapPin size={14} /> {b.campusArea}
                      </span>
                    )}
                  </div>

                  {b.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem', margin: 0 }}>
                      {b.description}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
              <Building2 size={42} style={{ margin: '0 auto 0.75rem auto', opacity: 0.35 }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)' }}>
                Belum Ada Master Data Gedung
              </div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.3rem', marginBottom: '1.25rem' }}>
                Tambahkan gedung kampus (misalnya GKB, Rektorat, Lab Terpadu) agar pendataan ruangan terstandarisasi.
              </p>
              <Button variant="primary" onClick={openCreateBuildingForm}>
                <Plus size={16} /> Tambah Gedung Pertama
              </Button>
            </Card>
          )}
        </>
      )}

      {/* TAB 2: Unit Pendidikan / Prodi / Fakultas Grid + Inline Form */}
      {activeTab === 'departments' && (
        <>
          {showDeptForm && (
            <Card style={{ padding: '1.5rem', border: '1px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                  {editingDeptId ? 'Edit Unit Pendidikan / Fakultas' : 'Formulir Tambah Unit Pendidikan / Fakultas Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeptForm(false);
                    setEditingDeptId(null);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  <X size={16} /> Tutup
                </button>
              </div>
              <form onSubmit={handleSaveDept} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  <Input
                    label="Kode Unit / Prodi *"
                    placeholder="FTI / IF / FEB"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    required
                  />
                  <Input
                    label="Nama Unit / Prodi / Fakultas *"
                    placeholder="Fakultas Teknologi Informasi"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Nama Kepala Unit / Dekan / Kaprodi (Opsional)"
                    placeholder="Dr. Ir. Budi Santoso, M.Kom."
                    value={deptForm.headName}
                    onChange={(e) => setDeptForm({ ...deptForm, headName: e.target.value })}
                  />
                </div>

                <Input
                  label="Deskripsi / Keterangan Unit"
                  placeholder="Keterangan singkat cakupan prodi, laboratorium, atau fakultas..."
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <Button type="button" variant="secondary" onClick={() => setShowDeptForm(false)}>
                    Batal
                  </Button>
                  <Button type="submit" variant="primary" isLoading={savingDept}>
                    Simpan Unit / Fakultas
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {deptLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height="160px" borderRadius="var(--radius-lg)" />
              ))}
            </div>
          ) : departments.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {departments.map((d) => (
                <Card key={d.id} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          background: 'rgba(16, 185, 129, 0.14)',
                          color: 'var(--color-success)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        {d.code}
                      </span>
                      <h3 style={{ fontSize: '1.12rem', fontWeight: 700, marginTop: '0.45rem', color: 'var(--color-text)' }}>
                        {d.name}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button
                        type="button"
                        onClick={() => openEditDeptForm(d)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.35rem' }}
                        title="Edit Unit/Fakultas"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDept(d)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.35rem', color: 'var(--color-danger)' }}
                        title="Hapus Unit/Fakultas"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {d.headName && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <UserCheck size={14} style={{ color: 'var(--color-primary-light)' }} />
                      Kepala Unit / Dekan / Kaprodi: <strong style={{ color: 'var(--color-text)' }}>{d.headName}</strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Box size={14} style={{ color: 'var(--color-primary-light)' }} />
                      <strong>{d._count?.assets || 0}</strong> Aset
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <DoorOpen size={14} style={{ color: 'var(--color-success)' }} />
                      <strong>{d._count?.locations || 0}</strong> Ruangan
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Users size={14} style={{ color: '#3b82f6' }} />
                      <strong>{d._count?.users || 0}</strong> Pengguna
                    </span>
                  </div>

                  {d.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem', margin: 0 }}>
                      {d.description}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
              <GraduationCap size={42} style={{ margin: '0 auto 0.75rem auto', opacity: 0.35 }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)' }}>
                Belum Ada Data Unit Pendidikan / Fakultas
              </div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.3rem', marginBottom: '1.25rem' }}>
                Tambahkan Fakultas, Program Studi, atau Unit Kerja agar penempatan dan pelaporan aset per unit terorganisir.
              </p>
              <Button variant="primary" onClick={openCreateDeptForm}>
                <Plus size={16} /> Tambah Unit / Fakultas Pertama
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

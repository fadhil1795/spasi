'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  ArrowRightLeft,
  ArrowRight,
  Building2,
  GraduationCap,
  UserCheck,
  Search,
  CheckCircle2,
  Box,
  ShieldCheck,
} from 'lucide-react';

export default function NewAssetTransferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledAssetId = searchParams.get('assetId') || '';

  const { data: session } = useSession();
  const { showToast } = useToast();
  const userRole = (session?.user as any)?.role || 'STAFF';
  const canApprove = ['SUPER_ADMIN', 'ADMIN', 'APPROVER'].includes(userRole);

  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter Pencarian Aset
  const [assetSearch, setAssetSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [unitFilter, setUnitFilter] = useState('ALL');

  const [form, setForm] = useState({
    assetId: prefilledAssetId,
    toLocationId: 'NONE',
    toDepartmentId: 'NONE',
    toPicName: '',
    reason: '',
    autoApprove: true,
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const [resA, resC, resL, resD] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/public/categories'),
        fetch('/api/locations'),
        fetch('/api/departments'),
      ]);

      let loadedAssets: any[] = [];
      if (resA.ok) {
        loadedAssets = await resA.json();
        setAssets(loadedAssets);
      }
      if (resC.ok) setCategories(await resC.json());
      if (resL.ok) setLocations(await resL.json());
      if (resD.ok) setDepartments(await resD.json());

      const initialAsset =
        (prefilledAssetId && loadedAssets.find((a) => a.id === prefilledAssetId)) ||
        loadedAssets[0] ||
        null;

      if (initialAsset) {
        setForm({
          assetId: initialAsset.id,
          toLocationId: initialAsset.locationId || 'NONE',
          toDepartmentId: initialAsset.departmentId || 'NONE',
          toPicName:
            initialAsset.picName ||
            initialAsset.location?.picName ||
            initialAsset.department?.headName ||
            '',
          reason: '',
          autoApprove: ['SUPER_ADMIN', 'ADMIN', 'APPROVER'].includes((session?.user as any)?.role || 'ADMIN'),
        });
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat referensi data mutasi aset', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (categoryFilter !== 'ALL' && a.categoryId !== categoryFilter && a.category?.parentId !== categoryFilter) {
        return false;
      }
      if (unitFilter !== 'ALL') {
        if (unitFilter === 'CENTRAL' && a.departmentId) return false;
        if (unitFilter !== 'CENTRAL' && a.departmentId !== unitFilter) return false;
      }
      if (assetSearch.trim()) {
        const q = assetSearch.toLowerCase();
        const matchName = a.name?.toLowerCase().includes(q);
        const matchCode = a.code?.toLowerCase().includes(q);
        const matchBrand = a.brand?.toLowerCase().includes(q);
        const matchLoc = (a.location?.name || a.location?.building || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchBrand && !matchLoc) return false;
      }
      return true;
    });
  }, [assets, categoryFilter, unitFilter, assetSearch]);

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === form.assetId) || null,
    [assets, form.assetId]
  );

  const handleSelectAsset = (newAssetId: string) => {
    const ast = assets.find((a) => a.id === newAssetId);
    setForm((prev) => ({
      ...prev,
      assetId: newAssetId,
      toLocationId: ast?.locationId || 'NONE',
      toDepartmentId: ast?.departmentId || 'NONE',
      toPicName: ast?.picName || ast?.location?.picName || ast?.department?.headName || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetId) {
      showToast('Pilih aset yang akan dimutasi terlebih dahulu', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          data.status === 'APPROVED'
            ? 'Mutasi aset berhasil disimpan dan langsung disetujui!'
            : 'Permohonan mutasi aset berhasil diajukan dan menunggu persetujuan.',
          'success'
        );
        router.push('/dashboard/transfers');
      } else {
        showToast(data.error || 'Gagal mengajukan mutasi aset', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Back navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link
          href="/dashboard/transfers"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.88rem',
            color: 'var(--color-muted)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Kembali ke Daftar Mutasi Aset
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ArrowRightLeft size={28} style={{ color: 'var(--color-primary)' }} />
          Formulir Pengajuan Mutasi &amp; Pemindahan Aset
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Pindahkan penempatan aset antar-ruangan, alihkan kepemilikan antar-unit/fakultas, atau perbarui penanggung jawab (PIC) aset.
        </p>
      </div>

      {loading ? (
        <Skeleton height="420px" />
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* STEP 1: Pilih Aset yang Akan Dimutasi */}
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.85rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Box size={18} style={{ color: 'var(--color-primary)' }} />
                  1. Pilih Aset Inventaris yang Akan Dimutasi
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                  Gunakan filter kategori, unit, atau kotak pencarian untuk menemukan aset dengan cepat.
                </p>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-muted)' }}>
                Menampilkan {filteredAssets.length} dari {assets.length} aset
              </span>
            </div>

            {/* Filter Aset */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Cari nama, kode aset, merek, ruangan..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  style={{ paddingLeft: '2.3rem', width: '100%' }}
                />
              </div>

              <select
                className="input-field"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">-- Semua Kategori Aset --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="input-field"
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
              >
                <option value="ALL">-- Semua Unit / Fakultas --</option>
                <option value="CENTRAL">Inventaris Pusat Instansi</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.code}] {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown Pemilih Aset */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                Aset Terpilih *
              </label>
              <select
                className="input-field"
                value={form.assetId}
                onChange={(e) => handleSelectAsset(e.target.value)}
                required
                style={{ fontWeight: 600 }}
              >
                <option value="">-- Pilih Aset Inventaris --</option>
                {filteredAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.code}] {a.name} — Ruang: {a.location ? `${a.location.name || a.location.building}` : 'Gudang Utama'} — Unit: {a.department?.code || 'PUSAT'}
                  </option>
                ))}
              </select>
            </div>

            {/* Info Posisi Saat Ini */}
            {selectedAsset && (
              <div
                style={{
                  padding: '1.1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface2)',
                  border: '1px solid var(--color-border)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Identitas &amp; Kategori Aset
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', marginTop: '0.2rem' }}>{selectedAsset.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontFamily: 'monospace', fontWeight: 700 }}>
                    {selectedAsset.code} • {selectedAsset.category?.name || '-'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Ruangan Penempatan Saat Ini
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building2 size={15} style={{ color: 'var(--color-primary)' }} />
                    {selectedAsset.location
                      ? `${selectedAsset.location.name || selectedAsset.location.building} ${selectedAsset.location.room ? `(${selectedAsset.location.room})` : ''}`
                      : 'Gudang Utama / Tanpa Ruangan'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Unit / Fakultas Saat Ini
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <GraduationCap size={15} style={{ color: '#10b981' }} />
                    {selectedAsset.department
                      ? `${selectedAsset.department.name} (${selectedAsset.department.code})`
                      : 'Inventaris Pusat Instansi'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Penanggung Jawab (PIC) Saat Ini
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UserCheck size={15} style={{ color: '#3b82f6' }} />
                    {selectedAsset.picName || selectedAsset.location?.picName || selectedAsset.department?.headName || 'Belum Ditentukan'}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* STEP 2: Detail Tujuan Mutasi */}
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.85rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowRightLeft size={18} style={{ color: '#10b981' }} />
                2. Rincian Tujuan Pemindahan (Ruangan, Unit &amp; Penanggung Jawab Baru)
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                Tentukan ruangan tujuan, unit/fakultas tujuan, dan nama penanggung jawab (PIC) baru beserta alasan mutasi.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Ruangan Tujuan (Pemindahan Antar-Ruangan)
                </label>
                <select
                  className="input-field"
                  value={form.toLocationId}
                  onChange={(e) => {
                    const newLocId = e.target.value;
                    const targetLoc = locations.find((l) => l.id === newLocId);
                    setForm((prev) => ({
                      ...prev,
                      toLocationId: newLocId,
                      toPicName: targetLoc?.picName || prev.toPicName,
                    }));
                  }}
                >
                  <option value="NONE">Gudang Utama / Tanpa Ruangan</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name || loc.building} {loc.room ? `(${loc.room})` : ''} — {loc.building}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Unit / Fakultas Tujuan (Pemindahan Antar-Unit)
                </label>
                <select
                  className="input-field"
                  value={form.toDepartmentId}
                  onChange={(e) => {
                    const newDeptId = e.target.value;
                    const targetDept = departments.find((d) => d.id === newDeptId);
                    setForm((prev) => ({
                      ...prev,
                      toDepartmentId: newDeptId,
                      toPicName: prev.toPicName || targetDept?.headName || '',
                    }));
                  }}
                >
                  <option value="NONE">Inventaris Pusat Instansi</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Input
                  label="Nama Penanggung Jawab (PIC) Baru"
                  placeholder="Contoh: Bpk. Hendra Wijaya, S.T. (Kepala Lab / PIC Ruang)"
                  value={form.toPicName}
                  onChange={(e) => setForm({ ...form, toPicName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                Alasan / Dasar Mutasi Aset *
              </label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Contoh: Relokasi perangkat laboratorium ke Gedung Kuliah Bersama Lt. 3 untuk mendukung praktikum semester baru..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                required
              />
            </div>

            {canApprove && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.9rem 1.15rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.autoApprove}
                  onChange={(e) => setForm({ ...form, autoApprove: e.target.checked })}
                  style={{ width: '17px', height: '17px' }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                    Langsung Setujui &amp; Terapkan Mutasi Sekarang
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 500 }}>
                    Hilangkan centang jika Anda ingin pengajuan ini masuk ke daftar antrean persetujuan (status <code>PENDING</code>) terlebih dahulu.
                  </div>
                </div>
              </label>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.15rem' }}>
              <Link href="/dashboard/transfers" className="btn btn-secondary">
                Batal
              </Link>
              <Button type="submit" variant="primary" isLoading={saving}>
                <CheckCircle2 size={17} />
                {canApprove && form.autoApprove ? 'Simpan & Setujui Mutasi' : 'Kirim Permohonan Mutasi'}
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Plus, Trash2, CheckSquare, Tag } from 'lucide-react';

interface FacilityItem {
  id: string;
  name: string;
  category: string | null;
}

export default function MasterRoomFacilitiesPage() {
  const { showToast } = useToast();
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Audio Visual');

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/room-facilities');
      if (res.ok) setFacilities(await res.json());
    } catch {
      showToast('Gagal memuat master fasilitas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setSaving(true);
      const res = await fetch('/api/room-facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          category: newCategory,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Fasilitas "${data.name}" ditambahkan!`, 'success');
        setNewName('');
        fetchFacilities();
      } else {
        showToast(data.error || 'Gagal menambahkan fasilitas', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: FacilityItem) => {
    if (!confirm(`Hapus fasilitas "${item.name}" dari master data?`)) return;
    try {
      const res = await fetch(`/api/room-facilities/${item.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Fasilitas dihapus', 'success');
        fetchFacilities();
      } else {
        showToast('Gagal menghapus fasilitas', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    }
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <CheckSquare size={28} style={{ color: 'var(--color-primary-light)' }} />
          Master Data Fasilitas Ruangan
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Kelola daftar opsi fasilitas yang tersedia saat mendata ruangan (AC, Proyektor, Panggung, Interactive Panel, dll).
        </p>
      </div>

      {/* Form Tambah Cepat */}
      <Card style={{ padding: '1.25rem' }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: '220px' }}>
            <Input
              label="Nama Fasilitas Baru *"
              placeholder="Contoh: Interactive Flat Panel 86 Inch"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
              Kelompok Kategori
            </label>
            <select
              className="input-field"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              <option value="Audio Visual">Audio Visual</option>
              <option value="Pendingin / Udara">Pendingin / Udara</option>
              <option value="Jaringan">Jaringan</option>
              <option value="Furniture">Furniture</option>
              <option value="Alat Tulis">Alat Tulis</option>
              <option value="Keamanan">Keamanan</option>
              <option value="Sanitasi">Sanitasi</option>
              <option value="Umum">Umum</option>
            </select>
          </div>
          <Button type="submit" variant="primary" isLoading={saving} style={{ height: '42px' }}>
            <Plus size={16} /> Tambah
          </Button>
        </form>
      </Card>

      {/* Daftar Fasilitas */}
      <Card style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Skeleton height="40px" />
            <Skeleton height="40px" />
            <Skeleton height="40px" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {facilities.map((fac) => (
              <div
                key={fac.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.9rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface2)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>{fac.name}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                    <Tag size={11} /> {fac.category || 'Umum'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(fac)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--color-danger)', padding: '0.3rem' }}
                  title="Hapus Fasilitas"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}


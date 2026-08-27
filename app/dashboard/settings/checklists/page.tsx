'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft, Plus, Trash2, Edit, Save, CheckSquare, Layers, Tag, HelpCircle, GripVertical
} from 'lucide-react';

interface ChecklistItemForm {
  name: string;
  description: string;
  isRequired: boolean;
}

export default function ChecklistTemplatesPage() {
  const { showToast } = useToast();

  const [templates, setTemplates] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [items, setItems] = useState<ChecklistItemForm[]>([
    { name: '', description: '', isRequired: true }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resTpl, resCat] = await Promise.all([
        fetch('/api/checklist-templates'),
        fetch('/api/categories'),
      ]);
      if (resTpl.ok) setTemplates(await resTpl.json());
      if (resCat.ok) setCategories(await resCat.json());
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data template', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setCategoryId('');
    setIsDefault(false);
    setItems([
      { name: 'Kondisi Fisik / Body', description: 'Cek fisik luar, lecet, keretakan', isRequired: true },
      { name: 'Fungsi Utama Perangkat', description: 'Cek perangkat menyala & dapat digunakan', isRequired: true },
      { name: 'Kelengkapan Aksesori & Kelengkapan', description: 'Cek kelengkapan charger, kabel, tas', isRequired: true },
      { name: 'Kebersihan', description: 'Cek kebersihan saat dikembalikan', isRequired: false },
    ]);
    setModalOpen(true);
  };

  const handleOpenEdit = (tpl: any) => {
    setEditingId(tpl.id);
    setTitle(tpl.title);
    setDescription(tpl.description || '');
    setCategoryId(tpl.categoryId || '');
    setIsDefault(tpl.isDefault);
    setItems(
      (tpl.items || []).map((it: any) => ({
        name: it.name,
        description: it.description || '',
        isRequired: it.isRequired,
      }))
    );
    setModalOpen(true);
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', description: '', isRequired: true }]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof ChecklistItemForm, val: any) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    setItems(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Judul template wajib diisi', 'error');
      return;
    }
    const validItems = items.filter(it => it.name.trim() !== '');
    if (validItems.length === 0) {
      showToast('Minimal tambahkan 1 item periksa yang valid', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title,
        description,
        categoryId: categoryId || null,
        isDefault,
        items: validItems,
      };

      const url = editingId ? `/api/checklist-templates/${editingId}` : '/api/checklist-templates';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(`Template checklist berhasil ${editingId ? 'diperbarui' : 'dibuat'}!`, 'success');
        setModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan template', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus template checklist "${title}"?`)) return;
    try {
      const res = await fetch(`/api/checklist-templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Template berhasil dihapus', 'success');
        fetchData();
      } else {
        showToast('Gagal menghapus template', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan koneksi', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href="/dashboard/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <ArrowLeft size={16} /> Pengaturan
          </Link>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Template Checklist Dinamis 📋</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Konfigurasi template checklist pemeriksaan fisik pengembalian aset/ruangan berdasarkan kategori.
          </p>
        </div>

        <Button onClick={handleOpenCreate}>
          <Plus size={18} /> Tambah Template Checklist
        </Button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} style={{ height: '220px' }} />)}
        </div>
      ) : templates.length === 0 ? (
        <Card style={{ padding: '3rem', textAlign: 'center' }}>
          <CheckSquare size={48} style={{ color: 'var(--color-muted)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Belum Ada Template Checklist</h3>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', marginTop: '0.3rem', marginBottom: '1.5rem' }}>
            Buat template checklist per kategori (misal: Laptop, Kamera, Ruangan) agar petugas dapat melakukan verifikasi fisik secara konsisten.
          </p>
          <Button onClick={handleOpenCreate}>
            <Plus size={16} /> Tambah Template Pertama
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {templates.map((tpl) => (
            <Card key={tpl.id} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{
                    padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                    background: tpl.category ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.12)',
                    color: tpl.category ? 'var(--color-primary)' : 'var(--color-warning)',
                  }}>
                    {tpl.category ? `🏷️ Kategori: ${tpl.category.name}` : tpl.isDefault ? '⭐ Default Standar' : 'Umum'}
                  </span>

                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button onClick={() => handleOpenEdit(tpl)} style={{ padding: '0.35rem', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }} title="Edit">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(tpl.id, tpl.title)} style={{ padding: '0.35rem', background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }} title="Hapus">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.35rem' }}>{tpl.title}</h3>
                {tpl.description && <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>{tpl.description}</p>}

                <div style={{ background: 'var(--color-surface2)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', margin: '0.75rem 0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Daftar {tpl.items?.length || 0} Item Periksa:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {tpl.items?.slice(0, 5).map((it: any) => (
                      <div key={it.id} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: 'var(--color-success)', fontWeight: 800 }}>✓</span>
                        <span style={{ fontWeight: 600 }}>{it.name}</span>
                        {it.isRequired && <span style={{ color: 'var(--color-danger)', fontSize: '0.7rem' }}>*</span>}
                      </div>
                    ))}
                    {(tpl.items?.length || 0) > 5 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                        + {(tpl.items?.length || 0) - 5} item periksa lainnya...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <Button variant="secondary" onClick={() => handleOpenEdit(tpl)} style={{ width: '100%' }}>
                  <Edit size={15} /> Kelola Item Checklist
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Modal Create / Edit Template ─────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Template Checklist' : 'Tambah Template Checklist Baru'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '650px' }}>
          <Input
            label="Judul Template *"
            placeholder="misal: Checklist Pengembalian Laptop & PC"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div>
            <label className="input-label">Deskripsi Template (Opsional)</label>
            <textarea
              className="input-field"
              rows={2}
              placeholder="Jelaskan standar pemeriksaan fisik saat pengembalian..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="input-label">Target Kategori Aset</label>
              <select
                className="input-field"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">-- Bebas / Semua Kategori --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.6rem' }}>
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="isDefault" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                Gunakan sebagai Template Standar Default
              </label>
            </div>
          </div>

          {/* Item Checklist Form Section */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ fontWeight: 800, fontSize: '0.95rem' }}>Daftar Item Pemeriksaan Fisik *</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Tambahkan bagian-bagian fisik yang wajib diperiksa oleh petugas saat pengembalian.</p>
              </div>
              <Button type="button" variant="secondary" onClick={handleAddItem}>
                <Plus size={15} /> Tambah Item
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.3rem' }}>
              {items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'var(--color-surface2)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-muted)', marginTop: '0.5rem' }}>#{idx + 1}</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Nama Item (misal: Layar / Baterai / AC / Meja)"
                      value={it.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.88rem' }}
                    />
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Petunjuk pemeriksaan (opsional)..."
                      value={it.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <input
                        type="checkbox"
                        id={`req-${idx}`}
                        checked={it.isRequired}
                        onChange={(e) => handleItemChange(idx, 'isRequired', e.target.checked)}
                        style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                      <label htmlFor={`req-${idx}`} style={{ fontSize: '0.78rem', color: 'var(--color-muted)', cursor: 'pointer', fontWeight: 600 }}>
                        Wajib Diperiksa (Required)
                      </label>
                    </div>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      style={{ padding: '0.35rem', background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', marginTop: '0.3rem' }}
                      title="Hapus Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Template'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

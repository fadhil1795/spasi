'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, Package, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface RoomAssetAllocItem {
  assetId: string;
  quantity: number;
  asset?: any;
}

interface RoomAssetSelectorProps {
  allocations: RoomAssetAllocItem[];
  onChange: (next: RoomAssetAllocItem[]) => void;
}

export function RoomAssetSelector({ allocations, onChange }: RoomAssetSelectorProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const [selectedParentCat, setSelectedParentCat] = useState('ALL');
  const [selectedSubCat, setSelectedSubCat] = useState('ALL');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [inputQty, setInputQty] = useState(1);

  // Load master categories on mount
  useEffect(() => {
    fetch('/api/public/categories')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setCategories(d))
      .catch(() => {});
  }, []);

  // Load unallocated assets whenever category filter changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('locationId', 'none');
    if (selectedSubCat !== 'ALL') {
      params.set('categoryId', selectedSubCat);
    } else if (selectedParentCat !== 'ALL') {
      params.set('parentCategoryId', selectedParentCat);
    }

    setLoadingAssets(true);
    fetch(`/api/assets?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setAssets(d);
          setSelectedAssetId('');
          setInputQty(1);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAssets(false));
  }, [selectedParentCat, selectedSubCat]);

  const parentCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  );

  const subCategories = useMemo(() => {
    if (selectedParentCat === 'ALL') return [];
    return categories.filter((c) => c.parentId === selectedParentCat);
  }, [categories, selectedParentCat]);

  // Filter out assets already added to the room list
  const selectableAssets = useMemo(() => {
    const addedIds = new Set(allocations.map((a) => a.assetId));
    return assets.filter((ast) => !addedIds.has(ast.id) && (ast.unallocatedQty ?? ast.quantity ?? 1) > 0);
  }, [assets, allocations]);

  const activeSelectedAsset = useMemo(
    () => selectableAssets.find((a) => a.id === selectedAssetId) || null,
    [selectableAssets, selectedAssetId]
  );

  const maxAddableQty = activeSelectedAsset
    ? (activeSelectedAsset.unallocatedQty ?? activeSelectedAsset.quantity ?? 1)
    : 1;

  const handleAdd = () => {
    if (!activeSelectedAsset) return;
    const finalQty = Math.min(maxAddableQty, Math.max(1, inputQty || 1));
    onChange([
      ...allocations,
      {
        assetId: activeSelectedAsset.id,
        quantity: finalQty,
        asset: activeSelectedAsset,
      },
    ]);
    setSelectedAssetId('');
    setInputQty(1);
  };

  const handleUpdateQty = (assetId: string, newQty: number, maxAllowed: number) => {
    const safeQty = Math.min(maxAllowed, Math.max(1, newQty || 1));
    onChange(
      allocations.map((al) =>
        al.assetId === assetId ? { ...al, quantity: safeQty } : al
      )
    );
  };

  const handleRemove = (assetId: string) => {
    onChange(allocations.filter((al) => al.assetId !== assetId));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Panel Pemilih Bertingkat (Dropdown Kategori -> Subkategori -> Aset -> Add) */}
      <div
        style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface2)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Layers size={15} style={{ color: 'var(--color-primary-light)' }} />
          Pilih &amp; Tambahkan Aset ke Ruangan
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {/* 1. Kategori Utama */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
              1. Kategori Utama Aset
            </label>
            <select
              className="input-field"
              style={{ height: '38px', fontSize: '0.84rem' }}
              value={selectedParentCat}
              onChange={(e) => {
                setSelectedParentCat(e.target.value);
                setSelectedSubCat('ALL');
              }}
            >
              <option value="ALL">-- Semua Kategori --</option>
              {parentCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code || 'CAT'}] {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Subkategori */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
              2. Subkategori
            </label>
            <select
              className="input-field"
              style={{ height: '38px', fontSize: '0.84rem' }}
              value={selectedSubCat}
              onChange={(e) => setSelectedSubCat(e.target.value)}
              disabled={selectedParentCat === 'ALL' || subCategories.length === 0}
            >
              <option value="ALL">
                {selectedParentCat === 'ALL'
                  ? '-- Pilih Kategori Dulu --'
                  : subCategories.length === 0
                  ? '-- Tanpa Subkategori --'
                  : '-- Semua Subkategori --'}
              </option>
              {subCategories.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  [{sc.code}] {sc.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Pilih Data Aset */}
          <div style={{ gridColumn: 'span 1' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
              3. Data Aset Tersedia ({selectableAssets.length})
            </label>
            <select
              className="input-field"
              style={{ height: '38px', fontSize: '0.84rem' }}
              value={selectedAssetId}
              onChange={(e) => {
                setSelectedAssetId(e.target.value);
                setInputQty(1);
              }}
              disabled={loadingAssets}
            >
              <option value="">
                {loadingAssets ? 'Memuat aset...' : '-- Pilih Aset --'}
              </option>
              {selectableAssets.map((ast) => {
                const avail = ast.unallocatedQty ?? ast.quantity ?? 1;
                return (
                  <option key={ast.id} value={ast.id}>
                    [{ast.code}] {ast.name} (Sisa: {avail} Unit)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Baris Jumlah & Tombol Add */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
          {activeSelectedAsset && (
            <div style={{ marginRight: 'auto', fontSize: '0.78rem', color: 'var(--color-muted)' }}>
              Stok tersedia di gudang: <strong style={{ color: 'var(--color-primary-light)' }}>{maxAddableQty}</strong> / {activeSelectedAsset.quantity || 1} Unit
            </div>
          )}

          <div style={{ width: '110px' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
              Jumlah Unit
            </label>
            <input
              type="number"
              className="input-field"
              style={{ height: '36px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 700 }}
              min="1"
              max={maxAddableQty}
              disabled={!activeSelectedAsset}
              value={inputQty}
              onChange={(e) => setInputQty(Math.min(maxAddableQty, Math.max(1, parseInt(e.target.value) || 1)))}
            />
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!activeSelectedAsset}
            onClick={handleAdd}
            style={{ height: '36px', padding: '0 1rem' }}
          >
            <Plus size={15} /> Tambah ke Ruangan
          </Button>
        </div>
      </div>

      {/* Tabel List Aset Terpasang di Ruangan */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                <th style={{ padding: '0.65rem 0.85rem', width: '44px', textAlign: 'center' }}>No</th>
                <th style={{ padding: '0.65rem 0.85rem', width: '170px' }}>Kode Aset</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Nama Aset &amp; Kategori</th>
                <th style={{ padding: '0.65rem 0.85rem', width: '150px', textAlign: 'center' }}>Jumlah di Ruangan</th>
                <th style={{ padding: '0.65rem 0.85rem', width: '70px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {allocations.length > 0 ? (
                allocations.map((al, idx) => {
                  const ast = al.asset || {};
                  const catName = ast.category?.parent
                    ? `${ast.category.parent.name} → ${ast.category.name}`
                    : (ast.category?.name || '-');
                  const totalStock = ast.quantity || 1;
                  // Max yang bisa diedit = sisa di gudang + yang sedang dipakai di baris ini (atau totalStock)
                  const maxEditable = ast.unallocatedQty !== undefined
                    ? Math.min(totalStock, ast.unallocatedQty + al.quantity)
                    : totalStock;

                  return (
                    <tr key={al.assetId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                        {ast.code || al.assetId}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{ast.name || 'Aset'}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--color-muted)' }}>
                          {catName} {ast.serialNumber ? `• S/N: ${ast.serialNumber}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        {totalStock > 1 ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <input
                              type="number"
                              min="1"
                              max={maxEditable}
                              value={al.quantity}
                              onChange={(e) => handleUpdateQty(al.assetId, parseInt(e.target.value) || 1, maxEditable)}
                              style={{
                                width: '64px',
                                height: '30px',
                                padding: '0 0.4rem',
                                fontSize: '0.84rem',
                                fontWeight: 700,
                                textAlign: 'center',
                                background: 'var(--color-surface2)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                color: 'var(--color-text)',
                              }}
                              title={`Maksimal ${maxEditable} unit`}
                            />
                            <span style={{ fontSize: '0.76rem', color: 'var(--color-muted)' }}>Unit</span>
                          </div>
                        ) : (
                          <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>1 Unit</span>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemove(al.assetId)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-danger)', padding: '0.3rem' }}
                          title="Keluarkan dari ruangan ini"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    <Package size={26} style={{ margin: '0 auto 0.4rem auto', opacity: 0.35 }} />
                    <div style={{ fontSize: '0.84rem' }}>
                      Belum ada aset yang ditambahkan ke ruangan ini.
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                      Pilih Kategori &amp; Aset pada kolom di atas, tentukan jumlahnya, lalu klik <strong>+ Tambah ke Ruangan</strong>.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


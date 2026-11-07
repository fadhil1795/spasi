'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import {
  Package, Plus, ArrowDownRight, ArrowUpRight, AlertTriangle,
  CheckCircle2, Search, Building2, ShoppingCart, Tag, RefreshCw
} from 'lucide-react';

export default function ConsumablesDashboardPage() {
  const { showToast } = useToast();
  const [consumables, setConsumables] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Item Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [initialStock, setInitialStock] = useState('0');
  const [minimumStock, setMinimumStock] = useState('5');
  const [locationId, setLocationId] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [adding, setAdding] = useState(false);

  // Stock Transaction Modal State
  const [transModalOpen, setTransModalOpen] = useState(false);
  const [transType, setTransType] = useState<'IN' | 'OUT'>('IN');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [transQuantity, setTransQuantity] = useState('1');
  const [recipientName, setRecipientName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [transNotes, setTransNotes] = useState('');
  const [transacting, setTransacting] = useState(false);

  useEffect(() => {
    fetchConsumables();
    fetchMetadata();
  }, []);

  const fetchConsumables = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/consumables');
      if (res.ok) {
        const data = await res.json();
        setConsumables(data);
      }
    } catch {
      showToast('Gagal memuat stok barang habis pakai', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [catRes, locRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/rooms'),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (locRes.ok) setLocations(await locRes.json());
    } catch {}
  };

  const handleCreateConsumable = async () => {
    if (!name.trim() || !unit.trim()) {
      showToast('Nama barang dan satuan wajib diisi', 'error');
      return;
    }

    try {
      setAdding(true);
      const res = await fetch('/api/consumables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim() || undefined,
          name: name.trim(),
          categoryId: categoryId || null,
          unit: unit.trim(),
          stock: parseInt(initialStock) || 0,
          minimumStock: parseInt(minimumStock) || 5,
          locationId: locationId || null,
          unitCost: unitCost ? parseFloat(unitCost) : null,
        }),
      });

      if (res.ok) {
        showToast('Barang habis pakai berhasil didaftarkan!', 'success');
        setAddModalOpen(false);
        setCode('');
        setName('');
        setUnit('Pcs');
        setInitialStock('0');
        setMinimumStock('5');
        setUnitCost('');
        fetchConsumables();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menambahkan barang', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setAdding(false);
    }
  };

  const openTransactionModal = (item: any, type: 'IN' | 'OUT') => {
    setSelectedItem(item);
    setTransType(type);
    setTransQuantity('1');
    setRecipientName('');
    setDepartmentName('');
    setTransNotes('');
    setTransModalOpen(true);
  };

  const handleExecuteTransaction = async () => {
    if (!selectedItem || !transQuantity || parseInt(transQuantity) <= 0) {
      showToast('Jumlah barang harus lebih dari 0', 'error');
      return;
    }

    try {
      setTransacting(true);
      const res = await fetch('/api/consumables/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumableId: selectedItem.id,
          type: transType,
          quantity: parseInt(transQuantity),
          recipientName: recipientName.trim() || null,
          departmentName: departmentName.trim() || null,
          notes: transNotes.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message, 'success');
        setTransModalOpen(false);
        fetchConsumables();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memproses transaksi stok', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setTransacting(false);
    }
  };

  const filteredItems = consumables.filter((item) => {
    const isLow = item.stock <= item.minimumStock;
    if (lowStockFilter && !isLow) return false;
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      (item.category?.name && item.category.name.toLowerCase().includes(q))
    );
  });

  const lowStockCount = consumables.filter((i) => i.stock <= i.minimumStock).length;
  const totalUnits = consumables.reduce((sum, i) => sum + (i.stock || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'rgba(234, 179, 8, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={22} color="#eab308" />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Stok Barang Habis Pakai (ATK)</h1>
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Pengelolaan stok spidol, kertas HVS, tinta printer, dan barang operasional dengan deteksi stok minimum otomatis.
          </p>
        </div>

        <Button variant="primary" onClick={() => setAddModalOpen(true)}>
          <Plus size={16} /> Tambah Item ATK Baru
        </Button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Macam Barang ATK
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem' }}>{consumables.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Item ATK terdaftar</div>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: lowStockCount > 0 ? '4px solid #ef4444' : undefined }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Peringatan Stok Menipis
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem', color: lowStockCount > 0 ? '#ef4444' : 'var(--color-success)' }}>
            {lowStockCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            {lowStockCount > 0 ? 'Di bawah ambang batas minimum' : 'Seluruh stok dalam level aman'}
          </div>
        </Card>

        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Fisik Unit Tersimpan
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--color-primary-light)' }}>
            {totalUnits}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Akumulasi pcs/rim di gudang</div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input
              type="text"
              placeholder="Cari nama barang atau kode ATK..."
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.4rem', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setLowStockFilter(false)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: !lowStockFilter ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: !lowStockFilter ? 'var(--color-primary)' : 'var(--color-surface)',
                color: !lowStockFilter ? '#fff' : 'var(--color-text)',
              }}
            >
              Semua Barang ({consumables.length})
            </button>
            <button
              onClick={() => setLowStockFilter(true)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: lowStockFilter ? '1px solid #ef4444' : '1px solid var(--color-border)',
                background: lowStockFilter ? '#ef4444' : 'var(--color-surface)',
                color: lowStockFilter ? '#fff' : 'var(--color-text)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <AlertTriangle size={14} /> Stok Menipis ({lowStockCount})
            </button>
          </div>
        </div>
      </Card>

      {/* Table of Consumables */}
      <Card style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', fontWeight: 700 }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Kode & Nama Barang</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Kategori</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Lokasi Gudang</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Sisa Stok Saat Ini</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Batas Minimum</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Aksi Mutasi Stok</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                    Memuat stok ATK...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                    Tidak ada barang habis pakai yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.stock <= item.minimumStock;

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', background: isLow ? 'rgba(239, 68, 68, 0.03)' : undefined }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{item.name}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-primary-light)', marginTop: '0.15rem' }}>
                          {item.code}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{ fontSize: '0.8rem', background: 'var(--color-surface2)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                          {item.category?.name || 'Umum'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                        {item.location?.name || item.location?.building || 'Gudang Pusat ATK'}
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isLow ? '#ef4444' : 'var(--color-success)' }}>
                            {item.stock} {item.unit}
                          </span>
                          {isLow && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)' }}>
                              Menipis!
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                        Min. {item.minimumStock} {item.unit}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => openTransactionModal(item, 'IN')}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-success)' }}
                            title="Restock / Barang Masuk"
                          >
                            <ArrowDownRight size={14} /> + Masuk
                          </button>
                          <button
                            onClick={() => openTransactionModal(item, 'OUT')}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444' }}
                            title="Permintaan / Barang Keluar"
                          >
                            <ArrowUpRight size={14} /> - Keluar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Tambah Barang ATK Baru */}
      {addModalOpen && (
        <Modal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Tambah Barang Habis Pakai (ATK) Baru"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Kode Barang (Opsional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Auto: ATK-XXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Nama Barang ATK *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Misal: Spidol Whiteboard Snowman Hitam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Kategori
                </label>
                <select
                  className="input-field"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Umum / Tanpa Kategori --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Satuan Barang *
                </label>
                <select
                  className="input-field"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="Pcs">Pcs / Buah</option>
                  <option value="Rim">Rim</option>
                  <option value="Box">Box / Dus</option>
                  <option value="Pack">Pack</option>
                  <option value="Botol">Botol</option>
                  <option value="Roll">Roll</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Stok Awal
                </label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Batas Peringatan Minimum
                </label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Lokasi Ruang / Rak Penyimpanan
              </label>
              <select
                className="input-field"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">-- Gudang Pusat Sarpras --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name || loc.building} (Lt. {loc.floor || '1'})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setAddModalOpen(false)} disabled={adding}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleCreateConsumable} loading={adding}>
                Simpan Item ATK
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Transaksi Mutasi Stok (IN / OUT) */}
      {transModalOpen && selectedItem && (
        <Modal
          isOpen={transModalOpen}
          onClose={() => setTransModalOpen(false)}
          title={
            transType === 'IN'
              ? `Barang Masuk / Restock: ${selectedItem.name}`
              : `Pengeluaran / Permintaan: ${selectedItem.name}`
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              Stok Saat Ini: <strong>{selectedItem.stock} {selectedItem.unit}</strong> &bull; Batas Minimum: <strong>{selectedItem.minimumStock} {selectedItem.unit}</strong>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Jumlah {transType === 'IN' ? 'Barang Masuk' : 'Barang Keluar'} ({selectedItem.unit}) *
              </label>
              <input
                type="number"
                min="1"
                max={transType === 'OUT' ? selectedItem.stock : undefined}
                className="input-field"
                value={transQuantity}
                onChange={(e) => setTransQuantity(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {transType === 'OUT' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Nama Peminta / Penerima Barang
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Misal: Bpk. Ahmad (Dosen Informatika)"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Jurusan / Unit Pemohon
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Misal: Prodi Teknik Informatika"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Keterangan / Catatan
              </label>
              <textarea
                className="input-field"
                rows={2}
                placeholder={transType === 'IN' ? 'Misal: Pembelian rutin awal semester...' : 'Misal: Untuk kebutuhan perkuliahan lab komputasi...'}
                value={transNotes}
                onChange={(e) => setTransNotes(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setTransModalOpen(false)} disabled={transacting}>
                Batal
              </Button>
              <Button
                variant={transType === 'IN' ? 'primary' : 'danger'}
                onClick={handleExecuteTransaction}
                loading={transacting}
              >
                {transType === 'IN' ? 'Simpan Restock Masuk' : 'Konfirmasi Pengeluaran Barang'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import {
  Package,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  Search,
  History,
  Edit3,
  Trash2,
  Download,
  RefreshCw,
  Upload,
  ExternalLink,
  Receipt,
  CalendarDays,
  FileSpreadsheet,
} from 'lucide-react';

function getLocalDatetimeString() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function getCurrentMonthString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function ConsumablesDashboardPage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'items' | 'transactions' | 'recap'>('items');
  const [consumables, setConsumables] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [recapMonth, setRecapMonth] = useState(getCurrentMonthString());
  const [recapData, setRecapData] = useState<{ summary: any; rows: any[] }>({ summary: null, rows: [] });
  const [recapLoading, setRecapLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transLoading, setTransLoading] = useState(false);

  // Filters - Items
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters - Transactions
  const [transSearch, setTransSearch] = useState('');
  const [transTypeFilter, setTransTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [transItemFilter, setTransItemFilter] = useState('ALL');

  // Add / Edit Item Modal State
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [initialStock, setInitialStock] = useState('0');
  const [minimumStock, setMinimumStock] = useState('5');
  const [locationId, setLocationId] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  // Stock Transaction Modal State
  const [transModalOpen, setTransModalOpen] = useState(false);
  const [transType, setTransType] = useState<'IN' | 'OUT'>('IN');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [transQuantity, setTransQuantity] = useState('1');
  const [transBrand, setTransBrand] = useState('');
  const [transDate, setTransDate] = useState(getLocalDatetimeString());
  const [transUnitCost, setTransUnitCost] = useState('');
  const [transTotalCost, setTransTotalCost] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [transNotes, setTransNotes] = useState('');
  const [transacting, setTransacting] = useState(false);

  // Import ATK Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importMode, setImportMode] = useState<'skip' | 'restock'>('restock');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const action = searchParams.get('action');
    const itemIdParam = searchParams.get('itemId');
    if (action === 'import') {
      setImportModalOpen(true);
    } else if ((action === 'in' || action === 'out') && consumables.length > 0) {
      const target = consumables.find((c) => c.id === itemIdParam);
      if (target) {
        openTransactionModal(target, action === 'in' ? 'IN' : 'OUT');
      }
    }
  }, [searchParams, consumables.length]);

  useEffect(() => {
    if (searchParams.get('action') === 'import') {
      setImportModalOpen(true);
    }
  }, [searchParams]);

  const handleDownloadImportTemplate = () => {
    const sampleData = [
      {
        Kode: 'ATK-101',
        'Nama Barang': 'Spidol Whiteboard Hitam',
        Merek: 'Snowman',
        Kategori: 'Alat Tulis Kantor',
        Satuan: 'Pcs',
        'Stok Masuk': 24,
        'Batas Minimum': 10,
        Lokasi: 'Gudang Pusat ATK',
        'Harga Beli Satuan': 8500,
        'Nama Toko': 'Multikom',
        'No Nota': 'INV-2026-001',
      },
      {
        Kode: 'ATK-102',
        'Nama Barang': 'Kertas HVS A4 80gr',
        Merek: 'PaperOne',
        Kategori: 'Kertas & Cetak',
        Satuan: 'Rim',
        'Stok Masuk': 15,
        'Batas Minimum': 5,
        Lokasi: 'Gudang Pusat ATK',
        'Harga Beli Satuan': 52000,
        'Nama Toko': 'Toko Kertas Jaya',
        'No Nota': 'INV-2026-002',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_ATK');
    XLSX.writeFile(wb, 'template-import-atk.xlsx');
  };

  const handleParseImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });

      const mapped = rawRows.map((row) => {
        const norm: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          norm[k.trim().toLowerCase()] = v;
        }
        return {
          code: norm['kode'] || norm['code'] || norm['kode barang'] || '',
          name: norm['nama barang'] || norm['nama'] || norm['name'] || '',
          brand: norm['merek'] || norm['merk'] || norm['brand'] || '',
          category: norm['kategori'] || norm['category'] || '',
          unit: norm['satuan'] || norm['unit'] || 'Pcs',
          stock: norm['stok masuk'] ?? norm['stok'] ?? norm['jumlah'] ?? norm['stock'] ?? 0,
          minimumStock: norm['batas minimum'] ?? norm['min stok'] ?? norm['minimumstock'] ?? 5,
          location: norm['lokasi'] || norm['location'] || '',
          unitCost: norm['harga beli satuan'] ?? norm['harga satuan'] ?? norm['harga'] ?? norm['unitcost'] ?? '',
          supplierName: norm['nama toko'] || norm['supplier'] || norm['toko'] || norm['suppliername'] || '',
          invoiceNumber: norm['no nota'] || norm['no. nota'] || norm['nota'] || norm['invoicenumber'] || '',
        };
      });

      setImportRows(mapped);
      setImportFileName(file.name);
      showToast(`${mapped.length} baris berhasil dibaca dari ${file.name}`, 'success');
    } catch {
      showToast('Gagal membaca file Excel/CSV. Pastikan format sesuai template.', 'error');
    }
  };

  const handleExecuteImport = async () => {
    if (importRows.length === 0) {
      showToast('Pilih file Excel/CSV terlebih dahulu', 'error');
      return;
    }
    try {
      setImporting(true);
      const res = await fetch('/api/consumables/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: importRows, mode: importMode }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        setImportModalOpen(false);
        setImportRows([]);
        setImportFileName('');
        fetchConsumables();
        fetchTransactions();
        fetchRecap(recapMonth);
      } else {
        showToast(data.error || 'Gagal mengimpor data ATK', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi saat import', 'error');
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    fetchConsumables();
    fetchTransactions();
    fetchRecap(recapMonth);
    fetchMetadata();
  }, []);

  const fetchRecap = async (monthStr: string) => {
    try {
      setRecapLoading(true);
      const res = await fetch(`/api/consumables/recap?month=${encodeURIComponent(monthStr)}`);
      if (res.ok) {
        const data = await res.json();
        setRecapData({ summary: data.summary, rows: data.rows || [] });
      }
    } catch {
      showToast('Gagal memuat rekap bulanan ATK', 'error');
    } finally {
      setRecapLoading(false);
    }
  };

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

  const fetchTransactions = async (itemId?: string, type?: string) => {
    try {
      setTransLoading(true);
      const params = new URLSearchParams();
      const targetItem = itemId ?? transItemFilter;
      const targetType = type ?? transTypeFilter;
      if (targetItem && targetItem !== 'ALL') params.set('consumableId', targetItem);
      if (targetType && targetType !== 'ALL') params.set('type', targetType);
      const res = await fetch(`/api/consumables/transactions?${params.toString()}`);
      if (res.ok) {
        setTransactions(await res.json());
      }
    } catch {
      showToast('Gagal memuat riwayat transaksi ATK', 'error');
    } finally {
      setTransLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [catRes, locRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/rooms'),
      ]);
      if (catRes.ok) {
        const cats = await catRes.json();
        setCategories(Array.isArray(cats) ? cats : cats.categories || []);
      }
      if (locRes.ok) setLocations(await locRes.json());
    } catch {}
  };

  const openAddModal = () => {
    setEditingItem(null);
    setCode('');
    setName('');
    setBrand('');
    setCategoryId('');
    setUnit('Pcs');
    setInitialStock('0');
    setMinimumStock('5');
    setLocationId('');
    setUnitCost('');
    setItemModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setCode(item.code || '');
    setName(item.name || '');
    setBrand(item.brand || '');
    setCategoryId(item.categoryId || '');
    setUnit(item.unit || 'Pcs');
    setInitialStock(String(item.stock ?? 0));
    setMinimumStock(String(item.minimumStock ?? 5));
    setLocationId(item.locationId || '');
    setUnitCost(item.unitCost !== null && item.unitCost !== undefined ? String(item.unitCost) : '');
    setItemModalOpen(true);
  };

  const normalizedInputName = name.trim().toLowerCase();
  const exactDuplicateItem = normalizedInputName
    ? consumables.find(
        (c) =>
          c.id !== editingItem?.id &&
          c.name.trim().toLowerCase() === normalizedInputName
      )
    : undefined;
  const similarItems =
    !exactDuplicateItem && normalizedInputName.length >= 3
      ? consumables.filter(
          (c) =>
            c.id !== editingItem?.id &&
            (c.name.trim().toLowerCase().includes(normalizedInputName) ||
              normalizedInputName.includes(c.name.trim().toLowerCase()))
        )
      : [];

  const handleSaveItem = async () => {
    if (!name.trim() || !unit.trim()) {
      showToast('Nama barang dan satuan wajib diisi', 'error');
      return;
    }

    if (exactDuplicateItem) {
      showToast(
        `Barang "${exactDuplicateItem.name}" (${exactDuplicateItem.code}) sudah terdaftar! Gunakan mutasi Masuk untuk menambah stok.`,
        'error'
      );
      return;
    }

    try {
      setSavingItem(true);
      const isEdit = Boolean(editingItem);
      const url = isEdit ? `/api/consumables/${editingItem.id}` : '/api/consumables';
      const method = isEdit ? 'PATCH' : 'POST';

      const payload: any = {
        code: code.trim() || undefined,
        name: name.trim(),
        brand: brand.trim() || null,
        categoryId: categoryId || null,
        unit: unit.trim(),
        minimumStock: parseInt(minimumStock) || 0,
        locationId: locationId || null,
        unitCost: unitCost ? parseFloat(unitCost) : null,
      };
      if (!isEdit) {
        payload.stock = parseInt(initialStock) || 0;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(
          isEdit ? 'Data barang habis pakai berhasil diperbarui!' : 'Barang habis pakai berhasil didaftarkan!',
          'success'
        );
        setItemModalOpen(false);
        fetchConsumables();
        fetchTransactions();
        fetchRecap(recapMonth);
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan barang', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!confirm(`Hapus master barang "${item.name}" (${item.code})? Seluruh riwayat transaksinya juga akan terhapus.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/consumables/${item.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Barang "${item.name}" berhasil dihapus`, 'success');
        fetchConsumables();
        fetchTransactions();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menghapus barang', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    }
  };

  const openTransactionModal = (item?: any, type: 'IN' | 'OUT' = 'IN') => {
    const target = item || consumables[0] || null;
    setSelectedItemId(target?.id || '');
    setTransType(type);
    setTransQuantity('1');
    setTransBrand(target?.brand || '');
    setTransDate(getLocalDatetimeString());
    const defaultCost = target?.unitCost ? String(target.unitCost) : '';
    setTransUnitCost(defaultCost);
    setTransTotalCost(defaultCost);
    setSupplierName('');
    setInvoiceNumber('');
    setReceiptUrl('');
    setRecipientName('');
    setDepartmentName('');
    setTransNotes('');
    setTransModalOpen(true);
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingReceipt(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'consumables');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setReceiptUrl(data.url);
        showToast(
          data.storage === 's3'
            ? 'Bukti pembelian berhasil diunggah ke S3/MinIO!'
            : 'Bukti pembelian berhasil diunggah!',
          'success'
        );
      } else {
        showToast('Gagal mengunggah bukti pembelian', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan saat mengunggah file', 'error');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const selectedItem = consumables.find((c) => c.id === selectedItemId) || null;

  const handleExecuteTransaction = async () => {
    if (!selectedItem || !transQuantity || parseInt(transQuantity) <= 0) {
      showToast('Pilih barang dan masukkan jumlah lebih dari 0', 'error');
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
          brand: transBrand.trim() || null,
          transactionDate: transDate ? new Date(transDate).toISOString() : undefined,
          unitCost: transType === 'IN' && transUnitCost ? parseFloat(transUnitCost) : null,
          totalCost: transType === 'IN' && transTotalCost ? parseFloat(transTotalCost) : null,
          supplierName: transType === 'IN' ? (supplierName.trim() || null) : null,
          invoiceNumber: transType === 'IN' ? (invoiceNumber.trim() || null) : null,
          receiptUrl: transType === 'IN' ? (receiptUrl.trim() || null) : null,
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
        fetchTransactions();
        fetchRecap(recapMonth);
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

  const handleExportCsv = () => {
    if (activeTab === 'items') {
      const headers = ['Kode', 'Nama Barang', 'Merek', 'Kategori', 'Lokasi', 'Stok', 'Satuan', 'Min Stok', 'Harga Satuan', 'Total Nilai'];
      const rows = filteredItems.map((i) => [
        i.code,
        `"${(i.name || '').replace(/"/g, '""')}"`,
        `"${(i.brand || '-').replace(/"/g, '""')}"`,
        `"${(i.category?.name || 'Umum').replace(/"/g, '""')}"`,
        `"${(i.location?.name || i.location?.building || 'Gudang Pusat ATK').replace(/"/g, '""')}"`,
        i.stock,
        i.unit,
        i.minimumStock,
        i.unitCost || 0,
        (i.stock || 0) * (i.unitCost || 0),
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stok-barang-habis-pakai-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (activeTab === 'recap') {
      const headers = ['Bulan', 'Kode', 'Nama Barang', 'Merek', 'Satuan', 'Saldo Awal', 'Masuk (IN)', 'Keluar (OUT)', 'Saldo Akhir', 'Total Belanja (Rp)', 'Estimasi Nilai Saldo Akhir (Rp)'];
      const rows = recapData.rows.map((r) => [
        recapMonth,
        r.code,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.brand || '-').replace(/"/g, '""')}"`,
        r.unit,
        r.openingStock,
        r.inQty,
        r.outQty,
        r.closingStock,
        r.spendMonth || 0,
        r.closingValue || 0,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rekap-bulanan-atk-${recapMonth}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['Waktu Transaksi', 'Kode', 'Nama Barang', 'Merek', 'Tipe', 'Jumlah', 'Satuan', 'Harga Beli Satuan', 'Total Biaya', 'Nama Toko / Supplier', 'No Nota', 'Bukti Pembelian', 'Penerima', 'Unit/Bagian', 'Petugas', 'Catatan'];
      const rows = filteredTransactions.map((t) => [
        new Date(t.transactionDate).toLocaleString('id-ID'),
        t.consumable?.code || '-',
        `"${(t.consumable?.name || '-').replace(/"/g, '""')}"`,
        `"${(t.brand || t.consumable?.brand || '-').replace(/"/g, '""')}"`,
        t.type === 'IN' ? 'MASUK' : 'KELUAR',
        t.quantity,
        t.consumable?.unit || '',
        t.unitCost || 0,
        t.totalCost || 0,
        `"${(t.supplierName || '-').replace(/"/g, '""')}"`,
        `"${(t.invoiceNumber || '-').replace(/"/g, '""')}"`,
        `"${(t.receiptUrl || '-').replace(/"/g, '""')}"`,
        `"${(t.recipientName || '-').replace(/"/g, '""')}"`,
        `"${(t.departmentName || '-').replace(/"/g, '""')}"`,
        `"${(t.recordedBy?.name || '-').replace(/"/g, '""')}"`,
        `"${(t.notes || '-').replace(/"/g, '""')}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `riwayat-transaksi-atk-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
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

  const filteredTransactions = transactions.filter((t) => {
    if (transItemFilter !== 'ALL' && t.consumableId !== transItemFilter) return false;
    if (transTypeFilter !== 'ALL' && t.type !== transTypeFilter) return false;
    const q = transSearch.toLowerCase();
    if (!q) return true;
    return (
      t.consumable?.name?.toLowerCase().includes(q) ||
      t.consumable?.code?.toLowerCase().includes(q) ||
      t.recipientName?.toLowerCase().includes(q) ||
      t.departmentName?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q) ||
      t.recordedBy?.name?.toLowerCase().includes(q)
    );
  });

  const lowStockCount = consumables.filter((i) => i.stock <= i.minimumStock).length;
  const totalUnits = consumables.reduce((sum, i) => sum + (i.stock || 0), 0);
  const totalValue = consumables.reduce((sum, i) => sum + (i.stock || 0) * (i.unitCost || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'rgba(234, 179, 8, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={22} color="#eab308" />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Barang Habis Pakai (ATK)</h1>
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Pendataan master barang habis pakai, pencatatan mutasi masuk/keluar, dan kartu stok transaksi per unit.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => setImportModalOpen(true)}>
            <FileSpreadsheet size={16} /> Import ATK
          </Button>
          <Button variant="secondary" onClick={handleExportCsv}>
            <Download size={16} /> Export CSV
          </Button>
          {consumables.length > 0 && (
            <Button variant="secondary" onClick={() => openTransactionModal(undefined, 'OUT')}>
              <ArrowUpRight size={16} /> Catat Transaksi
            </Button>
          )}
          <Button variant="primary" onClick={openAddModal}>
            <Plus size={16} /> Tambah Item ATK
          </Button>
        </div>
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
            Total Fisik &amp; Nilai Stok
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--color-primary-light)' }}>
            {totalUnits} unit
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            Estimasi nilai: {formatCurrency(totalValue)}
          </div>
        </Card>

        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Riwayat Mutasi
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem' }}>{transactions.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Transaksi masuk &amp; keluar tercatat</div>
        </Card>
      </div>

      {/* Otomatisasi Peringatan Minimum Stok */}
      {lowStockCount > 0 && (
        <Card
          style={{
            padding: '1rem 1.25rem',
            borderColor: 'rgba(239, 68, 68, 0.35)',
            background: 'rgba(239, 68, 68, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <AlertTriangle size={20} color="#ef4444" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ef4444' }}>
                Peringatan Otomatis: {lowStockCount} Barang di Bawah / Pada Batas Stok Minimum
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                {consumables
                  .filter((i) => i.stock <= i.minimumStock)
                  .slice(0, 4)
                  .map((i) => `${i.name} (${i.stock}/${i.minimumStock} ${i.unit})`)
                  .join(' • ')}
                {lowStockCount > 4 ? ` • +${lowStockCount - 4} lainnya` : ''}
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setActiveTab('items');
              setLowStockFilter(true);
            }}
          >
            Tampilkan Stok Menipis
          </Button>
        </Card>
      )}

      {/* Tab Switcher */}
      <div style={{ display: 'flex', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '0.25rem', gap: '0.25rem', width: 'fit-content' }}>
        <button
          type="button"
          onClick={() => setActiveTab('items')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.6rem 1.2rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'items' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'items' ? '#fff' : 'var(--color-muted)',
            fontWeight: activeTab === 'items' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          <Package size={16} /> Pendataan &amp; Stok Barang ({consumables.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.6rem 1.2rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'transactions' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'transactions' ? '#fff' : 'var(--color-muted)',
            fontWeight: activeTab === 'transactions' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          <History size={16} /> Riwayat Transaksi / Kartu Stok ({transactions.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('recap');
            fetchRecap(recapMonth);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.6rem 1.2rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'recap' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'recap' ? '#fff' : 'var(--color-muted)',
            fontWeight: activeTab === 'recap' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          <CalendarDays size={16} /> Rekap Bulanan
        </button>
      </div>

      {/* TAB 1: PENDATAAN & STOK BARANG */}
      {activeTab === 'items' && (
        <>
          <Card style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                <input
                  type="text"
                  placeholder="Cari nama barang, kode ATK, atau kategori..."
                  className="input-field"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.4rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setLowStockFilter(false)}
                  className={`btn btn-sm ${!lowStockFilter ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Semua Barang ({consumables.length})
                </button>
                <button
                  onClick={() => setLowStockFilter(true)}
                  className="btn btn-sm"
                  style={{
                    border: lowStockFilter ? '1px solid #ef4444' : '1px solid var(--color-border)',
                    background: lowStockFilter ? '#ef4444' : 'var(--color-surface)',
                    color: lowStockFilter ? '#fff' : 'var(--color-text)',
                  }}
                >
                  <AlertTriangle size={14} /> Stok Menipis ({lowStockCount})
                </button>
              </div>
            </div>
          </Card>

          <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', fontWeight: 700 }}>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Kode &amp; Nama Barang</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Kategori &amp; Lokasi</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Sisa Stok</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Harga Satuan</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Batas Min.</th>
                    <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Mutasi &amp; Kelola</th>
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
                            <Link
                              href={`/dashboard/consumables/${item.id}`}
                              style={{
                                fontWeight: 700,
                                color: 'var(--color-text)',
                                textDecoration: 'underline',
                                textDecorationColor: 'var(--color-border)',
                                textUnderlineOffset: '3px',
                              }}
                              title="Klik untuk membuka halaman penuh Kartu Stok & Riwayat item ini"
                            >
                              {item.name}
                            </Link>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-primary-light)' }}>
                                {item.code}
                              </span>
                              {item.brand && (
                                <span style={{ fontSize: '0.74rem', background: 'var(--color-surface2)', padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontWeight: 600 }}>
                                  Merek: {item.brand}
                                </span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{ fontSize: '0.78rem', background: 'var(--color-surface2)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                              {item.category?.name || 'Umum'}
                            </span>
                            <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                              {item.location?.name || item.location?.building || 'Gudang Pusat ATK'}
                            </div>
                          </td>

                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: isLow ? '#ef4444' : 'var(--color-success)' }}>
                                {item.stock} {item.unit}
                              </span>
                              {isLow && (
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)' }}>
                                  Menipis
                                </span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: '1rem 1.25rem', fontSize: '0.84rem' }}>
                            {item.unitCost ? formatCurrency(item.unitCost) : '-'}
                          </td>

                          <td style={{ padding: '1rem 1.25rem', fontSize: '0.84rem', color: 'var(--color-muted)' }}>
                            Min. {item.minimumStock} {item.unit}
                          </td>

                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => openTransactionModal(item, 'IN')}
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--color-success)' }}
                                title="Restock / Barang Masuk"
                              >
                                <ArrowDownRight size={14} /> Masuk
                              </button>
                              <button
                                onClick={() => openTransactionModal(item, 'OUT')}
                                className="btn btn-secondary btn-sm"
                                style={{ color: '#ef4444' }}
                                title="Permintaan / Barang Keluar"
                              >
                                <ArrowUpRight size={14} /> Keluar
                              </button>
                              <Link
                                href={`/dashboard/consumables/${item.id}`}
                                className="btn btn-secondary btn-sm"
                                title="Buka Halaman Riwayat Transaksi & Pengeluaran"
                              >
                                <History size={14} /> Riwayat ({item._count?.transactions || 0})
                              </Link>
                              <button
                                onClick={() => openEditModal(item)}
                                className="btn btn-secondary btn-sm"
                                title="Edit Data Barang"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--color-danger)' }}
                                title="Hapus Master Barang"
                              >
                                <Trash2 size={14} />
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
        </>
      )}

      {/* TAB 3: REKAP BULANAN (SALDO AWAL + MASUK - KELUAR = SALDO AKHIR) */}
      {activeTab === 'recap' && (
        <>
          <Card style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Periode Rekap Bulanan</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                  Sisa stok bulan sebelumnya otomatis menjadi Saldo Awal bulan berikutnya.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <input
                  type="month"
                  className="input-field"
                  value={recapMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRecapMonth(val);
                    if (val) fetchRecap(val);
                  }}
                />
                <Button variant="secondary" size="sm" onClick={() => fetchRecap(recapMonth)}>
                  <RefreshCw size={14} /> Muat Ulang
                </Button>
              </div>
            </div>
          </Card>

          {recapData.summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
              <Card style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Saldo Awal Bulan</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.3rem' }}>{recapData.summary.totalOpening}</div>
              </Card>
              <Card style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Masuk (IN)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.3rem', color: '#10b981' }}>+{recapData.summary.totalIn}</div>
              </Card>
              <Card style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Keluar (OUT)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.3rem', color: '#ef4444' }}>-{recapData.summary.totalOut}</div>
              </Card>
              <Card style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Saldo Akhir Bulan</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.3rem', color: 'var(--color-primary-light)' }}>{recapData.summary.totalClosing}</div>
              </Card>
              <Card style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Belanja Bulan Ini</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--color-success)' }}>{formatCurrency(recapData.summary.totalSpend || 0)}</div>
              </Card>
            </div>
          )}

          <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', fontWeight: 700 }}>
                    <th style={{ padding: '0.85rem 1.15rem' }}>Kode &amp; Nama Barang</th>
                    <th style={{ padding: '0.85rem 1.15rem' }}>Merek</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>Saldo Awal</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>Masuk (+)</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>Keluar (-)</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>Saldo Akhir</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>Belanja Bulan Ini</th>
                  </tr>
                </thead>
                <tbody>
                  {recapLoading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                        Menghitung rekap bulanan...
                      </td>
                    </tr>
                  ) : recapData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                        Belum ada data barang habis pakai.
                      </td>
                    </tr>
                  ) : (
                    recapData.rows.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.9rem 1.15rem' }}>
                          <div style={{ fontWeight: 700 }}>{r.name}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-primary-light)' }}>
                            {r.code} &bull; {r.unit}
                          </div>
                        </td>
                        <td style={{ padding: '0.9rem 1.15rem' }}>{r.brand || '-'}</td>
                        <td style={{ padding: '0.9rem 1.15rem', textAlign: 'right', fontWeight: 600 }}>{r.openingStock} {r.unit}</td>
                        <td style={{ padding: '0.9rem 1.15rem', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>+{r.inQty}</td>
                        <td style={{ padding: '0.9rem 1.15rem', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>-{r.outQty}</td>
                        <td style={{ padding: '0.9rem 1.15rem', textAlign: 'right', fontWeight: 800, color: 'var(--color-primary-light)' }}>{r.closingStock} {r.unit}</td>
                        <td style={{ padding: '0.9rem 1.15rem', textAlign: 'right', fontWeight: 600 }}>{r.spendMonth > 0 ? formatCurrency(r.spendMonth) : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* TAB 2: RIWAYAT TRANSAKSI (KARTU STOK) */}
      {activeTab === 'transactions' && (
        <>
          <Card style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                <input
                  type="text"
                  placeholder="Cari nama barang, penerima, unit, atau petugas..."
                  className="input-field"
                  value={transSearch}
                  onChange={(e) => setTransSearch(e.target.value)}
                  style={{ paddingLeft: '2.4rem', width: '100%' }}
                />
              </div>

              <select
                className="input-field"
                value={transItemFilter}
                onChange={(e) => {
                  setTransItemFilter(e.target.value);
                  fetchTransactions(e.target.value, transTypeFilter);
                }}
                style={{ minWidth: '200px' }}
              >
                <option value="ALL">Semua Barang ATK</option>
                {consumables.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>

              <select
                className="input-field"
                value={transTypeFilter}
                onChange={(e) => {
                  const val = e.target.value as 'ALL' | 'IN' | 'OUT';
                  setTransTypeFilter(val);
                  fetchTransactions(transItemFilter, val);
                }}
                style={{ minWidth: '150px' }}
              >
                <option value="ALL">Semua Mutasi</option>
                <option value="IN">Barang Masuk (IN)</option>
                <option value="OUT">Barang Keluar (OUT)</option>
              </select>

              <Button variant="secondary" size="sm" onClick={() => fetchTransactions()}>
                <RefreshCw size={14} /> Refresh
              </Button>
            </div>
          </Card>

          <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', fontWeight: 700 }}>
                    <th style={{ padding: '0.85rem 1.15rem' }}>Waktu Transaksi</th>
                    <th style={{ padding: '0.85rem 1.15rem' }}>Barang ATK</th>
                    <th style={{ padding: '0.85rem 1.15rem' }}>Tipe</th>
                    <th style={{ padding: '0.85rem 1.15rem' }}>Jumlah</th>
                    <th style={{ padding: '0.85rem 1.15rem' }}>Supplier / Penerima &amp; Biaya</th>
                    <th style={{ padding: '0.85rem 1.15rem' }}>Petugas, Nota &amp; Bukti</th>
                  </tr>
                </thead>
                <tbody>
                  {transLoading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                        Memuat riwayat transaksi...
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                        Belum ada transaksi barang habis pakai yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.9rem 1.15rem', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                          {new Date(t.transactionDate).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '0.9rem 1.15rem' }}>
                          <div style={{ fontWeight: 700 }}>{t.consumable?.name || '-'}</div>
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-primary-light)' }}>
                              {t.consumable?.code}
                            </span>
                            {(t.brand || t.consumable?.brand) && (
                              <span style={{ fontSize: '0.72rem', background: 'var(--color-surface2)', padding: '0.08rem 0.4rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                                {t.brand || t.consumable?.brand}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.9rem 1.15rem' }}>
                          <span
                            className="badge"
                            style={{
                              background: t.type === 'IN' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                              color: t.type === 'IN' ? '#10b981' : '#ef4444',
                              fontWeight: 700,
                            }}
                          >
                            {t.type === 'IN' ? 'MASUK (IN)' : 'KELUAR (OUT)'}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1.15rem', fontWeight: 800, color: t.type === 'IN' ? '#10b981' : '#ef4444' }}>
                          {t.type === 'IN' ? '+' : '-'}{t.quantity} {t.consumable?.unit || ''}
                        </td>
                        <td style={{ padding: '0.9rem 1.15rem' }}>
                          {t.type === 'IN' ? (
                            <div>
                              <div style={{ fontWeight: 600 }}>{t.supplierName || 'Pembelian / Restock'}</div>
                              {(t.totalCost || t.unitCost) ? (
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 700 }}>
                                  Total: {formatCurrency(t.totalCost || (t.unitCost * t.quantity))}
                                  {t.unitCost ? ` (${formatCurrency(t.unitCost)}/${t.consumable?.unit || 'unit'})` : ''}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 600 }}>{t.recipientName || '-'}</div>
                              {t.departmentName && (
                                <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)' }}>{t.departmentName}</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.9rem 1.15rem' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                            {t.recordedBy?.name || 'System'}
                          </div>
                          {t.invoiceNumber && (
                            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-primary-light)' }}>
                              Nota: {t.invoiceNumber}
                            </div>
                          )}
                          {t.notes && (
                            <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                              {t.notes}
                            </div>
                          )}
                          {t.receiptUrl && (
                            <a
                              href={t.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                marginTop: '0.3rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--color-primary-light)',
                                textDecoration: 'underline',
                              }}
                            >
                              <Receipt size={13} /> Lihat Bukti Pembelian <ExternalLink size={11} />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* TAB 3: REKAP BULANAN (SALDO AWAL + MASUK - KELUAR = SALDO AKHIR) */}
      {activeTab === 'recap' && (
        <>
          <Card style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Periode Rekap Bulanan</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                  Sisa stok bulan sebelumnya otomatis menjadi Saldo Awal bulan berikutnya.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <input
                  type="month"
                  className="input-field"
                  value={recapMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRecapMonth(val);
                    if (val) fetchRecap(val);
                  }}
                />
                <Button variant="secondary" size="sm" onClick={() => fetchRecap(recapMonth)}>
                  <RefreshCw size={14} /> Muat Ulang
                </Button>
              </div>
            </div>
          </Card>

          {recapData.summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
              <Card style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Saldo Awal Bulan</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.3rem' }}>{recapData.summary.totalOpening}</div>
              </Card>
              <Card style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Masuk (IN)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.3rem', color: '#10b981' }}>+{recapData.summary.totalIn}</div>
              </Card>
              <Card style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Keluar (OUT)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.3rem', color: '#ef4444' }}>-{recapData.summary.totalOut}</div>
              </Card>
              <Card style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Saldo Akhir Bulan</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.3rem', color: 'var(--color-primary-light)' }}>{recapData.summary.totalClosing}</div>
              </Card>
              <Card style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Belanja Bulan Ini</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--color-success)' }}>{formatCurrency(recapData.summary.totalSpend || 0)}</div>
              </Card>
            </div>
          )}

          <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', fontWeight: 700 }}>
                    <th style={{ padding: '0.85rem 1.15rem' }}>Kode &amp; Nama Barang</th>
                    <th style={{ padding: '0.85rem 1.15rem' }}>Merek</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>Saldo Awal</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>Masuk (+)</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>Keluar (-)</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>Saldo Akhir</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right' }}>Belanja Bulan Ini</th>
                  </tr>
                </thead>
                <tbody>
                  {recapLoading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                        Menghitung rekap bulanan...
                      </td>
                    </tr>
                  ) : recapData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                        Belum ada data barang habis pakai.
                      </td>
                    </tr>
                  ) : (
                    recapData.rows.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.9rem 1.15rem' }}>
                          <div style={{ fontWeight: 700 }}>{r.name}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-primary-light)' }}>
                            {r.code} &bull; {r.unit}
                          </div>
                        </td>
                        <td style={{ padding: '0.9rem 1.15rem' }}>{r.brand || '-'}</td>
                        <td style={{ padding: '0.9rem 1.15rem', textAlign: 'right', fontWeight: 600 }}>{r.openingStock} {r.unit}</td>
                        <td style={{ padding: '0.9rem 1.15rem', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>+{r.inQty}</td>
                        <td style={{ padding: '0.9rem 1.15rem', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>-{r.outQty}</td>
                        <td style={{ padding: '0.9rem 1.15rem', textAlign: 'right', fontWeight: 800, color: 'var(--color-primary-light)' }}>{r.closingStock} {r.unit}</td>
                        <td style={{ padding: '0.9rem 1.15rem', textAlign: 'right', fontWeight: 600 }}>{r.spendMonth > 0 ? formatCurrency(r.spendMonth) : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Modal: Tambah / Edit Barang ATK */}
      {itemModalOpen && (
        <Modal
          isOpen={itemModalOpen}
          onClose={() => setItemModalOpen(false)}
          title={editingItem ? `Edit Barang ATK: ${editingItem.name}` : 'Tambah Barang Habis Pakai (ATK) Baru'}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Kode Barang
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
                  placeholder="Misal: Spidol Whiteboard Hitam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Merek Barang
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Misal: Snowman, PaperOne, Epson, Joyko..."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {(exactDuplicateItem || similarItems.length > 0) && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: exactDuplicateItem ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: `1px solid ${exactDuplicateItem ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 800, color: exactDuplicateItem ? '#ef4444' : '#f59e0b', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertTriangle size={15} />
                  {exactDuplicateItem
                    ? 'Duplikasi Nama Barang Terdeteksi (Diblokir)'
                    : 'Barang dengan Nama Serupa Sudah Terdaftar'}
                </div>
                {exactDuplicateItem ? (
                  <div>
                    Item <strong>{exactDuplicateItem.code} — {exactDuplicateItem.name}</strong>
                    {exactDuplicateItem.brand ? ` (${exactDuplicateItem.brand})` : ''} sudah ada dengan stok{' '}
                    <strong>{exactDuplicateItem.stock} {exactDuplicateItem.unit}</strong>. Untuk menambah stok fisik, gunakan mutasi <strong>Masuk</strong>.
                    <div style={{ marginTop: '0.5rem' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setItemModalOpen(false);
                          openTransactionModal(exactDuplicateItem, 'IN');
                        }}
                      >
                        <ArrowDownRight size={14} /> Tambah Stok via Mutasi Masuk
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    Item serupa ditemukan:{' '}
                    {similarItems.slice(0, 3).map((s) => `${s.code} (${s.name}: ${s.stock} ${s.unit})`).join(', ')}.
                    <div style={{ marginTop: '0.45rem' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setItemModalOpen(false);
                          openTransactionModal(similarItems[0], 'IN');
                        }}
                      >
                        <ArrowDownRight size={14} /> Tambah Stok ke {similarItems[0].code}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                  <option value="">-- Umum / Lainnya --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Satuan *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Pcs, Rim, Box, Botol..."
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: editingItem ? '1fr 1fr' : '1fr 1fr 1fr', gap: '1rem' }}>
              {!editingItem && (
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
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Batas Minimum
                </label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Harga Satuan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  placeholder="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
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
              <Button variant="secondary" onClick={() => setItemModalOpen(false)} disabled={savingItem}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleSaveItem} loading={savingItem}>
                {editingItem ? 'Simpan Perubahan' : 'Simpan Item ATK'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Transaksi Mutasi Stok (IN / OUT) */}
      {transModalOpen && (
        <Modal
          isOpen={transModalOpen}
          onClose={() => setTransModalOpen(false)}
          title={
            transType === 'IN'
              ? 'Catat Barang Masuk / Restock ATK'
              : 'Catat Pengeluaran / Distribusi ATK'
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Pilih Barang ATK *
                </label>
                <select
                  className="input-field"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {consumables.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name} (Stok: {c.stock} {c.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Tipe Mutasi *
                </label>
                <select
                  className="input-field"
                  value={transType}
                  onChange={(e) => setTransType(e.target.value as 'IN' | 'OUT')}
                  style={{ width: '100%' }}
                >
                  <option value="IN">MASUK (Restock)</option>
                  <option value="OUT">KELUAR (Distribusi)</option>
                </select>
              </div>
            </div>

            {selectedItem && (
              <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                Stok Saat Ini: <strong>{selectedItem.stock} {selectedItem.unit}</strong> &bull; Batas Minimum: <strong>{selectedItem.minimumStock} {selectedItem.unit}</strong>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Tanggal &amp; Waktu {transType === 'IN' ? 'Masuk' : 'Keluar'} *
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={transDate}
                  onChange={(e) => setTransDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Merek Barang
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Misal: Snowman, PaperOne..."
                  value={transBrand}
                  onChange={(e) => setTransBrand(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Jumlah {transType === 'IN' ? 'Barang Masuk' : 'Barang Keluar'} ({selectedItem?.unit || 'Unit'}) *
              </label>
              <input
                type="number"
                min="1"
                max={transType === 'OUT' && selectedItem ? selectedItem.stock : undefined}
                className="input-field"
                value={transQuantity}
                onChange={(e) => {
                  const qVal = e.target.value;
                  setTransQuantity(qVal);
                  if (transType === 'IN' && transUnitCost) {
                    const tot = (parseFloat(transUnitCost) || 0) * (parseInt(qVal) || 0);
                    setTransTotalCost(tot > 0 ? String(tot) : '');
                  }
                }}
                style={{ width: '100%' }}
              />
            </div>

            {transType === 'IN' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      Harga Beli Satuan (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      placeholder="Contoh: 45000"
                      value={transUnitCost}
                      onChange={(e) => {
                        const uc = e.target.value;
                        setTransUnitCost(uc);
                        const tot = (parseFloat(uc) || 0) * (parseInt(transQuantity) || 0);
                        setTransTotalCost(tot > 0 ? String(tot) : '');
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      Total Harga Beli (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      placeholder="Otomatis / sesuaikan"
                      value={transTotalCost}
                      onChange={(e) => setTransTotalCost(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      Nama Supplier / Toko
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Misal: Toko ATK Jaya"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      No. Nota / Faktur
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Misal: INV-2026-001"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Bukti Pembelian / Nota (Foto atau PDF)
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                      <Upload size={14} /> {uploadingReceipt ? 'Mengunggah...' : 'Unggah Bukti Nota'}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleUploadReceipt}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {receiptUrl && (
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Receipt size={14} /> Bukti terunggah (Lihat) <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}

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

      {/* Modal: Import Massal ATK (Excel / CSV) */}
      {importModalOpen && (
        <Modal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          title="Import Data Barang Habis Pakai (ATK)"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.85rem 1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', lineHeight: 1.5 }}>
              Unggah file <strong>Excel (.xlsx / .xls)</strong> atau <strong>CSV</strong> untuk mendaftarkan banyak item ATK sekaligus beserta merek, stok masuk awal, harga beli, dan nama toko.
              <div style={{ marginTop: '0.6rem' }}>
                <Button variant="secondary" size="sm" onClick={handleDownloadImportTemplate}>
                  <Download size={14} /> Download Template Excel (.xlsx)
                </Button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Pilih File Excel / CSV *
                </label>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                  <Upload size={14} /> {importFileName || 'Pilih File (.xlsx / .csv)'}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleParseImportFile}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Jika Kode/Barang Sudah Ada
                </label>
                <select
                  className="input-field"
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as 'skip' | 'restock')}
                  style={{ width: '100%' }}
                >
                  <option value="restock">Tambahkan ke Stok (Restock IN)</option>
                  <option value="skip">Lewati (Jangan Ubah)</option>
                </select>
              </div>
            </div>

            {importRows.length > 0 && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ padding: '0.55rem 0.85rem', background: 'var(--color-surface2)', fontSize: '0.8rem', fontWeight: 700 }}>
                  Pratinjau Data ({importRows.length} baris siap diimpor)
                </div>
                <div style={{ maxHeight: '220px', overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                        <th style={{ padding: '0.45rem 0.65rem' }}>Kode</th>
                        <th style={{ padding: '0.45rem 0.65rem' }}>Nama Barang</th>
                        <th style={{ padding: '0.45rem 0.65rem' }}>Merek</th>
                        <th style={{ padding: '0.45rem 0.65rem' }}>Stok</th>
                        <th style={{ padding: '0.45rem 0.65rem' }}>Harga</th>
                        <th style={{ padding: '0.45rem 0.65rem' }}>Toko</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 15).map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.4rem 0.65rem', fontFamily: 'monospace' }}>{r.code || 'AUTO'}</td>
                          <td style={{ padding: '0.4rem 0.65rem', fontWeight: 600 }}>{r.name || '-'}</td>
                          <td style={{ padding: '0.4rem 0.65rem' }}>{r.brand || '-'}</td>
                          <td style={{ padding: '0.4rem 0.65rem' }}>{r.stock} {r.unit}</td>
                          <td style={{ padding: '0.4rem 0.65rem' }}>{r.unitCost ? formatCurrency(Number(r.unitCost)) : '-'}</td>
                          <td style={{ padding: '0.4rem 0.65rem' }}>{r.supplierName || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setImportModalOpen(false)} disabled={importing}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleExecuteImport} loading={importing} disabled={importRows.length === 0}>
                <FileSpreadsheet size={16} /> Proses Import ({importRows.length})
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

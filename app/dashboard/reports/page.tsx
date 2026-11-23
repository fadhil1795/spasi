'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Printer,
  Receipt,
  Box,
  Download,
  CreditCard,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  Filter,
  RefreshCw,
  Package,
  GraduationCap,
  Layers,
  ShieldCheck,
  DollarSign,
  ArrowRightLeft,
  Wrench,
  QrCode,
  FileSpreadsheet,
} from 'lucide-react';

// ─── Helper ──────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const currentYearNow = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYearNow - i);

type ReportMainMode = 'INVENTORY' | 'FINANCE';
type InventorySubTab = 'UNIT' | 'CATEGORY' | 'CONDITION' | 'VALUATION' | 'MUTATION' | 'DAMAGE' | 'AUDIT';

const INVENTORY_SUB_TABS: { id: InventorySubTab; label: string; icon: any }[] = [
  { id: 'UNIT', label: '1. Aset per Unit', icon: GraduationCap },
  { id: 'CATEGORY', label: '2. Aset per Kategori', icon: Layers },
  { id: 'CONDITION', label: '3. Kondisi Aset', icon: ShieldCheck },
  { id: 'VALUATION', label: '4. Nilai Perolehan', icon: DollarSign },
  { id: 'MUTATION', label: '5. Laporan Mutasi', icon: ArrowRightLeft },
  { id: 'DAMAGE', label: '6. Laporan Kerusakan', icon: Wrench },
  { id: 'AUDIT', label: '7. Hasil Audit Opname', icon: QrCode },
];

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  const map: Record<string, { label: string; color: string; bg: string }> = {
    PAID: { label: 'LUNAS', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    CONFIRMED: { label: 'CONFIRMED', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    COMPLETED: { label: 'SELESAI', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    COMPLETED_WITH_CLAIM: { label: 'SELESAI', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    APPROVED: { label: 'DISETUJUI', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    AVAILABLE: { label: 'TERSEDIA', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    UNPAID: { label: 'BELUM BAYAR', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    PENDING: { label: 'PENDING', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    ONGOING: { label: 'DIKERJAKAN', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    IN_PROGRESS: { label: 'BERJALAN', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    DOWN_PAYMENT: { label: 'DP', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    CANCELLED: { label: 'BATAL', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    REJECTED: { label: 'DITOLAK', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    DAMAGED: { label: 'RUSAK', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    MAINTENANCE: { label: 'SERVIS', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    ACTIVE: { label: 'AKTIF', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  };
  const cfg = map[s] || { label: s || '-', color: 'var(--color-muted)', bg: 'var(--color-surface2)' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.2rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        color: cfg.color,
        background: cfg.bg,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color, borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>{label}</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.15, wordBreak: 'break-word' }}>{value}</div>
          {sub && <div style={{ fontSize: '0.74rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────
function BarChart({ data, activeMonth }: { data: number[]; activeMonth: number | null }) {
  const maxVal = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
      {data.map((val, idx) => {
        const heightPct = Math.max((val / maxVal) * 100, 4);
        const isActive = activeMonth !== null && activeMonth - 1 === idx;
        const isCurrentMonth = activeMonth === null && idx === new Date().getMonth();
        const highlight = isActive || isCurrentMonth;
        return (
          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: highlight ? 'var(--color-primary)' : 'var(--color-muted)', whiteSpace: 'nowrap' }}>
              {val > 0 ? (val >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}jt` : `${(val / 1000).toFixed(0)}k`) : '-'}
            </span>
            <div
              style={{
                width: '100%',
                maxWidth: '32px',
                height: `${heightPct}%`,
                background: highlight ? 'var(--grad-primary)' : val > 0 ? 'rgba(228,37,44,0.35)' : 'var(--color-surface2)',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                transition: 'all 0.35s ease',
              }}
            />
            <span style={{ fontSize: '0.7rem', fontWeight: highlight ? 700 : 500, color: highlight ? 'var(--color-primary)' : 'var(--color-muted)' }}>
              {MONTH_NAMES[idx]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [mainMode, setMainMode] = useState<ReportMainMode>('INVENTORY');
  const [invSubTab, setInvSubTab] = useState<InventorySubTab>('UNIT');

  // Inventory Report State
  const [invData, setInvData] = useState<any>(null);
  const [invLoading, setInvLoading] = useState(true);
  const [invDeptFilter, setInvDeptFilter] = useState('ALL');
  const [invCatFilter, setInvCatFilter] = useState('ALL');
  const [invCondFilter, setInvCondFilter] = useState('ALL');

  // Finance Report State
  const [tableTab, setTableTab] = useState<'ROOM' | 'ASSET' | 'CONSUMABLE'>('ROOM');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(currentYearNow);
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterType, setFilterType] = useState('ALL');
  const [applied, setApplied] = useState({ year: currentYearNow, month: 0, type: 'ALL' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get('tab');
      const subParam = sp.get('sub') as InventorySubTab | null;
      if (tabParam === 'FINANCE') setMainMode('FINANCE');
      else if (tabParam === 'INVENTORY') setMainMode('INVENTORY');
      if (subParam && INVENTORY_SUB_TABS.some((t) => t.id === subParam)) {
        setInvSubTab(subParam);
      }
    }
  }, []);

  const fetchInventoryReports = useCallback(async () => {
    try {
      setInvLoading(true);
      const params = new URLSearchParams({
        departmentId: invDeptFilter,
        categoryId: invCatFilter,
        condition: invCondFilter,
      });
      const res = await fetch(`/api/reports/inventory?${params.toString()}`);
      if (res.ok) setInvData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setInvLoading(false);
    }
  }, [invDeptFilter, invCatFilter, invCondFilter]);

  useEffect(() => {
    fetchInventoryReports();
  }, [fetchInventoryReports]);

  const buildUrl = (params: { year: number; month: number; type: string }, extra = '') =>
    `/api/reports/analytics?year=${params.year}&month=${params.month || ''}&type=${params.type}${extra}`;

  const fetchData = useCallback(async (params: typeof applied) => {
    try {
      setLoading(true);
      const res = await fetch(buildUrl(params));
      if (res.ok) setAnalyticsData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(applied);
  }, [applied, fetchData]);

  const handleApply = () => {
    setApplied({ year: filterYear, month: filterMonth, type: filterType });
  };

  const handleReset = () => {
    const def = { year: currentYearNow, month: 0, type: 'ALL' };
    setFilterYear(def.year);
    setFilterMonth(def.month);
    setFilterType(def.type);
    setApplied(def);
  };

  const handleExportCSV = () => {
    window.open(buildUrl(applied, '&format=csv'), '_blank');
  };

  const handleExportInventoryExcel = () => {
    if (!invData) return;
    let rows: any[] = [];
    let sheetName = 'Laporan';

    if (invSubTab === 'UNIT') {
      sheetName = 'Aset_Per_Unit';
      rows = (invData.unitReport || []).map((u: any, idx: number) => ({
        No: idx + 1,
        'Kode Unit': u.code,
        'Nama Unit / Fakultas': u.name,
        'Kepala Unit / PIC': u.headName || '-',
        'Jumlah Jenis Aset': u.assetTypesCount,
        'Total Unit Fisik': u.totalUnitsQty,
        'Kondisi Baik': u.baikCount,
        'Rusak Ringan': u.rusakRinganCount,
        'Rusak Berat': u.rusakBeratCount,
        'Total Nilai Perolehan (Rp)': u.totalAcquisitionValue,
        'Total Nilai Buku (Rp)': u.totalBookValue,
      }));
    } else if (invSubTab === 'CATEGORY') {
      sheetName = 'Aset_Per_Klasifikasi';
      rows = (invData.categoryReport || []).map((c: any, idx: number) => ({
        No: idx + 1,
        'Kode Klasifikasi': c.code,
        'Klasifikasi Utama': c.parentName,
        'Nama Klasifikasi / Subkategori': c.name,
        'Jumlah Jenis Aset': c.assetTypesCount,
        'Total Unit Fisik': c.totalUnitsQty,
        'Aktif / Siap Pakai': c.activeCount || 0,
        'Dipinjam / Disewa': c.borrowedOrRentedCount || 0,
        'Sedang Maintenance': c.maintenanceCount || 0,
        'Kondisi Baik': c.baikCount || 0,
        'Rusak Ringan': c.rusakRinganCount || 0,
        'Rusak Berat': c.rusakBeratCount || 0,
        'Dihapuskan / Disposed': c.disposedCount || 0,
        'Nilai Perolehan (Rp)': c.totalAcquisitionValue,
        'Nilai Buku (Rp)': c.totalBookValue,
      }));
    } else if (invSubTab === 'CONDITION') {
      sheetName = 'Kondisi_Aset';
      rows = (invData.assets || []).map((a: any, idx: number) => ({
        No: idx + 1,
        'Kode Aset': a.code,
        'Nama Aset': a.name,
        Kategori: a.category?.name || '-',
        'Unit / Fakultas': a.department?.name || 'Inventaris Pusat',
        'Ruangan / Lokasi': a.location ? `${a.location.name || a.location.building} (${a.location.room || '-'})` : 'Gudang',
        'Kondisi Fisik': a.condition || 'Baik',
        'Status Operasional': a.status,
        'Kuantitas Unit': a.quantity || 1,
      }));
    } else if (invSubTab === 'VALUATION') {
      sheetName = 'Nilai_Perolehan_Aset';
      rows = (invData.assets || []).map((a: any, idx: number) => {
        const qty = a.quantity || 1;
        const acq = (a.purchaseCost || 0) * qty;
        const book = (a.currentValue ?? a.purchaseCost ?? 0) * qty;
        return {
          No: idx + 1,
          'Kode Aset': a.code,
          'Nama Aset': a.name,
          Kategori: a.category?.name || '-',
          'Unit / Fakultas': a.department?.name || 'Inventaris Pusat',
          'Tanggal Perolehan': a.purchaseDate ? formatDate(a.purchaseDate, 'dd/MM/yyyy') : '-',
          Kuantitas: qty,
          'Harga Satuan (Rp)': a.purchaseCost || 0,
          'Total Nilai Perolehan (Rp)': acq,
          'Akumulasi Penyusutan (Rp)': Math.max(0, acq - book),
          'Nilai Buku Saat Ini (Rp)': book,
        };
      });
    } else if (invSubTab === 'MUTATION') {
      sheetName = 'Laporan_Mutasi_Aset';
      rows = (invData.mutationReport || []).map((m: any, idx: number) => ({
        No: idx + 1,
        'No. Mutasi': m.transferNumber || m.id.slice(-6).toUpperCase(),
        'Tanggal Mutasi': formatDate(m.transferredAt, 'dd/MM/yyyy HH:mm'),
        'Kode Aset': m.asset?.code || '-',
        'Nama Aset': m.asset?.name || '-',
        'Ruangan Asal': m.fromLocation || '-',
        'Ruangan Tujuan': m.toLocation || '-',
        'Unit Asal': m.fromDepartment || '-',
        'Unit Tujuan': m.toDepartment || '-',
        'PIC Lama': m.fromPicName || '-',
        'PIC Baru': m.toPicName || '-',
        Status: m.status || 'APPROVED',
        'Diajukan Oleh': m.transferredBy,
        'Disetujui Oleh': m.approvedBy || '-',
        Alasan: m.reason || '-',
      }));
    } else if (invSubTab === 'DAMAGE') {
      sheetName = 'Laporan_Kerusakan';
      rows = (invData.damageReport?.maintenances || []).map((m: any, idx: number) => ({
        No: idx + 1,
        Tanggal: formatDate(m.startDate, 'dd/MM/yyyy'),
        'Kode Aset': m.asset?.code || '-',
        'Nama Aset / Ruangan': m.asset?.name || m.location?.name || '-',
        Tipe: m.type,
        'Deskripsi Kerusakan / Perbaikan': m.description,
        'Vendor / Teknisi': m.vendor || '-',
        'Biaya Perbaikan (Rp)': m.cost || 0,
        Status: m.status,
      }));
    } else if (invSubTab === 'AUDIT') {
      sheetName = 'Hasil_Audit_Opname';
      rows = (invData.auditReport?.sessions || []).map((s: any, idx: number) => ({
        No: idx + 1,
        'Nomor Sesi': s.sessionNumber,
        'Judul Audit': s.title,
        'Ruangan / Gedung': s.location ? `${s.location.name || s.location.building}` : '-',
        Auditor: s.auditor?.name || '-',
        Tanggal: formatDate(s.startDate, 'dd/MM/yyyy'),
        'Target Aset': s.totalExpected || 0,
        'Ter-Scan': s.totalScanned || 0,
        'Sesuai (Match)': s.totalMatch || 0,
        'Salah Lokasi': s.totalWrongLoc || 0,
        'Tidak Ditemukan (Missing)': s.totalMissing || 0,
        Status: s.status,
      }));
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `SPASI_${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrint = () => window.print();

  const s = analyticsData?.summary || {};
  const roomBookings: any[] = analyticsData?.roomBookings || [];
  const assetRentals: any[] = analyticsData?.assetRentals || [];

  const selectStyle: React.CSSProperties = {
    padding: '0.55rem 0.9rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface2)',
    color: 'var(--color-text)',
    fontSize: '0.86rem',
    fontWeight: 500,
    outline: 'none',
    cursor: 'pointer',
  };

  const activeSubLabel = INVENTORY_SUB_TABS.find((t) => t.id === invSubTab)?.label || 'Laporan Inventaris';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Pusat Laporan Inventaris, Audit &amp; Keuangan</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Laporan aset per unit, per kategori, kondisi fisik, nilai perolehan, histori mutasi, kerusakan, hasil audit opname, dan rekap keuangan.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {mainMode === 'INVENTORY' ? (
            <Button variant="secondary" onClick={handleExportInventoryExcel}>
              <FileSpreadsheet size={16} /> Ekspor Excel (.xlsx)
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleExportCSV}>
              <Download size={16} /> Ekspor CSV
            </Button>
          )}
          <Button variant="primary" onClick={handlePrint}>
            <Printer size={16} /> Cetak PDF / Print
          </Button>
        </div>
      </div>

      {/* ── Main Mode Switcher (Inventaris 7 Laporan vs Keuangan) ──────────── */}
      <div className="no-print" style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setMainMode('INVENTORY')}
          style={{
            padding: '0.7rem 1.35rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: mainMode === 'INVENTORY' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
            background: mainMode === 'INVENTORY' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: mainMode === 'INVENTORY' ? '#FFFFFF' : 'var(--color-text)',
          }}
        >
          <Box size={17} /> Laporan Inventaris &amp; Audit Aset (7 Laporan Standar)
        </button>

        <button
          type="button"
          onClick={() => setMainMode('FINANCE')}
          style={{
            padding: '0.7rem 1.35rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: mainMode === 'FINANCE' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
            background: mainMode === 'FINANCE' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: mainMode === 'FINANCE' ? '#FFFFFF' : 'var(--color-text)',
          }}
        >
          <Receipt size={17} /> Rekap Keuangan &amp; Penyewaan Sarpras
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MODE 1: 7 LAPORAN INVENTARIS & AUDIT ASET
          ════════════════════════════════════════════════════════════════════════ */}
      {mainMode === 'INVENTORY' && (
        <>
          {/* 7 Sub-Report Tabs */}
          <Card className="no-print" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {INVENTORY_SUB_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = invSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setInvSubTab(tab.id)}
                    style={{
                      padding: '0.55rem 0.95rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      border: active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: active ? 'rgba(228, 37, 44, 0.14)' : 'var(--color-surface2)',
                      color: active ? 'var(--color-primary)' : 'var(--color-text)',
                    }}
                  >
                    <Icon size={15} /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Filter Bar for Inventory Reports */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--color-border)' }}>
              <div>
                <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Filter Unit / Fakultas</div>
                <select value={invDeptFilter} onChange={(e) => setInvDeptFilter(e.target.value)} style={selectStyle}>
                  <option value="ALL">Semua Unit / Fakultas</option>
                  <option value="CENTRAL">Inventaris Umum / Pusat</option>
                  {(invData?.departments || []).map((d: any) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Filter Kategori</div>
                <select value={invCatFilter} onChange={(e) => setInvCatFilter(e.target.value)} style={selectStyle}>
                  <option value="ALL">Semua Kategori Aset</option>
                  {(invData?.categories || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.parent ? `${c.parent.name} › ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Filter Kondisi Fisik</div>
                <select value={invCondFilter} onChange={(e) => setInvCondFilter(e.target.value)} style={selectStyle}>
                  <option value="ALL">Semua Kondisi</option>
                  <option value="Baik">Baik</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                  <option value="Rusak Berat">Rusak Berat</option>
                </select>
              </div>

              <Button
                variant="secondary"
                onClick={() => {
                  setInvDeptFilter('ALL');
                  setInvCatFilter('ALL');
                  setInvCondFilter('ALL');
                }}
              >
                <RefreshCw size={14} /> Reset Filter
              </Button>
            </div>
          </Card>

          {/* Printable Header for PDF / Print */}
          <div className="print-only" style={{ display: 'none', textAlign: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #000', paddingBottom: '0.85rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
              SISTEM INFORMASI MANAJEMEN SARANA &amp; PRASARANA (SPASI)
            </h2>
            <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.2rem' }}>{activeSubLabel.toUpperCase()}</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>

          {invLoading ? (
            <Skeleton height="320px" />
          ) : (
            <>
              {/* 1. LAPORAN ASET PER UNIT */}
              {invSubTab === 'UNIT' && (
                <Card style={{ padding: '1.5rem' }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>1. Laporan Rekapitulasi Aset per Unit / Fakultas</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                      Distribusi jumlah jenis aset, total kuantitas fisik, rincian kondisi, serta nilai perolehan &amp; nilai buku di setiap unit/fakultas.
                    </p>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--color-surface2)' }}>
                          {['Kode Unit', 'Nama Unit / Prodi / Fakultas', 'Kepala Unit / PIC', 'Jenis Aset', 'Total Unit Fisik', 'Baik', 'Rusak Ringan', 'Rusak Berat', 'Nilai Perolehan', 'Nilai Buku'].map((h) => (
                            <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, borderBottom: '1.5px solid var(--color-border)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(invData?.unitReport || []).map((u: any) => (
                          <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary)' }}>{u.code}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700 }}>{u.name}</td>
                            <td style={{ padding: '0.75rem' }}>{u.headName || '-'}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700 }}>{u.assetTypesCount}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 800 }}>{u.totalUnitsQty} Unit</td>
                            <td style={{ padding: '0.75rem', color: '#10b981', fontWeight: 700 }}>{u.baikCount}</td>
                            <td style={{ padding: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>{u.rusakRinganCount}</td>
                            <td style={{ padding: '0.75rem', color: '#ef4444', fontWeight: 700 }}>{u.rusakBeratCount}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700 }}>{formatCurrency(u.totalAcquisitionValue)}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700, color: '#10b981' }}>{formatCurrency(u.totalBookValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* 2. LAPORAN ASET PER KATEGORI / KLASIFIKASI */}
              {invSubTab === 'CATEGORY' && (
                <Card style={{ padding: '1.5rem' }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>2. Laporan Rekapitulasi Aset per Klasifikasi (Kategori &amp; Subkategori)</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                      Pengelompokan inventaris berdasarkan klasifikasi kategori, jumlah aktif/siap pakai, dipinjam/disewa, sedang maintenance, kondisi fisik, dan nilai aset.
                    </p>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--color-surface2)' }}>
                          {['Kode', 'Klasifikasi Induk', 'Nama Klasifikasi / Subkategori', 'Jenis Aset', 'Total Unit', 'Aktif / Siap', 'Dipinjam / Sewa', 'Maintenance', 'Baik', 'Rusak Ringan', 'Rusak Berat', 'Disposed', 'Nilai Perolehan', 'Nilai Buku'].map((h) => (
                            <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, borderBottom: '1.5px solid var(--color-border)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(invData?.categoryReport || []).map((c: any) => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary)' }}>{c.code}</td>
                            <td style={{ padding: '0.75rem', color: 'var(--color-muted)' }}>{c.parentName}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700 }}>{c.name}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700 }}>{c.assetTypesCount}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 800 }}>{c.totalUnitsQty}</td>
                            <td style={{ padding: '0.75rem', color: '#10b981', fontWeight: 800 }}>{c.activeCount || 0}</td>
                            <td style={{ padding: '0.75rem', color: '#3b82f6', fontWeight: 700 }}>{c.borrowedOrRentedCount || 0}</td>
                            <td style={{ padding: '0.75rem', color: '#f59e0b', fontWeight: 800 }}>{c.maintenanceCount || 0}</td>
                            <td style={{ padding: '0.75rem', color: '#10b981', fontWeight: 700 }}>{c.baikCount}</td>
                            <td style={{ padding: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>{c.rusakRinganCount || 0}</td>
                            <td style={{ padding: '0.75rem', color: '#ef4444', fontWeight: 800 }}>{c.rusakBeratCount || 0}</td>
                            <td style={{ padding: '0.75rem', color: '#6b7280', fontWeight: 700 }}>{c.disposedCount || 0}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700 }}>{formatCurrency(c.totalAcquisitionValue)}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700, color: '#10b981' }}>{formatCurrency(c.totalBookValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* 3. LAPORAN KONDISI ASET */}
              {invSubTab === 'CONDITION' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                    <KPICard
                      icon={<CheckCircle size={18} />}
                      label="Kondisi Baik"
                      value={`${invData?.conditionSummary?.baik?.count || 0} Aset`}
                      sub={`${invData?.conditionSummary?.baik?.qty || 0} Unit • ${formatCurrency(invData?.conditionSummary?.baik?.value || 0)}`}
                      color="#10b981"
                    />
                    <KPICard
                      icon={<Clock size={18} />}
                      label="Rusak Ringan"
                      value={`${invData?.conditionSummary?.rusakRingan?.count || 0} Aset`}
                      sub={`${invData?.conditionSummary?.rusakRingan?.qty || 0} Unit • ${formatCurrency(invData?.conditionSummary?.rusakRingan?.value || 0)}`}
                      color="#f59e0b"
                    />
                    <KPICard
                      icon={<XCircle size={18} />}
                      label="Rusak Berat"
                      value={`${invData?.conditionSummary?.rusakBerat?.count || 0} Aset`}
                      sub={`${invData?.conditionSummary?.rusakBerat?.qty || 0} Unit • ${formatCurrency(invData?.conditionSummary?.rusakBerat?.value || 0)}`}
                      color="#ef4444"
                    />
                    <KPICard
                      icon={<Box size={18} />}
                      label="Dihapuskan (Disposed)"
                      value={`${invData?.conditionSummary?.disposed?.count || 0} Aset`}
                      sub={`${invData?.conditionSummary?.disposed?.qty || 0} Unit`}
                      color="#6b7280"
                    />
                  </div>

                  <Card style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>3. Daftar Rincian Kondisi Fisik &amp; Status Operasional Aset</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--color-surface2)' }}>
                            {['Kode Aset', 'Nama Barang', 'Kategori', 'Unit / Fakultas', 'Lokasi Ruangan', 'Kuantitas', 'Kondisi Fisik', 'Status'].map((h) => (
                              <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, borderBottom: '1.5px solid var(--color-border)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(invData?.assets || []).map((a: any) => {
                            const cond = a.condition || 'Baik';
                            const condColor = cond === 'Rusak Berat' ? '#ef4444' : cond === 'Rusak Ringan' ? '#f59e0b' : '#10b981';
                            return (
                              <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 800 }}>{a.code}</td>
                                <td style={{ padding: '0.75rem', fontWeight: 700 }}>{a.name}</td>
                                <td style={{ padding: '0.75rem' }}>{a.category?.name || '-'}</td>
                                <td style={{ padding: '0.75rem' }}>{a.department?.name || 'Inventaris Pusat'}</td>
                                <td style={{ padding: '0.75rem' }}>{a.location ? `${a.location.name || a.location.building} (${a.location.room || '-'})` : 'Gudang'}</td>
                                <td style={{ padding: '0.75rem', fontWeight: 700 }}>{a.quantity || 1} Unit</td>
                                <td style={{ padding: '0.75rem', fontWeight: 800, color: condColor }}>{cond}</td>
                                <td style={{ padding: '0.75rem' }}><StatusBadge status={a.status} /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* 4. LAPORAN NILAI PEROLEHAN */}
              {invSubTab === 'VALUATION' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <KPICard
                      icon={<DollarSign size={18} />}
                      label="Total Nilai Perolehan"
                      value={formatCurrency(invData?.valuationSummary?.totalAcquisitionValue || 0)}
                      sub={`${invData?.valuationSummary?.totalAssetsCount || 0} Jenis Aset`}
                      color="#3b82f6"
                    />
                    <KPICard
                      icon={<TrendingUp size={18} />}
                      label="Total Nilai Buku Saat Ini"
                      value={formatCurrency(invData?.valuationSummary?.totalBookValue || 0)}
                      sub="Nilai aset setelah depresiasi"
                      color="#10b981"
                    />
                    <KPICard
                      icon={<Clock size={18} />}
                      label="Akumulasi Penyusutan"
                      value={formatCurrency(invData?.valuationSummary?.totalAccumulatedDepreciation || 0)}
                      sub={`Depresiasi/Bulan: ${formatCurrency(invData?.valuationSummary?.totalMonthlyDepreciation || 0)}`}
                      color="#f59e0b"
                    />
                  </div>

                  <Card style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>4. Laporan Nilai Perolehan, Penyusutan &amp; Nilai Buku Aset</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--color-surface2)' }}>
                            {['Kode Aset', 'Nama Aset', 'Unit / Fakultas', 'Tgl Perolehan', 'Qty', 'Harga Satuan', 'Total Perolehan', 'Akumulasi Penyusutan', 'Nilai Buku Saat Ini'].map((h) => (
                              <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, borderBottom: '1.5px solid var(--color-border)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(invData?.assets || []).map((a: any) => {
                            const qty = a.quantity || 1;
                            const acq = (a.purchaseCost || 0) * qty;
                            const book = (a.currentValue ?? a.purchaseCost ?? 0) * qty;
                            const dep = Math.max(0, acq - book);
                            return (
                              <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 800 }}>{a.code}</td>
                                <td style={{ padding: '0.75rem', fontWeight: 700 }}>{a.name}</td>
                                <td style={{ padding: '0.75rem' }}>{a.department?.name || 'Inventaris Pusat'}</td>
                                <td style={{ padding: '0.75rem' }}>{a.purchaseDate ? formatDate(a.purchaseDate, 'dd MMM yyyy') : '-'}</td>
                                <td style={{ padding: '0.75rem', fontWeight: 700 }}>{qty}</td>
                                <td style={{ padding: '0.75rem' }}>{formatCurrency(a.purchaseCost || 0)}</td>
                                <td style={{ padding: '0.75rem', fontWeight: 700 }}>{formatCurrency(acq)}</td>
                                <td style={{ padding: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>{formatCurrency(dep)}</td>
                                <td style={{ padding: '0.75rem', fontWeight: 800, color: '#10b981' }}>{formatCurrency(book)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* 5. LAPORAN MUTASI ASET */}
              {invSubTab === 'MUTATION' && (
                <Card style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>5. Laporan Riwayat Mutasi &amp; Pemindahan Aset</h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                        Rekapitulasi perpindahan aset antar-ruangan, antar-unit/fakultas, perubahan penanggung jawab (PIC), dan status persetujuan.
                      </p>
                    </div>
                    <Link href="/dashboard/transfers" className="btn btn-secondary btn-sm no-print">
                      Kelola Mutasi Aset →
                    </Link>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--color-surface2)' }}>
                          {['No. Mutasi', 'Tanggal', 'Kode & Nama Aset', 'Ruangan Asal ➔ Tujuan', 'Unit Asal ➔ Tujuan', 'PIC Lama ➔ Baru', 'Status', 'Petugas / Approver'].map((h) => (
                            <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, borderBottom: '1.5px solid var(--color-border)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(invData?.mutationReport || []).length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                              Belum ada riwayat mutasi aset.
                            </td>
                          </tr>
                        ) : (
                          (invData?.mutationReport || []).map((m: any) => (
                            <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary)' }}>
                                {m.transferNumber || `MUT-${m.id.slice(-6).toUpperCase()}`}
                              </td>
                              <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{formatDate(m.transferredAt, 'dd MMM yyyy HH:mm')}</td>
                              <td style={{ padding: '0.75rem' }}>
                                <div style={{ fontWeight: 700 }}>{m.asset?.name || '-'}</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-muted)' }}>{m.asset?.code}</div>
                              </td>
                              <td style={{ padding: '0.75rem' }}>
                                {m.fromLocation || 'Gudang'} ➔ <strong>{m.toLocation}</strong>
                              </td>
                              <td style={{ padding: '0.75rem' }}>
                                {m.fromDepartment || 'Pusat'} ➔ <strong>{m.toDepartment || 'Pusat'}</strong>
                              </td>
                              <td style={{ padding: '0.75rem' }}>
                                {m.fromPicName || '-'} ➔ <strong>{m.toPicName || '-'}</strong>
                              </td>
                              <td style={{ padding: '0.75rem' }}><StatusBadge status={m.status || 'APPROVED'} /></td>
                              <td style={{ padding: '0.75rem', fontSize: '0.78rem' }}>
                                <div>Pengaju: {m.transferredBy}</div>
                                {m.approvedBy && <div style={{ color: 'var(--color-muted)' }}>Appr: {m.approvedBy}</div>}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* 6. LAPORAN KERUSAKAN & PEMELIHARAAN */}
              {invSubTab === 'DAMAGE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <KPICard
                      icon={<Wrench size={18} />}
                      label="Aset Sedang Rusak / Bermasalah"
                      value={`${invData?.damageReport?.damagedAssets?.length || 0} Aset`}
                      sub="Kondisi Rusak Ringan / Berat / Servis"
                      color="#ef4444"
                    />
                    <KPICard
                      icon={<Clock size={18} />}
                      label="Total Riwayat Perbaikan"
                      value={`${invData?.damageReport?.maintenances?.length || 0} Tiket`}
                      sub="Preventif & Korektif"
                      color="#f59e0b"
                    />
                    <KPICard
                      icon={<DollarSign size={18} />}
                      label="Total Biaya Perbaikan"
                      value={formatCurrency(invData?.damageReport?.totalMaintenanceCost || 0)}
                      sub="Akumulasi biaya pemeliharaan"
                      color="#3b82f6"
                    />
                  </div>

                  <Card style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>6. Laporan Kerusakan &amp; Riwayat Pemeliharaan Aset</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--color-surface2)' }}>
                            {['Tanggal', 'Kode & Nama Aset / Ruang', 'Tipe', 'Deskripsi Kerusakan / Tindakan', 'Vendor / Teknisi', 'Biaya Perbaikan', 'Status Pengerjaan'].map((h) => (
                              <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, borderBottom: '1.5px solid var(--color-border)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(invData?.damageReport?.maintenances || []).length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                                Belum ada catatan laporan kerusakan atau pemeliharaan.
                              </td>
                            </tr>
                          ) : (
                            (invData?.damageReport?.maintenances || []).map((m: any) => (
                              <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{formatDate(m.startDate, 'dd MMM yyyy')}</td>
                                <td style={{ padding: '0.75rem' }}>
                                  <div style={{ fontWeight: 700 }}>{m.asset?.name || m.location?.name || '-'}</div>
                                  <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-muted)' }}>{m.asset?.code || 'RUANGAN'}</div>
                                </td>
                                <td style={{ padding: '0.75rem', fontWeight: 700 }}>{m.type}</td>
                                <td style={{ padding: '0.75rem' }}>{m.description}</td>
                                <td style={{ padding: '0.75rem' }}>{m.vendor || '-'}</td>
                                <td style={{ padding: '0.75rem', fontWeight: 700 }}>{formatCurrency(m.cost || 0)}</td>
                                <td style={{ padding: '0.75rem' }}><StatusBadge status={m.status} /></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* 7. LAPORAN HASIL AUDIT / STOCK OPNAME */}
              {invSubTab === 'AUDIT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                    <KPICard
                      icon={<QrCode size={18} />}
                      label="Total Sesi Audit Opname"
                      value={invData?.auditReport?.summary?.totalSessions || 0}
                      sub={`${invData?.auditReport?.summary?.completedSessions || 0} Sesi Selesai`}
                      color="#3b82f6"
                    />
                    <KPICard
                      icon={<CheckCircle size={18} />}
                      label="Aset Sesuai (Match)"
                      value={invData?.auditReport?.summary?.totalMatch || 0}
                      sub="Fisik & lokasi ruangan sesuai"
                      color="#10b981"
                    />
                    <KPICard
                      icon={<Clock size={18} />}
                      label="Salah Ruangan (Wrong Loc)"
                      value={invData?.auditReport?.summary?.totalWrongLoc || 0}
                      sub="Ditemukan di ruangan berbeda"
                      color="#f59e0b"
                    />
                    <KPICard
                      icon={<XCircle size={18} />}
                      label="Tidak Ditemukan (Missing)"
                      value={invData?.auditReport?.summary?.totalMissing || 0}
                      sub="Selisih barang belum ditemukan"
                      color="#ef4444"
                    />
                  </div>

                  <Card style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>7. Laporan Hasil Audit Fisik / Stock Opname Ruangan</h3>
                      <Link href="/dashboard/stock-opname" className="btn btn-secondary btn-sm no-print">
                        Buka Modul Stock Opname →
                      </Link>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--color-surface2)' }}>
                            {['Nomor Sesi', 'Judul & Ruangan', 'Auditor', 'Tanggal Audit', 'Target', 'Sesuai (Match)', 'Salah Ruang', 'Tidak Ditemukan', 'Status', 'Berita Acara'].map((h) => (
                              <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, borderBottom: '1.5px solid var(--color-border)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(invData?.auditReport?.sessions || []).length === 0 ? (
                            <tr>
                              <td colSpan={10} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                                Belum ada sesi audit stock opname tercatat.
                              </td>
                            </tr>
                          ) : (
                            (invData?.auditReport?.sessions || []).map((sess: any) => (
                              <tr key={sess.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary)' }}>
                                  {sess.sessionNumber}
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                  <div style={{ fontWeight: 700 }}>{sess.title}</div>
                                  <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)' }}>
                                    {sess.location?.name || sess.location?.building || '-'}
                                  </div>
                                </td>
                                <td style={{ padding: '0.75rem' }}>{sess.auditor?.name || '-'}</td>
                                <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{formatDate(sess.startDate, 'dd MMM yyyy')}</td>
                                <td style={{ padding: '0.75rem', fontWeight: 700 }}>{sess.totalExpected || 0}</td>
                                <td style={{ padding: '0.75rem', color: '#10b981', fontWeight: 800 }}>{sess.totalMatch || 0}</td>
                                <td style={{ padding: '0.75rem', color: '#f59e0b', fontWeight: 800 }}>{sess.totalWrongLoc || 0}</td>
                                <td style={{ padding: '0.75rem', color: '#ef4444', fontWeight: 800 }}>{sess.totalMissing || 0}</td>
                                <td style={{ padding: '0.75rem' }}><StatusBadge status={sess.status} /></td>
                                <td style={{ padding: '0.75rem' }}>
                                  <Link
                                    href={`/dashboard/stock-opname/${sess.id}/report`}
                                    className="btn btn-secondary btn-sm"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                  >
                                    <Printer size={13} /> BA-SO
                                  </Link>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODE 2: REKAP KEUANGAN & PENYEWAAN SARPRAS
          ════════════════════════════════════════════════════════════════════════ */}
      {mainMode === 'FINANCE' && (
        <>
          {/* ── Filter Panel ───────────────────────────────────────────────────── */}
          <Card className="no-print" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>Tahun</div>
                <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} style={selectStyle}>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>Bulan</div>
                <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} style={selectStyle}>
                  <option value={0}>Semua Bulan</option>
                  {MONTH_FULL.map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>Jenis Transaksi</div>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selectStyle}>
                  <option value="ALL">Semua Jenis</option>
                  <option value="ROOM">Sewa Ruangan</option>
                  <option value="ASSET">Sewa Aset</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button onClick={handleApply} variant="primary">
                  <Filter size={15} /> Terapkan
                </Button>
                <Button onClick={handleReset} variant="secondary">
                  <RefreshCw size={15} /> Reset
                </Button>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--color-muted)' }}>
              Menampilkan data: <strong>Tahun {applied.year}{applied.month ? ` — ${MONTH_FULL[applied.month - 1]}` : ''}</strong>
              {applied.type !== 'ALL' && ` | Jenis: ${applied.type === 'ROOM' ? 'Sewa Ruangan' : 'Sewa Aset'}`}
            </div>
          </Card>

          {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {loading
              ? Array(6)
                  .fill(0)
                  .map((_, i) => <Skeleton key={i} style={{ height: '100px' }} />)
              : (
                <>
                  <KPICard icon={<TrendingUp size={18} />} label="Total Pendapatan" value={formatCurrency(s.totalRevenue || 0)} color="#E4252C" />
                  <KPICard icon={<Building2 size={18} />} label="Pendapatan Ruangan" value={formatCurrency(s.totalRoomRevenue || 0)} color="#3b82f6" />
                  <KPICard icon={<Box size={18} />} label="Pendapatan Aset" value={formatCurrency(s.totalAssetRevenue || 0)} color="#8b5cf6" />
                  <KPICard icon={<CheckCircle size={18} />} label="Transaksi Lunas" value={s.countPaid || 0} sub={formatCurrency(s.totalPaid || 0)} color="#10b981" />
                  <KPICard icon={<Clock size={18} />} label="Menunggu Pembayaran" value={s.countPending || 0} sub={formatCurrency(s.totalPending || 0)} color="#f59e0b" />
                  <KPICard icon={<XCircle size={18} />} label="Dibatalkan / Kadaluarsa" value={s.countCancelled || 0} color="#ef4444" />
                </>
              )}
          </div>

          {/* ── Monthly Revenue Chart ──────────────────────────────────────────── */}
          <Card style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
                  Tren Pendapatan Bulanan — {applied.year}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                  Total pendapatan yang telah terverifikasi (LUNAS) per bulan.
                </p>
              </div>
            </div>
            {loading ? <Skeleton style={{ height: '200px' }} /> : <BarChart data={analyticsData?.monthlyRevenue || Array(12).fill(0)} activeMonth={applied.month || null} />}
          </Card>

          {/* ── Payment Method Distribution ────────────────────────────────────── */}
          {!loading && Object.keys(analyticsData?.paymentMethods || {}).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: 0 }}>
                  <CreditCard size={18} style={{ color: 'var(--color-accent)' }} />
                  Distribusi Metode Pembayaran
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {Object.entries(analyticsData.paymentMethods)
                    .filter(([, v]) => (v as number) > 0)
                    .map(([pm, amount]: [string, any]) => (
                      <div key={pm} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>
                          {pm === 'QRIS' ? '📱 QRIS' : pm === 'TRANSFER' ? '🏦 Transfer Bank' : pm === 'CASH' ? '💵 Tunai' : `💳 ${pm}`}
                        </span>
                        <strong style={{ fontSize: '0.85rem' }}>{formatCurrency(amount)}</strong>
                      </div>
                    ))}
                </div>
              </Card>

              <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: 0 }}>
                  <Clock size={18} style={{ color: 'var(--color-danger)' }} />
                  Rekapitulasi Keterlambatan &amp; Sanksi
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', display: 'block', marginBottom: '0.2rem' }}>Denda Telat Pinjam</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--color-danger)' }}>{formatCurrency(s.totalLoanPenalties || 0)}</strong>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', display: 'block', marginBottom: '0.2rem' }}>Denda Overtime Ruang</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--color-danger)' }}>{formatCurrency(s.totalRoomOvertimePenalties || 0)}</strong>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', display: 'block', marginBottom: '0.2rem' }}>Total Pelanggaran</span>
                    <strong style={{ fontSize: '1.05rem' }}>{s.activeViolationsCount || 0} Kasus</strong>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', display: 'block', marginBottom: '0.2rem' }}>User Di-Suspend</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--color-danger)' }}>{s.suspendedUsersCount || 0} User</strong>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ── Ringkasan Barang Habis Pakai (ATK) ─────────────────────────────── */}
          {!loading && analyticsData?.consumablesSummary && (
            <Card style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={18} style={{ color: '#eab308' }} />
                    Rekapitulasi Belanja &amp; Pemakaian Barang Habis Pakai (ATK)
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                    Ringkasan pengadaan masuk, pengeluaran unit, dan nilai stok ATK pada periode terpilih.
                  </p>
                </div>
                <Link href="/dashboard/consumables" className="btn btn-secondary btn-sm">
                  Buka Modul ATK →
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                <div style={{ padding: '0.85rem 1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-muted)', display: 'block' }}>Belanja ATK (Periode)</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--color-success)' }}>{formatCurrency(analyticsData.consumablesSummary.totalSpend || 0)}</strong>
                </div>
                <div style={{ padding: '0.85rem 1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-muted)', display: 'block' }}>Barang Masuk (IN)</span>
                  <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>
                    +{analyticsData.consumablesSummary.totalInQty || 0} unit ({analyticsData.consumablesSummary.inCount || 0}x)
                  </strong>
                </div>
                <div style={{ padding: '0.85rem 1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-muted)', display: 'block' }}>Pemakaian Unit (OUT)</span>
                  <strong style={{ fontSize: '1.1rem', color: '#ef4444' }}>
                    -{analyticsData.consumablesSummary.totalOutQty || 0} unit ({analyticsData.consumablesSummary.outCount || 0}x)
                  </strong>
                </div>
                <div style={{ padding: '0.85rem 1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-muted)', display: 'block' }}>Estimasi Nilai Stok Gudang</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary-light)' }}>{formatCurrency(analyticsData.consumablesSummary.totalStockValue || 0)}</strong>
                </div>
              </div>
            </Card>
          )}

          {/* ── Data Tables ────────────────────────────────────────────────────── */}
          <Card style={{ padding: '1.5rem' }}>
            <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <button
                onClick={() => setTableTab('ROOM')}
                style={{
                  padding: '0.5rem 1.1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  background: tableTab === 'ROOM' ? 'var(--color-primary)' : 'transparent',
                  color: tableTab === 'ROOM' ? '#fff' : 'var(--color-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Building2 size={16} /> Booking Ruangan{' '}
                <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '999px', padding: '0.05rem 0.45rem', fontSize: '0.75rem' }}>{roomBookings.length}</span>
              </button>
              <button
                onClick={() => setTableTab('ASSET')}
                style={{
                  padding: '0.5rem 1.1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  background: tableTab === 'ASSET' ? 'var(--color-primary)' : 'transparent',
                  color: tableTab === 'ASSET' ? '#fff' : 'var(--color-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Box size={16} /> Sewa Aset{' '}
                <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '999px', padding: '0.05rem 0.45rem', fontSize: '0.75rem' }}>{assetRentals.length}</span>
              </button>
              <button
                onClick={() => setTableTab('CONSUMABLE')}
                style={{
                  padding: '0.5rem 1.1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  background: tableTab === 'CONSUMABLE' ? 'var(--color-primary)' : 'transparent',
                  color: tableTab === 'CONSUMABLE' ? '#fff' : 'var(--color-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Package size={16} /> Barang Habis Pakai (ATK){' '}
                <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '999px', padding: '0.05rem 0.45rem', fontSize: '0.75rem' }}>
                  {(analyticsData?.consumableTransactions || []).length}
                </span>
              </button>
            </div>

            {loading ? (
              <Skeleton style={{ height: '200px' }} />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                {tableTab === 'ROOM' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-surface2)' }}>
                        {['No. Booking', 'Tanggal', 'Penyewa', 'Ruangan', 'Durasi', 'Total', 'Status Bayar', 'Status Booking'].map((h) => (
                          <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap', borderBottom: '1.5px solid var(--color-border)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {roomBookings.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                            Tidak ada data booking ruangan
                          </td>
                        </tr>
                      ) : (
                        roomBookings.map((b, i) => (
                          <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-surface2)' }}>
                            <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem' }}>{b.bookingNumber}</td>
                            <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{formatDate(b.createdAt, 'dd MMM yyyy')}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>{b.renter?.name || '-'}</td>
                            <td style={{ padding: '0.75rem' }}>{b.location?.name || '-'}</td>
                            <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{b.rentalType === 'HOURLY' ? `${b.durationHours || 0} jam` : `${b.totalDays || 1} hari`}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatCurrency(b.totalAmount)}</td>
                            <td style={{ padding: '0.75rem' }}><StatusBadge status={b.payStatus} /></td>
                            <td style={{ padding: '0.75rem' }}><StatusBadge status={b.bookingStatus} /></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {tableTab === 'ASSET' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-surface2)' }}>
                        {['No. Booking', 'Tanggal', 'Penyewa', 'Aset', 'Jumlah Hari', 'Biaya Sopir', 'Total Tagihan', 'Status Bayar'].map((h) => (
                          <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap', borderBottom: '1.5px solid var(--color-border)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {assetRentals.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                            Tidak ada data penyewaan aset
                          </td>
                        </tr>
                      ) : (
                        assetRentals.map((r, i) => (
                          <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-surface2)' }}>
                            <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem' }}>{r.bookingNumber}</td>
                            <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{formatDate(r.createdAt, 'dd MMM yyyy')}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>{r.renter?.name || '-'}</td>
                            <td style={{ padding: '0.75rem' }}>{r.asset?.name || '-'}</td>
                            <td style={{ padding: '0.75rem' }}>{r.totalDays} hari</td>
                            <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{formatCurrency(r.operatorFee || 0)}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatCurrency(r.totalAmount + (r.operatorFee || 0))}</td>
                            <td style={{ padding: '0.75rem' }}><StatusBadge status={r.payStatus} /></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {tableTab === 'CONSUMABLE' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-surface2)' }}>
                        {['Waktu Transaksi', 'Kode & Barang ATK', 'Merek', 'Tipe', 'Jumlah', 'Toko / Penerima', 'Biaya Belanja'].map((h) => (
                          <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap', borderBottom: '1.5px solid var(--color-border)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsData?.consumableTransactions || []).length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                            Tidak ada transaksi ATK pada periode ini
                          </td>
                        </tr>
                      ) : (
                        (analyticsData?.consumableTransactions || []).map((t: any, i: number) => (
                          <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-surface2)' }}>
                            <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{formatDate(t.transactionDate, 'dd MMM yyyy HH:mm')}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <Link href={`/dashboard/consumables/${t.consumableId}`} style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                                {t.consumable?.name || '-'}
                              </Link>
                              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-primary-light)' }}>{t.consumable?.code}</div>
                            </td>
                            <td style={{ padding: '0.75rem' }}>{t.brand || t.consumable?.brand || '-'}</td>
                            <td style={{ padding: '0.75rem' }}>{t.type === 'IN' ? 'MASUK (IN)' : 'KELUAR (OUT)'}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 800 }}>{t.type === 'IN' ? '+' : '-'}{t.quantity}</td>
                            <td style={{ padding: '0.75rem' }}>{t.type === 'IN' ? t.supplierName || 'Restock' : t.recipientName || '-'}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 700 }}>
                              {t.type === 'IN' && (t.totalCost || t.unitCost) ? formatCurrency(t.totalCost || t.unitCost * t.quantity) : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── Print Styles ────────────────────────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          .no-print,
          header,
          aside,
          [data-topbar] {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            background: #fff !important;
            color: #000 !important;
          }
          main {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

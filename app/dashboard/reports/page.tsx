'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Printer, CalendarCheck, Receipt, Box, BarChart3, Download,
  CreditCard, TrendingUp, CheckCircle, Clock, XCircle,
  Building2, Filter, RefreshCw, ChevronDown,
} from 'lucide-react';

// ─── Helper ──────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_FULL  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const currentYearNow = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYearNow - i);

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  const map: Record<string, { label: string; color: string; bg: string }> = {
    PAID:       { label: 'LUNAS',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    CONFIRMED:  { label: 'CONFIRMED',color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    COMPLETED:  { label: 'SELESAI', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    COMPLETED_WITH_CLAIM: { label: 'SELESAI', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    UNPAID:     { label: 'BELUM BAYAR', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    PENDING:    { label: 'PENDING',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    DOWN_PAYMENT:{ label: 'DP',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    CANCELLED:  { label: 'BATAL',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    ACTIVE:     { label: 'AKTIF',   color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  };
  const cfg = map[s] || { label: s, color: 'var(--color-muted)', bg: 'var(--color-surface2)' };
  return (
    <span style={{
      display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px',
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
      color: cfg.color, background: cfg.bg,
    }}>{cfg.label}</span>
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
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>{label}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>{sub}</div>}
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
            <div style={{
              width: '100%', maxWidth: '32px',
              height: `${heightPct}%`,
              background: highlight ? 'var(--grad-primary)' : val > 0 ? 'rgba(99,102,241,0.4)' : 'var(--color-surface2)',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              transition: 'all 0.35s ease',
              boxShadow: highlight ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
            }} />
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
  const [tableTab, setTableTab] = useState<'ROOM' | 'ASSET'>('ROOM');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterYear, setFilterYear] = useState(currentYearNow);
  const [filterMonth, setFilterMonth] = useState<number>(0); // 0 = all
  const [filterType, setFilterType] = useState('ALL');
  const [applied, setApplied] = useState({ year: currentYearNow, month: 0, type: 'ALL' });

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

  useEffect(() => { fetchData(applied); }, [applied, fetchData]);

  const handleApply = () => {
    const next = { year: filterYear, month: filterMonth, type: filterType };
    setApplied(next);
  };

  const handleReset = () => {
    const def = { year: currentYearNow, month: 0, type: 'ALL' };
    setFilterYear(def.year); setFilterMonth(def.month); setFilterType(def.type);
    setApplied(def);
  };

  const handleExportCSV = () => {
    window.open(buildUrl(applied, '&format=csv'), '_blank');
  };

  const handlePrint = () => window.print();

  const s = analyticsData?.summary || {};
  const roomBookings: any[] = analyticsData?.roomBookings || [];
  const assetRentals: any[] = analyticsData?.assetRentals || [];

  const selectStyle: React.CSSProperties = {
    padding: '0.55rem 0.9rem', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)', background: 'var(--color-surface2)',
    color: 'var(--color-text)', fontSize: '0.88rem', fontWeight: 500,
    outline: 'none', cursor: 'pointer', appearance: 'none' as any,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Rekap Keuangan &amp; Laporan</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Rekapitulasi pendapatan penyewaan ruangan &amp; aset, distribusi metode bayar, dan rekap transaksi.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={handleExportCSV}>
            <Download size={16} /> Ekspor CSV
          </Button>
          <Button variant="primary" onClick={handlePrint}>
            <Printer size={16} /> Cetak PDF
          </Button>
        </div>
      </div>

      {/* ── Filter Panel ───────────────────────────────────────────────────── */}
      <Card className="no-print" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>Tahun</div>
            <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} style={selectStyle}>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.3rem' }}>Bulan</div>
            <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} style={selectStyle}>
              <option value={0}>Semua Bulan</option>
              {MONTH_FULL.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
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
        {loading ? Array(6).fill(0).map((_, i) => <Skeleton key={i} style={{ height: '100px' }} />) : (<>
          <KPICard icon={<TrendingUp size={18} />}  label="Total Pendapatan"        value={formatCurrency(s.totalRevenue || 0)}   color="#6366f1" />
          <KPICard icon={<Building2 size={18} />}   label="Pendapatan Ruangan"      value={formatCurrency(s.totalRoomRevenue || 0)} color="#3b82f6" />
          <KPICard icon={<Box size={18} />}          label="Pendapatan Aset"         value={formatCurrency(s.totalAssetRevenue || 0)} color="#8b5cf6" />
          <KPICard icon={<CheckCircle size={18} />}  label="Transaksi Lunas"         value={s.countPaid || 0}   sub={formatCurrency(s.totalPaid || 0)}    color="#10b981" />
          <KPICard icon={<Clock size={18} />}        label="Menunggu Pembayaran"     value={s.countPending || 0} sub={formatCurrency(s.totalPending || 0)} color="#f59e0b" />
          <KPICard icon={<XCircle size={18} />}      label="Dibatalkan / Kadaluarsa" value={s.countCancelled || 0}                                          color="#ef4444" />
        </>)}
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
        {loading
          ? <Skeleton style={{ height: '200px' }} />
          : <BarChart data={analyticsData?.monthlyRevenue || Array(12).fill(0)} activeMonth={applied.month || null} />
        }
      </Card>

      {/* ── Payment Method Distribution ────────────────────────────────────── */}
      {!loading && Object.keys(analyticsData?.paymentMethods || {}).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          
          {/* Payment Methods */}
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: 0 }}>
              <CreditCard size={18} style={{ color: 'var(--color-accent)' }} />
              Distribusi Metode Pembayaran
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {Object.entries(analyticsData.paymentMethods).filter(([, v]) => (v as number) > 0).map(([pm, amount]: [string, any]) => (
                <div key={pm} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600 }}>
                    {pm === 'QRIS' ? '📱 QRIS' : pm === 'TRANSFER' ? '🏦 Transfer Bank' : pm === 'CASH' ? '💵 Tunai' : `💳 ${pm}`}
                  </span>
                  <strong style={{ fontSize: '0.85rem' }}>{formatCurrency(amount)}</strong>
                </div>
              ))}
            </div>
          </Card>

          {/* Denda & Sanksi Keterlambatan */}
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

      {/* ── Pemakaian Alat & Kategori Terpopuler ───────────────────────────────── */}
      {!loading && analyticsData?.mostBorrowedAssets?.length > 0 && (
        <Card style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Box size={18} style={{ color: 'var(--color-primary)' }} />
            Laporan Pemakaian Aset &amp; Tingkat Kerusakan
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '1.25rem' }}>
            5 Aset yang paling sering dipinjam secara internal beserta presentase kasus kerusakan saat pengembalian.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)' }}>
                  {['Kode Aset', 'Nama Aset', 'Frekuensi Dipinjam', 'Tingkat Kerusakan'].map(h => (
                    <th key={h} style={{ padding: '0.65rem 0.75rem', textAlign: 'left', fontWeight: 700, borderBottom: '1.5px solid var(--color-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analyticsData.mostBorrowedAssets.map((asset: any) => (
                  <tr key={asset.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>{asset.code}</td>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{asset.name}</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>{asset.count} Kali Dipinjam</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800,
                        background: asset.damageRate > 25 ? 'rgba(239,68,68,0.12)' : (asset.damageRate > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)'),
                        color: asset.damageRate > 25 ? '#ef4444' : (asset.damageRate > 0 ? '#f59e0b' : '#10b981')
                      }}>
                        {asset.damageRate}% Kerusakan
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Data Tables ────────────────────────────────────────────────────── */}
      <Card style={{ padding: '1.5rem' }}>
        {/* Tab switcher */}
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          <button
            onClick={() => setTableTab('ROOM')}
            style={{
              padding: '0.5rem 1.1rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
              background: tableTab === 'ROOM' ? 'var(--color-primary)' : 'transparent',
              color: tableTab === 'ROOM' ? '#fff' : 'var(--color-muted)',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            <Building2 size={16} /> Booking Ruangan <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '999px', padding: '0.05rem 0.45rem', fontSize: '0.75rem' }}>{roomBookings.length}</span>
          </button>
          <button
            onClick={() => setTableTab('ASSET')}
            style={{
              padding: '0.5rem 1.1rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
              background: tableTab === 'ASSET' ? 'var(--color-primary)' : 'transparent',
              color: tableTab === 'ASSET' ? '#fff' : 'var(--color-muted)',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            <Box size={16} /> Sewa Aset <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '999px', padding: '0.05rem 0.45rem', fontSize: '0.75rem' }}>{assetRentals.length}</span>
          </button>
        </div>

        {/* Print header */}
        <div className="print-only" style={{ display: 'none', textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase' }}>
            LAPORAN REKAP KEUANGAN SPASI — {applied.year}{applied.month ? ` / ${MONTH_FULL[applied.month - 1]}` : ''}
          </h2>
          <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Dicetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>

        {loading ? <Skeleton style={{ height: '200px' }} /> : (
          <div style={{ overflowX: 'auto' }}>
            {tableTab === 'ROOM' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface2)' }}>
                    {['No. Booking','Tanggal','Penyewa','Ruangan','Durasi','Total','Status Bayar','Status Booking'].map(h => (
                      <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap', borderBottom: '1.5px solid var(--color-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roomBookings.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>Tidak ada data booking ruangan</td></tr>
                  ) : roomBookings.map((b, i) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-surface2)' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem' }}>{b.bookingNumber}</td>
                      <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{formatDate(b.createdAt, 'dd MMM yyyy')}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{b.renter?.name || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>{b.location?.name || '-'}</td>
                      <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                        {b.rentalType === 'HOURLY' ? `${b.durationHours || 0} jam` : `${b.totalDays || 1} hari`}
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatCurrency(b.totalAmount)}</td>
                      <td style={{ padding: '0.75rem' }}><StatusBadge status={b.payStatus} /></td>
                      <td style={{ padding: '0.75rem' }}><StatusBadge status={b.bookingStatus} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--color-surface2)', borderTop: '2px solid var(--color-border)' }}>
                    <td colSpan={5} style={{ padding: '0.75rem', fontWeight: 700, textAlign: 'right' }}>TOTAL LUNAS:</td>
                    <td style={{ padding: '0.75rem', fontWeight: 900, color: 'var(--color-success)' }}>{formatCurrency(s.totalRoomRevenue || 0)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}

            {tableTab === 'ASSET' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface2)' }}>
                    {['No. Booking','Tanggal','Penyewa','Aset','Jumlah Hari','Biaya Sopir','Total Tagihan','Status Bayar'].map(h => (
                      <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap', borderBottom: '1.5px solid var(--color-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assetRentals.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>Tidak ada data penyewaan aset</td></tr>
                  ) : assetRentals.map((r, i) => (
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
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--color-surface2)', borderTop: '2px solid var(--color-border)' }}>
                    <td colSpan={4} style={{ padding: '0.75rem', fontWeight: 700, textAlign: 'right' }}>TOTAL LUNAS:</td>
                    <td style={{ padding: '0.75rem', fontWeight: 900, color: 'var(--color-success)' }} colSpan={2}>{formatCurrency(s.totalAssetRevenue || 0)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </Card>

      {/* ── Print Styles ────────────────────────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          .no-print, header, aside, [data-topbar] { display: none !important; }
          .print-only { display: block !important; }
          body { background: #fff !important; color: #000 !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

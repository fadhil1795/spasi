'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCart } from '@/components/public/CartContext';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Box,
  CalendarCheck,
  Receipt,
  Wrench,
  QrCode,
  Plus,
  Building2,
  ShoppingBag,
  Clock,
  CheckCircle2,
  ArrowRight,
  User,
  ShieldCheck,
  FileSpreadsheet,
  AlertTriangle,
  FileText,
  SlidersHorizontal,
  TrendingUp,
  BarChart2,
} from 'lucide-react';

// ── SVG Line Chart (Tren Bulanan) ──────────────────────────────────
function TrendLineChart({ data }: { data: { label: string; count: number }[] }) {
  const W = 480, H = 160, PAD = 32;
  const vals = data.map(d => d.count);
  const max = Math.max(...vals, 1);
  const pts = vals.map((v, i) => {
    const x = PAD + (i / (vals.length - 1 || 1)) * (W - PAD * 2);
    const y = H - PAD - (v / max) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const area = `${PAD},${H - PAD} ` + polyline + ` ${W - PAD},${H - PAD}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '160px' }}>
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(t => {
        const y = H - PAD - t * (H - PAD * 2);
        return <line key={t} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4,4" />;
      })}
      {/* Area fill */}
      <polygon points={area} fill="url(#trendGrad)" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Points + labels */}
      {pts.map((pt, i) => {
        const [x, y] = pt.split(',').map(Number);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="4" fill="var(--color-primary)" />
            <text x={x} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--color-muted)">{data[i].label}</text>
            {vals[i] > 0 && (
              <text x={x} y={y - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--color-primary)">{vals[i]}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Donut Chart (Distribusi Kategori) ─────────────────────────────
const PALETTE = ['#6366f1','#22d3ee','#f59e0b','#10b981','#f97316','#ec4899','#8b5cf6'];
function CategoryDonut({ data }: { data: { name: string; count: number }[] }) {
  const total = data.reduce((a, d) => a + d.count, 0) || 1;
  const R = 44, CX = 56, CY = 56;
  let angle = -90;
  const slices = data.map((d, i) => {
    const pct = d.count / total;
    const deg = pct * 360;
    const rad1 = (angle * Math.PI) / 180;
    const rad2 = ((angle + deg) * Math.PI) / 180;
    const x1 = CX + R * Math.cos(rad1), y1 = CY + R * Math.sin(rad1);
    const x2 = CX + R * Math.cos(rad2), y2 = CY + R * Math.sin(rad2);
    const large = deg > 180 ? 1 : 0;
    const path = `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z`;
    angle += deg;
    return { path, color: PALETTE[i % PALETTE.length], name: d.name, count: d.count, pct };
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
      <svg viewBox="0 0 112 112" style={{ width: '112px', height: '112px', flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity="0.9">
            <title>{s.name}: {s.count}</title>
          </path>
        ))}
        <circle cx={CX} cy={CY} r="24" fill="var(--color-surface)" />
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--color-text)">{total}</text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize="7" fill="var(--color-muted)">Aset</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
            <span style={{ fontWeight: 700 }}>{s.count}</span>
            <span style={{ color: 'var(--color-muted)' }}>({(s.pct * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { totalItemCount } = useCart();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'recap'>('overview');
  const [recapGroupMode, setRecapGroupMode] = useState<'parent' | 'sub' | 'unit'>('parent');
  const [recapSearch, setRecapSearch] = useState('');

  const userRole = (session?.user as any)?.role || 'BORROWER';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // 1. VIEW KHUSUS USER / PEMINJAM (BORROWER)
  // ═════════════════════════════════════════════════════════════════
  if (userRole === 'BORROWER') {
    const userStats = data?.stats || {
      userActiveCount: 0,
      userPendingCount: 0,
      totalUserLoans: 0,
      totalUserRoomBookings: 0,
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Welcome Header */}
        <div
          style={{
            background: 'var(--grad-primary)',
            padding: '2rem',
            borderRadius: 'var(--radius-xl)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: 600, marginBottom: '0.5rem' }}>
              <User size={14} /> Dashboard Peminjam Akun Saya
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.35rem' }}>
              Selamat Datang, {session?.user?.name || 'User'}!
            </h1>
            <p style={{ opacity: 0.9, fontSize: '0.92rem', maxWidth: '540px' }}>
              Kelola pengajuan peminjaman sarana aset internal dan reservasi ruangan instansi Anda di satu tempat.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard/loans/new" className="btn" style={{ background: '#FFFFFF', color: 'var(--color-primary)', fontWeight: 700 }}>
              <Plus size={18} /> Ajukan Peminjaman
            </Link>
            <Link href="/dashboard/catalog" className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', fontWeight: 600 }}>
              <Building2 size={18} /> Katalog Sarana
            </Link>
            <Link href="/dashboard/cart" className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', fontWeight: 600 }}>
              <ShoppingBag size={18} /> Keranjang ({totalItemCount})
            </Link>
          </div>
        </div>

        {/* Status Akun & Peringatan Peminjaman */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    background:
                      data?.userProfile?.verificationStatus === 'VERIFIED'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(245, 158, 11, 0.12)',
                    color:
                      data?.userProfile?.verificationStatus === 'VERIFIED'
                        ? 'var(--color-success)'
                        : 'var(--color-warning)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>Status Verifikasi Akun</div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                    {data?.userProfile?.verificationStatus === 'VERIFIED'
                      ? 'Terverifikasi'
                      : data?.userProfile?.verificationStatus === 'PENDING'
                      ? 'Menunggu Review Admin'
                      : 'Belum Terverifikasi'}
                    {' '}•{' '}
                    <span style={{ color: 'var(--color-primary-light)' }}>
                      {data?.userProfile?.renterCategory === 'INTERNAL' ? 'Internal' : 'Eksternal'}
                    </span>
                  </div>
                </div>
              </div>
              <Link href="/dashboard/verification" className="btn btn-sm btn-secondary">
                {data?.userProfile?.verificationStatus === 'VERIFIED' ? 'Detail' : 'Verifikasi'}
              </Link>
            </Card>

            {(userStats.userOverdueCount > 0 || userStats.userUnpaidFinesTotal > 0) ? (
              <Card
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(239, 68, 68, 0.14)',
                      color: 'var(--color-danger)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-danger)', fontWeight: 700 }}>
                      Perlu Tindakan Segera
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      {userStats.userOverdueCount > 0 ? `${userStats.userOverdueCount} peminjaman jatuh tempo` : ''}
                      {userStats.userOverdueCount > 0 && userStats.userUnpaidFinesTotal > 0 ? ' • ' : ''}
                      {userStats.userUnpaidFinesTotal > 0 ? `Denda belum lunas ${formatCurrency(userStats.userUnpaidFinesTotal)}` : ''}
                    </div>
                  </div>
                </div>
                <Link href="/dashboard/loans?mode=my" className="btn btn-sm btn-primary">
                  Cek Peminjaman
                </Link>
              </Card>
            ) : (
              <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: 'var(--color-success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>Kepatuhan Pengembalian</div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Tidak ada tunggakan atau denda aktif</div>
                  </div>
                </div>
                <Link href="/dashboard/loans?mode=my" className="btn btn-sm btn-secondary">
                  Riwayat
                </Link>
              </Card>
            )}
          </div>
        )}

        {/* User Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {[
            { title: 'Peminjaman Aktif Saya', value: userStats.userActiveCount, icon: CalendarCheck, color: 'var(--color-success)' },
            { title: 'Menunggu Persetujuan', value: userStats.userPendingCount, icon: Clock, color: 'var(--color-warning)' },
            { title: 'Booking Ruangan Saya', value: userStats.totalUserRoomBookings, icon: Building2, color: 'var(--color-primary)' },
            { title: 'Item Keranjang Saya', value: totalItemCount, icon: ShoppingBag, color: 'var(--color-accent)' },
          ].map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <Card key={idx} style={{ padding: '1.25rem' }}>
                {loading ? (
                  <Skeleton height="50px" />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--color-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                        {kpi.title}
                      </span>
                      <span style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>{kpi.value}</span>
                    </div>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-surface2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: kpi.color,
                      }}
                    >
                      <Icon size={22} />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Personal Activity Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {/* User My Loans */}
          <Card style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CalendarCheck size={18} style={{ color: 'var(--color-primary)' }} /> Peminjaman Saya Terbaru
              </h3>
              <Link href="/dashboard/loans?mode=my" style={{ fontSize: '0.82rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>
                Lihat Semua →
              </Link>
            </div>

            {loading ? (
              <Skeleton height="150px" />
            ) : data?.userLoans?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {data.userLoans.map((loan: any) => (
                  <div
                    key={loan.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface2)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{loan.asset?.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                        {loan.ticketNumber} • {formatDate(loan.startDate)}
                      </div>
                    </div>
                    <Badge status={loan.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.88rem' }}>
                Belum ada riwayat peminjaman aset.
              </div>
            )}
          </Card>

          {/* User Room Bookings */}
          <Card style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Building2 size={18} style={{ color: 'var(--color-accent)' }} /> Booking Ruangan Saya
              </h3>
              <Link href="/dashboard/room-bookings?mode=my" style={{ fontSize: '0.82rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>
                Lihat Semua →
              </Link>
            </div>

            {loading ? (
              <Skeleton height="150px" />
            ) : data?.userRoomBookings?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {data.userRoomBookings.map((b: any) => (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface2)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{b.location?.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                        {b.bookingNumber} • {formatDate(b.startTime, 'dd MMM yyyy HH:mm')}
                      </div>
                    </div>
                    <Badge status={b.bookingStatus} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.88rem' }}>
                Belum ada reservasi ruangan.
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // 2. VIEW KHUSUS STAFF LAPANGAN / PETUGAS (STAFF)
  // ═════════════════════════════════════════════════════════════════
  if (userRole === 'STAFF') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ background: 'var(--grad-primary)', padding: '2rem', borderRadius: 'var(--radius-xl)', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: 600, marginBottom: '0.5rem' }}>
              <QrCode size={14} /> Dashboard Staff Operasional &amp; Lapangan
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.35rem' }}>
              Halo, {session?.user?.name}!
            </h1>
            <p style={{ opacity: 0.9, fontSize: '0.92rem', maxWidth: '540px' }}>
              Fokus tugas hari ini: Pemindaian QR Code Check-In/Out ruangan, verifikasi kondisi fisik alat, dan pencatatan perbaikan aset.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard/loans/scan" className="btn" style={{ background: '#FFFFFF', color: 'var(--color-primary)', fontWeight: 700 }}>
              <QrCode size={18} /> Scan QR Code Peminjaman
            </Link>
            <Link href="/dashboard/room-bookings/scan" className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', fontWeight: 600 }}>
              <Building2 size={18} /> Scan QR Check-In Ruangan
            </Link>
          </div>
        </div>

        {/* Staff KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {[
            { title: 'Check-In Siap Hari Ini', value: data?.stats?.activeRoomBookings || 0, icon: Building2, color: 'var(--color-primary)' },
            { title: 'Aset Sedang Dipinjam', value: data?.stats?.borrowedCount || 0, icon: CalendarCheck, color: 'var(--color-warning)' },
            { title: 'Aset Perlu Maintenance', value: data?.stats?.maintenanceCount || 0, icon: Wrench, color: 'var(--color-danger)' },
          ].map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <Card key={idx} style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                      {kpi.title}
                    </span>
                    <span style={{ fontSize: '2rem', fontWeight: 800 }}>{kpi.value}</span>
                  </div>
                  <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                    <Icon size={22} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Staff Quick Action Table */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} style={{ color: 'var(--color-primary)' }} /> Monitor Booking Ruangan Siap Check-In / Out
          </h3>
          {data?.recentRoomBookings?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.recentRoomBookings.map((b: any) => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{b.location?.name} ({b.bookingNumber})</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Penyewa: {b.renter?.name} ({b.renter?.phone})</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Badge status={b.bookingStatus} />
                    <Link href={`/dashboard/room-bookings/${b.id}`} className="btn btn-secondary btn-sm">Proses Inspection</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>Tidak ada jadwal booking aktif saat ini.</div>
          )}
        </Card>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // 3. VIEW KHUSUS KEPALA UNIT / ATASAN (APPROVER)
  // ═════════════════════════════════════════════════════════════════
  if (userRole === 'APPROVER') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ background: 'var(--grad-primary)', padding: '2rem', borderRadius: 'var(--radius-xl)', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: 600, marginBottom: '0.5rem' }}>
              <ShieldCheck size={14} /> Dashboard Executive Approver Level 1
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.35rem' }}>
              Selamat Datang, Bapak/Ibu {session?.user?.name}!
            </h1>
            <p style={{ opacity: 0.9, fontSize: '0.92rem', maxWidth: '540px' }}>
              Tinjau dan berikan persetujuan (*approval*) terhadap permohonan peminjaman aset dari staf &amp; mahasiswa unit kerja Anda.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard/loans" className="btn" style={{ background: '#FFFFFF', color: 'var(--color-primary)', fontWeight: 700 }}>
              <CalendarCheck size={18} /> Antrean Persetujuan Peminjaman
            </Link>
            <Link href="/dashboard/reports" className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', fontWeight: 600 }}>
              <FileSpreadsheet size={18} /> Laporan Penggunaan Unit
            </Link>
          </div>
        </div>

        {/* Approver KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <Card style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>Peminjaman Menunggu Persetujuan Anda</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-warning)' }}>{data?.recentLoans?.filter((l: any) => l.status.includes('PENDING')).length || 0} Pengajuan</div>
          </Card>
          <Card style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>Total Aset Terdaftar Instansi</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{data?.stats?.totalAssets || 0} Unit</div>
          </Card>
        </div>

        {/* Approval Queue Table */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} style={{ color: 'var(--color-warning)' }} /> Permohonan Peminjaman Aset Menunggu Persetujuan
          </h3>
          {data?.recentLoans?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.recentLoans.map((loan: any) => (
                <div key={loan.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{loan.asset?.name} ({loan.ticketNumber})</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Pemohon: {loan.user?.name} ({loan.user?.email})</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Badge status={loan.status} />
                    <Link href={`/dashboard/loans/${loan.id}`} className="btn btn-primary btn-sm">Tinjau &amp; Setujui</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>Tidak ada permohonan yang memerlukan persetujuan saat ini.</div>
          )}
        </Card>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // 4. VIEW ADMINISTRATOR UTAMA (ADMIN & SUPER_ADMIN)
  // ═════════════════════════════════════════════════════════════════
  const stats = data?.stats || {
    totalAssets: 0,
    totalPhysicalUnits: 0,
    totalAssetAcquisitionValue: 0,
    totalAssetBookValue: 0,
    borrowedCount: 0,
    rentedCount: 0,
    maintenanceCount: 0,
    damagedCount: 0,
    disposedCount: 0,
    availableCount: 0,
    totalRooms: 0,
    totalRoomBookings: 0,
    activeRoomBookings: 0,
    problematicCount: 0,
  };

  const conditionDist: any[] = data?.conditionDistribution || [];
  const deptDist: any[] = data?.departmentDistribution || [];
  const newestAssets: any[] = data?.newestAssets || [];
  const problematicAssets: any[] = data?.problematicAssets || [];
  const classificationRecap: any[] = data?.classificationRecap || [];
  const subClassificationRecap: any[] = data?.subClassificationRecap || [];
  const unitRecap: any[] = data?.unitRecap || [];

  const activeRecapRows: any[] = (
    recapGroupMode === 'parent'
      ? classificationRecap
      : recapGroupMode === 'sub'
      ? subClassificationRecap
      : unitRecap
  ).filter((r: any) => {
    if (!recapSearch.trim()) return true;
    const q = recapSearch.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.code?.toLowerCase().includes(q) ||
      (r.parentName && r.parentName.toLowerCase().includes(q))
    );
  });

  const recapTotals = activeRecapRows.reduce(
    (acc, r) => ({
      totalAssets: acc.totalAssets + (r.totalAssets || 0),
      totalUnits: acc.totalUnits + (r.totalUnits || 0),
      activeCount: acc.activeCount + (r.activeCount || 0),
      activeUnits: acc.activeUnits + (r.activeUnits || 0),
      borrowedOrRentedCount: acc.borrowedOrRentedCount + (r.borrowedOrRentedCount || 0),
      maintenanceCount: acc.maintenanceCount + (r.maintenanceCount || 0),
      conditionBaikCount: acc.conditionBaikCount + (r.conditionBaikCount || 0),
      conditionRusakRinganCount: acc.conditionRusakRinganCount + (r.conditionRusakRinganCount || 0),
      conditionRusakBeratCount: acc.conditionRusakBeratCount + (r.conditionRusakBeratCount || 0),
      totalDamagedCount: acc.totalDamagedCount + (r.totalDamagedCount || 0),
      disposedCount: acc.disposedCount + (r.disposedCount || 0),
      totalValue: acc.totalValue + (r.totalValue || 0),
    }),
    {
      totalAssets: 0,
      totalUnits: 0,
      activeCount: 0,
      activeUnits: 0,
      borrowedOrRentedCount: 0,
      maintenanceCount: 0,
      conditionBaikCount: 0,
      conditionRusakRinganCount: 0,
      conditionRusakBeratCount: 0,
      totalDamagedCount: 0,
      disposedCount: 0,
      totalValue: 0,
    }
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'var(--grad-primary)',
          padding: '2rem',
          borderRadius: 'var(--radius-xl)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: 'var(--shadow-glow)',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: 600, marginBottom: '0.5rem' }}>
            <ShieldCheck size={14} /> System Administrator Portal
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.35rem' }}>
            Overview Manajemen Aset &amp; Ruangan
          </h1>
          <p style={{ opacity: 0.9, fontSize: '0.92rem', maxWidth: '540px' }}>
            Pantau inventaris barang, permohonan peminjaman, verifikasi pembayaran booking ruangan, dan audit maintenance secara *real-time*.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/rooms/new" className="btn" style={{ background: '#FFFFFF', color: 'var(--color-primary)', fontWeight: 700 }}>
            <Plus size={18} /> Tambah Ruangan
          </Link>
          <Link href="/dashboard/assets/new" className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', fontWeight: 600 }}>
            <Plus size={18} /> Tambah Aset
          </Link>
          <Link href="/dashboard/room-bookings" className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', fontWeight: 600 }}>
            <Receipt size={18} /> Verifikasi Bayar
          </Link>
        </div>
      </div>

      {/* Menu Navigasi Internal Dashboard: Overview vs Rekap per Klasifikasi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.85rem' }}>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setDashboardTab('overview')}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: dashboardTab === 'overview' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: dashboardTab === 'overview' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: dashboardTab === 'overview' ? '#FFFFFF' : 'var(--color-text)',
            }}
          >
            <BarChart2 size={16} /> Ringkasan &amp; Statistik Dashboard
          </button>

          <button
            type="button"
            onClick={() => setDashboardTab('recap')}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: dashboardTab === 'recap' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: dashboardTab === 'recap' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: dashboardTab === 'recap' ? '#FFFFFF' : 'var(--color-text)',
            }}
          >
            <FileSpreadsheet size={16} /> Rekapitulasi Aset per Klasifikasi (Aktif, Rusak, Maintenance, dll.)
          </button>
        </div>

        <Link href="/dashboard/reports?tab=INVENTORY&sub=CATEGORY" className="btn btn-secondary btn-sm">
          <FileSpreadsheet size={15} /> Cetak / Ekspor Excel Rekap Klasifikasi →
        </Link>
      </div>

      {/* Primary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {[
          {
            title: 'Total Seluruh Aset',
            value: `${stats.totalAssets} Jenis`,
            sub: `${stats.totalPhysicalUnits || stats.totalAssets} Total Unit Fisik`,
            icon: Box,
            color: 'var(--color-primary)',
          },
          {
            title: 'Total Nilai Perolehan Aset',
            value: formatCurrency(stats.totalAssetAcquisitionValue || 0),
            sub: `Nilai Buku: ${formatCurrency(stats.totalAssetBookValue || 0)}`,
            icon: Receipt,
            color: '#10b981',
          },
          {
            title: 'Aset Sedang Disewa / Pinjam',
            value: stats.borrowedCount + stats.rentedCount,
            sub: `${stats.availableCount} Aset Tersedia Siap Pakai`,
            icon: CalendarCheck,
            color: 'var(--color-warning)',
          },
          {
            title: 'Aset Bermasalah / Maintenance',
            value: (stats.maintenanceCount || 0) + (stats.damagedCount || 0),
            sub: `${stats.maintenanceCount || 0} Servis • ${stats.damagedCount || 0} Rusak`,
            icon: Wrench,
            color: 'var(--color-danger)',
          },
          {
            title: 'Booking Ruangan Aktif',
            value: stats.activeRoomBookings,
            sub: `Dari ${stats.totalRooms || 0} Ruangan Terdaftar`,
            icon: Building2,
            color: '#3b82f6',
          },
          {
            title: 'Saldo Kas Akhir',
            value: formatCurrency(stats.totalCashBalance || 0),
            sub: 'Kas Operasional Sarpras',
            icon: FileText,
            color: 'var(--color-accent)',
          },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} style={{ padding: '1.25rem' }}>
              {loading ? (
                <Skeleton height="64px" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                      {kpi.title}
                    </span>
                    <span style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.15, display: 'block', wordBreak: 'break-word' }}>
                      {kpi.value}
                    </span>
                    {kpi.sub && (
                      <span style={{ fontSize: '0.74rem', color: 'var(--color-muted)', display: 'block', marginTop: '0.35rem', fontWeight: 500 }}>
                        {kpi.sub}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: kpi.color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── MENU REKAPITULASI ASET PER KLASIFIKASI DI DASHBOARD ── */}
      <Card style={{ padding: '1.5rem', border: dashboardTab === 'recap' ? '1.5px solid var(--color-primary)' : undefined }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <FileSpreadsheet size={20} style={{ color: 'var(--color-primary)' }} />
              Rekapitulasi Aset per Klasifikasi (Aktif, Dipinjam, Maintenance, Kondisi Baik &amp; Rusak)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
              Rincian lengkap jumlah aset, unit fisik, status aktif/siap pakai, sedang dipinjam/sewa, sedang maintenance, hingga rincian kerusakan per klasifikasi.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { id: 'parent' as const, label: `Per Klasifikasi Utama (${classificationRecap.length})` },
              { id: 'sub' as const, label: `Per Sub-Klasifikasi Detail (${subClassificationRecap.length})` },
              { id: 'unit' as const, label: `Per Unit / Fakultas (${unitRecap.length})` },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setRecapGroupMode(m.id)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: recapGroupMode === m.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: recapGroupMode === m.id ? 'rgba(228, 37, 44, 0.14)' : 'var(--color-surface2)',
                  color: recapGroupMode === m.id ? 'var(--color-primary)' : 'var(--color-text)',
                }}
              >
                {m.label}
              </button>
            ))}

            <input
              type="text"
              className="input-field"
              placeholder="Cari klasifikasi / kode..."
              value={recapSearch}
              onChange={(e) => setRecapSearch(e.target.value)}
              style={{ width: '200px', height: '34px', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        {loading ? (
          <Skeleton height="220px" />
        ) : activeRecapRows.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.88rem' }}>
            Tidak ada data klasifikasi yang sesuai pencarian.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)', borderBottom: '1.5px solid var(--color-border)', color: 'var(--color-muted)', fontWeight: 700 }}>
                  <th style={{ padding: '0.75rem 0.85rem' }}>Kode</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>
                    {recapGroupMode === 'parent' ? 'Nama Klasifikasi Utama' : recapGroupMode === 'sub' ? 'Sub-Klasifikasi & Induk' : 'Nama Unit / Fakultas'}
                  </th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center' }}>Total Aset</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center' }}>Unit Fisik</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: '#10b981' }}>Aktif / Siap</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: '#3b82f6' }}>Dipinjam / Sewa</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: '#f59e0b' }}>Maintenance</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: '#10b981' }}>Kondisi Baik</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: '#f59e0b' }}>Rusak Ringan</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: '#ef4444' }}>Rusak Berat</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center', color: '#6b7280' }}>Afkir / Disposed</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Nilai Perolehan</th>
                </tr>
              </thead>
              <tbody>
                {activeRecapRows.map((r: any, idx: number) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                    }}
                  >
                    <td style={{ padding: '0.7rem 0.85rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary)' }}>
                      {r.code}
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{r.name}</div>
                      {r.parentName && (
                        <div style={{ fontSize: '0.73rem', color: 'var(--color-muted)' }}>Induk: {r.parentName}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center', fontWeight: 800 }}>
                      {r.totalAssets}
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center', fontWeight: 700 }}>
                      {r.totalUnits} Unit
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 800 }}>
                        {r.activeCount} ({r.activeUnits} u)
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center', fontWeight: 700, color: r.borrowedOrRentedCount > 0 ? '#3b82f6' : 'var(--color-muted)' }}>
                      {r.borrowedOrRentedCount}
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center', fontWeight: 800, color: r.maintenanceCount > 0 ? '#f59e0b' : 'var(--color-muted)' }}>
                      {r.maintenanceCount}
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center', fontWeight: 700, color: '#10b981' }}>
                      {r.conditionBaikCount}
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center', fontWeight: 700, color: r.conditionRusakRinganCount > 0 ? '#f59e0b' : 'var(--color-muted)' }}>
                      {r.conditionRusakRinganCount}
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center', fontWeight: 800, color: r.conditionRusakBeratCount > 0 ? '#ef4444' : 'var(--color-muted)' }}>
                      {r.conditionRusakBeratCount}
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center', color: r.disposedCount > 0 ? '#ef4444' : 'var(--color-muted)' }}>
                      {r.disposedCount}
                    </td>
                    <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right', fontWeight: 700 }}>
                      {formatCurrency(r.totalValue || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--color-surface2)', borderTop: '2px solid var(--color-border)', fontWeight: 800 }}>
                  <td colSpan={2} style={{ padding: '0.8rem 0.85rem' }}>
                    TOTAL KESELURUHAN ({activeRecapRows.length} Klasifikasi)
                  </td>
                  <td style={{ padding: '0.8rem 0.85rem', textAlign: 'center', color: 'var(--color-primary)' }}>
                    {recapTotals.totalAssets}
                  </td>
                  <td style={{ padding: '0.8rem 0.85rem', textAlign: 'center' }}>
                    {recapTotals.totalUnits} Unit
                  </td>
                  <td style={{ padding: '0.8rem 0.85rem', textAlign: 'center', color: '#10b981' }}>
                    {recapTotals.activeCount} ({recapTotals.activeUnits} u)
                  </td>
                  <td style={{ padding: '0.8rem 0.85rem', textAlign: 'center', color: '#3b82f6' }}>
                    {recapTotals.borrowedOrRentedCount}
                  </td>
                  <td style={{ padding: '0.8rem 0.85rem', textAlign: 'center', color: '#f59e0b' }}>
                    {recapTotals.maintenanceCount}
                  </td>
                  <td style={{ padding: '0.8rem 0.85rem', textAlign: 'center', color: '#10b981' }}>
                    {recapTotals.conditionBaikCount}
                  </td>
                  <td style={{ padding: '0.8rem 0.85rem', textAlign: 'center', color: '#f59e0b' }}>
                    {recapTotals.conditionRusakRinganCount}
                  </td>
                  <td style={{ padding: '0.8rem 0.85rem', textAlign: 'center', color: '#ef4444' }}>
                    {recapTotals.conditionRusakBeratCount}
                  </td>
                  <td style={{ padding: '0.8rem 0.85rem', textAlign: 'center', color: '#6b7280' }}>
                    {recapTotals.disposedCount}
                  </td>
                  <td style={{ padding: '0.8rem 0.85rem', textAlign: 'right', color: '#10b981' }}>
                    {formatCurrency(recapTotals.totalValue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {dashboardTab === 'overview' && (
        <>
      {/* Distribusi Aset per Unit & Kondisi Fisik Aset */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Jumlah Aset Berdasarkan Kondisi */}
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <ShieldCheck size={18} style={{ color: '#10b981' }} /> Jumlah Aset Berdasarkan Kondisi Fisik
            </h3>
            <Link href="/dashboard/reports?tab=INVENTORY&sub=CONDITION" style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>
              Laporan Kondisi →
            </Link>
          </div>
          {loading ? (
            <Skeleton height="150px" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {conditionDist.map((item: any) => {
                const total = Math.max(stats.totalAssets, 1);
                const pct = Math.round((item.count / total) * 100);
                const color =
                  item.condition === 'Baik'
                    ? '#10b981'
                    : item.condition === 'Rusak Ringan'
                    ? '#f59e0b'
                    : '#ef4444';
                return (
                  <div key={item.condition} style={{ padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Kondisi {item.condition}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color }}>
                        {item.count} Aset ({item.totalQty} Unit) • {pct}%
                      </div>
                    </div>
                    <div style={{ width: '100%', height: '7px', borderRadius: '999px', background: 'var(--color-border)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.25rem' }}>
                {[
                  { label: 'Tersedia', val: stats.availableCount, color: '#10b981' },
                  { label: 'Dipinjam/Sewa', val: stats.borrowedCount + stats.rentedCount, color: '#3b82f6' },
                  { label: 'Maintenance', val: stats.maintenanceCount, color: '#f59e0b' },
                  { label: 'Dihapuskan', val: stats.disposedCount || 0, color: '#6b7280' },
                ].map((st) => (
                  <div key={st.label} style={{ textAlign: 'center', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', fontWeight: 600 }}>{st.label}</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: st.color }}>{st.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Jumlah Aset per Unit / Fakultas */}
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Building2 size={18} style={{ color: 'var(--color-primary)' }} /> Jumlah &amp; Nilai Aset per Unit / Fakultas
            </h3>
            <Link href="/dashboard/reports?tab=INVENTORY&sub=UNIT" style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>
              Detail Unit →
            </Link>
          </div>
          {loading ? (
            <Skeleton height="150px" />
          ) : deptDist.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '260px', overflowY: 'auto' }}>
              {deptDist.map((d: any) => (
                <div
                  key={d.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface2)',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.74rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(228,37,44,0.12)', color: 'var(--color-primary)', fontWeight: 800 }}>
                        {d.code}
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                      Nilai Aset: <strong>{formatCurrency(d.totalValue || 0)}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-primary)' }}>{d.count} Aset</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{d.totalQty} Unit Fisik</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.88rem' }}>
              Belum ada data unit/fakultas.
            </div>
          )}
        </Card>
      </div>

      {/* Aset Baru Ditambahkan & Aset Bermasalah */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Aset Baru */}
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Plus size={18} style={{ color: '#10b981' }} /> Aset Baru Ditambahkan
            </h3>
            <Link href="/dashboard/assets" style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>
              Semua Aset →
            </Link>
          </div>
          {loading ? (
            <Skeleton height="160px" />
          ) : newestAssets.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {newestAssets.map((ast: any) => (
                <Link
                  key={ast.id}
                  href={`/dashboard/assets/${ast.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.95rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface2)',
                    textDecoration: 'none',
                    color: 'inherit',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ast.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ast.code}</span> • {ast.category?.name || '-'} • {formatDate(ast.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <Badge status={ast.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.88rem' }}>
              Belum ada aset baru.
            </div>
          )}
        </Card>

        {/* Aset Bermasalah */}
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <AlertTriangle size={18} style={{ color: '#ef4444' }} /> Aset Bermasalah &amp; Perlu Perbaikan
            </h3>
            <Link href="/dashboard/maintenance" style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>
              Menu Pemeliharaan →
            </Link>
          </div>
          {loading ? (
            <Skeleton height="160px" />
          ) : problematicAssets.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {problematicAssets.map((ast: any) => (
                <Link
                  key={ast.id}
                  href={`/dashboard/assets/${ast.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.95rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    textDecoration: 'none',
                    color: 'inherit',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ast.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ast.code}</span> • Kondisi: <strong style={{ color: '#ef4444' }}>{ast.condition || ' Bermasalah'}</strong> • {ast.location?.name || ast.location?.building || 'Gudang'}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <Badge status={ast.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-success)', fontSize: '0.88rem', background: 'rgba(16, 185, 129, 0.06)', borderRadius: 'var(--radius-md)' }}>
              <CheckCircle2 size={24} style={{ margin: '0 auto 0.4rem', display: 'block' }} />
              Seluruh aset dalam kondisi baik &amp; tidak ada kendala aktif.
            </div>
          )}
        </Card>
      </div>

      {/* Admin Monitoring Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Room Bookings */}
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building2 size={18} style={{ color: 'var(--color-primary)' }} /> Booking Ruangan Terbaru
            </h3>
            <Link href="/dashboard/room-bookings" style={{ fontSize: '0.82rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>
              Lihat Semua →
            </Link>
          </div>
          {loading ? (
            <Skeleton height="160px" />
          ) : data?.recentRoomBookings?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {data.recentRoomBookings.map((b: any) => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{b.location?.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Penyewa: {b.renter?.name} • {b.bookingNumber}</div>
                  </div>
                  <Badge status={b.bookingStatus} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.88rem' }}>Belum ada data booking ruangan.</div>
          )}
        </Card>

        {/* Live Assets Status Monitor */}
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Box size={18} style={{ color: 'var(--color-accent)' }} /> Monitor Status Aset Live
            </h3>
            <Link href="/dashboard/assets" style={{ fontSize: '0.82rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>Lihat Semua →</Link>
          </div>
          {loading ? (
            <Skeleton height="160px" />
          ) : data?.liveAssets?.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {data.liveAssets.slice(0, 8).map((ast: any) => (
                <div key={ast.id} style={{ padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ast.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}>{ast.code}</span>
                    <Badge status={ast.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.88rem' }}>Belum ada aset terdaftar.</div>
          )}
        </Card>
      </div>

      {/* ── STATISTIK LANJUTAN ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>

        {/* Tren Peminjaman 6 Bulan */}
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={18} style={{ color: '#6366f1' }} /> Tren Peminjaman — 6 Bulan Terakhir
            </h3>
          </div>
          {loading ? (
            <Skeleton height="160px" />
          ) : data?.monthlyTrend ? (
            <TrendLineChart data={data.monthlyTrend} />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.88rem' }}>Belum ada data tren.</div>
          )}
        </Card>

        {/* Distribusi Kategori Aset */}
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
            <BarChart2 size={18} style={{ color: '#f59e0b' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Distribusi Aset per Kategori</h3>
          </div>
          {loading ? (
            <Skeleton height="120px" />
          ) : data?.categoryDistribution?.length > 0 ? (
            <CategoryDonut data={data.categoryDistribution} />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.88rem' }}>Belum ada data kategori.</div>
          )}
        </Card>
      </div>

      {/* Top 10 Aset Terpopuler */}
      <Card style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🏆 Top 10 Aset Paling Sering Dipinjam
            <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--color-muted)', marginLeft: '0.35rem' }}>(6 bulan terakhir)</span>
          </h3>
          <Link href="/dashboard/assets" style={{ fontSize: '0.82rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>Lihat Semua →</Link>
        </div>
        {loading ? (
          <Skeleton height="200px" />
        ) : data?.topAssets?.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface2)' }}>
                  {['#', 'Nama Aset', 'Jumlah Dipinjam', 'Bar Utilisasi'].map((h, i) => (
                    <th key={h} style={{ padding: '0.7rem 1rem', textAlign: i < 2 ? 'left' : 'center', fontWeight: 700, borderBottom: '1.5px solid var(--color-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topAssets.map((asset: any, idx: number) => {
                  const maxCount = data.topAssets[0]?.count || 1;
                  const pct = (asset.count / maxCount) * 100;
                  return (
                    <tr key={asset.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.7rem 1rem', fontWeight: 800, color: idx < 3 ? '#f59e0b' : 'var(--color-muted)', width: '36px' }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </td>
                      <td style={{ padding: '0.7rem 1rem', fontWeight: 600 }}>{asset.name}</td>
                      <td style={{ padding: '0.7rem 1rem', textAlign: 'center', fontWeight: 800, color: 'var(--color-primary)' }}>{asset.count}×</td>
                      <td style={{ padding: '0.7rem 1rem', width: '200px' }}>
                        <div style={{ background: 'var(--color-surface2)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: idx < 3 ? '#f59e0b' : 'var(--color-primary)', borderRadius: '999px', transition: 'width 0.6s ease' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>Belum ada data peminjaman dalam 6 bulan terakhir.</div>
        )}
      </Card>
        </>
      )}
    </div>
  );
}

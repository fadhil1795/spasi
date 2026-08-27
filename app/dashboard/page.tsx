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
              <Link href="/dashboard/loans" style={{ fontSize: '0.82rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>
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
              <Link href="/dashboard/room-bookings" style={{ fontSize: '0.82rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>
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
    borrowedCount: 0,
    rentedCount: 0,
    maintenanceCount: 0,
    availableCount: 0,
    totalRooms: 0,
    totalRoomBookings: 0,
    activeRoomBookings: 0,
  };

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

      {/* Primary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {[
          { title: 'Total Aset Terdaftar', value: stats.totalAssets, icon: Box, color: 'var(--color-primary)' },
          { title: 'Aset Sedang Disewa/Pinjam', value: stats.borrowedCount + stats.rentedCount, icon: CalendarCheck, color: 'var(--color-warning)' },
          { title: 'Booking Ruangan Aktif', value: stats.activeRoomBookings, icon: Clock, color: 'var(--color-success)' },
          { title: 'Saldo Kas Akhir', value: formatCurrency(stats.totalCashBalance || 0), icon: FileText, color: 'var(--color-accent)' },
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
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>{kpi.value}</span>
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
    </div>
  );
}

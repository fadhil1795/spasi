'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Package,
  Filter,
  Box,
  Clock,
} from 'lucide-react';

interface AssetRentalCalendarProps {
  /** Jika di-pass, hanya tampilkan rental milik user tertentu */
  renterId?: string;
  /** Callback saat user klik slot kosong sebuah aset */
  onSelectSlot?: (assetId: string, date: Date) => void;
  /** Daftar rental yang sudah di-fetch dari luar (opsional) */
  rentals?: any[];
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    'var(--color-primary)',
  CONFIRMED: 'var(--color-success)',
  PENDING:   'var(--color-warning)',
  APPROVED:  '#7c3aed',
  COMPLETED: 'var(--color-muted)',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:    'Aktif',
  CONFIRMED: 'Dikonfirmasi',
  PENDING:   'Menunggu',
  APPROVED:  'Disetujui',
  COMPLETED: 'Selesai',
};

export function AssetRentalCalendar({ renterId, onSelectSlot, rentals: externalRentals }: AssetRentalCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [assets, setAssets] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>(externalRentals ?? []);
  const [loading, setLoading] = useState(!externalRentals);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('ALL');

  const buildAssets = (data: any[]) => {
    const assetMap = new Map<string, any>();
    data.forEach((r) => {
      if (r.asset && !assetMap.has(r.asset.id)) {
        assetMap.set(r.asset.id, r.asset);
      }
    });
    setAssets(Array.from(assetMap.values()));
  };

  useEffect(() => {
    if (externalRentals) {
      const active = externalRentals.filter((r) => r.status !== 'CANCELLED');
      setRentals(active);
      buildAssets(active);
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/rentals');
        if (res.ok) {
          const data: any[] = await res.json();
          const filtered = renterId ? data.filter((r) => r.renterId === renterId) : data;
          const active = filtered.filter((r) => r.status !== 'CANCELLED');
          setRentals(active);
          buildAssets(active);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Week helpers ────────────────────────────────────────────────
  const getWeekDates = (date: Date): Date[] => {
    const curr = new Date(date);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates(currentDate);
  const prevWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const nextWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); };
  const todayWeek = () => setCurrentDate(new Date());

  const filteredAssets = assets.filter((a) =>
    selectedAssetId === 'ALL' ? true : a.id === selectedAssetId
  );

  const findRentalsForDay = (assetId: string, date: Date) => {
    const dateStr = formatDate(date, 'yyyy-MM-dd');
    return rentals.filter((r) => {
      const rid = r.assetId || r.asset?.id;
      if (rid !== assetId) return false;
      const startStr = formatDate(new Date(r.startDate), 'yyyy-MM-dd');
      const endStr   = formatDate(new Date(r.endDate),   'yyyy-MM-dd');
      return dateStr >= startStr && dateStr <= endStr;
    });
  };

  return (
    <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} style={{ color: 'var(--color-warning)' }} />
            Jadwal Penyewaan Aset Minggu Ini
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
            Periode: {formatDate(weekDates[0], 'dd MMM yyyy')} — {formatDate(weekDates[6], 'dd MMM yyyy')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Asset Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--color-surface2)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
            <Filter size={14} style={{ color: 'var(--color-muted)' }} />
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <option value="ALL">Semua Aset ({assets.length})</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
              ))}
            </select>
          </div>

          {/* Week Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--color-surface2)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            <button className="btn btn-ghost btn-sm" onClick={prevWeek} title="Minggu Sebelumnya"><ChevronLeft size={16} /></button>
            <button className="btn btn-ghost btn-sm" onClick={todayWeek} style={{ fontWeight: 700, fontSize: '0.8rem' }}>Hari Ini</button>
            <button className="btn btn-ghost btn-sm" onClick={nextWeek} title="Minggu Berikutnya"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.8rem', background: 'var(--color-surface2)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
        {Object.entries(STATUS_LABEL).map(([k, label]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: STATUS_COLOR[k] }} />
            <span>{label} ({k})</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
          <span>Kosong (AVAILABLE)</span>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <Skeleton height="350px" />
      ) : assets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-muted)' }}>
          <Package size={44} style={{ margin: '0 auto 1rem', opacity: 0.18 }} />
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>Belum ada data penyewaan aset</div>
          <div style={{ fontSize: '0.82rem', marginTop: '0.35rem' }}>Data aset yang disewa akan tampil sebagai jadwal di sini.</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: '850px' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.85rem', width: '200px', textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--color-muted)', textAlign: 'left' }}>
                  Aset &amp; Peralatan
                </th>
                {weekDates.map((d, idx) => {
                  const isToday = formatDate(d, 'yyyy-MM-dd') === formatDate(new Date(), 'yyyy-MM-dd');
                  return (
                    <th key={idx} style={{ padding: '0.85rem 0.5rem', textAlign: 'center', background: isToday ? 'rgba(245,158,11,0.10)' : 'transparent', borderLeft: '1px solid var(--color-border)' }}>
                      <div style={{ fontWeight: 800, color: isToday ? '#f59e0b' : 'var(--color-text)' }}>{formatDate(d, 'EEEE')}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{formatDate(d, 'dd MMM')}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    <Box size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.2 }} />
                    Tidak ada data aset.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.85rem', fontWeight: 700, background: 'var(--color-surface2)', verticalAlign: 'top' }}>
                      <div style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Box size={14} /> {asset.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontFamily: 'monospace', fontWeight: 400, marginTop: '0.15rem' }}>
                        {asset.code}
                      </div>
                    </td>

                    {weekDates.map((date, dIdx) => {
                      const dayRentals = findRentalsForDay(asset.id, date);
                      const isToday = formatDate(date, 'yyyy-MM-dd') === formatDate(new Date(), 'yyyy-MM-dd');

                      return (
                        <td key={dIdx} style={{
                          padding: '0.5rem', verticalAlign: 'top', borderLeft: '1px solid var(--color-border)',
                          height: '80px',
                          background: isToday ? 'rgba(245,158,11,0.04)' : dayRentals.length > 0 ? 'var(--color-surface2)' : 'transparent',
                        }}>
                          {dayRentals.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              {dayRentals.map((r) => {
                                const sk = (r.status || 'PENDING').toUpperCase();
                                const bg = STATUS_COLOR[sk] || 'var(--color-muted)';
                                const isStart = formatDate(new Date(r.startDate), 'yyyy-MM-dd') === formatDate(date, 'yyyy-MM-dd');
                                const isEnd   = formatDate(new Date(r.endDate),   'yyyy-MM-dd') === formatDate(date, 'yyyy-MM-dd');
                                return (
                                  <div
                                    key={r.id}
                                    title={`${r.bookingNumber || r.id} — ${r.renter?.name || 'Penyewa'} | ${formatDate(new Date(r.startDate), 'dd MMM')} s.d ${formatDate(new Date(r.endDate), 'dd MMM')} | ${formatCurrency(r.totalAmount)}`}
                                    style={{
                                      background: bg, color: '#FFFFFF',
                                      padding: '0.3rem 0.5rem',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '0.7rem', fontWeight: 700,
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                      borderLeft: isStart ? '3px solid rgba(255,255,255,0.5)' : '3px solid transparent',
                                      opacity: sk === 'COMPLETED' ? 0.65 : 1,
                                    }}
                                  >
                                    {isStart && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.1rem', opacity: 0.85 }}>
                                        <Clock size={9} /><span style={{ fontSize: '0.64rem' }}>Mulai sewa</span>
                                      </div>
                                    )}
                                    {isEnd && !isStart && (
                                      <div style={{ fontSize: '0.64rem', opacity: 0.85, marginBottom: '0.1rem' }}>⏹ Akhir sewa</div>
                                    )}
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {r.renter?.name || 'Penyewa'}
                                    </div>
                                    {isStart && (
                                      <div style={{ fontSize: '0.62rem', opacity: 0.8, marginTop: '0.1rem' }}>
                                        s.d {formatDate(new Date(r.endDate), 'dd MMM')}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div
                              onClick={() => onSelectSlot && onSelectSlot(asset.id, date)}
                              style={{
                                height: '100%', minHeight: '60px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--color-muted)', fontSize: '0.72rem', opacity: 0.45,
                                cursor: onSelectSlot ? 'pointer' : 'default',
                                border: '1px dashed transparent', borderRadius: 'var(--radius-sm)', transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => { if (onSelectSlot) { e.currentTarget.style.border = '1px dashed #f59e0b'; e.currentTarget.style.opacity = '1'; } }}
                              onMouseLeave={(e) => { if (onSelectSlot) { e.currentTarget.style.border = '1px dashed transparent'; e.currentTarget.style.opacity = '0.45'; } }}
                            >
                              Tersedia
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

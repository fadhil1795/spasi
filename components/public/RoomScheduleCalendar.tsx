'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Building2,
  CheckCircle2,
  AlertCircle,
  Filter,
  User,
} from 'lucide-react';

interface RoomScheduleCalendarProps {
  onSelectSlot?: (roomId: string, date: Date, startTime: string) => void;
}

export function RoomScheduleCalendar({ onSelectSlot }: RoomScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resRooms, resBookings] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/room-bookings'),
      ]);

      if (resRooms.ok) setRooms(await resRooms.json());
      if (resBookings.ok) setBookings(await resBookings.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get 7 days of the current week (Monday to Sunday)
  const getWeekDates = (date: Date) => {
    const curr = new Date(date);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(curr.setDate(diff));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push(nextDay);
    }
    return week;
  };

  const weekDates = getWeekDates(currentDate);

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const todayWeek = () => {
    setCurrentDate(new Date());
  };

  const filteredRooms = rooms.filter((r) =>
    selectedRoomId === 'ALL' ? true : r.id === selectedRoomId
  );

  // Time slots 08:00 to 20:00
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00',
  ];

  // Helper to find booking for a room on a date at a specific hour
  const findBooking = (roomId: string, date: Date, hourStr: string) => {
    const slotHour = parseInt(hourStr.split(':')[0]);
    return bookings.find((b) => {
      if (b.locationId !== roomId) return false;
      if (['CANCELLED'].includes(b.bookingStatus)) return false;

      const start = new Date(b.startTime);
      const end = new Date(b.endTime);

      const slotDateStr = formatDate(date, 'yyyy-MM-dd');
      const startDateStr = formatDate(start, 'yyyy-MM-dd');

      if (slotDateStr !== startDateStr) return false;

      const startHour = start.getHours();
      const endHour = end.getHours();

      return slotHour >= startHour && slotHour < endHour;
    });
  };

  return (
    <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Calendar Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} style={{ color: 'var(--color-primary)' }} /> Jadwal Pemakaian Ruangan Minggu Ini
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
            Periode: {formatDate(weekDates[0], 'dd MMM yyyy')} — {formatDate(weekDates[6], 'dd MMM yyyy')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Room Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--color-surface2)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
            <Filter size={14} style={{ color: 'var(--color-muted)' }} />
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <option value="ALL">Semua Ruangan ({rooms.length})</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.building})</option>
              ))}
            </select>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--color-surface2)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            <button className="btn btn-ghost btn-sm" onClick={prevWeek} title="Minggu Sebelumnya">
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={todayWeek} style={{ fontWeight: 700, fontSize: '0.8rem' }}>
              Hari Ini
            </button>
            <button className="btn btn-ghost btn-sm" onClick={nextWeek} title="Minggu Berikutnya">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend Indicators */}
      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.8rem', background: 'var(--color-surface2)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--color-success)' }}></span>
          <span>Dikonfirmasi &amp; Lunas (CONFIRMED / PAID)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--color-primary)' }}></span>
          <span>Sedang Digunakan (ACTIVE Check-In)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--color-warning)' }}></span>
          <span>Menunggu Verifikasi (PENDING)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}></span>
          <span>Slot Jam Kosong (AVAILABLE)</span>
        </div>
      </div>

      {/* Interactive Matrix Grid Table */}
      {loading ? (
        <Skeleton height="350px" />
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: '850px' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.85rem', width: '180px', textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  Ruangan &amp; Gedung
                </th>
                {weekDates.map((d, idx) => {
                  const isToday = formatDate(d, 'yyyy-MM-dd') === formatDate(new Date(), 'yyyy-MM-dd');
                  return (
                    <th
                      key={idx}
                      style={{
                        padding: '0.85rem 0.5rem',
                        textAlign: 'center',
                        background: isToday ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                        borderLeft: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontWeight: 800, color: isToday ? 'var(--color-primary-light)' : 'var(--color-text)' }}>
                        {formatDate(d, 'EEEE')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                        {formatDate(d, 'dd MMM')}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => (
                <tr key={room.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.85rem', fontWeight: 700, background: 'var(--color-surface2)' }}>
                    <div style={{ color: 'var(--color-primary-light)' }}>{room.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 400 }}>
                      {room.building} • Kap. {room.capacity || '-'} Org
                    </div>
                  </td>

                  {weekDates.map((date, dIdx) => {
                    // Check if there are any bookings on this date for this room
                    const dayBookings = bookings.filter((b) => {
                      if (b.locationId !== room.id) return false;
                      if (['CANCELLED'].includes(b.bookingStatus)) return false;
                      return formatDate(new Date(b.startTime), 'yyyy-MM-dd') === formatDate(date, 'yyyy-MM-dd');
                    });

                    return (
                      <td
                        key={dIdx}
                        style={{
                          padding: '0.5rem',
                          verticalAlign: 'top',
                          borderLeft: '1px solid var(--color-border)',
                          height: '80px',
                          background: dayBookings.length > 0 ? 'var(--color-surface2)' : 'transparent',
                        }}
                      >
                        {dayBookings.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {dayBookings.map((b) => {
                              const isConfirmed = ['CONFIRMED'].includes(b.bookingStatus) || b.payStatus === 'PAID';
                              const isActive = b.bookingStatus === 'ACTIVE';

                              const bgColor = isActive
                                ? 'var(--color-primary)'
                                : isConfirmed
                                ? 'var(--color-success)'
                                : 'var(--color-warning)';

                              return (
                                <div
                                  key={b.id}
                                  title={`${b.bookingNumber} - Penyewa: ${b.renter?.name || 'User'} (${formatDate(b.startTime, 'HH:mm')} - ${formatDate(b.endTime, 'HH:mm')})`}
                                  style={{
                                    background: bgColor,
                                    color: '#FFFFFF',
                                    padding: '0.35rem 0.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    boxShadow: 'var(--shadow-sm)',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <Clock size={10} />
                                    <span>{formatDate(b.startTime, 'HH:mm')} - {formatDate(b.endTime, 'HH:mm')}</span>
                                  </div>
                                  <div style={{ opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.1rem' }}>
                                    {b.renter?.name || 'Penyewa'}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div
                            onClick={() => onSelectSlot && onSelectSlot(room.id, date, '08:00')}
                            style={{
                              height: '100%',
                              minHeight: '60px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--color-muted)',
                              fontSize: '0.75rem',
                              opacity: 0.5,
                              cursor: onSelectSlot ? 'pointer' : 'default',
                              border: '1px dashed transparent',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              if (onSelectSlot) e.currentTarget.style.border = '1px dashed var(--color-primary)';
                            }}
                            onMouseLeave={(e) => {
                              if (onSelectSlot) e.currentTarget.style.border = '1px dashed transparent';
                            }}
                          >
                            Tersedia
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

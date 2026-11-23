'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FilterPill } from '@/components/ui/FilterPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import { ROOM_TYPES, getRoomTypeLabel, getRoomTypeColor } from '@/lib/roomConstants';
import { Plus, Building2, Users, Clock, Package, Search, X, Printer, Eye, CheckSquare, QrCode, UserCheck } from 'lucide-react';

type RoomStatus = 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'INACTIVE';

interface Room {
  id: string;
  code: string | null;
  name: string;
  roomType?: string | null;
  building: string;
  floor: string | null;
  room?: string | null;
  areaName?: string | null;
  area?: number | null;
  capacity: number | null;
  pricePerHour: number | null;
  pricePerDay?: number | null;
  picName?: string | null;
  picPhone?: string | null;
  status: RoomStatus;
  photos: string[] | string;
  facilities?: string[] | string;
  isRentable?: boolean;
  isLoanable?: boolean;
  requiresDepositForInternal?: boolean;
  departmentId?: string | null;
  department?: { id: string; code: string; name: string } | null;
  _count?: { assets: number; roomBookings?: number };
}

const STATUS_FILTERS = [
  { label: 'SEMUA', value: '' },
  { label: 'TERSEDIA', value: 'AVAILABLE' },
  { label: 'DISEWA', value: 'RENTED' },
  { label: 'MAINTENANCE', value: 'MAINTENANCE' },
];

export default function DashboardRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('ALL');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  useEffect(() => {
    fetchRooms();
    fetch('/api/departments')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (Array.isArray(d)) setDepartments(d);
      })
      .catch(() => {});
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rooms');
      if (res.ok) setRooms(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const buildings = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      if (r.building && r.building.trim()) set.add(r.building.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rooms]);

  const filtered = useMemo(() => {
    return rooms.filter((r) => {
      if (activeFilter && r.status !== activeFilter) return false;
      if (buildingFilter !== 'ALL' && r.building !== buildingFilter) return false;
      if (roomTypeFilter !== 'ALL' && (r.roomType || 'CLASSROOM') !== roomTypeFilter) return false;
      if (departmentFilter !== 'ALL' && (r.departmentId || 'NONE') !== departmentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchCode = (r.code || '').toLowerCase().includes(q);
        const matchBuilding = r.building.toLowerCase().includes(q);
        const matchRoom = (r.room || '').toLowerCase().includes(q);
        const matchPic = (r.picName || '').toLowerCase().includes(q);
        const matchDept = (r.department?.name || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchBuilding && !matchRoom && !matchPic && !matchDept) return false;
      }
      return true;
    });
  }, [rooms, activeFilter, buildingFilter, roomTypeFilter, departmentFilter, searchQuery]);

  const countFor = (val: string) =>
    val === '' ? rooms.length : rooms.filter((r) => r.status === val).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Building2 size={28} style={{ color: 'var(--color-primary-light)' }} />
            Katalog &amp; Manajemen Ruangan Kampus
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Kelola data ruang kelas, laboratorium, aula serbaguna, dan fasilitas kampus untuk peminjaman internal maupun sewa komersial.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/dashboard/buildings" className="btn btn-secondary">
            <Building2 size={16} /> Master Gedung &amp; Unit Fakultas
          </Link>
          <Link href="/dashboard/rooms/new" className="btn btn-primary">
            <Plus size={18} /> Tambah Ruangan Baru
          </Link>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="spasi-card" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Status Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map((f) => (
              <FilterPill
                key={f.value}
                label={f.label}
                active={activeFilter === f.value}
                onClick={() => setActiveFilter(f.value)}
                count={countFor(f.value)}
              />
            ))}
          </div>

          {(searchQuery || buildingFilter !== 'ALL' || roomTypeFilter !== 'ALL' || activeFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setBuildingFilter('ALL');
                setRoomTypeFilter('ALL');
                setActiveFilter('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-danger)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Input Baris 2: Search, Tipe & Building Dropdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-muted)',
              }}
            />
            <input
              className="input-field"
              style={{ paddingLeft: '2.2rem', height: '38px', fontSize: '0.85rem' }}
              placeholder="Cari nama, kode, gedung, PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-muted)',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div>
            <select
              className="input-field"
              style={{ height: '38px', fontSize: '0.85rem', cursor: 'pointer' }}
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value)}
            >
              <option value="ALL">-- Semua Tipe Ruangan --</option>
              {ROOM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="input-field"
              style={{ height: '38px', fontSize: '0.85rem', cursor: 'pointer' }}
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
            >
              <option value="ALL">-- Semua Gedung ({buildings.length} Gedung) --</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="input-field"
              style={{ height: '38px', fontSize: '0.85rem', cursor: 'pointer' }}
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="ALL">-- Semua Unit / Fakultas --</option>
              <option value="NONE">Fasilitas Umum / Pusat</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  [{d.code}] {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} style={{ padding: 0, overflow: 'hidden' }}>
              <Skeleton height="180px" borderRadius="0" />
              <div
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                <Skeleton height="1.4rem" width="70%" />
                <Skeleton height="1rem" width="50%" />
                <Skeleton height="1rem" width="40%" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filtered.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      ) : (
        <Card
          style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--color-muted)' }}
        >
          <div style={{ marginBottom: '1rem', opacity: 0.4 }}>
            <Building2 size={40} style={{ margin: '0 auto' }} />
          </div>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>
            Tidak ada ruangan yang cocok.
          </p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Coba ubah kata kunci pencarian atau gedung yang Anda pilih.
          </p>
        </Card>
      )}
    </div>
  );
}

function RoomCard({ room }: { room: Room }) {
  // Safe parsing of photos array/JSON string
  let photoList: string[] = [];
  try {
    if (typeof room.photos === 'string') {
      photoList = JSON.parse(room.photos);
    } else if (Array.isArray(room.photos)) {
      photoList = room.photos;
    }
  } catch {
    photoList = [];
  }
  const photo = photoList && photoList.length > 0 ? photoList[0] : null;

  return (
    <Card
      style={{
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      hoverable
    >
      {/* Photo */}
      <div
        style={{
          width: '100%',
          height: '180px',
          background: 'var(--color-surface2)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={room.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-muted)',
            }}
          >
            <Building2 size={40} opacity={0.3} />
          </div>
        )}
        <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', gap: '0.3rem', flexDirection: 'column' }}>
          {room.isLoanable && (
            <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: '#22c55e', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Pinjam Internal
            </span>
          )}
          {room.isRentable && (
            <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: '#3b82f6', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Sewa Komersial
            </span>
          )}
        </div>
        <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
          <Badge status={room.status} />
        </div>
      </div>

      {/* Info */}
      <div
        style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          flex: 1,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: getRoomTypeColor(room.roomType),
                background: `${getRoomTypeColor(room.roomType)}18`,
                padding: '0.12rem 0.45rem',
                borderRadius: '4px',
              }}
            >
              {getRoomTypeLabel(room.roomType)}
            </span>
            {room.code && (
              <span
                style={{
                  fontSize: '0.74rem',
                  color: 'var(--color-primary-light)',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                }}
              >
                {room.code}
              </span>
            )}
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)' }}>{room.name}</div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            color: 'var(--color-muted)',
            flexWrap: 'wrap',
          }}
        >
          <Building2 size={13} style={{ flexShrink: 0 }} />
          <span>
            <strong>{room.building}</strong>
            {room.floor ? `, Lantai ${room.floor}` : ''}
            {room.room ? ` (${room.room})` : ''}
          </span>
          {room.department && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.1rem 0.45rem',
                borderRadius: '4px',
                background: 'rgba(16, 185, 129, 0.14)',
                color: 'var(--color-success)',
              }}
            >
              {room.department.code}
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            fontSize: '0.85rem',
            color: 'var(--color-muted)',
            flexWrap: 'wrap',
          }}
        >
          {room.capacity != null && (
            <span
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Users size={13} /> {room.capacity} orang
            </span>
          )}
          {room.area != null && (
            <span style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
              📐 {room.area} m²
            </span>
          )}
          {room.pricePerHour != null && (
            <span
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-success)', fontWeight: 600 }}
            >
              <Clock size={13} /> {formatCurrency(room.pricePerHour)}/jam
            </span>
          )}
        </div>

        {room.picName && (
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--color-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <UserCheck size={13} style={{ color: 'var(--color-primary-light)' }} />
            PIC: <strong style={{ color: 'var(--color-text)' }}>{room.picName}</strong>
          </div>
        )}

        {room._count !== undefined && (
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Package size={13} /> <strong>{room._count.assets}</strong> aset terpasang di ruangan
          </div>
        )}

        {/* Action Button Row */}
        <div style={{ marginTop: 'auto', paddingTop: '0.75rem', display: 'flex', gap: '0.45rem' }}>
          <Link
            href={`/dashboard/rooms/${room.id}/qr`}
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: 'center', fontSize: '0.76rem', padding: '0.35rem 0.6rem' }}
            title="Cetak Stiker QR Pintu Ruangan"
          >
            <QrCode size={14} /> QR
          </Link>
          <Link
            href={`/dashboard/rooms/${room.id}/kir`}
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: 'center', fontSize: '0.76rem', padding: '0.35rem 0.6rem' }}
            title="Cetak Kartu Inventaris Ruangan (KIR)"
          >
            <Printer size={14} /> KIR
          </Link>
          <Link
            href={`/dashboard/rooms/${room.id}`}
            className="btn btn-primary btn-sm"
            style={{ flex: 1, justifyContent: 'center', fontSize: '0.76rem' }}
          >
            <Eye size={14} /> Detail
          </Link>
        </div>
      </div>
    </Card>
  );
}

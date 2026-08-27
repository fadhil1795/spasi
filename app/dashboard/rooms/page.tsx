'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FilterPill } from '@/components/ui/FilterPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import { Plus, Building2, Users, Clock, Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

type RoomStatus = 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'INACTIVE';

interface Room {
  id: string;
  code: string | null;
  name: string;
  building: string;
  floor: string | null;
  areaName: string | null;
  capacity: number | null;
  pricePerHour: number | null;
  status: RoomStatus;
  photos: string[];
  _count?: { assets: number };
}

const STATUS_FILTERS = [
  { label: 'SEMUA', value: '' },
  { label: 'TERSEDIA', value: 'AVAILABLE' },
  { label: 'DISEWA', value: 'RENTED' },
  { label: 'MAINTENANCE', value: 'MAINTENANCE' },
];

export default function DashboardRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');

  useEffect(() => {
    fetchRooms();
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

  const filtered = activeFilter
    ? rooms.filter((r) => r.status === activeFilter)
    : rooms;

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
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Manajemen Ruangan Sewa</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Kelola daftar ruangan, fasilitas, tarif, dan status ketersediaan.
          </p>
        </div>
        <Link href="/dashboard/rooms/new" className="btn btn-primary">
          <Plus size={18} /> Tambah Ruangan
        </Link>
      </div>

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
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

      {/* Room Grid */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filtered.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      ) : (
        <Card
          style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}
        >
          <div style={{ marginBottom: '1rem', opacity: 0.4 }}>
            <Building2 size={40} style={{ margin: '0 auto' }} />
          </div>
          <p style={{ fontSize: '1rem' }}>Tidak ada ruangan yang ditemukan.</p>
        </Card>
      )}
    </div>
  );
}

function RoomCard({ room }: { room: Room }) {
  const photo = room.photos?.[0] || null;

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
          <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{room.name}</div>
          {room.code && (
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-primary-light)',
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
            >
              {room.code}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            color: 'var(--color-muted)',
          }}
        >
          <Building2 size={13} />
          <span>
            {room.building}
            {room.floor ? `, Lantai ${room.floor}` : ''}
            {room.areaName ? ` — ${room.areaName}` : ''}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            fontSize: '0.85rem',
            color: 'var(--color-muted)',
          }}
        >
          {room.capacity != null && (
            <span
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Users size={13} /> {room.capacity} orang
            </span>
          )}
          {room.pricePerHour != null && (
            <span
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Clock size={13} /> {formatCurrency(room.pricePerHour)}/jam
            </span>
          )}
        </div>

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
            <Package size={13} /> {room._count.assets} aset terpasang
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
          <Link
            href={`/dashboard/rooms/${room.id}`}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Lihat Detail
          </Link>
        </div>
      </div>
    </Card>
  );
}

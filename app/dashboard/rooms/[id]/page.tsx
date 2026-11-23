'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getRoomTypeLabel, getRoomTypeColor, parseFacilities } from '@/lib/roomConstants';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  Users,
  Clock,
  DollarSign,
  Package,
  CalendarDays,
  History,
  Info,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Printer,
  QrCode,
  UserCheck,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomDetail {
  id: string;
  code: string | null;
  name: string;
  roomType?: string | null;
  building: string;
  floor: string | null;
  room?: string | null;
  areaName: string | null;
  area: number | null;
  capacity: number | null;
  picName?: string | null;
  picPhone?: string | null;
  description: string | null;
  pricePerHour: number | null;
  pricePerDay: number | null;
  deposit: number | null;
  depositAmount?: number | null;
  isRentable?: boolean;
  isLoanable?: boolean;
  requiresDepositForInternal?: boolean;
  facilities: string[] | any;
  photos: string[];
  status: string;
  assets?: AssetRow[];
  assetAllocations?: any[];
  bookings?: BookingRow[];
  roomBookings?: any[];
}

interface AssetRow {
  id: string;
  code: string;
  name: string;
  category?: { name: string };
  condition: string;
  status: string;
}

interface BookingRow {
  id: string;
  bookingNumber: string;
  renterName: string;
  startTime: string;
  endTime: string;
  totalAmount: number | null;
  status: string;
}

interface SlotRow {
  id: string;
  bookingNumber: string;
  renterName: string;
  startTime: string;
  endTime: string;
  status: string;
}

// ── Tab configuration ─────────────────────────────────────────────────────────

const TABS = [
  { key: 'info', label: 'Info', icon: Info },
  { key: 'inventaris', label: 'Inventaris', icon: Package },
  { key: 'ketersediaan', label: 'Ketersediaan', icon: CalendarDays },
  { key: 'riwayat', label: 'Riwayat Sewa', icon: History },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const roomId = params?.id as string;

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [photoIdx, setPhotoIdx] = useState(0);

  const [availability, setAvailability] = useState<SlotRow[]>([]);
  const [availLoading, setAvailLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load room detail
  useEffect(() => {
    if (!roomId) return;
    fetchRoom();
  }, [roomId]);

  // Load availability when that tab is selected
  useEffect(() => {
    if (activeTab === 'ketersediaan' && roomId) {
      fetchAvailability();
    }
  }, [activeTab, roomId]);

  const fetchRoom = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/rooms/${roomId}`);
      if (res.ok) setRoom(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      setAvailLoading(true);
      const res = await fetch(`/api/rooms/${roomId}/availability`);
      if (res.ok) setAvailability(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setAvailLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Ruangan berhasil dihapus.', 'success');
        router.push('/dashboard/rooms');
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menghapus ruangan.', 'error');
        setDeleteOpen(false);
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan jaringan.', 'error');
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  // ── Loading State ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Skeleton height="2.5rem" width="60%" />
        <Skeleton height="1rem" width="30%" />
        <Card style={{ padding: '1.5rem' }}>
          <Skeleton height="200px" style={{ marginBottom: '1rem' }} />
          <Skeleton height="1.2rem" width="80%" style={{ marginBottom: '0.6rem' }} />
          <Skeleton height="1rem" width="60%" style={{ marginBottom: '0.6rem' }} />
          <Skeleton height="1rem" width="50%" />
        </Card>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
        <p>Ruangan tidak ditemukan.</p>
        <Link href="/dashboard/rooms" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Kembali
        </Link>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Back */}
      <Link
        href="/dashboard/rooms"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.85rem',
          color: 'var(--color-muted)',
        }}
      >
        <ArrowLeft size={15} /> Kembali ke Daftar Ruangan
      </Link>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{room.name}</h1>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.2rem 0.55rem',
                borderRadius: '4px',
                color: getRoomTypeColor(room.roomType),
                background: `${getRoomTypeColor(room.roomType)}18`,
              }}
            >
              {getRoomTypeLabel(room.roomType)}
            </span>
            {room.code && (
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.6rem',
                  background: 'var(--color-surface2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-primary-light)',
                }}
              >
                {room.code}
              </span>
            )}
            <Badge status={room.status} />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              fontSize: '0.85rem',
              color: 'var(--color-muted)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Building2 size={13} />
              {room.building}
              {room.floor ? `, Lantai ${room.floor}` : ''}
              {room.room ? ` (${room.room})` : (room.areaName ? ` — ${room.areaName}` : '')}
            </span>
            {room.picName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <UserCheck size={13} style={{ color: 'var(--color-primary-light)' }} />
                PIC: <strong style={{ color: 'var(--color-text)' }}>{room.picName}</strong>
                {room.picPhone && ` (${room.picPhone})`}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Link
            href={`/dashboard/rooms/${room.id}/qr`}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <QrCode size={16} /> Cetak QR Pintu
          </Link>
          <Link
            href={`/dashboard/rooms/${room.id}/kir`}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Printer size={16} /> Cetak KIR Ruangan
          </Link>
          <Link
            href={`/dashboard/rooms/${room.id}/edit`}
            className="btn btn-secondary"
          >
            <Edit size={16} /> Edit
          </Link>
          <Button
            variant="danger"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={16} /> Hapus
          </Button>
        </div>
      </div>

      {/* Pengelolaan Ruangan yang Sedang Disewa / Siap Check-In */}
      {(() => {
        const activeOrConfirmed = (room.roomBookings || []).filter((b: any) =>
          ['ACTIVE', 'RETURN_REQUESTED', 'CONFIRMED'].includes(b.bookingStatus)
        );
        if (activeOrConfirmed.length === 0) return null;

        return (
          <Card
            style={{
              padding: '1.15rem 1.35rem',
              border: '1px solid var(--color-primary-light)',
              background: 'rgba(124, 58, 237, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--color-text)' }}>
              🔑 Pengelolaan Penggunaan Ruangan Aktif ({activeOrConfirmed.length})
            </div>
            {activeOrConfirmed.map((b: any) => (
              <div
                key={b.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                      {b.bookingNumber}
                    </span>
                    <strong>{b.renter?.name || '-'}</strong>
                    <Badge status={b.bookingStatus} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                    Jadwal: {formatDate(b.startTime, 'dd MMM yyyy HH:mm')} s.d. {formatDate(b.endTime, 'dd MMM yyyy HH:mm')}
                    {b.addonAssets?.length > 0 && ` • +${b.addonAssets.length} Peralatan`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {b.bookingStatus === 'CONFIRMED' && (
                    <Link href={`/dashboard/room-bookings/${b.id}/checkin`} className="btn btn-secondary btn-sm">
                      Serah Terima Masuk (Check-In)
                    </Link>
                  )}
                  {['ACTIVE', 'RETURN_REQUESTED'].includes(b.bookingStatus) && (
                    <Link href={`/dashboard/room-bookings/${b.id}/checkout`} className="btn btn-primary btn-sm">
                      Serah Terima Keluar (Check-Out)
                    </Link>
                  )}
                  <Link href={`/dashboard/room-bookings/${b.id}`} className="btn btn-ghost btn-sm">
                    Detail Booking
                  </Link>
                </div>
              </div>
            ))}
          </Card>
        );
      })()}

      {/* Tab Nav */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '0',
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1.1rem',
                fontSize: '0.9rem',
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--color-primary-light)' : 'var(--color-muted)',
                background: 'transparent',
                border: 'none',
                borderBottom: active
                  ? '2px solid var(--color-primary-light)'
                  : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '-1px',
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && <TabInfo room={room} photoIdx={photoIdx} setPhotoIdx={setPhotoIdx} />}
      {activeTab === 'inventaris' && <TabInventaris room={room} />}
      {activeTab === 'ketersediaan' && <TabKetersediaan slots={availability} loading={availLoading} />}
      {activeTab === 'riwayat' && <TabRiwayat room={room} />}

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Konfirmasi Hapus Ruangan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" isLoading={deleting} onClick={handleDelete}>
              Ya, Hapus Ruangan
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--color-muted)', lineHeight: 1.6 }}>
          Apakah Anda yakin ingin menghapus ruangan{' '}
          <strong style={{ color: 'var(--color-text)' }}>{room.name}</strong>? Tindakan ini
          tidak dapat dibatalkan.
        </p>
      </Modal>
    </div>
  );
}

// ── Tab: INFO ─────────────────────────────────────────────────────────────────

function TabInfo({
  room,
  photoIdx,
  setPhotoIdx,
}: {
  room: RoomDetail;
  photoIdx: number;
  setPhotoIdx: React.Dispatch<React.SetStateAction<number>>;
}) {
  const parseArr = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return []; }
  };

  const photos = parseArr(room.photos);
  const facilities = parseFacilities(room.facilities);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Photo Slideshow */}
      {photos.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ position: 'relative', width: '100%', height: '320px', background: 'var(--color-surface2)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[photoIdx]}
              alt={`${room.name} foto ${photoIdx + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <ChevronRight size={20} />
                </button>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '0.75rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '0.4rem',
                  }}
                >
                  {photos.map((_: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        border: 'none',
                        background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Detail Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Spesifikasi */}
        <Card style={{ padding: '1.5rem' }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-primary-light)',
              marginBottom: '1rem',
            }}
          >
            Spesifikasi
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <InfoRow icon={<Building2 size={15} />} label="Lokasi">
              {room.building}
              {room.floor ? `, Lantai ${room.floor}` : ''}
              {room.room ? ` — ${room.room}` : room.areaName ? ` — ${room.areaName}` : ''}
            </InfoRow>
            {room.area != null && (
              <InfoRow icon={<Package size={15} />} label="Luas">
                {room.area} m²
              </InfoRow>
            )}
            {room.capacity != null && (
              <InfoRow icon={<Users size={15} />} label="Kapasitas">
                {room.capacity} orang
              </InfoRow>
            )}
          </div>
        </Card>

        {/* Tarif */}
        <Card style={{ padding: '1.5rem' }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-primary-light)',
              marginBottom: '1rem',
            }}
          >
            Tarif & Keuangan
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {room.pricePerHour != null && (
              <InfoRow icon={<Clock size={15} />} label="Harga per Jam">
                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                  {formatCurrency(room.pricePerHour)}
                </span>
              </InfoRow>
            )}
            {room.pricePerDay != null && (
              <InfoRow icon={<CalendarDays size={15} />} label="Harga per Hari">
                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                  {formatCurrency(room.pricePerDay)}
                </span>
              </InfoRow>
            )}
            {(room.depositAmount != null || room.deposit != null) && (
              <InfoRow icon={<DollarSign size={15} />} label="Deposit Jaminan">
                {formatCurrency(room.depositAmount ?? room.deposit)}
              </InfoRow>
            )}
            <div style={{ borderTop: '1px solid var(--color-border)', margin: '0.5rem 0', paddingTop: '0.5rem' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: room.isLoanable ? 'var(--color-success)' : 'var(--color-muted)' }} />
                <span style={{ color: room.isLoanable ? 'var(--color-text)' : 'var(--color-muted)' }}>
                  Bisa Dipinjam Gratis (Internal): <strong>{room.isLoanable ? 'Ya' : 'Tidak'}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: room.isRentable ? 'var(--color-success)' : 'var(--color-muted)' }} />
                <span style={{ color: room.isRentable ? 'var(--color-text)' : 'var(--color-muted)' }}>
                  Bisa Disewa Berbayar: <strong>{room.isRentable ? 'Ya' : 'Tidak'}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: room.requiresDepositForInternal ? 'var(--color-warning)' : 'var(--color-muted)' }} />
                <span style={{ color: room.requiresDepositForInternal ? 'var(--color-text)' : 'var(--color-muted)' }}>
                  Wajib Deposit bagi Internal: <strong>{room.requiresDepositForInternal ? 'Ya' : 'Tidak'}</strong>
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Fasilitas */}
      {facilities && facilities.length > 0 && (
        <Card style={{ padding: '1.5rem' }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-primary-light)',
              marginBottom: '1rem',
            }}
          >
            Fasilitas
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {facilities.map((fac, i) => (
              <span
                key={`${fac.name}-${i}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.32rem 0.8rem',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-success-bg)',
                  color: 'var(--color-success)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={12} /> {fac.name}
                {fac.qty > 1 && (
                  <span style={{ background: 'rgba(16, 185, 129, 0.25)', padding: '0.05rem 0.35rem', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 800 }}>
                    {fac.qty}
                  </span>
                )}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Deskripsi */}
      {room.description && (
        <Card style={{ padding: '1.5rem' }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-primary-light)',
              marginBottom: '0.75rem',
            }}
          >
            Deskripsi & Aturan
          </div>
          <p style={{ lineHeight: 1.7, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            {room.description}
          </p>
        </Card>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.85rem',
          color: 'var(--color-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        {icon} {label}
      </span>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>
        {children}
      </span>
    </div>
  );
}

// ── Tab: INVENTARIS ───────────────────────────────────────────────────────────

function TabInventaris({ room }: { room: RoomDetail }) {
  // Gabungkan aset yang tertaut langsung (assets) dan aset alokasi jumlah (assetAllocations)
  const combinedMap = new Map<string, any>();

  (room.assets ?? []).forEach((a: any) => {
    combinedMap.set(a.id, { ...a, roomQty: a.quantity || 1 });
  });

  (room.assetAllocations ?? []).forEach((al: any) => {
    if (al.asset) {
      combinedMap.set(al.asset.id, { ...al.asset, roomQty: al.quantity || 1 });
    }
  });

  const assets = Array.from(combinedMap.values());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <Link
          href={`/dashboard/rooms/${room.id}/edit`}
          className="btn btn-secondary btn-sm"
        >
          <Edit size={15} /> Atur Jumlah &amp; Aset Ruangan
        </Link>
        <Link
          href={`/dashboard/assets/new?roomId=${room.id}`}
          className="btn btn-primary btn-sm"
        >
          <Package size={15} /> + Tambah Aset Baru ke Ruangan
        </Link>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.9rem',
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'var(--color-surface2)',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-muted)',
                }}
              >
                <th style={{ padding: '1rem 1.25rem' }}>Kode</th>
                <th style={{ padding: '1rem' }}>Nama Aset</th>
                <th style={{ padding: '1rem' }}>Kategori</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Jumlah di Ruangan</th>
                <th style={{ padding: '1rem' }}>Kondisi</th>
                <th style={{ padding: '1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.length > 0 ? (
                assets.map((a) => (
                  <tr
                    key={a.id}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <td
                      style={{
                        padding: '1rem 1.25rem',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: 'var(--color-primary-light)',
                      }}
                    >
                      <Link href={`/dashboard/assets/${a.id}`}>{a.code}</Link>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{a.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--color-muted)' }}>
                      {a.category?.name ?? '-'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                      {a.roomQty} Unit
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Badge status={a.condition} />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Badge status={a.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: '3rem',
                      textAlign: 'center',
                      color: 'var(--color-muted)',
                    }}
                  >
                    Belum ada aset yang di-assign ke ruangan ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Tab: KETERSEDIAAN ─────────────────────────────────────────────────────────

function TabKetersediaan({
  slots,
  loading,
}: {
  slots: SlotRow[];
  loading: boolean;
}) {
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem',
          color: 'var(--color-muted)',
        }}
      >
        <CalendarDays size={16} />
        <span>Slot terbooking hari ini — {today}</span>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <Skeleton height="3rem" />
            <Skeleton height="3rem" />
            <Skeleton height="3rem" />
          </div>
        ) : slots.length > 0 ? (
          <div>
            {slots.map((slot, i) => (
              <div
                key={slot.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderBottom:
                    i < slots.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary-light)', fontSize: '0.85rem' }}>
                    {slot.bookingNumber}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{slot.renterName}</div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                  <div>{formatDate(slot.startTime, 'HH:mm')} — {formatDate(slot.endTime, 'HH:mm')}</div>
                </div>
                <Badge status={slot.status} />
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              color: 'var(--color-muted)',
            }}
          >
            Tidak ada booking untuk hari ini.
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Tab: RIWAYAT SEWA ─────────────────────────────────────────────────────────

function TabRiwayat({ room }: { room: RoomDetail }) {
  const bookings = room.roomBookings ?? room.bookings ?? [];

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.9rem',
          }}
        >
          <thead>
            <tr
              style={{
                background: 'var(--color-surface2)',
                borderBottom: '1px solid var(--color-border)',
                color: 'var(--color-muted)',
              }}
            >
              <th style={{ padding: '1rem 1.25rem' }}>No. Booking</th>
              <th style={{ padding: '1rem' }}>Penyewa</th>
              <th style={{ padding: '1rem' }}>Waktu</th>
              <th style={{ padding: '1rem' }}>Total</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length > 0 ? (
              bookings.map((b: any) => {
                const status = b.bookingStatus || b.status;
                const renterName = b.renter?.name || b.renterName || '-';
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td
                      style={{
                        padding: '1rem 1.25rem',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: 'var(--color-primary-light)',
                      }}
                    >
                      {b.bookingNumber}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{renterName}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                      {formatDate(b.startTime, 'dd MMM yyyy HH:mm')}
                      <br />
                      s/d {formatDate(b.endTime, 'dd MMM yyyy HH:mm')}
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                        fontWeight: 700,
                        color: 'var(--color-success)',
                      }}
                    >
                      {b.totalAmount != null ? formatCurrency(b.totalAmount) : '-'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Badge status={status} />
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {status === 'CONFIRMED' && (
                          <Link href={`/dashboard/room-bookings/${b.id}/checkin`} className="btn btn-secondary btn-sm">
                            Check-In
                          </Link>
                        )}
                        {['ACTIVE', 'RETURN_REQUESTED'].includes(status) && (
                          <Link href={`/dashboard/room-bookings/${b.id}/checkout`} className="btn btn-primary btn-sm">
                            Check-Out
                          </Link>
                        )}
                        <Link href={`/dashboard/room-bookings/${b.id}`} className="btn btn-ghost btn-sm">
                          Detail
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '3rem',
                    textAlign: 'center',
                    color: 'var(--color-muted)',
                  }}
                >
                  Belum ada riwayat sewa untuk ruangan ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

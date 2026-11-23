'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { PublicNavbar } from '@/components/public/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useCart } from '@/components/public/CartContext';
import { formatCurrency } from '@/lib/utils';
import { parseFacilities } from '@/lib/roomConstants';
import { MapPin, Users, Maximize, ArrowLeft, CheckCircle2, ShieldCheck, ShoppingBag, ChevronRight, Check } from 'lucide-react';

export default function PublicRoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { addToCart } = useCart();

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState<string>('');

  // Booking Widget State
  const [rentalType, setRentalType] = useState<'HOURLY' | 'DAILY'>('HOURLY');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [availabilityState, setAvailabilityState] = useState<'idle'|'checking'|'available'|'unavailable'>('idle');
  const [availabilityMessage, setAvailabilityMessage] = useState('');

  useEffect(() => {
    fetchRoom();
  }, [params.id]);

  const fetchRoom = async () => {
    try {
      const res = await fetch(`/api/rooms/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data);
        const photos = data.photos ? JSON.parse(data.photos) : [];
        if (photos.length > 0) setSelectedImg(photos[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = () => {
    if (rentalType === 'HOURLY') {
      if (!startTime || !endTime) return 0;
      const [h1, m1] = startTime.split(':').map(Number);
      const [h2, m2] = endTime.split(':').map(Number);
      let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
      return diff > 0 ? diff : 0;
    } else {
      if (!bookingDate || !endDate) return 0;
      const d1 = new Date(bookingDate).getTime();
      const d2 = new Date(endDate).getTime();
      const diffDays = Math.ceil((d2 - d1) / (1000 * 3600 * 24));
      return Math.max(1, diffDays);
    }
  };

  const duration = calculateDuration();
  const priceRate = rentalType === 'HOURLY' ? (room?.pricePerHour || 0) : (room?.pricePerDay || (room?.pricePerHour || 0) * 8);
  const subtotal = duration * priceRate;

  const handleAddToCart = () => {
    if (!room) return;
    if (!session || !session.user) {
      showToast('Silakan login terlebih dahulu untuk memasukkan ruangan ke keranjang.', 'error');
      router.push(`/login?callbackUrl=/rooms/${room.id}`);
      return;
    }

    const photos = room.photos ? JSON.parse(room.photos) : [];
    const photoUrl = photos.length > 0 ? photos[0] : null;

    const added = addToCart({
      id: `cart_${room.id}_${Date.now()}`,
      userId: (session.user as any).id || undefined,
      userEmail: session.user.email || undefined,
      roomId: room.id,
      roomName: room.name,
      roomCode: room.code,
      building: room.building,
      photoUrl,
      bookingDate,
      startTime: startTime || '08:00',
      endTime: endTime || '17:00',
      rentalType,
      durationHours: duration,
      priceRate,
      roomSubtotal: subtotal,
      depositAmount: room.depositAmount || 0,
      addOns: [],
    });

    if (added) {
      showToast('Ruangan berhasil ditambahkan ke keranjang!', 'success');
    }
  };

  const handleCheckAvailability = async () => {
    let startIso = '';
    let endIso = '';

    if (rentalType === 'HOURLY') {
      if (!bookingDate || !startTime || !endTime) {
        setAvailabilityState('unavailable');
        setAvailabilityMessage('Harap lengkapi tanggal dan jam sewa');
        return;
      }
      if (calculateDuration() <= 0) {
        setAvailabilityState('unavailable');
        setAvailabilityMessage('Jam selesai harus lebih besar dari jam mulai');
        return;
      }
      startIso = new Date(`${bookingDate}T${startTime}:00`).toISOString();
      endIso = new Date(`${bookingDate}T${endTime}:00`).toISOString();
    } else {
      if (!bookingDate) {
        setAvailabilityState('unavailable');
        setAvailabilityMessage('Harap pilih tanggal sewa');
        return;
      }
      const targetEndDate = endDate || bookingDate;
      startIso = new Date(`${bookingDate}T08:00:00`).toISOString();
      endIso = new Date(`${targetEndDate}T17:00:00`).toISOString();
    }

    try {
      setAvailabilityState('checking');
      const res = await fetch(`/api/rooms/${params.id}/availability?startTime=${startIso}&endTime=${endIso}`);
      const data = await res.json();
      
      if (data.isAvailable || data.available) {
        setAvailabilityState('available');
        setAvailabilityMessage('Tersedia!');
      } else {
        setAvailabilityState('unavailable');
        setAvailabilityMessage(data.error || data.reason || 'Tidak tersedia');
      }
    } catch (e) {
      setAvailabilityState('unavailable');
      setAvailabilityMessage('Gagal mengecek ketersediaan');
    }
  };

  const handleProceedBooking = () => {
    if (availabilityState !== 'available') return;
    if (!session || !session.user) {
      showToast('Silakan login terlebih dahulu untuk melanjutkan pemesanan.', 'error');
      router.push(`/login?callbackUrl=/rooms/${params.id}`);
      return;
    }

    let startIso = '';
    let endIso = '';
    if (rentalType === 'HOURLY') {
      startIso = new Date(`${bookingDate}T${startTime}:00`).toISOString();
      endIso = new Date(`${bookingDate}T${endTime}:00`).toISOString();
    } else {
      const targetEndDate = endDate || bookingDate;
      startIso = new Date(`${bookingDate}T08:00:00`).toISOString();
      endIso = new Date(`${targetEndDate}T17:00:00`).toISOString();
    }
    router.push(`/rooms/${params.id}/booking?start=${startIso}&end=${endIso}&rentalType=${rentalType}`);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <Skeleton height="30px" width="200px" style={{ marginBottom: '2rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
          <div>
            <Skeleton height="450px" borderRadius="var(--radius-lg)" />
          </div>
          <div>
            <Skeleton height="500px" borderRadius="var(--radius-xl)" />
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg)' }}>
        <PublicNavbar />
        <div style={{ padding: '6rem 2rem', textAlign: 'center' }}>
          <h2>Ruangan tidak ditemukan</h2>
          <Link href="/rooms" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>Kembali ke Katalog</Link>
        </div>
      </div>
    );
  }

  const photos = room.photos ? JSON.parse(room.photos) : [];
  if (photos.length === 0) photos.push('https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop');
  const currentImg = selectedImg || photos[0];
  const facilities = parseFacilities(room.facilities);
  const fixedAssets = room.assets?.filter((a: any) => a.isFixedToRoom) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      <PublicNavbar />
      
      <main style={{ flex: 1, maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-muted)', fontWeight: 600 }}>
            <Link href="/rooms" style={{ color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ArrowLeft size={16} /> Kembali
            </Link>
            <ChevronRight size={14} />
            <span style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' }}>{room.building || 'GEDUNG'}</span>
          </div>
        </div>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1.5rem' }}>
          {room.name}
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2.5rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: Media & Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* Gallery */}
            <div>
              <div
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  height: '450px',
                  backgroundColor: 'var(--color-surface2)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '1rem',
                }}
              >
                <img src={currentImg} alt={room.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                  <Badge status={room.status} />
                </div>
              </div>

              {photos.length > 1 && (
                <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {photos.map((img: string, idx: number) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Thumbnail ${idx}`}
                      onClick={() => setSelectedImg(img)}
                      style={{
                        width: '100px',
                        height: '75px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        border: currentImg === img ? '2px solid var(--color-primary)' : '1px solid transparent',
                        opacity: currentImg === img ? 1 : 0.7,
                        transition: 'all 0.2s'
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Specifications Box */}
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Spesifikasi Ruangan</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem', background: 'var(--color-surface)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Kapasitas</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Users size={16} /> {room.capacity || '-'} Orang</div>
                </div>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem', background: 'var(--color-surface)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Luas Area</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Maximize size={16} /> {room.area || '-'} m²</div>
                </div>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem', background: 'var(--color-surface)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Lokasi</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={16} /> {room.building}</div>
                </div>
              </div>
            </div>

            {/* Inclusions & Terms Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Sudah termasuk (Fasilitas)</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {facilities.map((f, i: number) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)' }}>
                      <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} /> {f.name}{f.qty > 1 ? ` (${f.qty})` : ''}
                    </li>
                  ))}
                  {fixedAssets.map((asset: any) => (
                    <li key={asset.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)' }}>
                      <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} /> {asset.name}
                    </li>
                  ))}
                  {facilities.length === 0 && fixedAssets.length === 0 && (
                    <li style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Fasilitas standar</li>
                  )}
                </ul>
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Syarat & Aturan</h3>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--color-muted)' }}>
                  <li>Harap menjaga kebersihan ruangan</li>
                  <li>Deposit dikembalikan penuh jika tidak ada kerusakan</li>
                  <li>Dilarang merokok di dalam ruangan</li>
                </ul>
              </div>
            </div>

            <hr style={{ borderColor: 'var(--color-border)' }} />

            {/* Description */}
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Deskripsi Lengkap</h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {room.description || 'Tidak ada deskripsi rinci untuk ruangan ini.'}
              </p>
            </div>

          </div>

          {/* RIGHT COLUMN: Sticky Booking Widget */}
          <div style={{ position: 'sticky', top: '100px' }}>
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)',
            }}>
              
              {/* Rental Type Toggle */}
              <div style={{ display: 'flex', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '0.25rem', marginBottom: '1.25rem' }}>
                <button
                  onClick={() => { setRentalType('HOURLY'); setAvailabilityState('idle'); }}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: 'none',
                    background: rentalType === 'HOURLY' ? '#fff' : 'transparent',
                    color: rentalType === 'HOURLY' ? '#111' : 'var(--color-muted)',
                    fontWeight: rentalType === 'HOURLY' ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: rentalType === 'HOURLY' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Sewa Per Jam
                </button>
                <button
                  onClick={() => { setRentalType('DAILY'); setAvailabilityState('idle'); }}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: 'none',
                    background: rentalType === 'DAILY' ? '#fff' : 'transparent',
                    color: rentalType === 'DAILY' ? '#111' : 'var(--color-muted)',
                    fontWeight: rentalType === 'DAILY' ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: rentalType === 'DAILY' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Sewa Per Hari
                </button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  {rentalType === 'HOURLY' ? 'Harga Per Jam' : 'Harga Per Hari'}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: '#111' }}>
                    {formatCurrency(rentalType === 'HOURLY' ? (room.pricePerHour || 0) : (room.pricePerDay || (room.pricePerHour || 0) * 8))}
                  </span>
                  <span style={{ color: 'var(--color-muted)', fontWeight: 500 }}>/{rentalType === 'HOURLY' ? 'jam' : 'hari'}</span>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--color-border)', marginBottom: '1.5rem' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Rencana Pinjam
                  </label>
                  
                  {rentalType === 'HOURLY' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                      <input 
                        type="date" 
                        value={bookingDate}
                        onChange={(e) => { setBookingDate(e.target.value); setAvailabilityState('idle'); }}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <input 
                          type="time" 
                          value={startTime}
                          onChange={(e) => { setStartTime(e.target.value); setAvailabilityState('idle'); }}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}
                        />
                        <input 
                          type="time" 
                          value={endTime}
                          onChange={(e) => { setEndTime(e.target.value); setAvailabilityState('idle'); }}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <input 
                        type="date" 
                        value={bookingDate}
                        onChange={(e) => { setBookingDate(e.target.value); setAvailabilityState('idle'); }}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}
                      />
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setAvailabilityState('idle'); }}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Deposit</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(room.depositAmount || 0)}</span>
                </div>

                {duration > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Total Sewa ({duration} {rentalType === 'HOURLY' ? 'Jam' : 'Hari'})</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(subtotal)}</span>
                  </div>
                )}
                
                {availabilityMessage && (
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem', fontSize: '0.8rem', fontWeight: 600,
                    color: availabilityState === 'available' ? 'var(--color-success)' : 'var(--color-danger)'
                  }}>
                    {availabilityState === 'available' ? <Check size={16} /> : null} {availabilityMessage}
                  </div>
                )}

              </div>

              {session?.user && (session.user as any).role === 'BORROWER' && ((session.user as any).renterCategory || 'EXTERNAL') === 'EXTERNAL' ? (
                <div style={{
                  background: 'rgba(239,68,68,0.05)',
                  border: '1px dashed rgba(239,68,68,0.3)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: 'var(--color-muted)',
                  lineHeight: 1.5,
                }}>
                  <span style={{ fontWeight: 800, color: '#ef4444', display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    🔒 Tombol Booking Dinonaktifkan
                  </span>
                  Akun Anda saat ini terdaftar sebagai <strong>Penyewa Eksternal</strong>. Silakan ajukan verifikasi Mahasiswa / Internal Kampus melalui menu <strong>Verifikasi Akun</strong> untuk melakukan pemesanan.
                </div>
              ) : availabilityState === 'available' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    onClick={handleProceedBooking}
                    style={{
                      width: '100%', padding: '1rem', background: '#2563EB', color: '#FFF',
                      border: 'none', borderRadius: 'var(--radius-lg)', fontSize: '1rem', fontWeight: 700,
                      cursor: 'pointer', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)', transition: 'all 0.2s',
                    }}
                  >
                    Booking Ruangan Ini
                  </button>
                  <button
                    onClick={handleAddToCart}
                    style={{
                      width: '100%', padding: '0.85rem', background: '#FFF', color: '#111',
                      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: '0.9rem', fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                    }}
                  >
                    <ShoppingBag size={16} /> Tambah ke Keranjang
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCheckAvailability}
                  style={{
                    width: '100%', padding: '1rem', background: 'var(--color-surface2)', color: 'var(--color-text)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: '1rem', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.2s', marginBottom: '1rem'
                  }}
                >
                  {availabilityState === 'checking' ? 'Mengecek...' : 'Cek Ketersediaan'}
                </button>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-success)' }}>
                  <ShieldCheck size={16} /> Tanpa biaya tersembunyi
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-success)' }}>
                  <ShieldCheck size={16} /> Batal gratis H-2
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '4rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>SPASI — Sistem Pencatatan Aset, Sewa & Pinjam Instansi</div>
          <div>© {new Date().getFullYear()} SPASI App Platform. Installable Web Application (PWA).</div>
        </div>
      </footer>
    </div>
  );
}

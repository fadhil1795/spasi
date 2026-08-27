'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart } from '@/components/public/CartContext';
import { PublicNavbar } from '@/components/public/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, CheckCircle2, Package, ShieldCheck, MapPin, Tag, Calendar, Pencil, ChevronRight } from 'lucide-react';

export default function PublicAssetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { addToCart } = useCart();

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState<string>('');

  // Widget State
  const [startDate, setStartDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date(Date.now() + 86400000).toISOString().split('T')[0]; // tomorrow
  });
  const [renterName, setRenterName] = useState(session?.user?.name || '');
  const [renterPhone, setRenterPhone] = useState('');

  const currentUserRole = (session?.user as any)?.role;

  useEffect(() => {
    if (id) fetchAssetDetail();
  }, [id]);

  const fetchAssetDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/public/assets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAsset(data);
        try {
          const imgs = JSON.parse(data.images || '[]');
          if (Array.isArray(imgs) && imgs.length > 0) setSelectedImg(imgs[0]);
        } catch (e) {}
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = () => {
    let url = `/dashboard/rentals/new?assetId=${asset.id}&startDate=${startDate}&endDate=${endDate}`;
    if (renterName) url += `&renterName=${encodeURIComponent(renterName)}`;
    if (renterPhone) url += `&renterPhone=${encodeURIComponent(renterPhone)}`;
    router.push(url);
  };

  const handleAddToCart = () => {
    if (!session || !session.user) {
      alert("Silakan login terlebih dahulu untuk menambah ke keranjang.");
      router.push('/login');
      return;
    }

    const sTime = new Date(startDate);
    const eTime = new Date(endDate);
    const diffMs = eTime.getTime() - sTime.getTime();
    const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const success = addToCart({
      id: `asset-${asset.id}-${Date.now()}`,
      itemType: 'ASSET',
      assetId: asset.id,
      roomName: asset.name, // using roomName field for asset name in cart UI
      building: asset.brand || asset.category?.name || 'Aset',
      photoUrl: selectedImg,
      bookingDate: startDate,
      startTime: "00:00",
      endTime: "23:59",
      rentalType: 'DAILY',
      durationHours: totalDays * 24,
      priceRate: asset.dailyRentRate || 0,
      roomSubtotal: (asset.dailyRentRate || 0) * totalDays,
      depositAmount: asset.depositAmount || 50000,
      addOns: [],
    });

    if (success) {
      alert("Aset berhasil ditambahkan ke keranjang!");
    } else {
      alert("Gagal menambahkan ke keranjang.");
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <Skeleton height="30px" width="200px" style={{ marginBottom: '2rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
          <div>
            <Skeleton height="450px" borderRadius="var(--radius-lg)" />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Skeleton height="100px" width="100px" />
              <Skeleton height="100px" width="100px" />
            </div>
          </div>
          <div>
            <Skeleton height="500px" borderRadius="var(--radius-xl)" />
          </div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center', padding: '1.5rem' }}>
        <h2>Aset Tidak Ditemukan</h2>
        <p style={{ color: 'var(--color-muted)', marginTop: '0.5rem' }}>Aset yang Anda cari mungkin telah dihapus atau kode tidak valid.</p>
        <Link href="/assets" className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>
          Kembali ke Katalog
        </Link>
      </div>
    );
  }

  let imagesList: string[] = [];
  try {
    imagesList = JSON.parse(asset.images || '[]');
  } catch (e) {}
  if (imagesList.length === 0) {
    imagesList = ['https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop'];
  }
  const currentImg = selectedImg || imagesList[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      <PublicNavbar />
      
      <main style={{ flex: 1, maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-muted)', fontWeight: 600 }}>
            <Link href="/assets" style={{ color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ArrowLeft size={16} /> Kembali
            </Link>
            <ChevronRight size={14} />
            <span style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' }}>{asset.brand || 'UMUM'}</span>
          </div>

          {(currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN') && (
            <Link href={`/dashboard/assets/${asset.id}/edit`} className="btn btn-secondary">
              <Pencil size={16} /> Edit Aset Ini
            </Link>
          )}
        </div>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1.5rem' }}>
          {asset.name}
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
                <img src={currentImg} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                  <Badge status={asset.status} />
                </div>
              </div>

              {imagesList.length > 1 && (
                <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {imagesList.map((img, idx) => (
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Spesifikasi</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem', background: 'var(--color-surface)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Merek</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{asset.brand || '-'}</div>
                </div>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem', background: 'var(--color-surface)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Kondisi</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{asset.condition || 'Baik'}</div>
                </div>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem', background: 'var(--color-surface)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Kategori</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{asset.category?.name || '-'}</div>
                </div>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem', background: 'var(--color-surface)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Nomor Seri</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'monospace' }}>{asset.serialNumber || '-'}</div>
                </div>
              </div>
            </div>

            {/* Inclusions & Terms Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Sudah termasuk</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} /> Asuransi dasar (TLO)
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} /> Perawatan & Sanitasi
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} /> Bantuan darurat 24 jam
                  </li>
                </ul>
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Syarat singkat</h3>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--color-muted)' }}>
                  <li>Identitas aktif (KTP/Paspor)</li>
                  <li>Usia minimum 21 tahun</li>
                  <li>Deposit dikembalikan penuh sesuai kondisi</li>
                </ul>
              </div>
            </div>

            <hr style={{ borderColor: 'var(--color-border)' }} />

            {/* Description */}
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Deskripsi Lengkap</h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {asset.description || 'Tidak ada deskripsi rinci untuk aset ini.'}
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
              
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Harga Sewa
                </div>
                {asset.isRentable && asset.dailyRentRate ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#111' }}>{formatCurrency(asset.dailyRentRate)}</span>
                    <span style={{ color: 'var(--color-muted)', fontWeight: 500 }}>/hari</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    Khusus Pinjam Internal
                  </div>
                )}
              </div>

              <hr style={{ borderColor: 'var(--color-border)', marginBottom: '1.5rem' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Data Penyewa
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Lengkap"
                    value={renterName}
                    onChange={(e) => setRenterName(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '0.75rem', fontSize: '0.9rem' }}
                  />
                  <input
                    type="tel"
                    placeholder="Nomor WhatsApp"
                    value={renterPhone}
                    onChange={(e) => setRenterPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Rencana Pinjam
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem', color: 'var(--color-text)' }}
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem', color: 'var(--color-text)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Deposit</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(asset.depositAmount || 50000)}</span>
                </div>
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
                  marginBottom: '1rem'
                }}>
                  <span style={{ fontWeight: 800, color: '#ef4444', display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    🔒 Tombol Pinjam Dinonaktifkan
                  </span>
                  Akun Anda saat ini terdaftar sebagai <strong>Penyewa Eksternal</strong>. Silakan ajukan verifikasi Mahasiswa / Internal Kampus melalui menu <strong>Verifikasi Akun</strong> untuk melakukan pemesanan.
                </div>
              ) : asset.isRentable ? (
                <>
                  <button
                    onClick={handleBooking}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: '#2563EB',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                      transition: 'all 0.2s',
                      marginBottom: '1rem'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    Sewa Aset Ini
                  </button>
                  <button
                    onClick={handleAddToCart}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: '#F3F4F6',
                      color: '#111827',
                      border: '1px solid #D1D5DB',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      marginBottom: '1rem'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#E5E7EB')}
                    onMouseOut={(e) => (e.currentTarget.style.background = '#F3F4F6')}
                  >
                    + Tambah ke Keranjang
                  </button>
                </>
              ) : (
                <button
                  onClick={() => router.push(`/dashboard/loans/new?assetId=${asset.id}`)}
                  style={{
                    width: '100%', padding: '1rem', background: 'var(--color-surface2)',
                    color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
                    fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginBottom: '1rem'
                  }}
                >
                  Ajukan Pinjam (Internal)
                </button>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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


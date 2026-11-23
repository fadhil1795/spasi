'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useCart } from '@/components/public/CartContext';
import { formatCurrency } from '@/lib/utils';
import { parseFacilities } from '@/lib/roomConstants';
import {
  Building2, Box, Search, Users, ShieldCheck,
  ArrowRight, Sparkles, Filter, ShoppingBag, Plus, Check, CreditCard, CalendarCheck
} from 'lucide-react';

export default function DashboardCatalogPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { addToCart } = useCart();

  const [activeTab, setActiveTab] = useState<'rooms' | 'assets'>('rooms');
  const [rooms, setRooms] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('ALL');
  const [parentCategoryFilter, setParentCategoryFilter] = useState('ALL');
  const [subCategoryFilter, setSubCategoryFilter] = useState('ALL');
  const [brandFilter, setBrandFilter] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, assetsRes, catsRes, brandsRes] = await Promise.all([
        fetch('/api/rooms?status=AVAILABLE'),
        fetch('/api/public/assets?status=AVAILABLE'),
        fetch('/api/public/categories'),
        fetch('/api/brands?detail=true'),
      ]);

      if (roomsRes.ok) setRooms(await roomsRes.json());
      if (assetsRes.ok) setAssets(await assetsRes.json());
      if (catsRes.ok) {
        const catsData = await catsRes.json();
        setCategories(Array.isArray(catsData) ? catsData : catsData.categories || []);
      }
      if (brandsRes.ok) {
        const brandsData = await brandsRes.json();
        setBrands(Array.isArray(brandsData) ? brandsData : brandsData.brands || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoomToCart = (room: any) => {
    const today = new Date().toISOString().split('T')[0];
    const added = addToCart({
      id: `cart-room-${room.id}-${Date.now()}`,
      itemType: 'ROOM',
      roomId: room.id,
      roomName: room.name,
      roomCode: room.code || 'ROOM',
      building: room.building || 'Gedung Utama',
      photoUrl: Array.isArray(room.photos) ? room.photos[0] : (typeof room.photos === 'string' ? JSON.parse(room.photos || '[]')[0] : ''),
      bookingDate: today,
      startTime: '08:00',
      endTime: '17:00',
      rentalType: 'HOURLY',
      durationHours: 9,
      priceRate: room.pricePerHour || 100000,
      roomSubtotal: (room.pricePerHour || 100000) * 9,
      depositAmount: room.depositAmount || 150000,
      addOns: [],
    });

    if (added) {
      showToast(`Ruangan "${room.name}" berhasil disimpan ke keranjang!`, 'success');
    }
  };

  const handleAddAssetToCart = (ast: any) => {
    const today = new Date().toISOString().split('T')[0];
    const added = addToCart({
      id: `cart-ast-${ast.id}-${Date.now()}`,
      itemType: 'ASSET',
      assetId: ast.id,
      roomId: ast.id,
      roomName: ast.name,
      roomCode: ast.code || 'ASET',
      building: ast.location?.building || ast.location?.name || 'Sarpras',
      photoUrl: Array.isArray(ast.images) ? ast.images[0] : (typeof ast.images === 'string' ? JSON.parse(ast.images || '[]')[0] : ''),
      bookingDate: today,
      startTime: '08:00',
      endTime: '17:00',
      rentalType: 'HOURLY',
      durationHours: 9,
      priceRate: ast.sessionRentRate || ast.dailyRentRate || 50000,
      roomSubtotal: ast.sessionRentRate || ast.dailyRentRate || 50000,
      depositAmount: 50000,
      addOns: [],
    });

    if (added) {
      showToast(`Aset "${ast.name}" berhasil disimpan ke keranjang!`, 'success');
    }
  };

  const buildings = Array.from(new Set(rooms.map((r) => r.building).filter(Boolean)));

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch = r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.building?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBuilding = selectedBuilding === 'ALL' || r.building === selectedBuilding;
    return matchesSearch && matchesBuilding;
  });

  const parentCategories = categories.filter((c) => !c.parentId);
  const activeParentCategory = parentCategories.find((c) => c.id === parentCategoryFilter);
  const subCategories = activeParentCategory?.children || categories.filter((c) => c.parentId === parentCategoryFilter);

  const availableBrandNames = Array.from(
    new Set([
      ...brands.map((b) => b.name).filter(Boolean),
      ...assets.map((a) => a.brand).filter(Boolean),
    ])
  ).sort((a, b) => a.localeCompare(b));

  const filteredAssets = assets.filter((a) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      a.name?.toLowerCase().includes(q) ||
      a.code?.toLowerCase().includes(q) ||
      a.brand?.toLowerCase().includes(q) ||
      a.category?.name?.toLowerCase().includes(q) ||
      a.category?.parent?.name?.toLowerCase().includes(q);

    const matchesParent =
      parentCategoryFilter === 'ALL' ||
      a.categoryId === parentCategoryFilter ||
      a.category?.parentId === parentCategoryFilter ||
      a.category?.parent?.id === parentCategoryFilter;

    const matchesSub =
      subCategoryFilter === 'ALL' || a.categoryId === subCategoryFilter;

    const matchesBrand =
      brandFilter === 'ALL' ||
      (a.brand || '').toLowerCase() === brandFilter.toLowerCase();

    return matchesSearch && matchesParent && matchesSub && matchesBrand;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
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
            <Building2 size={14} /> Katalog Sarana, Ruangan &amp; Peralatan
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.35rem' }}>
            Katalog Visual Ruangan &amp; Aset
          </h1>
          <p style={{ opacity: 0.9, fontSize: '0.92rem', maxWidth: '560px' }}>
            Jelajahi ruangan rapat, aula serbaguna, studio recording, serta peralatan sound system, kamera &amp; laptop instansi.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/cart" className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', fontWeight: 600 }}>
            <ShoppingBag size={18} /> Keranjang Saya
          </Link>
          {!(session?.user && (session.user as any).role === 'BORROWER' && ((session.user as any).renterCategory || 'EXTERNAL') === 'EXTERNAL') && (
            <Link href="/dashboard/room-bookings/new" className="btn" style={{ background: '#FFFFFF', color: 'var(--color-primary)', fontWeight: 700 }}>
              <Sparkles size={18} /> Booking Langsung via Wizard
            </Link>
          )}
        </div>
      </div>

      {/* Segmented Catalog Tab Switcher */}
      <div style={{ display: 'flex', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '0.25rem', gap: '0.25rem', width: 'fit-content' }}>
        <button
          type="button"
          onClick={() => setActiveTab('rooms')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
            background: activeTab === 'rooms' ? 'var(--color-surface)' : 'transparent',
            color: activeTab === 'rooms' ? 'var(--color-primary)' : 'var(--color-muted)',
            fontWeight: activeTab === 'rooms' ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <Building2 size={18} /> Katalog Ruangan Sewa ({rooms.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assets')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
            background: activeTab === 'assets' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'assets' ? '#fff' : 'var(--color-muted)',
            fontWeight: activeTab === 'assets' ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <Box size={18} /> Katalog Aset &amp; Peralatan ({assets.length})
        </button>
      </div>

      {/* Filter Bar */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <Input
              placeholder={activeTab === 'rooms' ? "Cari nama ruangan, kode, atau fasilitas..." : "Cari nama aset, kode, atau kategori..."}
              icon={<Search size={18} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {activeTab === 'rooms' && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Filter size={15} /> Gedung:
              </span>
              <button
                onClick={() => setSelectedBuilding('ALL')}
                className={`btn btn-sm ${selectedBuilding === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Semua Gedung
              </button>
              {buildings.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBuilding(b)}
                  className={`btn btn-sm ${selectedBuilding === b ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {b}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'assets' && (
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="input-field"
                value={parentCategoryFilter}
                onChange={(e) => {
                  setParentCategoryFilter(e.target.value);
                  setSubCategoryFilter('ALL');
                }}
                style={{ minWidth: '170px', padding: '0.45rem 0.75rem', fontSize: '0.84rem' }}
              >
                <option value="ALL">Semua Kategori Utama</option>
                {parentCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {parentCategoryFilter !== 'ALL' && subCategories.length > 0 && (
                <select
                  className="input-field"
                  value={subCategoryFilter}
                  onChange={(e) => setSubCategoryFilter(e.target.value)}
                  style={{ minWidth: '170px', padding: '0.45rem 0.75rem', fontSize: '0.84rem' }}
                >
                  <option value="ALL">Semua Subkategori</option>
                  {subCategories.map((sc: any) => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              )}

              <select
                className="input-field"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                style={{ minWidth: '150px', padding: '0.45rem 0.75rem', fontSize: '0.84rem' }}
              >
                <option value="ALL">Semua Merek</option>
                {availableBrandNames.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {(parentCategoryFilter !== 'ALL' || subCategoryFilter !== 'ALL' || brandFilter !== 'ALL' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setParentCategoryFilter('ALL');
                    setSubCategoryFilter('ALL');
                    setBrandFilter('ALL');
                  }}
                  className="btn btn-sm btn-secondary"
                >
                  Reset Filter
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Tab 1: ROOMS GRID */}
      {activeTab === 'rooms' && (
        loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <Skeleton height="320px" />
            <Skeleton height="320px" />
            <Skeleton height="320px" />
          </div>
        ) : filteredRooms.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {filteredRooms.map((room) => {
              const photos = typeof room.photos === 'string' ? JSON.parse(room.photos || '[]') : (room.photos || []);
              const facilities = parseFacilities(room.facilities);
              const coverPhoto = photos[0] || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop';

              return (
                <Card
                  key={room.id}
                  style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}
                  className="spasi-card-hover"
                >
                  <div
                    style={{
                      height: '180px',
                      background: `url(${coverPhoto}) center/cover`,
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '0.85rem', left: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                      <span className="badge" style={{ background: 'rgba(0,0,0,0.65)', color: '#FFFFFF', backdropFilter: 'blur(4px)', fontFamily: 'monospace', fontWeight: 700 }}>
                        {room.code || 'RUANGAN'}
                      </span>
                    </div>
                    <div style={{ position: 'absolute', top: '0.85rem', right: '0.85rem' }}>
                      <Badge status={room.status} />
                    </div>
                  </div>

                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.35rem' }}>{room.name}</h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
                        {room.building} • {room.floor || 'Lantai 1'}
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Users size={15} style={{ color: 'var(--color-primary-light)' }} /> Kapasitas: <strong>{room.capacity || '-'} Org</strong>
                        </span>
                        {room.area && <span>Luas: <strong>{room.area} m²</strong></span>}
                      </div>

                      {facilities.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.25rem' }}>
                          {facilities.slice(0, 4).map((f, idx: number) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '12px',
                                background: 'var(--color-surface2)',
                                color: 'var(--color-muted)',
                                fontWeight: 600,
                              }}
                            >
                              ✓ {f.name}{f.qty > 1 ? ` (${f.qty})` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                      {(() => {
                        const isBorrower = session?.user && (session.user as any).role === 'BORROWER';
                        const renterCategory = isBorrower ? ((session.user as any).renterCategory || 'EXTERNAL') : 'EXTERNAL';
                        
                        if (isBorrower && renterCategory !== 'EXTERNAL') {
                          // Internal user
                          if (room.isLoanable) {
                            return (
                              <>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>Tarif Sewa</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-success)', marginBottom: '0.85rem' }}>
                                  Gratis <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-warning)' }}>
                                    {room.requiresDepositForInternal && (room.depositAmount || room.price) ? `(Wajib Deposit: ${formatCurrency(room.depositAmount || room.price)})` : '(Pinjam)'}
                                  </span>
                                </div>
                              </>
                            );
                          } else {
                            // Paid room for internal
                            return (
                              <>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>Tarif Sewa (Internal Berbayar)</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-success)', marginBottom: '0.85rem' }}>
                                  {formatCurrency(room.pricePerHour || 0)}<span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--color-muted)' }}>/jam</span>
                                </div>
                              </>
                            );
                          }
                        }

                        // External / Admin
                        return (
                          <>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>Tarif Sewa</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-success)', marginBottom: '0.85rem' }}>
                              {formatCurrency(room.pricePerHour || 0)}<span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--color-muted)' }}>/jam</span>
                            </div>
                          </>
                        );
                      })()}

                      {(() => {
                        const isBorrower = session?.user && (session.user as any).role === 'BORROWER';
                        const renterCategory = isBorrower ? ((session.user as any).renterCategory || 'EXTERNAL') : 'EXTERNAL';
                        
                        if (isBorrower) {
                          if (renterCategory === 'EXTERNAL') {
                            if (!room.isRentable) {
                              return (
                                <div style={{
                                  background: 'rgba(239,68,68,0.04)',
                                  border: '1px dashed rgba(239,68,68,0.2)',
                                  padding: '0.65rem 0.85rem',
                                  borderRadius: 'var(--radius-md)',
                                  textAlign: 'center',
                                  fontSize: '0.73rem',
                                  color: 'var(--color-danger)',
                                  lineHeight: 1.4,
                                  fontWeight: 600,
                                }}>
                                  🔒 Khusus Kegiatan Internal. Ajukan verifikasi KTM/NIP di menu Verifikasi Akun.
                                </div>
                              );
                            }
                            // Rentable rooms can be booked by external!
                          } else {
                            // Internal
                            if (!room.isLoanable && !room.isRentable) {
                              return (
                                <div style={{
                                  background: 'rgba(239,68,68,0.04)',
                                  border: '1px dashed rgba(239,68,68,0.2)',
                                  padding: '0.65rem 0.85rem',
                                  borderRadius: 'var(--radius-md)',
                                  textAlign: 'center',
                                  fontSize: '0.73rem',
                                  color: 'var(--color-danger)',
                                  lineHeight: 1.4,
                                  fontWeight: 600,
                                }}>
                                  🔒 Ruangan sedang dinonaktifkan/tutup.
                                </div>
                              );
                            }
                          }
                        }

                        // Rentable/Loanable or not borrower (Staff/Admin)
                        return (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAddRoomToCart(room)}
                              style={{ flex: 1, padding: '0.5rem' }}
                            >
                              <ShoppingBag size={14} /> + Keranjang
                            </Button>

                            <Link
                              href={`/dashboard/room-bookings/new?roomId=${room.id}`}
                              className="btn btn-primary btn-sm"
                              style={{ flex: 1, padding: '0.5rem' }}
                            >
                              Pesan Sekarang <ArrowRight size={14} />
                            </Link>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
            <Building2 size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Tidak ada ruangan yang cocok dengan pencarian Anda.</p>
          </Card>
        )
      )}

      {/* Tab 2: ASSETS GRID */}
      {activeTab === 'assets' && (
        loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <Skeleton height="320px" />
            <Skeleton height="320px" />
            <Skeleton height="320px" />
          </div>
        ) : filteredAssets.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {filteredAssets.map((ast) => {
              const images = typeof ast.images === 'string' ? JSON.parse(ast.images || '[]') : (ast.images || []);
              const coverImg = images[0] || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop';
              const rate = ast.sessionRentRate || ast.dailyRentRate || 0;

              return (
                <Card
                  key={ast.id}
                  style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}
                  className="spasi-card-hover"
                >
                  <div
                    style={{
                      height: '170px',
                      background: `url(${coverImg}) center/cover`,
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '0.85rem', left: '0.85rem' }}>
                      <span className="badge" style={{ background: 'rgba(0,0,0,0.65)', color: '#FFFFFF', backdropFilter: 'blur(4px)', fontFamily: 'monospace', fontWeight: 700 }}>
                        {ast.code}
                      </span>
                    </div>
                    <div style={{ position: 'absolute', top: '0.85rem', right: '0.85rem' }}>
                      <Badge status={ast.status} />
                    </div>
                  </div>

                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.45rem' }}>{ast.name}</h3>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(14, 165, 233, 0.12)',
                            color: '#0284c7',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                          }}
                        >
                          {ast.category?.parent?.name
                            ? `${ast.category.parent.name} › ${ast.category.name}`
                            : (ast.category?.name || 'Aset Moving')}
                        </span>
                        {ast.brand && (
                          <span
                            className="badge"
                            style={{
                              background: 'var(--color-surface2)',
                              color: 'var(--color-text)',
                              border: '1px solid var(--color-border)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                            }}
                          >
                            {ast.brand}
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', lineHeight: 1.4, marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {ast.description || 'Peralatan operasional berkualitas tinggi siap guna.'}
                      </p>

                      <Link
                        href={`/dashboard/assets/${ast.id}`}
                        style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.75rem' }}
                      >
                        Lihat Spesifikasi &amp; Detail <ArrowRight size={13} />
                      </Link>
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>Tarif Pinjam / Sewa</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-primary-light)', marginBottom: '0.85rem' }}>
                        {rate > 0 ? `${formatCurrency(rate)}/hari` : 'Gratis Pinjam (Internal)'}
                      </div>

                      {(() => {
                        const isBorrower = session?.user && (session.user as any).role === 'BORROWER';
                        const renterCategory = isBorrower ? ((session.user as any).renterCategory || 'EXTERNAL') : 'EXTERNAL';

                        if (isBorrower && renterCategory === 'EXTERNAL' && !ast.isRentable) {
                          return (
                            <div style={{
                              background: 'rgba(239,68,68,0.04)',
                              border: '1px dashed rgba(239,68,68,0.2)',
                              padding: '0.65rem 0.85rem',
                              borderRadius: 'var(--radius-md)',
                              textAlign: 'center',
                              fontSize: '0.73rem',
                              color: 'var(--color-danger)',
                              lineHeight: 1.4,
                              fontWeight: 600,
                            }}>
                              🔒 Khusus Pinjam Internal. Ajukan verifikasi KTM/NIP di menu Verifikasi Akun.
                            </div>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {ast.isRentable && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAddAssetToCart(ast)}
                                style={{ flex: 1, minWidth: '85px' }}
                              >
                                <ShoppingBag size={13} /> Keranjang
                              </Button>
                            )}

                            {ast.isRentable ? (
                              <Link
                                href={`/dashboard/rentals/new?assetId=${ast.id}`}
                                className="btn btn-primary btn-sm"
                                style={{ flex: 1, minWidth: '95px' }}
                              >
                                <CreditCard size={13} /> Sewa
                              </Link>
                            ) : null}

                            {(!isBorrower || renterCategory !== 'EXTERNAL') && ast.isLoanable && (
                              <Link
                                href={`/dashboard/loans/new?assetId=${ast.id}`}
                                className="btn btn-secondary btn-sm"
                                style={{ flex: 1, minWidth: '80px' }}
                              >
                                <CalendarCheck size={13} /> Pinjam
                              </Link>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
            <Box size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Tidak ada aset atau peralatan yang cocok dengan pencarian Anda.</p>
          </Card>
        )
      )}
    </div>
  );
}

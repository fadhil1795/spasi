'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart } from '@/components/public/CartContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBag, Trash2, CalendarClock, Building2, ArrowRight, ShieldCheck, Plus, Sparkles } from 'lucide-react';

export default function DashboardCartPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { cartItems, removeFromCart, clearCart, grandTotal } = useCart();

  const handleCheckoutItem = (item: any) => {
    const isAsset =
      item.itemType === 'ASSET' ||
      Boolean(item.assetId) ||
      item.roomCode?.startsWith('AST');

    if (isAsset) {
      // Gunakan assetId jika ada, fallback ke roomId (yang bisa jadi assetId)
      const targetAssetId = item.assetId || item.roomId;
      // Kirim juga tanggal dari item keranjang
      const startDate = item.bookingDate || '';
      router.push(`/dashboard/rentals/new?assetId=${targetAssetId}&startDate=${startDate}`);
    } else {
      const startIso = new Date(`${item.bookingDate}T${item.startTime}:00`).toISOString();
      const endIso = new Date(`${item.bookingDate}T${item.endTime}:00`).toISOString();
      router.push(`/dashboard/room-bookings/new?roomId=${item.roomId}&start=${startIso}&end=${endIso}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-primary-light)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            <ShoppingBag size={16} /> Dashboard Keranjang Saya
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Draf Pesanan & Wishlist Booking</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Kelola daftar ruangan dan peralatan yang telah Anda simpan di keranjang pemesanan.
          </p>
        </div>

        {cartItems.length > 0 && (
          <Button variant="secondary" onClick={clearCart} style={{ color: 'var(--color-danger)' }}>
            <Trash2 size={16} /> Kosongkan Keranjang
          </Button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <Card style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--color-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: 'var(--color-muted)' }}>
            <ShoppingBag size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Keranjang Pemesanan Kosong</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto 2rem' }}>
            Anda belum menyimpan draf reservasi ruangan atau peralatan. Jelajahi katalog instansi kami untuk memilih sarana yang Anda butuhkan.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/dashboard/catalog" className="btn btn-primary btn-lg">
              <Building2 size={18} /> Jelajahi Katalog Dashboard
            </Link>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.75rem' }}>
          {/* Left Column: Cart Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {cartItems.map((item) => {
              const addonsSubtotal = item.addOns.reduce((sum, a) => sum + a.rate * a.quantity, 0);
              const itemTotal = item.roomSubtotal + addonsSubtotal + item.depositAmount;

              return (
                <Card key={item.id} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '1.25rem' }}>
                    {/* Photo Thumbnail */}
                    <div
                      style={{
                        width: '130px',
                        height: '100px',
                        borderRadius: 'var(--radius-md)',
                        background: item.photoUrl ? `url(${item.photoUrl}) center/cover` : 'var(--color-surface2)',
                        flexShrink: 0,
                      }}
                    />

                    {/* Info Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.2rem' }}>{item.roomName}</h3>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{item.building} {item.roomCode ? `(${item.roomCode})` : ''}</div>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-danger)',
                            cursor: 'pointer',
                            padding: '0.2rem',
                          }}
                          title="Hapus dari keranjang"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>
                        <CalendarClock size={16} />
                        <span>{item.bookingDate} ({item.startTime} - {item.endTime}) — {item.durationHours.toFixed(1)} Jam</span>
                      </div>
                    </div>
                  </div>

                  {/* Add-Ons Included */}
                  {item.addOns.length > 0 && (
                    <div style={{ background: 'var(--color-surface2)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-muted)', fontSize: '0.78rem' }}>ADD-ON PERALATAN:</div>
                      {item.addOns.map((a, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span>{a.name} (x{a.quantity})</span>
                          <span style={{ fontWeight: 600 }}>{formatCurrency(a.rate * a.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer Item Total & Action */}
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Subtotal Estimasi</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                        {formatCurrency(itemTotal)}
                      </div>
                    </div>

                    <Button variant="primary" onClick={() => handleCheckoutItem(item)}>
                      Lanjut ke Wizard Booking <ArrowRight size={16} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Right Column: Order Summary */}
          <div>
            <Card style={{ padding: '1.5rem', position: 'sticky', top: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.85rem' }}>
                Ringkasan Draf Pesanan
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Jumlah Item Keranjang</span>
                  <span style={{ fontWeight: 600 }}>{cartItems.length} Draf</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Total Deposit Jaminan</span>
                  <span style={{ fontWeight: 600 }}>
                    {formatCurrency(cartItems.reduce((sum, i) => sum + i.depositAmount, 0))}
                  </span>
                </div>
                <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>Total Estimasi</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-primary-light)' }}>
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              <div style={{ background: 'var(--color-surface2)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <ShieldCheck size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                <span>Terintegrasi dengan akun {session?.user?.name || 'Anda'}. Deposit dikembalikan penuh saat Check-Out.</span>
              </div>

              {cartItems.length > 0 && (
                <Button variant="primary" style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }} onClick={() => handleCheckoutItem(cartItems[0])}>
                  Lanjut Pemesanan Sekarang <ArrowRight size={16} />
                </Button>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

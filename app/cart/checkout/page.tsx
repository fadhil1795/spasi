'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/public/CartContext';
import { PublicNavbar } from '@/components/public/Navbar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { useSession } from 'next-auth/react';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { cartItems, grandTotal, clearCart } = useCart();

  const [renterName, setRenterName] = useState('');
  const [renterPhone, setRenterPhone] = useState('');
  const [renterEmail, setRenterEmail] = useState('');
  const [idCardNo, setIdCardNo] = useState('');
  const [payMethod, setPayMethod] = useState<'Transfer' | 'QRIS' | 'Cash'>('Transfer');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setRenterName(session.user.name || '');
      setRenterEmail(session.user.email || '');
    }
  }, [session]);

  const totalDeposit = cartItems.reduce((acc, item) => acc + item.depositAmount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return alert('Keranjang kosong!');
    
    setLoading(true);
    try {
      const res = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems,
          renterData: { name: renterName, phone: renterPhone, email: renterEmail, idCardNo },
          payMethod,
          totalAmount: grandTotal,
          depositAmount: totalDeposit
        })
      });

      if (res.ok) {
        const data = await res.json();
        clearCart();
        alert('Pemesanan berhasil! Struk (Master Invoice) telah dibuat.');
        router.push(`/dashboard`); // TBD: redirect ke halaman master invoice detail jika ada
      } else {
        const err = await res.json();
        alert('Gagal checkout: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div style={{ background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PublicNavbar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <h2>Keranjang Anda Kosong</h2>
            <Button onClick={() => router.push('/assets')} style={{ marginTop: '1rem' }}>Mulai Belanja</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PublicNavbar />
      <main style={{ flex: 1, maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem' }}>Checkout ({cartItems.length} Item)</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Card style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Daftar Pesanan</h2>
              {cartItems.map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: idx < cartItems.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.roomName}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                      Tipe: {item.itemType} | {item.bookingDate}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(item.roomSubtotal)}</div>
                  </div>
                </div>
              ))}
            </Card>

            <Card style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Data Pemesan</h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600 }}>Nama Lengkap</label>
                  <input type="text" value={renterName} onChange={e => setRenterName(e.target.value)} required className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600 }}>Email</label>
                  <input type="email" value={renterEmail} onChange={e => setRenterEmail(e.target.value)} required className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600 }}>Nomor HP/WA</label>
                    <input type="text" value={renterPhone} onChange={e => setRenterPhone(e.target.value)} required className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600 }}>No KTP / NIK</label>
                    <input type="text" value={idCardNo} onChange={e => setIdCardNo(e.target.value)} required className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                  </div>
                </div>
              </form>
            </Card>
          </div>

          <div style={{ position: 'sticky', top: '2rem' }}>
            <Card style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Total Tagihan</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span>Subtotal ({cartItems.length} item)</span>
                <span>{formatCurrency(grandTotal - totalDeposit)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--color-muted)' }}>
                <span>Total Deposit</span>
                <span>{formatCurrency(totalDeposit)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Grand Total</span>
                <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--color-primary)' }}>{formatCurrency(grandTotal)}</span>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <Button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '1rem', fontSize: '1rem' }} variant="primary">
                  {loading ? 'Memproses...' : 'Selesaikan Pemesanan'}
                </Button>
              </div>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}

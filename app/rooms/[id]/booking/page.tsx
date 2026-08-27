'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PublicNavbar } from '@/components/public/Navbar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { ArrowLeft, ArrowRight, Package, User, Building2, CheckCircle, Plus, Minus, Lock, LogIn } from 'lucide-react';

function PublicBookingWizardForm() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { data: session } = useSession();
  
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  // Data from previous page
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const [startTime, setStartTime] = useState(startParam ? new Date(startParam) : new Date());
  const [endTime, setEndTime] = useState(endParam ? new Date(endParam) : new Date(Date.now() + 3600000));
  
  // Step 2: Add-Ons
  const [availableAddOns, setAvailableAddOns] = useState<any[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<any[]>([]); // { assetId, quantity, rate }

  // Step 3: Renter Data
  const [renterData, setRenterData] = useState({
    name: '',
    phone: '',
    email: '',
    nik: '',
    supportingDocUrl: '',
    notes: '',
    paymentScheme: 'FULL',
    paymentMethod: 'TRANSFER'
  });

  useEffect(() => {
    if (session?.user) {
      setRenterData(prev => ({
        ...prev,
        name: prev.name || session?.user?.name || '',
        email: prev.email || session?.user?.email || '',
      }));
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomRes, assetsRes] = await Promise.all([
        fetch(`/api/rooms/${params.id}`),
        fetch('/api/public/assets?isFixedToRoom=false&isRentable=true&status=AVAILABLE') // We'll just fetch all for now and filter manually below just in case API doesn't support
      ]);
      
      if (roomRes.ok) {
        setRoom(await roomRes.json());
      }
      if (assetsRes.ok) {
        const assets = await assetsRes.json();
        // filter to be safe
        setAvailableAddOns(assets.filter((a: any) => !a.isFixedToRoom && a.isRentable && a.status === 'AVAILABLE'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDurationHours = () => {
    const diff = endTime.getTime() - startTime.getTime();
    return diff > 0 ? diff / (1000 * 60 * 60) : 0;
  };

  const duration = getDurationHours();
  const roomCost = duration * (room?.pricePerHour || 0);
  const deposit = room?.depositAmount || 0;
  
  const addonsCost = selectedAddOns.reduce((acc, curr) => {
    return acc + (curr.rate * curr.quantity);
  }, 0);

  const grandTotal = roomCost + addonsCost;
  const payAmount = renterData.paymentScheme === 'DOWN_PAYMENT' ? grandTotal / 2 : grandTotal;

  const handleAddQty = (asset: any) => {
    const exist = selectedAddOns.find(a => a.assetId === asset.id);
    if (exist) {
      if (exist.quantity >= asset.availableQty) return;
      setSelectedAddOns(selectedAddOns.map(a => a.assetId === asset.id ? { ...a, quantity: a.quantity + 1 } : a));
    } else {
      setSelectedAddOns([...selectedAddOns, { 
        assetId: asset.id, 
        name: asset.name,
        quantity: 1, 
        rate: asset.sessionRentRate || asset.dailyRentRate || 0 
      }]);
    }
  };

  const handleMinQty = (assetId: string) => {
    const exist = selectedAddOns.find(a => a.assetId === assetId);
    if (!exist) return;
    if (exist.quantity <= 1) {
      setSelectedAddOns(selectedAddOns.filter(a => a.assetId !== assetId));
    } else {
      setSelectedAddOns(selectedAddOns.map(a => a.assetId === assetId ? { ...a, quantity: a.quantity - 1 } : a));
    }
  };

  const getQty = (assetId: string) => {
    const exist = selectedAddOns.find(a => a.assetId === assetId);
    return exist ? exist.quantity : 0;
  };

  const [uploadingDoc, setUploadingDoc] = useState(false);

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDoc(true);
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        setRenterData((prev) => ({ ...prev, supportingDocUrl: data.url }));
        showToast('Dokumen resmi berhasil diunggah!', 'success');
      } else {
        showToast('Gagal mengunggah dokumen', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan unggah file', 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      const payload = {
        locationId: room.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        renterName: renterData.name,
        renterPhone: renterData.phone,
        renterEmail: renterData.email,
        renterIdCard: renterData.nik,
        supportingDocUrl: renterData.supportingDocUrl,
        notes: renterData.notes,
        payStatus: 'UNPAID',
        payMethod: renterData.paymentMethod,
        paymentScheme: renterData.paymentScheme,
        addonAssets: selectedAddOns.map(a => ({ assetId: a.assetId, assetName: a.name, quantity: a.quantity, ratePerSession: a.rate }))
      };

      const res = await fetch('/api/room-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Booking berhasil dibuat!', 'success');
        router.push(`/bookings/${data.bookingNumber}`);
      } else {
        showToast(data.error || 'Gagal membuat booking', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg)' }}>
        <PublicNavbar />
        <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div style={{ height: '400px', background: 'var(--color-surface2)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <PublicNavbar />
      
      <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Pesan Ruangan</h1>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-muted)', fontWeight: 600 }}>
            Langkah {step} dari 4
          </div>
        </div>

        {/* Stepper Progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '4px', background: 'var(--color-surface2)', zIndex: 0, transform: 'translateY(-50%)' }} />
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{ 
              width: '40px', height: '40px', borderRadius: '50%', 
              background: step >= s ? 'var(--color-primary)' : 'var(--color-surface2)', 
              color: step >= s ? '#fff' : 'var(--color-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
              position: 'relative', zIndex: 1, transition: 'all 0.3s'
            }}>
              {step > s ? <CheckCircle size={20} /> : s}
            </div>
          ))}
        </div>

        <Card style={{ padding: '2rem' }}>
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} style={{ color: 'var(--color-primary)' }}/> Waktu & Ruangan
              </h2>
              
              <div style={{ background: 'var(--color-surface2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Ruangan Terpilih</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{room?.name}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-muted)' }}>{room?.building}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="input-label">Waktu Mulai</label>
                  <input type="datetime-local" className="input-field" style={{ width: '100%' }} value={startTime.toISOString().slice(0,16)} disabled />
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>*Kembali ke halaman sebelumnya untuk ubah waktu</span>
                </div>
                <div>
                  <label className="input-label">Waktu Selesai</label>
                  <input type="datetime-local" className="input-field" style={{ width: '100%' }} value={endTime.toISOString().slice(0,16)} disabled />
                </div>
              </div>

              <div style={{ background: 'var(--color-primary-light, rgba(37,99,235,0.05))', border: '1px solid var(--color-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Estimasi Biaya Ruangan</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{duration.toFixed(1)} Jam × {formatCurrency(room?.pricePerHour || 0)}</div>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  {formatCurrency(roomCost)}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={20} style={{ color: 'var(--color-primary)' }}/> Tambahan Peralatan (Add-Ons)
              </h2>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Pilih peralatan tambahan yang ingin Anda sewa selama acara.</p>
              
              {availableAddOns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
                  Tidak ada peralatan tambahan yang tersedia saat ini.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                  {availableAddOns.map(asset => {
                    const qty = getQty(asset.id);
                    const photos = asset.images ? JSON.parse(asset.images) : [];
                    const img = photos.length > 0 ? photos[0] : null;
                    const rate = asset.sessionRentRate || asset.dailyRentRate || 0;
                    
                    return (
                      <div key={asset.id} style={{ border: qty > 0 ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: '120px', background: img ? `url(${img}) center/cover` : 'var(--color-surface2)' }} />
                        <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem', lineHeight: 1.2 }}>{asset.name}</h4>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '1rem' }}>
                            {formatCurrency(rate)} <span style={{ color: 'var(--color-muted)', fontWeight: 500 }}>/ sesi</span>
                          </div>
                          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Tersedia: {asset.availableQty}</span>
                            {qty === 0 ? (
                              <button onClick={() => handleAddQty(asset)} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Tambah</button>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button onClick={() => handleMinQty(asset.id)} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface2)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Minus size={14}/></button>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', width: '16px', textAlign: 'center' }}>{qty}</span>
                                <button onClick={() => handleAddQty(asset)} disabled={qty >= asset.availableQty} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: qty >= asset.availableQty ? 0.5 : 1 }}><Plus size={14}/></button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={20} style={{ color: 'var(--color-primary)' }}/> Data Penyewa & Pembayaran
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Nama Lengkap / Instansi <span style={{ color: 'red' }}>*</span></label>
                  <input className="input-field" style={{ width: '100%' }} value={renterData.name} onChange={(e) => setRenterData({...renterData, name: e.target.value})} placeholder="Contoh: Budi Santoso / PT Maju Jaya" />
                </div>
                <div>
                  <label className="input-label">No. WhatsApp <span style={{ color: 'red' }}>*</span></label>
                  <input className="input-field" style={{ width: '100%' }} value={renterData.phone} onChange={(e) => setRenterData({...renterData, phone: e.target.value})} placeholder="Contoh: 08123456789" />
                </div>
                <div>
                  <label className="input-label">Email (Opsional)</label>
                  <input type="email" className="input-field" style={{ width: '100%' }} value={renterData.email} onChange={(e) => setRenterData({...renterData, email: e.target.value})} placeholder="email@contoh.com" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Dokumen Resmi Pendukung (Surat Tugas / Proposal / KTP) <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>(Format PDF, JPG, PNG)</span></label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="input-field"
                      style={{ flex: 1 }}
                      onChange={handleDocUpload}
                    />
                    {uploadingDoc && <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>Mengunggah...</span>}
                  </div>
                  {renterData.supportingDocUrl && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle size={14} /> Dokumen berhasil terunggah! (<a href={renterData.supportingDocUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Lihat File</a>)
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Catatan Tambahan (Opsional)</label>
                  <textarea className="input-field" style={{ width: '100%', minHeight: '80px' }} value={renterData.notes} onChange={(e) => setRenterData({...renterData, notes: e.target.value})} placeholder="Keperluan acara, request layout ruangan, dll." />
                </div>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>Metode Pembayaran</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label className="input-label">Skema Pembayaran</label>
                  <select className="input-field" style={{ width: '100%' }} value={renterData.paymentScheme} onChange={(e) => setRenterData({...renterData, paymentScheme: e.target.value})}>
                    <option value="FULL">Bayar Penuh Lunas</option>
                    <option value="DOWN_PAYMENT">Bayar DP 50%</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Cara Bayar</label>
                  <select className="input-field" style={{ width: '100%' }} value={renterData.paymentMethod} onChange={(e) => setRenterData({...renterData, paymentMethod: e.target.value})}>
                    <option value="TRANSFER">Transfer Bank</option>
                    <option value="QRIS">QRIS</option>
                    <option value="CASH">Bayar Tunai / Cash</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={20} style={{ color: 'var(--color-primary)' }}/> Ringkasan Pesanan
              </h2>

              <div style={{ background: 'var(--color-surface2)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
                <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{room?.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>{startTime.toLocaleString('id-ID')} s.d {endTime.toLocaleString('id-ID')}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>Biaya Sewa ({duration.toFixed(1)} Jam)</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(roomCost)}</span>
                  </div>
                </div>

                {selectedAddOns.length > 0 && (
                  <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.5rem' }}>TAMBAHAN PERALATAN</div>
                    {selectedAddOns.map(a => (
                      <div key={a.assetId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        <span>{a.name} (x{a.quantity})</span>
                        <span>{formatCurrency(a.rate * a.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
                    <span>Deposit Jaminan (Akan dikembalikan)</span>
                    <span>{formatCurrency(deposit)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total Tagihan</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-primary)' }}>{formatCurrency(grandTotal + deposit)}</span>
                </div>
              </div>

              <div style={{ background: 'var(--color-primary-light, rgba(37,99,235,0.05))', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.9rem' }}>Jumlah yang harus dibayar sekarang</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{renterData.paymentScheme === 'DOWN_PAYMENT' ? 'Pembayaran DP 50% + Deposit Penuh' : 'Pembayaran Lunas + Deposit Penuh'}</div>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  {formatCurrency(payAmount + deposit)}
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
            {step > 1 ? (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={16} /> Sebelumnya
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => router.back()}>
                Batal
              </Button>
            )}
            
            {step < 4 ? (
              <Button variant="primary" onClick={() => {
                if (step === 3 && (!renterData.name || !renterData.phone)) {
                  showToast('Nama dan No WhatsApp wajib diisi', 'error');
                  return;
                }
                setStep(step + 1);
              }}>
                Selanjutnya <ArrowRight size={16} />
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSubmit} isLoading={submitting}>
                <CheckCircle size={16} /> Selesaikan Pesanan
              </Button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}

export default function PublicBookingWizardPage() {
  return (
    <React.Suspense fallback={<div>Memuat...</div>}>
      <PublicBookingWizardForm />
    </React.Suspense>
  );
}

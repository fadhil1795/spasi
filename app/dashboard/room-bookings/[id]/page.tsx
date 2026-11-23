'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Building2, User, FileText, CalendarClock, CreditCard, LogIn, LogOut, Download, CheckCircle, Package, Camera, Upload, Eye } from 'lucide-react';
import { TransactionTimeline, buildBookingTimeline } from '@/components/ui/TransactionTimeline';

export default function AdminRoomBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { showToast } = useToast();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/room-bookings/${id}`);
      if (res.ok) {
        setBooking(await res.json());
      } else {
        showToast('Data booking tidak ditemukan', 'error');
      }
    } catch (e) {
      showToast('Gagal memuat detail booking', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPaymentProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingProof(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload gagal');
      const data = await res.json();

      const patchRes = await fetch(`/api/room-bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentProofUrl: data.url,
          payStatus: 'PENDING_VERIFICATION',
        }),
      });

      if (patchRes.ok) {
        showToast('Struk/Bukti transfer pembayaran berhasil diunggah!', 'success');
        fetchBooking();
      } else {
        showToast('Gagal memperbarui bukti pembayaran', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan unggah bukti pembayaran', 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleUpdateStatus = async (bookingStatus: string, payStatus?: string) => {
    try {
      setUpdating(true);
      const res = await fetch(`/api/room-bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingStatus, ...(payStatus && { payStatus }) }),
      });

      if (res.ok) {
        showToast(`Status booking berhasil diubah menjadi ${bookingStatus}!`, 'success');
        fetchBooking();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal mengubah status', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const { data: session } = useSession();
  const isBorrower = session?.user && (session.user as any).role === 'BORROWER';

  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Skeleton height="300px" />
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Link
        href="/dashboard/room-bookings"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: 'var(--color-muted)',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={16} /> Kembali ke Daftar Booking
      </Link>

      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>
              {booking.bookingNumber}
            </span>
            <Badge status={booking.bookingStatus} />
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem' }}>
            Dibuat pada {formatDate(booking.createdAt, 'dd MMMM yyyy HH:mm')}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {['PENDING', 'PENDING_L1', 'PENDING_L2'].includes(booking.bookingStatus) && (
            <Link href={`/dashboard/room-bookings/new?editId=${booking.id}`} className="btn btn-secondary">
              ✏️ Edit Pesanan
            </Link>
          )}

          {['PENDING', 'PENDING_L1', 'PENDING_L2', 'APPROVED', 'CONFIRMED'].includes(booking.bookingStatus) && (
            <Button
              variant="ghost"
              style={{ color: 'var(--color-danger)' }}
              isLoading={updating}
              onClick={async () => {
                if (!confirm(`Batalkan pesanan #${booking.bookingNumber}?`)) return;
                await handleUpdateStatus('CANCELLED');
              }}
            >
              ❌ Batalkan Pesanan
            </Button>
          )}

          {!isBorrower && booking.bookingStatus === 'PENDING' && (
            <Button
              variant="primary"
              style={{ background: 'var(--color-success)', color: '#FFFFFF' }}
              isLoading={updating}
              onClick={() => {
                const isFree = ((booking.totalAmount || 0) + (booking.depositAmount || 0)) === 0;
                handleUpdateStatus(isFree ? 'CONFIRMED' : 'APPROVED');
              }}
            >
              <CheckCircle size={16} /> Setujui Pengajuan
            </Button>
          )}

          {!isBorrower && booking.payStatus === 'PENDING_VERIFICATION' && (
            <Button variant="primary" style={{ background: 'var(--color-success)', color: '#FFFFFF' }} isLoading={updating} onClick={() => handleUpdateStatus('CONFIRMED', 'PAID')}>
              <CheckCircle size={16} /> Verifikasi Bayar &amp; Konfirmasi
            </Button>
          )}

          {!isBorrower && booking.bookingStatus === 'APPROVED' && ((booking.totalAmount || 0) + (booking.depositAmount || 0)) === 0 && (
            <Button variant="primary" style={{ background: 'var(--color-success)', color: '#FFFFFF' }} isLoading={updating} onClick={() => handleUpdateStatus('CONFIRMED', 'PAID')}>
              <CheckCircle size={16} /> Konfirmasi Sesi Gratis
            </Button>
          )}

          {!isBorrower && booking.bookingStatus === 'CONFIRMED' && (
            <Link href={`/dashboard/room-bookings/${booking.id}/checkin`} className="btn btn-primary">
              <LogIn size={16} /> Proses Check-In
            </Link>
          )}

          {!isBorrower && ['ACTIVE', 'RETURN_REQUESTED'].includes(booking.bookingStatus) && (
            <Link href={`/dashboard/room-bookings/${booking.id}/checkout`} className="btn btn-primary">
              <LogOut size={16} /> Proses Check-Out &amp; Klaim
            </Link>
          )}

          {!isBorrower && booking.payStatus === 'DOWN_PAYMENT' && (
            <Button variant="secondary" isLoading={updating} onClick={() => handleUpdateStatus(booking.bookingStatus, 'PAID')}>
              <CreditCard size={16} /> Pelunasan Sisa DP
            </Button>
          )}
        </div>
      </div>

      <div className="booking-details-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* Main Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card Ruangan */}
          <Card style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} style={{ color: 'var(--color-primary)' }} /> Ruangan & Jadwal Sewa
            </h3>

            <div className="detail-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.78rem' }}>Ruangan / Paket Sarpras</span>
                <strong>{booking.location?.name || 'Paket Peralatan Sarpras (Tanpa Ruangan)'}</strong>
                {booking.location?.code ? ` (${booking.location.code})` : ''}
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.78rem' }}>Gedung / Lokasi</span>
                <span>{booking.location?.building || '-'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.78rem' }}>Tipe Sewa & Durasi</span>
                <span>{booking.rentalType === 'DAILY' ? 'Per Hari' : 'Per Jam'} — <strong>{booking.durationHours} Jam</strong></span>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.78rem' }}>Waktu Mulai - Selesai</span>
                <span>{formatDate(booking.startTime, 'dd MMM yyyy HH:mm')} s.d {formatDate(booking.endTime, 'dd MMM yyyy HH:mm')}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.78rem' }}>Waktu Check-In Aktual</span>
                <strong style={{ color: booking.checkInTime ? 'var(--color-info)' : 'var(--color-muted)' }}>
                  {booking.checkInTime ? formatDate(booking.checkInTime, 'dd MMM yyyy, HH:mm:ss') : 'Belum Check-In'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.78rem' }}>Waktu Check-Out Aktual</span>
                <strong style={{ color: booking.checkOutTime ? 'var(--color-success)' : 'var(--color-muted)' }}>
                  {booking.checkOutTime ? formatDate(booking.checkOutTime, 'dd MMM yyyy, HH:mm:ss') : 'Belum Check-Out'}
                </strong>
              </div>
            </div>

            {booking.notes && (
              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', whiteSpace: 'pre-line' }}>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Catatan / Riwayat Keterangan
                </span>
                {booking.notes}
              </div>
            )}
          </Card>

          {/* Card Riwayat Inspeksi Check-In & Check-Out */}
          {Array.isArray(booking.inspections) && booking.inspections.length > 0 && (
            <Card style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.85rem' }}>
                🔍 Riwayat Inspeksi Fisik (Check-In / Check-Out)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                      <th style={{ padding: '0.55rem 0.7rem' }}>Tahap</th>
                      <th style={{ padding: '0.55rem 0.7rem' }}>Fasilitas / Aset</th>
                      <th style={{ padding: '0.55rem 0.7rem' }}>Kondisi</th>
                      <th style={{ padding: '0.55rem 0.7rem' }}>Petugas &amp; Waktu</th>
                      <th style={{ padding: '0.55rem 0.7rem' }}>Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.inspections.map((ins: any) => (
                      <tr key={ins.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.55rem 0.7rem', fontWeight: 700 }}>
                          {ins.type === 'CHECK_IN' ? 'Check-In' : 'Check-Out'}
                        </td>
                        <td style={{ padding: '0.55rem 0.7rem', fontWeight: 600 }}>{ins.assetName || '-'}</td>
                        <td style={{ padding: '0.55rem 0.7rem' }}>
                          {ins.isMissing ? (
                            <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>HILANG</span>
                          ) : ins.isDamaged ? (
                            <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>{ins.conditionAfter || 'RUSAK'}</span>
                          ) : (
                            <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                              {ins.type === 'CHECK_IN' ? (ins.conditionBefore || 'Baik') : (ins.conditionAfter || 'Baik')}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.55rem 0.7rem', color: 'var(--color-muted)', fontSize: '0.76rem' }}>
                          {ins.inspectedBy || '-'} • {formatDate(ins.timestamp, 'dd MMM yyyy, HH:mm')}
                        </td>
                        <td style={{ padding: '0.55rem 0.7rem' }}>{ins.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Card Penyewa & Dokumen Pendukung */}
          <Card style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} style={{ color: 'var(--color-accent)' }} /> Data Penyewa & Dokumen Resmi
            </h3>

            <div className="detail-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.78rem' }}>Nama Pemesan / Instansi</span>
                <strong>{booking.renter?.name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.78rem' }}>No. WhatsApp</span>
                <span>{booking.renter?.phone}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.78rem' }}>Email</span>
                <span>{booking.renter?.email || '-'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: '0.78rem' }}>NIK / NIP / No. KTP</span>
                <span>{booking.renter?.idCardNo || '-'}</span>
              </div>
            </div>

            {/* Dokumen Pendukung Section */}
            <div style={{ background: 'var(--color-surface2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.4rem' }}>
                <FileText size={16} style={{ color: 'var(--color-primary)' }} /> Dokumen Resmi Pendukung
              </div>
              {(() => {
                let docs: string[] = [];
                if (booking.supportingDocUrl) {
                  try {
                    const parsed = JSON.parse(booking.supportingDocUrl);
                    if (Array.isArray(parsed)) docs = parsed;
                    else docs = [booking.supportingDocUrl];
                  } catch {
                    docs = [booking.supportingDocUrl];
                  }
                }

                if (docs.length === 0) {
                  return (
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                      Tidak ada dokumen pendukung yang diunggah saat pemesanan.
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {docs.length >= 2 ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.83rem' }}>
                          <span>🪪 <strong>Identitas (KTP/KTM):</strong></span>
                          <a href={docs[0]} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}>
                            <Download size={12} /> Buka / Unduh
                          </a>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.83rem' }}>
                          <span>📄 <strong>Surat Kegiatan:</strong></span>
                          <a href={docs[1]} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}>
                            <Download size={12} /> Buka / Unduh
                          </a>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.83rem' }}>
                        <span>📄 <strong>Lampiran:</strong></span>
                        <a href={docs[0]} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}>
                          <Download size={12} /> Buka / Unduh
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Bukti Transfer Pembayaran Section */}
            {((booking.totalAmount || 0) + (booking.depositAmount || 0)) === 0 ? (
              <div style={{ background: 'rgba(16,185,129,0.06)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <CheckCircle size={20} style={{ color: '#10b981', flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#10b981', marginBottom: '0.2rem' }}>Pemesanan Bebas Biaya (Rp 0)</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', lineHeight: 1.5, margin: 0 }}>
                    Reservasi ini bersifat gratis (Mahasiswa/Internal/Lembaga) sehingga tidak memerlukan proses transfer dana atau unggah struk pembayaran pembayaran.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--color-surface2)', padding: '1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CreditCard size={17} style={{ color: 'var(--color-success)' }} /> Struk / Bukti Transfer Pembayaran
                  </span>
                  {booking.paymentProofUrl && (
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(16,185,129,0.12)', color: 'var(--color-success)', fontWeight: 700 }}>
                      ✓ Terlampir
                    </span>
                  )}
                </div>

                {booking.paymentProofUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {/* Thumbnail / Image or PDF Preview */}
                    <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border)', maxWidth: '360px', background: '#000' }}>
                      {/\.pdf(\?.*)?$/i.test(booking.paymentProofUrl) ? (
                        <iframe
                          src={booking.paymentProofUrl}
                          title="Struk Pembayaran PDF"
                          style={{ width: '100%', height: '220px', border: 'none', background: '#fff' }}
                        />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={booking.paymentProofUrl}
                          alt="Struk Pembayaran"
                          style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', display: 'block' }}
                        />
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <a
                        href={booking.paymentProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Download size={14} /> Lihat / Periksa Struk
                      </a>

                      <label
                        className="btn btn-secondary btn-sm"
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Upload size={14} /> {uploadingProof ? 'Mengunggah...' : 'Perbarui / Ganti Struk'}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleUploadPaymentProof}
                          style={{ display: 'none' }}
                          disabled={uploadingProof}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                      Belum ada struk pembayaran yang terlampir untuk transaksi ini.
                    </div>
                    <div>
                      <label
                        className="btn btn-primary btn-sm"
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Upload size={14} /> {uploadingProof ? 'Mengunggah Struk...' : '+ Unggah Bukti Transfer Pembayaran'}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleUploadPaymentProof}
                          style={{ display: 'none' }}
                          disabled={uploadingProof}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Add-On Assets */}
          {booking.addonAssets && booking.addonAssets.length > 0 && (
            <Card style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={18} style={{ color: 'var(--color-warning)' }} /> Peralatan Tambahan (Add-Ons)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
                {booking.addonAssets.map((a: any) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span>{a.assetName} (x{a.quantity})</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(a.subtotal)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar: Summary + Transaction Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Rincian Keuangan */}
          <Card style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              Rincian Keuangan
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-muted)' }}>Sewa Ruangan</span>
                <span>{formatCurrency(booking.roomSubtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-muted)' }}>Add-On Peralatan</span>
                <span>{formatCurrency(booking.addonSubtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-muted)' }}>Deposit Jaminan</span>
                <span>{formatCurrency(booking.depositAmount)}</span>
              </div>
              {booking.overtimeFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)' }}>
                  <span>Denda Overtime ({booking.overtimeHours} Jam)</span>
                  <span>+{formatCurrency(booking.overtimeFee)}</span>
                </div>
              )}
              <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Total Billing</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-primary)' }}>
                  {formatCurrency(booking.totalAmount + booking.depositAmount + (booking.overtimeFee || 0))}
                </span>
              </div>
            </div>

            <div style={{ background: 'var(--color-surface2)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
              <div><span style={{ color: 'var(--color-muted)' }}>Status Bayar:</span> <strong style={{ textTransform: 'uppercase' }}>{booking.payStatus}</strong></div>
              <div><span style={{ color: 'var(--color-muted)' }}>Metode:</span> {booking.payMethod || '-'}</div>
              {booking.paymentScheme && (
                <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Skema Bayar:</span>{' '}
                  <strong style={{ color: booking.paymentScheme === 'DOWN_PAYMENT' ? 'var(--color-warning)' : 'var(--color-success)' }}>
                    {booking.paymentScheme === 'DOWN_PAYMENT' ? '💡 DP 50% (Cicilan)' : '✅ Lunas Penuh'}
                  </strong>
                </div>
              )}
            </div>

            {/* Rekening Pengembalian Jaminan (Deposit) */}
            {booking.depositAmount > 0 && (
              <div style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.9rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Rekening Pengembalian Deposit
                  </span>
                  <Badge variant={booking.refundStatus === 'REFUNDED' ? 'success' : (booking.refundStatus === 'PENDING' ? 'warning' : 'neutral')}>
                    {booking.refundStatus === 'REFUNDED' ? '✓ Telah Dikembalikan' : (booking.refundStatus === 'PENDING' ? '⏳ Menunggu Checkout' : 'Tidak Ada')}
                  </Badge>
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text)' }}>
                  {booking.bankName || 'Bank Belum Diisi'}
                </div>
                <div style={{ fontSize: '0.95rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary-light)', margin: '0.2rem 0' }}>
                  {booking.bankAccountNumber || '-'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                  a.n. {booking.bankAccountHolder || booking.renter?.name || '-'}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link href={`/bookings/${booking.bookingNumber}`} target="_blank" className="btn btn-secondary" style={{ width: '100%', textDecoration: 'none', justifyContent: 'center' }}>
                Lihat E-Voucher Digital
              </Link>

              {/* Cetak Kuitansi / Invoice */}
              {booking.payStatus !== 'UNPAID' && (
                <a
                  href={`/api/room-bookings/${booking.id}/pdf?type=RECEIPT`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-success"
                  style={{ width: '100%', textDecoration: 'none', justifyContent: 'center', background: 'var(--color-success)', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.88rem' }}
                >
                  🖨️ Cetak Kuitansi &amp; Invoice
                </a>
              )}

              {/* Cetak Berita Acara Serah Terima (BAST) */}
              {booking.bookingStatus !== 'PENDING' && (
                <a
                  href={`/api/room-bookings/${booking.id}/pdf?type=BAST`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ width: '100%', textDecoration: 'none', justifyContent: 'center', background: 'var(--color-primary)', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.88rem' }}
                >
                  📄 Cetak Berita Acara (BAST)
                </a>
              )}
            </div>
          </Card>

          {/* Transaction Timeline — Expedition-style Tracking */}
          <Card style={{ padding: '1.5rem' }}>
            <TransactionTimeline steps={buildBookingTimeline(booking)} />
          </Card>

        </div>
      </div>
    </div>
  );
}

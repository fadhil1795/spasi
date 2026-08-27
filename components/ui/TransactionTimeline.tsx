'use client';

import React from 'react';
import { CheckCircle2, Clock, XCircle, Circle, Package, Truck, ShieldCheck, FileText, PhoneCall, Wrench, Home } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export interface TimelineStep {
  key: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  status: 'done' | 'active' | 'pending' | 'rejected' | 'skipped';
  actor?: string;
  timestamp?: string;
  notes?: string;
}

interface TransactionTimelineProps {
  steps: TimelineStep[];
  title?: string;
}

export function TransactionTimeline({ steps, title = 'Riwayat & Alur Transaksi' }: TransactionTimelineProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {title && (
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-muted)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}>
          <FileText size={14} />
          {title}
        </div>
      )}

      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;

        const iconBg =
          step.status === 'done'     ? '#10b981' :
          step.status === 'active'   ? 'var(--color-primary)' :
          step.status === 'rejected' ? '#ef4444' :
          step.status === 'skipped'  ? 'var(--color-muted)' :
                                       'var(--color-surface2)';

        const iconColor =
          step.status === 'pending' ? 'var(--color-muted)' : '#FFFFFF';

        const lineBg =
          step.status === 'done'     ? '#10b981' :
          step.status === 'active'   ? 'var(--color-primary)' :
          step.status === 'rejected' ? '#ef4444' :
                                       'var(--color-border)';

        const defaultIcon =
          step.status === 'done'     ? <CheckCircle2 size={16} /> :
          step.status === 'active'   ? <Clock size={16} style={{ animation: 'pulse 2s infinite' }} /> :
          step.status === 'rejected' ? <XCircle size={16} /> :
                                       <Circle size={16} />;

        return (
          <div key={step.key} style={{ display: 'flex', gap: '0' }}>
            {/* Left: Icon + Connector Line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '36px', flexShrink: 0 }}>
              {/* Circle Icon */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: iconColor,
                  flexShrink: 0,
                  border: step.status === 'active' ? '2px solid var(--color-primary-light)' : '2px solid transparent',
                  boxShadow: step.status === 'active' ? '0 0 12px rgba(79,70,229,0.4)' : 'none',
                  zIndex: 2,
                  transition: 'all 0.3s ease',
                }}
              >
                {step.icon || defaultIcon}
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  style={{
                    width: '2px',
                    flexGrow: 1,
                    minHeight: '32px',
                    background: lineBg,
                    margin: '2px 0',
                    transition: 'background 0.3s ease',
                    opacity: step.status === 'pending' ? 0.25 : 0.6,
                  }}
                />
              )}
            </div>

            {/* Right: Content */}
            <div style={{
              paddingLeft: '1rem',
              paddingBottom: isLast ? '0' : '1.5rem',
              flex: 1,
              paddingTop: '0.2rem',
            }}>
              {/* Label Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
                <span style={{
                  fontWeight: step.status === 'active' ? 800 : step.status === 'done' ? 700 : 600,
                  fontSize: '0.9rem',
                  color: step.status === 'active'
                    ? 'var(--color-primary-light)'
                    : step.status === 'rejected'
                    ? 'var(--color-danger)'
                    : step.status === 'pending'
                    ? 'var(--color-muted)'
                    : 'var(--color-text)',
                }}>
                  {step.label}
                </span>

                {step.timestamp && (
                  <span style={{
                    fontSize: '0.72rem',
                    color: 'var(--color-muted)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    background: 'var(--color-surface2)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-pill)',
                  }}>
                    {formatDate(step.timestamp, 'dd MMM yyyy HH:mm')}
                  </span>
                )}
              </div>

              {/* Sublabel */}
              {step.sublabel && (
                <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.1rem' }}>
                  {step.sublabel}
                </div>
              )}

              {/* Actor */}
              {step.actor && (
                <div style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: step.status === 'done' ? '#10b981' : step.status === 'active' ? 'var(--color-primary)' : 'var(--color-muted)',
                  marginTop: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}>
                  <span style={{ opacity: 0.6 }}>↳</span> {step.actor}
                </div>
              )}

              {/* Notes / Catatan */}
              {step.notes && (
                <div style={{
                  marginTop: '0.4rem',
                  fontSize: '0.8rem',
                  background: step.status === 'rejected' ? 'rgba(239,68,68,0.08)' : 'var(--color-surface2)',
                  borderLeft: `3px solid ${step.status === 'rejected' ? '#ef4444' : step.status === 'done' ? '#10b981' : 'var(--color-primary)'}`,
                  padding: '0.4rem 0.65rem',
                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  color: 'var(--color-muted)',
                  lineHeight: 1.5,
                  fontStyle: 'italic',
                }}>
                  {step.notes}
                </div>
              )}

              {/* Active pulse indicator */}
              {step.status === 'active' && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginTop: '0.35rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                }}>
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: 'var(--color-primary)',
                    animation: 'pulse 1.5s infinite',
                    display: 'inline-block',
                  }} />
                  Sedang Berlangsung...
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Helper: Build timeline steps for Internal Loan transaction
 */
export function buildLoanTimeline(loan: any): TimelineStep[] {
  const s = loan?.status || '';

  const isDone     = (statuses: string[]) => statuses.some((x) => {
    const order = ['PENDING_L1','PENDING_L2','APPROVED','ACTIVE','RETURN_REQUESTED','UNDER_INSPECTION','RETURNED','NEEDS_REPAIR','LOST_REPORTED','REJECTED'];
    const currentIdx = order.indexOf(s);
    const checkIdx   = order.indexOf(x);
    return currentIdx >= checkIdx && s !== 'REJECTED';
  });

  const isActive   = (statuses: string[]) => statuses.includes(s);
  const isRejected = s === 'REJECTED';

  return [
    {
      key: 'created',
      label: '📝 Pengajuan Dibuat',
      sublabel: 'Peminjam mengisi & mengirim formulir pengajuan',
      icon: <FileText size={15} />,
      status: 'done',
      actor: loan?.user?.name || 'Peminjam',
      timestamp: loan?.createdAt,
    },
    {
      key: 'approval_l1',
      label: '🛡️ Persetujuan Level 1 (Kepala Unit / Atasan)',
      sublabel: 'Atasan langsung peminjam memverifikasi kebutuhan',
      icon: <ShieldCheck size={15} />,
      status: isRejected && s === 'PENDING_L1'
        ? 'rejected'
        : isActive(['PENDING_L1'])
        ? 'active'
        : isDone(['PENDING_L2','APPROVED','ACTIVE','RETURN_REQUESTED','UNDER_INSPECTION','RETURNED'])
        ? 'done'
        : 'pending',
      actor: loan?.approverL1?.name || undefined,
      timestamp: loan?.approvedL1At || undefined,
      notes: loan?.status === 'REJECTED' && !loan?.approvedL1At ? 'Ditolak oleh Kepala Unit' : loan?.notesL1 || undefined,
    },
    {
      key: 'approval_l2',
      label: '🔐 Verifikasi Level 2 (Admin Aset / Sarpras)',
      sublabel: 'Admin memastikan ketersediaan & kondisi aset',
      icon: <ShieldCheck size={15} />,
      status: isActive(['PENDING_L2'])
        ? 'active'
        : isDone(['APPROVED','ACTIVE','RETURN_REQUESTED','UNDER_INSPECTION','RETURNED'])
        ? 'done'
        : 'pending',
      actor: loan?.approverL2?.name || undefined,
      timestamp: loan?.approvedL2At || undefined,
      notes: loan?.notesL2 || undefined,
    },
    {
      key: 'handover',
      label: '📦 Penyerahan Fisik & Scan QR Check-In',
      sublabel: 'Petugas menyerahkan aset & melakukan QR Scan',
      icon: <Package size={15} />,
      status: isActive(['APPROVED'])
        ? 'active'
        : isDone(['ACTIVE','RETURN_REQUESTED','UNDER_INSPECTION','RETURNED'])
        ? 'done'
        : 'pending',
      actor: undefined,
      timestamp: loan?.checkedOutAt || undefined,
    },
    {
      key: 'active',
      label: '⏳ Aset Sedang Dipinjam (Aktif)',
      sublabel: 'Aset berada di tangan peminjam',
      icon: <Truck size={15} />,
      status: isActive(['ACTIVE'])
        ? 'active'
        : isDone(['RETURN_REQUESTED','UNDER_INSPECTION','RETURNED'])
        ? 'done'
        : 'pending',
      actor: loan?.user?.name || undefined,
      timestamp: loan?.startDate ? loan.startDate : undefined,
    },
    {
      key: 'return_requested',
      label: '🔄 Pengajuan Pengembalian (Peminjam)',
      sublabel: 'Peminjam mengajukan pengembalian aset ke petugas',
      icon: <PhoneCall size={15} />,
      status: isActive(['RETURN_REQUESTED'])
        ? 'active'
        : isDone(['UNDER_INSPECTION','RETURNED'])
        ? 'done'
        : 'pending',
      actor: loan?.user?.name || undefined,
      timestamp: loan?.returnRequestedAt || undefined,
      notes: loan?.returnNotes || undefined,
    },
    {
      key: 'inspection',
      label: '🔍 Inspeksi Fisik & Verifikasi Kondisi (Petugas)',
      sublabel: 'Pemeriksaan 10-tahap: kelengkapan, kondisi, & dokumentasi foto',
      icon: <Wrench size={15} />,
      status: isActive(['UNDER_INSPECTION'])
        ? 'active'
        : isDone(['RETURNED','NEEDS_REPAIR','LOST_REPORTED'])
        ? 'done'
        : 'pending',
      actor: undefined,
      timestamp: loan?.inspectedAt || undefined,
    },
    {
      key: 'completed',
      label: isRejected
        ? '❌ Pengajuan Ditolak'
        : ['NEEDS_REPAIR'].includes(s)
        ? '⚠️ Selesai — Aset Perlu Perbaikan'
        : ['LOST_REPORTED'].includes(s)
        ? '🚨 Selesai — Laporan Kehilangan'
        : '✅ Transaksi Selesai & Aset Dikembalikan',
      sublabel: isRejected
        ? 'Pengajuan tidak dapat diproses lebih lanjut'
        : 'Status aset diperbarui otomatis oleh sistem',
      icon: isRejected ? <XCircle size={15} /> : <CheckCircle2 size={15} />,
      status: isRejected
        ? 'rejected'
        : isDone(['RETURNED','NEEDS_REPAIR','LOST_REPORTED'])
        ? 'done'
        : 'pending',
      actor: 'Sistem Otomatis (SPASI)',
      timestamp: loan?.returnedAt || undefined,
    },
  ];
}

/**
 * Helper: Build timeline steps for Room Booking / Commercial Rental transaction
 */
export function buildBookingTimeline(booking: any): TimelineStep[] {
  const s = booking?.bookingStatus || '';
  const p = booking?.payStatus || '';

  const isRejected   = ['CANCELLED', 'REJECTED'].includes(s) || p === 'REJECTED';
  const isFree       = ((booking?.totalAmount || 0) + (booking?.depositAmount || 0)) === 0;

  const order = ['PENDING','APPROVED','CONFIRMED','ACTIVE','RETURN_REQUESTED','COMPLETED'];
  const currentIdx   = order.indexOf(s);
  const isDone       = (statuses: string[]) => statuses.some((x) => {
    const checkIdx = order.indexOf(x);
    return currentIdx > checkIdx && !isRejected;
  });
  const isCurrent    = (statuses: string[]) => statuses.includes(s);

  return [
    {
      key: 'created',
      label: '📝 Pengajuan Booking Dibuat',
      sublabel: 'Penyewa mengisi & mengirim formulir pemesanan ruangan/alat',
      icon: <FileText size={15} />,
      status: 'done',
      actor: booking?.renter?.name || 'Penyewa',
      timestamp: booking?.createdAt,
    },
    {
      key: 'approval',
      label: '🛡️ Persetujuan Admin / Kepala',
      sublabel: 'Admin memverifikasi ketersediaan slot & kelayakan pemesanan',
      icon: <ShieldCheck size={15} />,
      status: isRejected && isCurrent(['CANCELLED'])
        ? 'rejected'
        : isCurrent(['PENDING'])
        ? 'active'
        : isDone(['APPROVED','CONFIRMED','ACTIVE','COMPLETED']) || ['APPROVED','CONFIRMED','ACTIVE','COMPLETED'].includes(s)
        ? 'done'
        : 'pending',
      actor: undefined,
      timestamp: booking?.approvedAt || undefined,
    },
    {
      key: 'payment',
      label: isFree ? '💡 Bebas Biaya (Gratis)' : '💳 Pembayaran & Upload Bukti Transfer',
      sublabel: isFree ? 'Pemesanan ruangan/alat ini tidak memerlukan biaya pembayaran.' : 'Penyewa melakukan transfer & mengunggah struk pembayaran',
      icon: <FileText size={15} />,
      status: isFree
        ? 'done'
        : p === 'REJECTED'
        ? 'rejected'
        : ['PAID','DOWN_PAYMENT'].includes(p) || isCurrent(['CONFIRMED','ACTIVE','COMPLETED'])
        ? 'done'
        : p === 'PENDING_VERIFICATION'
        ? 'active'
        : isCurrent(['APPROVED'])
        ? 'active'
        : 'pending',
      actor: isFree ? 'Sistem Otomatis (SPASI)' : (booking?.renter?.name || undefined),
      timestamp: booking?.paidAt || undefined,
      notes: isFree ? 'Bebas biaya sewa & jaminan deposit' : (p === 'REJECTED' ? 'Struk pembayaran ditolak (tidak valid/palsu)' : p === 'PENDING_VERIFICATION' ? 'Menunggu verifikasi Admin...' : undefined),
    },
    {
      key: 'payment_verify',
      label: isFree ? '✅ Konfirmasi Otomatis' : '✅ Verifikasi Pembayaran & Konfirmasi Booking',
      sublabel: isFree ? 'Reservasi otomatis dikonfirmasi setelah disetujui Admin.' : 'Admin memverifikasi keabsahan struk transfer & menerbitkan E-Voucher',
      icon: <ShieldCheck size={15} />,
      status: isFree
        ? (s !== 'PENDING' ? 'done' : 'pending')
        : (['CONFIRMED','ACTIVE','COMPLETED'].includes(s) && ['PAID','DOWN_PAYMENT'].includes(p))
        ? 'done'
        : p === 'PENDING_VERIFICATION'
        ? 'active'
        : 'pending',
      actor: undefined,
      timestamp: booking?.confirmedAt || undefined,
    },
    {
      key: 'checkin',
      label: '🔑 Check-In & Pemakaian Ruangan Dimulai',
      sublabel: 'Petugas & penyewa melakukan cek fisik ruangan & fasilitas sebelum sesi',
      icon: <Home size={15} />,
      status: isCurrent(['ACTIVE','RETURN_REQUESTED'])
        ? 'done'
        : isCurrent(['CONFIRMED'])
        ? 'active'
        : isDone(['ACTIVE','COMPLETED'])
        ? 'done'
        : 'pending',
      timestamp: booking?.checkedInAt || booking?.startTime || undefined,
    },
    {
      key: 'active',
      label: '⏳ Sesi Berlangsung',
      sublabel: 'Ruangan sedang digunakan oleh penyewa',
      icon: <Truck size={15} />,
      status: isCurrent(['ACTIVE'])
        ? 'active'
        : isCurrent(['RETURN_REQUESTED','COMPLETED'])
        ? 'done'
        : 'pending',
      actor: booking?.renter?.name || undefined,
      timestamp: booking?.startTime || undefined,
    },
    {
      key: 'return_req',
      label: '📤 Ajukan Selesai Pemakaian (Penyewa)',
      sublabel: 'Penyewa memberitahukan sesi telah selesai',
      icon: <PhoneCall size={15} />,
      status: isCurrent(['RETURN_REQUESTED'])
        ? 'active'
        : isCurrent(['COMPLETED'])
        ? 'done'
        : 'pending',
      timestamp: booking?.returnRequestedAt || undefined,
    },
    {
      key: 'checkout',
      label: '🔍 Inspeksi & Check-Out (Petugas)',
      sublabel: 'Petugas memeriksa kondisi fasilitas, menghitung deposit & klaim kerusakan',
      icon: <Wrench size={15} />,
      status: isCurrent(['COMPLETED'])
        ? 'done'
        : 'pending',
      timestamp: booking?.checkedOutAt || undefined,
    },
    {
      key: 'completed',
      label: isRejected
        ? '❌ Booking Dibatalkan / Ditolak'
        : '✅ Sesi Selesai & Deposit Diselesaikan',
      sublabel: isRejected
        ? 'Transaksi tidak dapat dilanjutkan'
        : 'Transaksi tercatat & deposit dikembalikan/diklaim sesuai kondisi',
      icon: isRejected ? <XCircle size={15} /> : <CheckCircle2 size={15} />,
      status: isRejected
        ? 'rejected'
        : isCurrent(['COMPLETED'])
        ? 'done'
        : 'pending',
      actor: 'Sistem Otomatis (SPASI)',
      timestamp: booking?.completedAt || booking?.endTime || undefined,
    },
  ];
}

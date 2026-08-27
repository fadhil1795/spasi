import React from 'react';

interface BadgeProps {
  status?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status = '', className = '' }) => {
  let badgeClass = 'badge-available';
  let label = status || 'N/A';
  let hasPulse = false;

  const safeStatus = (status || '').toString().toUpperCase();

  switch (safeStatus) {
    case 'AVAILABLE':
    case 'TERSEDIA':
    case 'APPROVED':
    case 'PAID':
    case 'LUNAS':
      badgeClass = 'badge-available';
      label = safeStatus === 'AVAILABLE' ? 'Tersedia' : safeStatus === 'APPROVED' ? 'Disetujui' : safeStatus === 'PAID' ? 'Lunas' : status;
      break;

    case 'BORROWED':
    case 'DIPINJAM':
    case 'ACTIVE':
    case 'REJECTED':
    case 'OVERDUE':
    case 'UNPAID':
      badgeClass = 'badge-borrowed';
      label = safeStatus === 'BORROWED' ? 'Dipinjam' : safeStatus === 'ACTIVE' ? 'Aktif' : safeStatus === 'REJECTED' ? 'Ditolak' : safeStatus === 'OVERDUE' ? 'Jatuh Tempo' : safeStatus === 'UNPAID' ? 'Belum Bayar' : status;
      hasPulse = safeStatus === 'BORROWED' || safeStatus === 'ACTIVE' || safeStatus === 'OVERDUE';
      break;

    case 'RENTED':
    case 'DISEWA':
    case 'PENDING':
    case 'PENDING_L1':
    case 'PENDING_L2':
    case 'DOWN_PAYMENT':
    case 'DP':
      badgeClass = 'badge-rented';
      label = safeStatus === 'RENTED' ? 'Disewa' : safeStatus.startsWith('PENDING') ? 'Menunggu' : safeStatus === 'DOWN_PAYMENT' ? 'DP' : status;
      hasPulse = safeStatus === 'RENTED';
      break;

    case 'RETURN_REQUESTED':
    case 'UNDER_INSPECTION':
      badgeClass = 'badge-rented';
      label = safeStatus === 'RETURN_REQUESTED' ? 'Menunggu Pemeriksaan' : 'Dalam Pemeriksaan';
      hasPulse = true;
      break;

    case 'NEEDS_REPAIR':
    case 'MAINTENANCE':
    case 'REPAIR':
      badgeClass = 'badge-maintenance';
      label = safeStatus === 'NEEDS_REPAIR' ? 'Perlu Perbaikan' : 'Maintenance';
      break;

    case 'LOST_REPORTED':
    case 'DISPOSED':
    case 'DAMAGED':
      badgeClass = 'badge-borrowed';
      label = safeStatus === 'LOST_REPORTED' ? 'Laporan Kehilangan' : safeStatus === 'DAMAGED' ? 'Rusak Berat' : 'Hilang/Dihapus';
      break;

    default:
      badgeClass = 'badge-available';
  }

  return (
    <span className={`badge ${badgeClass} ${className}`}>
      {hasPulse && <span className="pulse-dot" />}
      {label}
    </span>
  );
};

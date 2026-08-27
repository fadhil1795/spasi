import { format, differenceInDays, differenceInHours } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string | null | undefined, pattern: string = 'dd MMMM yyyy'): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, pattern, { locale: localeID });
}

export function generateAssetCode(seq: number): string {
  const year = new Date().getFullYear();
  const padSeq = String(seq).padStart(4, '0');
  return `AST-${year}-${padSeq}`;
}

export function generateLoanTicket(seq: number): string {
  const year = new Date().getFullYear();
  const padSeq = String(seq).padStart(4, '0');
  return `LN-${year}-${padSeq}`;
}

export function generateRentalNumber(seq: number): string {
  const year = new Date().getFullYear();
  const padSeq = String(seq).padStart(4, '0');
  return `RNT-${year}-${padSeq}`;
}

export function generateBookingNumber(seq: number): string {
  const year = new Date().getFullYear();
  const padSeq = String(seq).padStart(4, '0');
  return `BK-${year}-${padSeq}`;
}

export function calculateDaysCount(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diff = differenceInDays(end, start);
  return diff <= 0 ? 1 : diff;
}

export function calculateDurationHours(startTime: Date | string, endTime: Date | string): number {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
  const hours = differenceInHours(end, start);
  return hours <= 0 ? 1 : hours;
}

export function calculatePenaltyFee(endDate: Date | string, returnDate: Date | string, ratePerDay: number = 50000): number {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const ret = typeof returnDate === 'string' ? new Date(returnDate) : returnDate;
  if (ret <= end) return 0;
  const lateDays = Math.ceil(differenceInHours(ret, end) / 24);
  return lateDays > 0 ? lateDays * ratePerDay : 0;
}

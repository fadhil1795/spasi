import { prisma } from '@/lib/prisma';

export interface AuditLogInput {
  userId?: string | null;
  action: string; // e.g., CREATE, UPDATE, DELETE, STATUS_CHANGE, APPROVE, REJECT, RESET_PASSWORD
  entity: string; // e.g., Asset, User, Category, Brand, Loan, Maintenance, Procurement, StockOpname
  entityId: string;
  details?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string | null;
}

const SENSITIVE_KEYS = new Set(['password', 'token', 'secret', 'apiKey']);

function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k)) continue;
    if (v instanceof Date) {
      clean[k] = v.toISOString();
    } else if (typeof v === 'object' && v !== null) {
      clean[k] = sanitizeObject(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

/**
 * Mencatat aktivitas dan perubahan data (A -> B) ke dalam tabel AuditLog.
 * Tidak melempar error ke caller agar tidak menggagalkan transaksi utama.
 */
export async function recordAuditLog(input: AuditLogInput) {
  try {
    const cleanOld = input.oldData !== undefined && input.oldData !== null
      ? JSON.stringify(sanitizeObject(input.oldData))
      : null;
    const cleanNew = input.newData !== undefined && input.newData !== null
      ? JSON.stringify(sanitizeObject(input.newData))
      : null;

    await prisma.auditLog.create({
      data: {
        userId: input.userId || null,
        action: input.action,
        entity: input.entity,
        entityId: String(input.entityId),
        details: input.details || null,
        oldData: cleanOld,
        newData: cleanNew,
        ipAddress: input.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err);
  }
}

export const createAuditLog = recordAuditLog;

/**
 * Menghitung daftar field yang berubah antara oldObj dan newObj (Dari A -> Menjadi B).
 */
export function computeDiffFields(oldObj: Record<string, any> | null, newObj: Record<string, any> | null) {
  if (!oldObj && !newObj) return [];
  const oldClean = oldObj ? sanitizeObject(oldObj) : {};
  const newClean = newObj ? sanitizeObject(newObj) : {};
  const allKeys = Array.from(new Set([...Object.keys(oldClean), ...Object.keys(newClean)]));
  const diffs: { field: string; from: any; to: any }[] = [];

  const IGNORED = new Set(['updatedAt', 'createdAt', 'password']);
  for (const key of allKeys) {
    if (IGNORED.has(key)) continue;
    const a = oldClean[key];
    const b = newClean[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      diffs.push({ field: key, from: a ?? null, to: b ?? null });
    }
  }
  return diffs;
}

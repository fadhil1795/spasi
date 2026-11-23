'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import {
  Activity, Search, RefreshCw, Eye, ArrowRight,
  Clock, Shield, Database, User, Filter, FileText, RotateCcw
} from 'lucide-react';

function parseSafeJson(raw: string | null | undefined): Record<string, any> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function getFieldDiffs(oldObj: Record<string, any> | null, newObj: Record<string, any> | null) {
  if (!oldObj && !newObj) return [];
  const o = oldObj || {};
  const n = newObj || {};
  const keys = Array.from(new Set([...Object.keys(o), ...Object.keys(n)]));
  const ignored = new Set(['updatedAt', 'createdAt', 'password']);
  const diffs: { field: string; from: any; to: any }[] = [];

  for (const k of keys) {
    if (ignored.has(k)) continue;
    const valA = o[k];
    const valB = n[k];
    if (JSON.stringify(valA) !== JSON.stringify(valB)) {
      diffs.push({ field: k, from: valA ?? null, to: valB ?? null });
    }
  }
  return diffs;
}

function formatValue(val: any): string {
  if (val === null || val === undefined || val === '') return '(kosong)';
  if (typeof val === 'boolean') return val ? 'Ya (true)' : 'Tidak (false)';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export default function SystemAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Detail Diff Modal
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (entityFilter !== 'ALL') params.set('entity', entityFilter);
      if (actionFilter !== 'ALL') params.set('action', actionFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', '200');

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      setLoading(false);
    }
  }, [entityFilter, actionFilter, searchQuery, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Distinct entities & actions from loaded logs
  const uniqueEntities = useMemo(() => {
    const set = new Set<string>(['Asset', 'User', 'Loan', 'Maintenance', 'Procurement', 'Category', 'StockOpname']);
    logs.forEach((l) => l.entity && set.add(l.entity));
    return Array.from(set).sort();
  }, [logs]);

  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => l.action && set.add(l.action));
    return Array.from(set).sort();
  }, [logs]);

  // Stats
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = logs.filter((l) => (l.timestamp || '').startsWith(todayStr)).length;
    const mutationCount = logs.filter((l) =>
      String(l.action).includes('CREATE') || String(l.action).includes('UPDATE')
    ).length;
    const criticalCount = logs.filter((l) =>
      String(l.action).includes('DELETE') || String(l.action).includes('SUSPEND')
    ).length;
    return {
      total: logs.length,
      todayCount,
      mutationCount,
      criticalCount,
    };
  }, [logs]);

  const getActionBadgeStyle = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('CREATE') || act.includes('ACTIVATE')) {
      return { bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', border: 'rgba(16, 185, 129, 0.3)' };
    }
    if (act.includes('DELETE') || act.includes('SUSPEND') || act.includes('REJECT')) {
      return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
    }
    if (act.includes('APPROVE') || act.includes('CONFIRM')) {
      return { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' };
    }
    return { bg: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-primary-light)', border: 'rgba(59, 130, 246, 0.3)' };
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setEntityFilter('ALL');
    setActionFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  const selectedDiffs = useMemo(() => {
    if (!selectedLog) return [];
    const oldObj = parseSafeJson(selectedLog.oldData);
    const newObj = parseSafeJson(selectedLog.newData);
    return getFieldDiffs(oldObj, newObj);
  }, [selectedLog]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <Activity size={24} style={{ color: 'var(--color-primary)' }} />
            Log Sistem &amp; Audit Trail
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            Rekaman terpusat seluruh aktivitas pengguna, mutasi transaksi, dan jejak perubahan data (Dari A → Menjadi B).
          </p>
        </div>

        <Button variant="secondary" onClick={fetchLogs} disabled={loading}>
          <RefreshCw size={16} /> Muat Ulang Log
        </Button>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Rekaman Log
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--color-text)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            Maks. 200 log terbaru ditampilkan
          </div>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Aktivitas Hari Ini
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--color-primary-light)' }}>
            {stats.todayCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            Tercatat pada tanggal hari ini
          </div>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Perubahan &amp; Input Data
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--color-success)' }}>
            {stats.mutationCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            Aksi CREATE &amp; UPDATE entitas
          </div>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Aksi Kritis / Hapus
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.35rem', color: '#ef4444' }}>
            {stats.criticalCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            Penghapusan atau penangguhan
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.35rem' }}>
              Pencarian Kata Kunci
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Nama user, deskripsi, atau nilai..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.35rem' }}>
              Entitas / Modul
            </label>
            <select
              className="input-field"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="ALL">Semua Entitas</option>
              {uniqueEntities.map((ent) => (
                <option key={ent} value={ent}>{ent}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.35rem' }}>
              Tipe Aksi
            </label>
            <select
              className="input-field"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="ALL">Semua Aksi</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.35rem' }}>
              Dari Tanggal
            </label>
            <input
              type="date"
              className="input-field"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.35rem' }}>
              Sampai Tanggal
            </label>
            <input
              type="date"
              className="input-field"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <Button variant="secondary" onClick={handleResetFilters} style={{ width: '100%' }}>
              <RotateCcw size={14} /> Reset Filter
            </Button>
          </div>
        </div>
      </Card>

      {/* Log Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                <th style={{ padding: '0.85rem 1.25rem', whiteSpace: 'nowrap' }}>Waktu Kejadian</th>
                <th style={{ padding: '0.85rem 1rem' }}>Aktor / User</th>
                <th style={{ padding: '0.85rem 1rem' }}>Aksi</th>
                <th style={{ padding: '0.85rem 1rem' }}>Entitas</th>
                <th style={{ padding: '0.85rem 1rem' }}>Keterangan &amp; Pratinjau Perubahan (A → B)</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Inspeksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem' }}>
                    <Skeleton height="36px" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton height="36px" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton height="36px" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    Belum ada rekaman log audit yang cocok dengan filter ini.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badgeStyle = getActionBadgeStyle(log.action);
                  const oldObj = parseSafeJson(log.oldData);
                  const newObj = parseSafeJson(log.newData);
                  const diffs = getFieldDiffs(oldObj, newObj);

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.85rem 1.25rem', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                          {formatDate(log.timestamp, 'dd MMM yyyy')}
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {formatDate(log.timestamp, 'HH:mm:ss')}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                          {log.user?.name || 'Sistem Otomatis'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                          {log.user?.email || '-'} {log.user?.role ? `• ${log.user.role}` : ''}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.border}`,
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{log.entity}</span>
                        <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--color-muted)' }}>
                          ID: {log.entityId?.slice(-8) || '-'}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', maxWidth: '380px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                          {log.details || '-'}
                        </div>
                        {diffs.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                            {diffs.slice(0, 3).map((d) => (
                              <span
                                key={d.field}
                                style={{
                                  fontSize: '0.72rem',
                                  background: 'var(--color-surface2)',
                                  border: '1px solid var(--color-border)',
                                  padding: '0.12rem 0.45rem',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                <strong style={{ color: 'var(--color-primary-light)' }}>{d.field}:</strong>
                                <span style={{ color: '#ef4444', textDecoration: 'line-through', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {formatValue(d.from)}
                                </span>
                                <ArrowRight size={10} style={{ color: 'var(--color-muted)' }} />
                                <span style={{ color: 'var(--color-success)', fontWeight: 700, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {formatValue(d.to)}
                                </span>
                              </span>
                            ))}
                            {diffs.length > 3 && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                                +{diffs.length - 3} field lainnya
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye size={14} /> Detail A → B
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Detail Perubahan (A -> B) */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Detail Audit Log: ${selectedLog.action} (${selectedLog.entity})`}
          maxWidth="840px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Metadata Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.85rem',
                padding: '1rem',
                background: 'var(--color-surface2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: '0.85rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 700 }}>PELAKU / AKTOR</div>
                <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>{selectedLog.user?.name || 'Sistem'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{selectedLog.user?.email || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 700 }}>WAKTU KEJADIAN</div>
                <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>
                  {formatDate(selectedLog.timestamp, 'dd MMM yyyy HH:mm:ss')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 700 }}>ENTITAS &amp; ID</div>
                <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>{selectedLog.entity}</div>
                <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--color-muted)' }}>{selectedLog.entityId}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 700 }}>AKSI</div>
                <div style={{ fontWeight: 800, marginTop: '0.2rem', color: 'var(--color-primary-light)' }}>{selectedLog.action}</div>
              </div>
            </div>

            {selectedLog.details && (
              <div style={{ fontSize: '0.88rem', padding: '0.75rem 1rem', background: 'rgba(59, 130, 246, 0.08)', borderLeft: '3px solid var(--color-primary)', borderRadius: '4px' }}>
                <strong>Ringkasan:</strong> {selectedLog.details}
              </div>
            )}

            {/* Diff Table (From A -> To B) */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.65rem' }}>
                Perbandingan Perubahan Data (Dari A → Menjadi B)
              </h4>

              {selectedDiffs.length > 0 ? (
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ padding: '0.65rem 0.85rem', width: '180px' }}>Nama Field</th>
                        <th style={{ padding: '0.65rem 0.85rem', color: '#ef4444' }}>Nilai Sebelumnya (A)</th>
                        <th style={{ padding: '0.65rem 0.85rem', color: 'var(--color-success)' }}>Nilai Baru (B)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDiffs.map((d) => (
                        <tr key={d.field} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>
                            {d.field}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', wordBreak: 'break-word' }}>
                            {formatValue(d.from)}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', background: 'rgba(16, 185, 129, 0.05)', color: 'var(--color-success)', fontWeight: 600, wordBreak: 'break-word' }}>
                            {formatValue(d.to)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                  Tidak ada perbandingan snapshot JSON (A → B) yang dilampirkan pada log ini.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


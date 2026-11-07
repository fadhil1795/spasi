'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import {
  QrCode, Plus, CheckCircle2, AlertTriangle, HelpCircle,
  Building2, Search, ArrowRight, Eye, Calendar, UserCheck
} from 'lucide-react';

export default function StockOpnameListPage() {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [targetLocationId, setTargetLocationId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchLocations();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stock-opname');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch {
      showToast('Gagal memuat daftar sesi opname', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch {
      // fallback
    }
  };

  const handleCreateSession = async () => {
    if (!targetLocationId) {
      showToast('Pilih target ruangan yang akan di-opname', 'error');
      return;
    }

    try {
      setCreating(true);
      const res = await fetch('/api/stock-opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: targetLocationId,
          title: sessionTitle.trim(),
          notes: sessionNotes.trim(),
        }),
      });

      if (res.ok) {
        const newSession = await res.json();
        showToast('Sesi Stock Opname berhasil dibuka!', 'success');
        setCreateModalOpen(false);
        setTargetLocationId('');
        setSessionTitle('');
        setSessionNotes('');
        fetchSessions();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal membuat sesi opname', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setCreating(false);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const matchStatus = filterStatus === 'ALL' || s.status === filterStatus;
    const query = searchQuery.toLowerCase();
    const matchQuery =
      !query ||
      s.sessionNumber.toLowerCase().includes(query) ||
      s.title.toLowerCase().includes(query) ||
      (s.location?.name && s.location.name.toLowerCase().includes(query)) ||
      (s.location?.building && s.location.building.toLowerCase().includes(query));
    return matchStatus && matchQuery;
  });

  // Calculate Aggregates
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter((s) => s.status === 'IN_PROGRESS').length;
  const totalVerified = sessions.reduce((acc, s) => acc + (s.totalMatch || 0), 0);
  const totalDiscrepancies = sessions.reduce(
    (acc, s) => acc + (s.totalWrongLoc || 0) + (s.totalMissing || 0),
    0
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={22} color="var(--color-primary)" />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Audit Fisik & Stock Opname QR</h1>
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Audit berkala inventaris fisik per ruangan menggunakan pemindai QR kamera HP di lapangan.
          </p>
        </div>

        <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
          <Plus size={16} /> Buka Sesi Opname Baru
        </Button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Sesi Audit
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--color-text)' }}>
            {totalSessions}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            {activeSessions} sesi sedang berjalan aktif
          </div>
        </Card>

        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Aset Terverifikasi Sesuai
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--color-success)' }}>
            {totalVerified}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            Fisik dan lokasi buku klop (Match)
          </div>
        </Card>

        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Selisih Fisik Terdeteksi
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem', color: '#ef4444' }}>
            {totalDiscrepancies}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            Salah kamar & belum ditemukan
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input
              type="text"
              placeholder="Cari nomor sesi, nama ruangan, atau gedung..."
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.4rem', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'Semua Status' },
              { id: 'IN_PROGRESS', label: 'Berjalan (In Progress)' },
              { id: 'COMPLETED', label: 'Selesai (Completed)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: filterStatus === tab.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: filterStatus === tab.id ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: filterStatus === tab.id ? '#fff' : 'var(--color-text)',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Sessions Table */}
      <Card style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', fontWeight: 700 }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Nomor & Judul Sesi</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Target Ruangan</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Auditor / Pelaksana</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Progres Scan</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Hasil Audit Fisik</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                    Memuat data sesi opname...
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                    Tidak ada sesi stock opname yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => {
                  const percent = session.totalExpected > 0
                    ? Math.min(100, Math.round((session.totalScanned / session.totalExpected) * 100))
                    : 0;

                  return (
                    <tr
                      key={session.id}
                      style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s ease' }}
                    >
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{session.title}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-primary-light)', marginTop: '0.15rem' }}>
                          {session.sessionNumber}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                          <Building2 size={15} style={{ color: 'var(--color-muted)' }} />
                          {session.location?.name || session.location?.building}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                          Lt. {session.location?.floor || '1'} {session.location?.room ? `(${session.location.room})` : ''}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <UserCheck size={15} style={{ color: 'var(--color-muted)' }} />
                          <span>{session.auditor?.name || 'Petugas'}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                          {formatDate(session.startDate)}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', minWidth: '160px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                          <span>{session.totalScanned} / {session.totalExpected} Unit</span>
                          <span>{percent}%</span>
                        </div>
                        <div style={{ height: '6px', width: '100%', background: 'var(--color-surface2)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: percent === 100 ? 'var(--color-success)' : 'var(--color-primary)', transition: 'width 0.3s ease' }} />
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(34, 197, 94, 0.12)', color: 'var(--color-success)' }}>
                            ✓ {session.totalMatch || 0} Cocok
                          </span>
                          {(session.totalWrongLoc || 0) > 0 && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
                              ⚠ {session.totalWrongLoc} Nyasar
                            </span>
                          )}
                          {(session.totalMissing || 0) > 0 && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                              ✕ {session.totalMissing} Hilang
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            background: session.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: session.status === 'COMPLETED' ? 'var(--color-success)' : 'var(--color-primary)',
                          }}
                        >
                          {session.status === 'COMPLETED' ? 'Selesai' : 'Sedang Berjalan'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <Link
                          href={`/dashboard/stock-opname/${session.id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Eye size={14} /> Buka Sesi <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Buka Sesi Stock Opname Baru */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Buka Sesi Stock Opname Baru"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Pilih ruangan target yang akan diaudit fisiknya. Sistem akan secara otomatis mengunci seluruh daftar aset aktif yang terdaftar di ruangan tersebut untuk diverifikasi fisik menggunakan scan kamera HP.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Ruangan Target Audit *
              </label>
              <select
                className="input-field"
                value={targetLocationId}
                onChange={(e) => setTargetLocationId(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">-- Pilih Ruangan / Gedung --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name || loc.building} (Lt. {loc.floor || '1'} {loc.room ? `- ${loc.room}` : ''})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Judul Sesi (Opsional)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Misal: Audit Fisik Semester Ganjil 2026 Lab Komputer"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Catatan / Instruksi Petugas
              </label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Misal: Cek kondisi fisik printer, kabel power, dan proyektor..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setCreateModalOpen(false)} disabled={creating}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleCreateSession} loading={creating}>
                Buka Sesi & Siapkan Data
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

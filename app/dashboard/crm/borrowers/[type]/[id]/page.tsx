'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowLeft, User, Phone, Mail, FileText, Calendar,
  AlertCircle, CheckCircle, MessageSquare, AlertTriangle,
  MapPin, ShieldAlert, ShieldCheck, Award
} from 'lucide-react';

export default function BorrowerDetailPage({ params }: { params: { type: string; id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [borrower, setBorrower] = useState<any>(null);
  const [commlogs, setCommlogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/crm/borrowers/${params.id}?type=${params.type}`);
        if (!res.ok) throw new Error('Peminjam tidak ditemukan');
        setBorrower(await res.json());

        const logRes = await fetch(`/api/crm/communication-logs?${params.type === 'user' ? `userId=${params.id}` : `renterId=${params.id}`}`);
        if (logRes.ok) setCommlogs(await logRes.json());
      } catch (e: any) {
        showToast(e.message, 'error');
        router.push('/dashboard/crm');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id, params.type, router, showToast]);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Memuat data peminjam...</div>;
  if (!borrower) return null;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <button className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard/crm')} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <ArrowLeft size={14} /> Kembali ke CRM
      </button>

      {/* Profile Header */}
      <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: params.type === 'user' ? 'var(--grad-primary)' : 'var(--grad-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2rem', fontWeight: 900 }}>
            {borrower.name[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 900 }}>{borrower.name}</h1>
              <span style={{ padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, background: 'var(--color-primary-alpha)', color: 'var(--color-primary)' }}>
                {params.type === 'user' ? 'Internal' : 'Eksternal'}
              </span>
              {borrower.isSuspended && (
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, background: '#ef444420', color: '#ef4444' }}>
                  Suspended
                </span>
              )}
            </div>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
              ID: {borrower.id}
            </p>
          </div>
        </div>
      </Card>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column - Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card style={{ padding: '1.25rem' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Detail Kontak</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.88rem' }}>
              {borrower.identityNo && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Award size={16} /> NIM/NIP: {borrower.identityNo}</div>}
              {borrower.email && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={16} /> {borrower.email}</div>}
              {borrower.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={16} /> {borrower.phone}</div>}
              {borrower.address && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} /> {borrower.address}</div>}
            </div>
          </Card>

          <Card style={{ padding: '1.25rem' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Aktivitas Akun</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
              <div>Terdaftar pada: {formatDate(borrower.createdAt)}</div>
            </div>
          </Card>
        </div>

        {/* Right Column - Transactions & Communication */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* History */}
          <Card style={{ padding: '1.25rem' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '1rem' }}>Riwayat Transaksi</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem' }}>
              Daftar pinjaman, sewa, dan denda akan dimuat di sini.
            </p>
          </Card>

          {/* Comm logs */}
          <Card style={{ padding: '1.25rem' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '1rem' }}>Log Komunikasi</h3>
            {commlogs.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem' }}>Belum ada riwayat komunikasi.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {commlogs.map(log => (
                  <div key={log.id} style={{ padding: '0.85rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{log.subject}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{formatDate(log.sentAt)}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{log.body}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

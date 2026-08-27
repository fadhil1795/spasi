'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { Bell, CheckCircle, Info, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function NotificationsPage() {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch {
      showToast('Gagal memuat notifikasi', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      if (res.ok) {
        showToast('Semua notifikasi telah ditandai dibaca', 'success');
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch {
      showToast('Gagal memperbarui status notifikasi', 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle size={18} style={{ color: '#10b981' }} />;
      case 'WARNING':
        return <AlertTriangle size={18} style={{ color: '#f59e0b' }} />;
      case 'DANGER':
        return <AlertCircle size={18} style={{ color: '#ef4444' }} />;
      default:
        return <Info size={18} style={{ color: '#3b82f6' }} />;
    }
  };

  const getBorderColor = (type: string, isRead: boolean) => {
    if (isRead) return 'var(--color-border)';
    switch (type) {
      case 'SUCCESS':
        return '#10b981';
      case 'WARNING':
        return '#f59e0b';
      case 'DANGER':
        return '#ef4444';
      default:
        return 'var(--color-primary)';
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bell size={26} style={{ color: 'var(--color-primary)' }} /> Notifikasi Anda
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Pusat informasi status pengajuan peminjaman, reservasi ruangan, tagihan pembayaran, dan pelanggaran.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={fetchNotifications} disabled={loading} style={{ padding: '0.5rem' }}>
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
          </Button>
          {unreadCount > 0 && (
            <Button variant="primary" onClick={handleMarkAllAsRead} disabled={markingAll}>
              Tandai Semua Dibaca
            </Button>
          )}
        </div>
      </div>

      {/* Main List */}
      <Card style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Skeleton height="70px" />
            <Skeleton height="70px" />
            <Skeleton height="70px" />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
            <Bell size={48} style={{ opacity: 0.25, marginBottom: '1rem' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>Kotak Masuk Kosong</div>
            <p style={{ fontSize: '0.85rem' }}>Anda belum menerima notifikasi sistem untuk saat ini.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: notif.isRead ? 'var(--color-surface2)' : 'rgba(99,102,241,0.03)',
                  border: `1.5px solid ${getBorderColor(notif.type, notif.isRead)}`,
                  cursor: notif.isRead ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                }}
              >
                <div style={{ marginTop: '0.15rem' }}>{getIcon(notif.type)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--color-text)' }}>{notif.title}</strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600 }}>
                      {formatDate(notif.createdAt, 'dd MMM yyyy HH:mm')}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {notif.message}
                  </p>
                </div>
                {!notif.isRead && (
                  <span style={{
                    position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px',
                    borderRadius: '50%', background: 'var(--color-primary)'
                  }} />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

    </div>
  );
}

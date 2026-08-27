import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { MapPin, Tag } from 'lucide-react';

interface AssetCardProps {
  asset: {
    id: string;
    code: string;
    name: string;
    status: string;
    images?: string;
    category?: { name: string };
    location?: { building: string; room?: string | null };
    dailyRentRate?: number | null;
    isRentable?: boolean;
    isLoanable?: boolean;
  };
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset }) => {
  let mainImage = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop';
  try {
    if (asset.images) {
      const parsed = JSON.parse(asset.images);
      if (Array.isArray(parsed) && parsed.length > 0) mainImage = parsed[0];
    }
  } catch (e) {}

  return (
    <Card hoverable className="animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Image & Status Badge Overlay */}
      <div className="asset-card-img-container" style={{ position: 'relative', height: '190px', backgroundColor: 'var(--color-surface2)', overflow: 'hidden' }}>
        <img
          src={mainImage}
          alt={asset.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
          className="asset-img-hover"
        />
        <div className="asset-card-badge" style={{ position: 'absolute', top: '0.85rem', right: '0.85rem' }}>
          <Badge status={asset.status} />
        </div>
        <div
          className="asset-card-code"
          style={{
            position: 'absolute',
            bottom: '0.85rem',
            left: '0.85rem',
            background: 'rgba(15, 15, 26, 0.75)',
            backdropFilter: 'blur(8px)',
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            fontWeight: 700,
            fontFamily: 'monospace',
            color: 'var(--color-primary-light)',
          }}
        >
          {asset.code}
        </div>
      </div>

      {/* Content */}
      <div className="asset-card-body" style={{ padding: '1.25rem' }}>
        {asset.category && (
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--color-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              marginBottom: '0.35rem',
              fontWeight: 500,
            }}
          >
            <Tag size={13} /> {asset.category.name}
          </div>
        )}

        <h3
          className="asset-card-title"
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            height: '2.7rem',
          }}
        >
          {asset.name}
        </h3>

        {asset.location && (
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              marginBottom: '1rem',
            }}
          >
            <MapPin size={14} style={{ color: 'var(--color-primary-light)' }} />
            {asset.location.building} {asset.location.room ? `- ${asset.location.room}` : ''}
          </div>
        )}

        <div className="card-footer-layout" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {asset.isRentable && asset.dailyRentRate ? (
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', display: 'block' }}>Tarif Sewa</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-success)' }}>
                  {formatCurrency(asset.dailyRentRate)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-muted)' }}>/hari</span>
                </span>
              </div>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>Peminjaman</span>
            )}
          </div>

          <Link href={`/assets/${asset.id}`} className="btn btn-secondary btn-sm card-footer-button">
            Detail Aset
          </Link>
        </div>
      </div>
    </Card>
  );
};

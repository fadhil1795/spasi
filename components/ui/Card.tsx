'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  onClick,
  style = {},
}) => {
  return (
    <div
      className={`spasi-card ${hoverable ? 'spasi-card-hover' : ''} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick || hoverable ? 'pointer' : 'default', ...style }}
    >
      {children}
    </div>
  );
};

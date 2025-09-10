import React from 'react';

export function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-img" />
          <div className="skeleton-actions">
            <div className="skeleton-btn" />
            <div className="skeleton-btn" />
          </div>
        </div>
      ))}
    </div>
  );
}

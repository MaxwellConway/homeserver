import React from 'react';

function SkeletonCard() {
  return (
    <div className="card skeleton-card">
      <div className="skeleton-image"></div>
      <div className="skeleton-text skeleton-title"></div>
      <div className="skeleton-text skeleton-subtitle"></div>
    </div>
  );
}

export default SkeletonCard;

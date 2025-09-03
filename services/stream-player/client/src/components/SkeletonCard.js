import React from 'react';

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-thumbnail"></div>
      <div className="skeleton-info">
        <div className="skeleton-title"></div>
        <div className="skeleton-meta"></div>
      </div>
    </div>
  );
}

export default SkeletonCard;

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
}) => {
  return (
    <div
      className={`animate-pulse bg-surface-hover rounded-lg ${className}`}
      style={{
        width: width,
        height: height,
      }}
    />
  );
};

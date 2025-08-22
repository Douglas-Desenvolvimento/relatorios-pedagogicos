// src/components/icons/ChangeIcon.tsx
import React from 'react';

interface ChangeIconProps {
  className?: string;
  size?: number;
}

const ChangeIcon = ({ className = 'text-current', size = 20 }: ChangeIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    width={size}
    height={size}
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v5h.582m0 0A7.5 7.5 0 0119.5 9m0 0V4m0 5h-.621M20 20v-5h-.582m0 0A7.5 7.5 0 014.5 15m0 0v5m0-5h.621"
    />
  </svg>
);

export default ChangeIcon;

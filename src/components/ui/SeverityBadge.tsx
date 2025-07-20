import React from 'react';
import { getSeverityConfig, getSeverityBadgeClasses, getSeverityStyles, type SeverityLevel } from '@/lib/severity';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  showPriority?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SeverityBadge({ 
  severity, 
  showPriority = true, 
  size = 'md',
  className = '' 
}: SeverityBadgeProps) {
  const config = getSeverityConfig(severity);
  const baseClasses = getSeverityBadgeClasses();
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1'
  };
  
  const classes = `${baseClasses} ${sizeClasses[size]} ${className}`;
  
  return (
    <span 
      className={classes}
      style={getSeverityStyles(severity)}
      title={config.description}
    >
      {showPriority && (
        <span className="font-mono font-bold mr-1">
          {config.priority}
        </span>
      )}
      <span className="font-medium">
        {config.label}
      </span>
    </span>
  );
}

export default SeverityBadge;

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

export interface SeverityConfig {
  level: SeverityLevel;
  priority: PriorityLevel;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  description: string;
}

export const SEVERITY_CONFIGS: Record<SeverityLevel, SeverityConfig> = {
  critical: {
    level: 'critical',
    priority: 'P1',
    label: 'Critical',
    color: '#7F1D1D', // Dark red
    bgColor: '#FEF2F2', // Light red background
    borderColor: '#DC2626', // Red border
    textColor: '#7F1D1D', // Dark red text
    description: 'Immediate action required - Critical vulnerabilities'
  },
  high: {
    level: 'high',
    priority: 'P2', 
    label: 'High',
    color: '#DC2626', // Red
    bgColor: '#FEF2F2', // Light red background
    borderColor: '#EF4444', // Lighter red border
    textColor: '#DC2626', // Red text
    description: 'High priority vulnerabilities requiring prompt attention'
  },
  medium: {
    level: 'medium',
    priority: 'P3',
    label: 'Medium',
    color: '#D97706', // Yellow/Orange
    bgColor: '#FFFBEB', // Light yellow background
    borderColor: '#F59E0B', // Orange border
    textColor: '#D97706', // Orange text
    description: 'Medium priority vulnerabilities for scheduled remediation'
  },
  low: {
    level: 'low',
    priority: 'P4',
    label: 'Low',
    color: '#1E40AF', // Dark blue
    bgColor: '#EFF6FF', // Light blue background
    borderColor: '#3B82F6', // Blue border
    textColor: '#1E40AF', // Dark blue text
    description: 'Low priority vulnerabilities for future consideration'
  },
  info: {
    level: 'info',
    priority: 'P5',
    label: 'Info',
    color: '#0EA5E9', // Light blue
    bgColor: '#F0F9FF', // Very light blue background
    borderColor: '#38BDF8', // Sky blue border
    textColor: '#0EA5E9', // Light blue text
    description: 'Informational findings and general security observations'
  }
};

export function getSeverityConfig(severity: SeverityLevel): SeverityConfig {
  return SEVERITY_CONFIGS[severity];
}

export function getSeverityBadgeClasses(): string {
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border`;
}

export function getSeverityStyles(severity: SeverityLevel): React.CSSProperties {
  const config = getSeverityConfig(severity);
  return {
    backgroundColor: config.bgColor,
    color: config.textColor,
    borderColor: config.borderColor,
  };
}

export function getSeverityCount(vulnerabilities: Array<{ severity: string }>, severity: SeverityLevel): number {
  return vulnerabilities.filter(vuln => vuln.severity?.toLowerCase() === severity).length;
}

export function sortBySeverity<T extends { severity: string }>(items: T[]): T[] {
  const severityOrder: Record<string, number> = {
    'critical': 0,
    'high': 1,
    'medium': 2,
    'low': 3,
    'info': 4
  };
  
  return [...items].sort((a, b) => {
    const aSeverity = severityOrder[a.severity.toLowerCase()] ?? 5;
    const bSeverity = severityOrder[b.severity.toLowerCase()] ?? 5;
    return aSeverity - bSeverity;
  });
}

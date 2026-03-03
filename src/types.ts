export interface ComplianceIssue {
  type: 'warning' | 'error' | 'success';
  message: string;
  count?: number;
}

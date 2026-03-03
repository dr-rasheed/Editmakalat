import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ComplianceIssue } from '../types';

interface ComplianceReportProps {
  issues: ComplianceIssue[];
}

export default function ComplianceReport({ issues }: ComplianceReportProps) {
  if (!issues || issues.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 h-fit">
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <CheckCircle size={20} className="text-indigo-600" />
        تقرير جودة المقال
      </h3>
      
      <div className="space-y-3">
        {issues.map((issue, index) => (
          <div 
            key={index}
            className={`p-4 rounded-lg border flex items-start gap-3 text-sm ${
              issue.type === 'error' 
                ? 'bg-red-50 border-red-100 text-red-700' 
                : issue.type === 'warning'
                ? 'bg-amber-50 border-amber-100 text-amber-700'
                : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {issue.type === 'error' && <XCircle size={16} />}
              {issue.type === 'warning' && <AlertTriangle size={16} />}
              {issue.type === 'success' && <CheckCircle size={16} />}
            </div>
            <div>
              <p className="font-medium">{issue.message}</p>
              {issue.count && issue.count > 0 && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-white/50 rounded text-xs font-bold">
                  العدد: {issue.count}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

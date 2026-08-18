
export type Language = 'en' | 'zh';

export type AiModel = 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite';

export enum AuditStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WARNING = 'WARNING'
}

export enum PpapLevel {
  LEVEL_1 = 1,
  LEVEL_2 = 2,
  LEVEL_3 = 3,
  LEVEL_4 = 4,
  LEVEL_5 = 5
}

export interface ProjectInfo {
  id: string; // Unique Identifier for the project
  projectName: string;
  partName: string;
  partNumber: string;
  supplierName: string;
  createdAt: string;
  lastAccessedAt?: string;
}

export interface AuditFeedback {
  status: AuditStatus;
  summary: string;
  findings: string[];
  recommendation: string;
}

export interface PpapItem {
  id: number;
  name: string;
  name_zh?: string; // Chinese name
  description?: string;
  requiredForLevels: number[];
  status: AuditStatus;
  feedback?: AuditFeedback;
  fileData?: string; // Base64 string of the uploaded file
  fileName?: string;
  mimeType?: string;
}

export interface Finding {
  id: string;
  source: string; // e.g. "Cover Sheet" or "Consistency Check #1"
  category: string; // e.g. "Completeness", "Dimension", "Consistency"
  description: string;
  timestamp: Date;
}

export interface DashboardStats {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

export interface ConsistencyRule {
  id: string;
  name: string;
  name_zh?: string;
  description: string;
  description_zh?: string;
  requiredItemIds: number[];
}

export interface ConsistencyResult {
  ruleId: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  score: number; // 0-100
  analysis: string;
  discrepancies: string[];
  lastRun: Date;
}

export interface ExemptionRule {
  id: string;
  documentName: string;
  summary: string;
  createdAt: string;
}

export interface FocusRule {
  id: string;
  documentName: string;
  summary: string;
  createdAt: string;
}

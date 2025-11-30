export interface Participant {
  id: string;
  name: string;
  avatar?: string;
}

export enum SplitType {
  EQUAL = 'EQUAL',
  SHARES = 'SHARES', // e.g. 2 shares for heavy drinker
  SPECIFIC = 'SPECIFIC' // Only specific people
}

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  category: string;
  paidBy: string; // Participant ID
  splitAmong: string[]; // Participant IDs
  date: string;
}

export interface Balance {
  from: string; // Participant ID
  to: string; // Participant ID
  amount: number;
}

// AI Service Types
export interface AIReceiptItem {
  description: string;
  amount: number;
  category: string;
  suggestedSplitStrategy: string;
}

export interface AIReceiptResponse {
  items: AIReceiptItem[];
  currency: string;
  total: number;
}
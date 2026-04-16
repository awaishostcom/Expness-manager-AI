import { Timestamp } from 'firebase/firestore';

export type CurrencyCode = 'USD' | 'PKR' | 'INR' | 'SAR' | 'JPY' | 'CNY' | 'TRY' | 'EUR' | 'GBP';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  createdAt: Timestamp;
  currency: CurrencyCode;
  walletBalance: number;
}

export interface BankAccount {
  id: string;
  name: string;
  number?: string;
  balance: number;
  bankName: string;
  type: 'checking' | 'savings' | 'credit' | 'other';
  userId: string;
  sharedWith?: string[]; // Array of user emails
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: Timestamp;
  accountId: string;
  type: 'income' | 'expense';
  notes?: string;
  userId: string;
  attachmentUrl?: string;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  dueDate: Timestamp;
  status: 'paid' | 'unpaid';
  recurring: boolean;
  userId: string;
  companyName?: string;
  category?: string;
  referenceId?: string;
  frequency: 'weekly' | 'monthly' | 'yearly';
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  period: 'monthly';
  userId: string;
}

export interface LedgerEntry {
  id: string;
  clientId: string;
  amount: number;
  type: 'in' | 'out';
  date: Timestamp;
  description: string;
  attachmentUrl?: string;
  userId: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  userId: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  cnic: string;
  salary: number;
  userId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: Timestamp;
  status: 'pending' | 'completed';
  clientId?: string;
  userId: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: Timestamp;
  location: string;
  clientId?: string;
  userId: string;
}

export interface WalletTransfer {
  id: string;
  fromUid: string;
  toUid: string;
  amount: number;
  fee: number;
  date: Timestamp;
}

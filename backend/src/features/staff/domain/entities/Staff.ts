export interface StaffShift {
  id?: string;
  staffName: string;
  role: string;
  clockIn: string | Date;
  clockOut?: string | Date;
  hourlyRate: number;
  totalHours?: number;
  totalEarned?: number;
}

export interface StaffAdvance {
  id?: string;
  staffId: string;
  staffName: string;
  amount: number;
  reason: string;
  date: string | Date;
  isDeducted: boolean;
}

export interface PayrollRecord {
  id?: string;
  staffId: string;
  staffName: string;
  role: string;
  periodStart: string;
  periodEnd: string;
  hourlyRate: number;
  regularHours: number;
  overtimeHours: number;
  grossPay: number;
  bonusTips: number;
  cashAdvanceDeduction: number;
  otherDeductions: number;
  netPay: number;
  status: 'paid' | 'pending';
  paidAt?: string | Date;
  notes?: string;
}


export enum UserRole {
  PATIENT = 'PATIENT',
  ADMIN = 'ADMIN'
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  APPOINTMENTS = 'APPOINTMENTS',
  MEDICATIONS = 'MEDICATIONS',
  RECORDS = 'RECORDS',
  CHAT = 'CHAT',
  PROFILE = 'PROFILE',
  NOTIFICATION_DETAIL = 'NOTIFICATION_DETAIL',
  TERMS = 'TERMS',
  BOOKING_CALENDAR = 'BOOKING_CALENDAR'
}

export interface PrescribedMed {
  name: string;
  duration: string;
}

export interface Appointment {
  id: string;
  doctorName: string;
  treatmentType: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  historySummary?: string;
  prescribedMedications?: PrescribedMed[];
  visitNotes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string[]; // e.g. ["08:00", "20:00"]
  instructions: string;
  takenToday: boolean[]; // tracks checks for times
}

export interface RecordItem {
  id: string;
  type: 'prescription' | 'xray' | 'report';
  title: string;
  date: string;
  doctor: string;
  imageUrl?: string;
  summary: string; // Detailed content for AI explanation
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  age: number | string;
  profileImage?: string;
  nextCheckup: string | null;
}

export interface Notification {
  id: number;
  text: string;
  details: string;
  time: string;
  read: boolean;
  type: 'appointment' | 'medication' | 'record' | 'general';
}

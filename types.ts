export interface PatientData {
  firstName: string;
  lastName: string;
  dob: string;
  admissionDate: string;
  dischargeDate: string;
}

export interface ClinicalData {
  diagnosis: string;
  anamnesis: string;
  findings: string;
  operation: string;
  clinicalCourse: string;
  medication: string;
  recommendations: string;
}

export type Language = 'de' | 'en';
export type Audience = 'doctor' | 'patient';

export interface AppState {
  patient: PatientData;
  clinical: ClinicalData;
  language: Language;
  audience: Audience;
  useStandardCourse: boolean;
  doctorName: string;
  doctorPosition: string;
}

export interface FileAttachment {
  file: File;
  base64: string;
  mimeType: string;
  category: 'lab' | 'letter' | 'preop' | 'postop' | 'medplan' | 'microbio' | 'opreport';
}

export const INITIAL_PATIENT: PatientData = {
  firstName: '',
  lastName: '',
  dob: '',
  admissionDate: '',
  dischargeDate: '',
};

export const INITIAL_CLINICAL: ClinicalData = {
  diagnosis: '',
  anamnesis: '',
  findings: '',
  operation: '',
  clinicalCourse: '',
  medication: '',
  recommendations: '',
};
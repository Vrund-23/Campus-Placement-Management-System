export type UserRole = 'student' | 'tpc' | 'tpf' | 'tpo' | 'principal';

export type ApplicationStatus = 'applied' | 'shortlisted' | 'placed' | 'rejected';

export type VerificationStage = 'pending' | 'tpc_verified' | 'tpo_verified';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  avatar?: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  department: string;
  cgpa: number;
  backlogs: number;
  resumeUrl?: string;
  resume_url?: string;
  profile_picture_url?: string;
  class_10_percentage?: number | null;
  class_12_percentage?: number | null;
  diploma_percentage?: number | null;
  verificationStage: VerificationStage;
  isTpcVerified: boolean;
  isTpoVerified: boolean;
  isPlaced: boolean;
  placedCompany?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  ctc: string;
  location: string;
  description: string;
  minCgpa: number;
  min10thPercent?: number;
  min12thPercent?: number;
  maxBacklogs: number;
  eligibleBranches: string[];
  deadline: string;
  isActive: boolean;
  isPublic: boolean;
  applicationsCount: number;
  type?: string;
}

export interface Application {
  id: string;
  jobId: string;
  studentId: string;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
}

export interface PlacementStats {
  totalStudents: number;
  placedStudents: number;
  activeJobs: number;
  companiesVisited: number;
}

export interface BranchPlacement {
  branch: string;
  total: number;
  placed: number;
  percentage: number;
}

export type EnrollmentStatus = 'ACTIVE' | 'SUSPENDED' | 'ENDED';

export interface EnrollmentRequest {
  routeId: number;
  stopId: number;
}

export interface EnrollmentResponse {
  id: number;
  studentId: number;
  routeId: number;
  stopId: number;
  status: EnrollmentStatus;
  validFrom: string;
  validUntil: string | null;
  estimatedPickupTime: string | null;
}

export interface CurrentEnrollment {
  enrollmentId: number;
  routeId: number;
  stopId: number;
  status: EnrollmentStatus;
  suspendedFrom: string | null;
  suspendedUntil: string | null;
}

export interface SuspensionRequest {
  startDate: string;
  endDate: string;
}

import { DriverCredential, TripHistoryItem, TripIncident, TripStatus } from './trip.models';

export interface NotificationPreferences {
  linkId: number;
  studentId: number;
  notifyBoarding: boolean;
  notifyArrival: boolean;
  notifyDelay: boolean;
  notifyVehicleChange: boolean;
  notifyIncident: boolean;
}

export type NotificationPreferencesRequest = Omit<NotificationPreferences, 'linkId' | 'studentId'>;

export interface FamilyUpcomingTrip {
  tripId: number;
  routeId: number;
  routeCode: string;
  routeName: string;
  routeOrigin: string;
  routeDestination: string;
  institutionName: string;
  campusName: string;
  stopId: number;
  stopName: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: TripStatus;
  resourcesReassigned: boolean;
  studentRouteOrStopModified: boolean;
  modificationMessage: string | null;
}

export interface FamilyTripHistoryDetail {
  trip: TripHistoryItem;
  incidents: TripIncident[];
}

export type FamilyDriverCredential = DriverCredential;

export interface FamilyLinkCode {
  code: string;
  expiresAt: string;
}

export interface LinkedStudent {
  studentId: number;
  fullName: string;
  email: string;
  institutionName: string;
  campusName: string | null;
  relationship: string | null;
}

export interface LinkStudentRequest {
  code: string;
  relationship: string;
}

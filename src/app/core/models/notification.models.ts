export type AppNotificationType =
  | 'BOARDING'
  | 'ARRIVAL'
  | 'DELAY'
  | 'VEHICLE_CHANGE'
  | 'DRIVER_CHANGE'
  | 'INCIDENT'
  | 'GENERAL';

export interface AppNotification {
  id: number;
  type: AppNotificationType;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

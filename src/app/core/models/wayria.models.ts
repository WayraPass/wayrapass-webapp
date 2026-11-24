export interface WayriaChatRequest {
  message: string;
}

export interface WayriaRouteSummary {
  code: string;
  name: string;
  origin: string;
  destination: string;
  institution: string;
  campus: string | null;
}

export interface WayriaServiceStatus {
  studentName: string | null;
  routeCode: string | null;
  routeName: string | null;
  status: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  estimatedArrivalAt: string | null;
  delayMinutes: number | null;
  assignedStop: string | null;
  message: string;
}

export interface WayriaChatResponse {
  message: string;
  routes: WayriaRouteSummary[] | null;
  serviceStatus: WayriaServiceStatus | null;
}

import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AppNotification, AppNotificationType } from '../../../core/models/notification.models';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-family-notifications',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class FamilyNotifications {
  private readonly notificationCenter = inject(NotificationService);

  readonly notifications = this.notificationCenter.notifications;
  readonly loading = this.notificationCenter.loading;
  readonly errorMessage = this.notificationCenter.errorMessage;

  constructor() {
    this.notificationCenter.startPolling();
  }

  refresh(): void {
    this.notificationCenter.refresh();
  }

  iconFor(type: AppNotificationType): string {
    return ({ BOARDING: 'how_to_reg', ARRIVAL: 'flag', DELAY: 'schedule', VEHICLE_CHANGE: 'directions_bus', DRIVER_CHANGE: 'badge', INCIDENT: 'warning', GENERAL: 'info' } as const)[type];
  }

  typeLabel(type: AppNotificationType): string {
    return ({ BOARDING: 'Abordaje', ARRIVAL: 'Llegada', DELAY: 'Retraso', VEHICLE_CHANGE: 'Cambio de vehículo', DRIVER_CHANGE: 'Cambio de conductor', INCIDENT: 'Incidencia', GENERAL: 'Aviso' } as const)[type];
  }

  iconClass(notification: AppNotification): string {
    return `notification-icon notification-icon--${notification.type.toLowerCase().replace('_', '-')}`;
  }

  dateTime(value: string): string {
    return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  }
}

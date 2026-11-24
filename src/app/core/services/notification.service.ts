import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { EMPTY, Subject, Subscription, catchError, exhaustMap, finalize, merge, tap, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse } from '../models/auth.models';
import { AppNotification } from '../models/notification.models';

export const NOTIFICATION_POLL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly refreshRequests = new Subject<void>();
  private pollingSubscription: Subscription | null = null;
  private loadedOnce = false;

  readonly notifications = signal<AppNotification[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly latestNotification = signal<AppNotification | null>(null);
  readonly hasNotifications = computed(() => this.notifications().length > 0);

  getMyNotifications() {
    return this.http.get<AppNotification[]>(`${environment.apiUrl}/notifications/me`);
  }

  startPolling(): void {
    if (this.pollingSubscription) return;
    this.pollingSubscription = merge(timer(0, NOTIFICATION_POLL_MS), this.refreshRequests).pipe(
      exhaustMap(() => this.loadNotifications()),
    ).subscribe();
  }

  refresh(): void {
    this.startPolling();
    this.refreshRequests.next();
  }

  stopPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = null;
    this.loadedOnce = false;
    this.notifications.set([]);
    this.latestNotification.set(null);
    this.errorMessage.set('');
    this.loading.set(true);
  }

  dismissLatestNotification(): void {
    this.latestNotification.set(null);
  }

  private loadNotifications() {
    this.loading.set(true);
    this.errorMessage.set('');
    return this.getMyNotifications().pipe(
      tap((response) => this.applyNotifications(response)),
      catchError((error: unknown) => {
        this.errorMessage.set(notificationErrorMessage(error));
        return EMPTY;
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  private applyNotifications(response: AppNotification[]): void {
    const ordered = [...response].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    const existingIds = new Set(this.notifications().map((notification) => notification.id));
    if (this.loadedOnce) {
      const latest = ordered.find((notification) => !existingIds.has(notification.id));
      if (latest) this.latestNotification.set(latest);
    }
    this.notifications.set(ordered);
    this.loadedOnce = true;
  }
}

export function notificationErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'No pudimos cargar tus notificaciones. Inténtalo nuevamente.';
  if (error.status === 0) return 'No se pudo conectar con WayraPass. Verifica que el backend esté disponible.';
  if (error.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
  if (error.status === 403) return 'Tu cuenta no tiene permiso para consultar notificaciones.';
  const response = error.error as ApiErrorResponse | null;
  return response?.message || 'No pudimos cargar tus notificaciones. Inténtalo nuevamente.';
}

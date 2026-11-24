import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AppNotification } from '../../../core/models/notification.models';
import { NotificationService } from '../../../core/services/notification.service';
import { FamilyNotifications } from './notifications';

const items: AppNotification[] = [
  { id: 2, type: 'INCIDENT', title: 'Incidencia reportada', message: 'Tráfico intenso en la ruta.', createdAt: '2026-11-20T19:40:00Z', readAt: null },
  { id: 1, type: 'BOARDING', title: 'Abordaje confirmado', message: 'Rafael abordó el vehículo.', createdAt: '2026-11-20T19:27:00Z', readAt: null },
];

class NotificationServiceStub {
  readonly notifications = signal<AppNotification[]>(items);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  startCalls = 0;
  refreshCalls = 0;
  startPolling(): void { this.startCalls += 1; }
  refresh(): void { this.refreshCalls += 1; }
}

describe('FamilyNotifications', () => {
  let fixture: ComponentFixture<FamilyNotifications>;
  let service: NotificationServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FamilyNotifications], providers: [{ provide: NotificationService, useClass: NotificationServiceStub }] }).compileComponents();
    service = TestBed.inject(NotificationService) as unknown as NotificationServiceStub;
    fixture = TestBed.createComponent(FamilyNotifications);
  });

  it('renders notifications in the supplied newest-first order with type icons', () => {
    fixture.detectChanges();
    const cards = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.notification-item'));
    expect(cards).toHaveLength(2);
    expect(cards[0]?.textContent).toContain('Incidencia reportada');
    expect(cards[0]?.querySelector('mat-icon')?.textContent).toContain('warning');
    expect(cards[1]?.textContent).toContain('Abordaje confirmado');
    expect(cards[1]?.querySelector('mat-icon')?.textContent).toContain('how_to_reg');
  });

  it('shows the empty state when there are no notifications', () => {
    service.notifications.set([]); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No tienes notificaciones recientes.');
  });

  it('shows a recoverable error and refreshes without reloading the application', () => {
    service.errorMessage.set('No pudimos cargar tus notificaciones.'); fixture.detectChanges();
    const retry = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((button) => button.textContent?.includes('Reintentar')) as HTMLButtonElement;
    retry.click();
    expect(service.refreshCalls).toBe(1);
  });

  it('refreshes when the user uses the manual update button', () => {
    fixture.detectChanges();
    const refresh = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((button) => button.textContent?.includes('Actualizar')) as HTMLButtonElement;
    refresh.click();
    expect(service.refreshCalls).toBe(1);
    expect(service.startCalls).toBe(1);
  });
});

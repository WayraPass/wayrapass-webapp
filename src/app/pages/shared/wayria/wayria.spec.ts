import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { WayriaChatResponse } from '../../../core/models/wayria.models';
import { WayriaService } from '../../../core/services/wayria.service';
import { Wayria } from './wayria';

class WayriaServiceStub {
  requests: string[] = [];
  response = of<WayriaChatResponse>({ message: 'Respuesta real', routes: [], serviceStatus: null });
  chat(message: string) { this.requests.push(message); return this.response; }
}

describe('Wayria', () => {
  let fixture: ComponentFixture<Wayria>;
  let service: WayriaServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Wayria], providers: [{ provide: WayriaService, useClass: WayriaServiceStub }] }).compileComponents();
    service = TestBed.inject(WayriaService) as unknown as WayriaServiceStub;
    fixture = TestBed.createComponent(Wayria); fixture.detectChanges();
  });

  it('renders the initial WayrIA chat and keeps empty sends disabled', () => {
    expect(fixture.nativeElement.textContent).toContain('WayrIA');
    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders the validated US10 suggestions and sends the selected text unchanged', () => {
    const expected = [
      '¿Cuáles son mis rutas disponibles?',
      '¿Qué horarios tiene UPC-MON-SMI-01?',
      '¿Qué paraderos tiene UPC-MON-SMI-01?',
    ];
    expect(fixture.componentInstance.suggestions()).toEqual(expected);
    fixture.componentInstance.useSuggestion(expected[1]);
    expect(service.requests).toEqual([expected[1]]);
  });

  it('sends a message and displays the assistant response', () => {
    fixture.componentInstance.message.set('¿Qué paraderos tiene la ruta?'); fixture.componentInstance.send(); fixture.detectChanges();
    expect(service.requests).toEqual(['¿Qué paraderos tiene la ruta?']);
    expect(fixture.nativeElement.textContent).toContain('Respuesta real');
  });

  it('shows loading and keeps structured route data out of the chat UI', () => {
    const pending = new Subject<WayriaChatResponse>(); service.response = pending;
    fixture.componentInstance.message.set('Ruta UPC'); fixture.componentInstance.send(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Consultando información real');
    pending.next({ message: 'Encontré una ruta.', routes: [{ code: 'UPC-MON-SMI-01', name: 'San Miguel', origin: 'San Miguel', destination: 'UPC', institution: 'UPC', campus: 'Monterrico' }], serviceStatus: null }); pending.complete(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('UPC-MON-SMI-01');
  });

  it('shows a friendly error when the service fails', () => {
    service.response = throwError(() => new Error('offline'));
    fixture.componentInstance.message.set('Estado'); fixture.componentInstance.send(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No pude consultar la información del servicio');
  });
});

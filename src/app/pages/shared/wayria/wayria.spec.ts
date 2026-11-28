import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { TranscriptionResponse, WayriaChatResponse } from '../../../core/models/wayria.models';
import { WayriaService } from '../../../core/services/wayria.service';
import { Wayria } from './wayria';

class WayriaServiceStub {
  requests: string[] = [];
  transcriptions: Blob[] = [];
  response = of<WayriaChatResponse>({ message: 'Respuesta real', routes: [], serviceStatus: null });
  transcriptionResponse = of<TranscriptionResponse>({ transcript: 'Consulta transcrita' });
  chat(message: string) { this.requests.push(message); return this.response; }
  transcribe(audio: Blob) { this.transcriptions.push(audio); return this.transcriptionResponse; }
  proactiveMessages() { return of([]); }
}

class FakeMediaRecorder {
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  mimeType = 'audio/webm';
  start(): void { }
  stop(): void {
    this.ondataavailable?.({ data: new Blob(['voice'], { type: this.mimeType }) } as BlobEvent);
    this.onstop?.();
  }
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

  it('renders only the welcome copy while the conversation is empty', () => {
    expect(fixture.nativeElement.textContent).toContain('¿Qué necesitas consultar?');
    expect(fixture.nativeElement.textContent).toContain('WayrIA consulta los datos registrados en WayraPass para responderte.');
    expect(fixture.nativeElement.querySelectorAll('.suggestions').length).toBe(0);
    expect(service.requests).toEqual([]);
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

  it('transcribes audio into the textarea without automatically sending chat', async () => {
    let stoppedTracks = 0;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => stoppedTracks++ }] }) } });
    Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder });

    await fixture.componentInstance.startRecording();
    expect(fixture.componentInstance.recordingState()).toBe('RECORDING');
    fixture.componentInstance.stopRecording();

    expect(service.transcriptions.length).toBe(1);
    expect(fixture.componentInstance.message()).toBe('Consulta transcrita');
    expect(service.requests).toEqual([]);
    expect(stoppedTracks).toBe(1);
  });

  it('keeps text chat available when microphone permission or transcription fails', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { throw new Error('denied'); } } });
    Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder });

    await fixture.componentInstance.startRecording();
    expect(fixture.componentInstance.voiceErrorMessage()).toContain('micrófono');
    expect(fixture.componentInstance.recordingState()).toBe('IDLE');

    let stoppedTracks = 0;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => stoppedTracks++ }] }) } });
    service.transcriptionResponse = throwError(() => new Error('offline'));
    await fixture.componentInstance.startRecording();
    fixture.componentInstance.stopRecording();
    expect(fixture.componentInstance.voiceErrorMessage()).toContain('transcribir');
    expect(service.requests).toEqual([]);
    expect(stoppedTracks).toBe(1);
  });
});

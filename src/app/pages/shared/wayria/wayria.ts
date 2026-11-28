import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { WayriaChatResponse } from '../../../core/models/wayria.models';
import { WayriaService, wayriaErrorMessage } from '../../../core/services/wayria.service';

interface ChatMessage { sender: 'user' | 'assistant'; text: string; response?: WayriaChatResponse; }
type RecordingState = 'IDLE' | 'RECORDING' | 'TRANSCRIBING';

@Component({ selector: 'app-wayria', standalone: true, imports: [FormsModule, MatIconModule, MatProgressSpinnerModule], templateUrl: './wayria.html', styleUrl: './wayria.css' })
export class Wayria implements OnInit, OnDestroy {
  private readonly wayria = inject(WayriaService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  readonly messages = signal<ChatMessage[]>([]);
  readonly message = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly voiceErrorMessage = signal('');
  readonly recordingState = signal<RecordingState>('IDLE');
  readonly isCoordinator = computed(() => this.route?.snapshot.parent?.routeConfig?.path === 'coordinator');
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private discardRecording = false;

  ngOnInit(): void {
    if (this.isCoordinator()) return;
    this.wayria.proactiveMessages().subscribe({
      next: (items) => this.messages.set(items.map((item) => ({ sender: 'assistant' as const, text: item.message }))),
      error: () => undefined,
    });
  }

  ngOnDestroy(): void { this.releaseMicrophone(); }

  send(): void {
    const text = this.message().trim();
    if (!text || this.loading()) return;
    this.messages.update((items) => [...items, { sender: 'user', text }]); this.message.set(''); this.errorMessage.set(''); this.loading.set(true);
    this.wayria.chat(text).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => this.messages.update((items) => [...items, { sender: 'assistant', text: response.message, response }]),
      error: (error: unknown) => this.errorMessage.set(wayriaErrorMessage(error)),
    });
  }
  async startRecording(): Promise<void> {
    if (this.loading() || this.recordingState() !== 'IDLE') return;
    this.voiceErrorMessage.set('');
    if (!this.voiceSupported()) {
      this.voiceErrorMessage.set('La grabación por voz no está disponible en este navegador.');
      return;
    }
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.discardRecording = false;
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) this.audioChunks.push(event.data); };
      this.mediaRecorder.onstop = () => this.handleRecordingStopped();
      this.mediaRecorder.start();
      this.recordingState.set('RECORDING');
    } catch {
      this.releaseMicrophone();
      this.recordingState.set('IDLE');
      this.voiceErrorMessage.set('No pudimos acceder al micrófono. Revisa los permisos e inténtalo nuevamente.');
    }
  }

  stopRecording(): void {
    if (this.recordingState() !== 'RECORDING' || !this.mediaRecorder) return;
    this.recordingState.set('TRANSCRIBING');
    this.mediaRecorder.stop();
  }

  cancelRecording(): void {
    if (this.recordingState() !== 'RECORDING' || !this.mediaRecorder) return;
    this.discardRecording = true;
    this.mediaRecorder.stop();
  }

  private handleRecordingStopped(): void {
    const shouldDiscard = this.discardRecording;
    const audio = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
    this.audioChunks = [];
    this.mediaRecorder = null;
    this.releaseMicrophone();
    if (shouldDiscard) { this.recordingState.set('IDLE'); return; }
    if (audio.size === 0) {
      this.recordingState.set('IDLE');
      this.voiceErrorMessage.set('No se registró audio. Inténtalo nuevamente.');
      return;
    }
    this.wayria.transcribe(audio).pipe(finalize(() => this.recordingState.set('IDLE'))).subscribe({
      next: ({ transcript }) => {
        if (transcript.trim()) this.message.set(transcript);
        else this.voiceErrorMessage.set('No pudimos reconocer texto en el audio. Inténtalo nuevamente.');
      },
      error: () => this.voiceErrorMessage.set('No pudimos transcribir el audio. Puedes escribir tu consulta o intentarlo nuevamente.'),
    });
  }

  private releaseMicrophone(): void {
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
  }

  private voiceSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  }
  onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) { keyboardEvent.preventDefault(); this.send(); }
  }
}

import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { WayriaChatResponse } from '../../../core/models/wayria.models';
import { WayriaService, wayriaErrorMessage } from '../../../core/services/wayria.service';

interface ChatMessage { sender: 'user' | 'assistant'; text: string; response?: WayriaChatResponse; }

@Component({ selector: 'app-wayria', standalone: true, imports: [FormsModule, MatIconModule, MatProgressSpinnerModule, DatePipe], templateUrl: './wayria.html', styleUrl: './wayria.css' })
export class Wayria {
  private readonly wayria = inject(WayriaService);
  readonly messages = signal<ChatMessage[]>([]);
  readonly message = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly suggestions = [
    '¿Cuáles son mis rutas disponibles?',
    '¿Qué horarios tiene UPC-MON-SMI-01?',
    '¿Qué paraderos tiene UPC-MON-SMI-01?',
  ];

  send(): void {
    const text = this.message().trim();
    if (!text || this.loading()) return;
    this.messages.update((items) => [...items, { sender: 'user', text }]); this.message.set(''); this.errorMessage.set(''); this.loading.set(true);
    this.wayria.chat(text).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => this.messages.update((items) => [...items, { sender: 'assistant', text: response.message, response }]),
      error: (error: unknown) => this.errorMessage.set(wayriaErrorMessage(error)),
    });
  }
  useSuggestion(suggestion: string): void { this.message.set(suggestion); this.send(); }
  onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) { keyboardEvent.preventDefault(); this.send(); }
  }
}

import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DISTRICTS, Stop } from '../../../core/models/route.models';
import { RouteService, routeErrorMessage } from '../../../core/services/route.service';
import { StatusBadge } from '../status-badge/status-badge';

interface StopRow extends Stop {
  routeCodes: string[];
}

@Component({
  selector: 'app-stop-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule, StatusBadge],
  templateUrl: './stop-list.html',
  styleUrl: './stop-list.css',
})
export class StopList {
  private readonly service = inject(RouteService);
  private readonly dialogBox = viewChild<ElementRef<HTMLElement>>('dialogBox');

  readonly districts = DISTRICTS;

  readonly stops = signal<Stop[]>([]);
  readonly routeCount = signal<number | null>(null);
  readonly loading = signal(true);
  readonly query = signal('');
  readonly notice = signal<{ kind: 'success' | 'error'; text: string } | null>(null);

  readonly rows = computed<StopRow[]>(() => {
    const q = normalize(this.query());
    return this.stops()
      .filter((s) => !q || normalize(`${s.name} ${s.district} ${s.reference}`).includes(q))
      .map((s) => ({ ...s, routeCodes: this.service.routeCodesUsingStop(s.id) }));
  });
  readonly activeCount = computed(() => this.stops().filter((s) => s.status === 'ACTIVE').length);
  readonly inactiveCount = computed(() => this.stops().length - this.activeCount());

  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    district: ['', Validators.required],
    reference: ['', Validators.maxLength(120)],
  });

  readonly confirmFor = signal<StopRow | null>(null);
  readonly reason = signal('');

  constructor() {
    this.service.getStops().subscribe((stops) => {
      this.stops.set(stops);
      this.loading.set(false);
    });
    this.service.getRoutes().subscribe((routes) => this.routeCount.set(routes.length));
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  openForm(stop: Stop | null = null): void {
    this.editingId.set(stop?.id ?? null);
    this.form.reset({ name: stop?.name ?? '', district: stop?.district ?? '', reference: stop?.reference ?? '' });
    this.formError.set('');
    this.formOpen.set(true);
    this.focusDialog();
  }

  saveStop(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const id = this.editingId();
    const request = this.form.getRawValue();
    const request$ = id ? this.service.updateStop(id, request) : this.service.createStop(request);
    this.saving.set(true);
    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.replace(saved);
        this.formOpen.set(false);
        this.notice.set({
          kind: 'success',
          text: id ? `Paradero «${saved.name}» actualizado.` : `Paradero «${saved.name}» registrado y activo.`,
        });
      },
      error: (error: unknown) => this.formError.set(routeErrorMessage(error)),
    });
  }

  askDeactivate(row: StopRow): void {
    this.reason.set('');
    this.confirmFor.set(row);
    this.focusDialog();
  }

  onReason(event: Event): void {
    this.reason.set((event.target as HTMLTextAreaElement).value);
  }

  confirmDeactivate(): void {
    const row = this.confirmFor();
    if (!row) return;
    this.confirmFor.set(null);
    this.changeStatus(row, 'INACTIVE', this.reason());
  }

  reactivate(row: StopRow): void {
    this.changeStatus(row, 'ACTIVE');
  }

  closeDialogs(): void {
    this.formOpen.set(false);
    this.confirmFor.set(null);
  }

  private changeStatus(row: Stop, status: Stop['status'], reason = ''): void {
    this.service.setStopStatus(row.id, status, reason).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.notice.set({
          kind: 'success',
          text:
            status === 'INACTIVE'
              ? `«${updated.name}» quedó inactivo. Ya no aparece en nuevas asignaciones; su historial se conserva.`
              : `«${updated.name}» está activo otra vez.`,
        });
      },
      error: (error: unknown) => this.notice.set({ kind: 'error', text: routeErrorMessage(error) }),
    });
  }

  private replace(stop: Stop): void {
    const exists = this.stops().some((s) => s.id === stop.id);
    this.stops.update((list) => (exists ? list.map((s) => (s.id === stop.id ? stop : s)) : [...list, stop]));
  }

  private focusDialog(): void {
    setTimeout(() => {
      const box = this.dialogBox()?.nativeElement;
      (box?.querySelector<HTMLElement>('input, textarea, select') ?? box)?.focus();
    });
  }
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

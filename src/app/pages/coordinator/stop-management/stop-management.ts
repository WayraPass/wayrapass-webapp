import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { StopAdmin, StopRequest } from '../../../core/models/coordinator.models';
import { CoordinatorService, coordinatorErrorMessage } from '../../../core/services/coordinator.service';

@Component({ selector: 'app-stop-management', standalone: true, imports: [ReactiveFormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule], templateUrl: './stop-management.html', styleUrl: './stop-management.css' })
export class StopManagement {
  private readonly service = inject(CoordinatorService); private readonly fb = inject(FormBuilder).nonNullable;
  readonly stops = signal<StopAdmin[]>([]); readonly loading = signal(true); readonly saving = signal(false); readonly errorMessage = signal(''); readonly notice = signal(''); readonly query = signal(''); readonly formOpen = signal(false); readonly editing = signal<StopAdmin | null>(null);
  readonly visibleStops = computed(() => { const q = normalize(this.query()); return this.stops().filter((item) => !q || normalize(`${item.name} ${item.district ?? ''} ${item.address ?? ''}`).includes(q)); });
  readonly form = this.fb.group({ name: ['', [Validators.required, Validators.maxLength(150)]], address: ['', Validators.maxLength(250)], district: ['', Validators.maxLength(100)], latitude: this.fb.control<number | null>(null, [Validators.min(-90), Validators.max(90)]), longitude: this.fb.control<number | null>(null, [Validators.min(-180), Validators.max(180)]), active: [true] });
  constructor() { this.load(); }
  load(): void { this.loading.set(true); this.errorMessage.set(''); this.service.stops().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (items) => this.stops.set(items), error: (error: unknown) => this.errorMessage.set(coordinatorErrorMessage(error)) }); }
  open(item: StopAdmin | null = null): void { this.editing.set(item); this.form.reset(item ? { ...item, address: item.address ?? '', district: item.district ?? '' } : { name: '', address: '', district: '', latitude: null, longitude: null, active: true }); this.formOpen.set(true); this.errorMessage.set(''); }
  save(): void { const value = this.form.getRawValue(); this.form.setErrors((value.latitude === null) !== (value.longitude === null) ? { locationPair: true } : null); if (this.form.invalid) { this.form.markAllAsTouched(); return; } const request: StopRequest = { ...value, name: value.name.trim(), address: value.address.trim() || null, district: value.district.trim() || null }; const editing = this.editing(); this.saving.set(true); (editing ? this.service.updateStop(editing.id, request) : this.service.createStop(request)).pipe(finalize(() => this.saving.set(false))).subscribe({ next: (saved) => { this.stops.update((items) => editing ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved]); this.formOpen.set(false); this.notice.set(editing ? `Paradero «${saved.name}» actualizado.` : `Paradero «${saved.name}» creado.`); }, error: (error: unknown) => this.errorMessage.set(coordinatorErrorMessage(error)) }); }
  onSearch(event: Event): void { this.query.set((event.target as HTMLInputElement).value); }
}
function normalize(value: string): string { return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }

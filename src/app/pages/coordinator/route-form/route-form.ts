import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, of, startWith } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  DISTRICTS,
  EntityStatus,
  INSTITUTIONS,
  RouteRequest,
  Stop,
  TransportRoute,
  WEEK_DAYS,
  WeekDay,
} from '../../../core/models/route.models';
import { RouteService, routeErrorMessage } from '../../../core/services/route.service';
import { durationBetween, fromMinutes, toMinutes } from '../../../core/utils/time';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

interface PreviewStop {
  name: string;
  district: string;
  time: string;
  inactive: boolean;
}

type StopGroup = FormGroup<{ stopId: FormControl<string>; estimatedTime: FormControl<string> }>;
type ScheduleGroup = FormGroup<{ departureTime: FormControl<string>; days: FormControl<WeekDay[]> }>;

const minItems = (min: number): ValidatorFn => (control: AbstractControl): ValidationErrors | null =>
  (control as FormArray).length >= min ? null : { minItems: { min } };

const orderedTimes: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const times = (control as FormArray<StopGroup>).getRawValue().map((s) => toMinutes(s.estimatedTime));
  for (let i = 1; i < times.length; i++) {
    const prev = times[i - 1];
    const curr = times[i];
    if (prev !== null && curr !== null && curr <= prev) return { unordered: true };
  }
  return null;
};

const atLeastOneDay: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  Array.isArray(control.value) && control.value.length > 0 ? null : { noDays: true };

@Component({
  selector: 'app-route-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './route-form.html',
  styleUrl: './route-form.css',
})
export class RouteForm {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly service = inject(RouteService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly errorBox = viewChild<ElementRef<HTMLElement>>('errorBox');

  readonly districts = DISTRICTS;
  readonly institutions = INSTITUTIONS;
  readonly weekDays = WEEK_DAYS;

  readonly editingId = signal<string | null>(this.activatedRoute.snapshot.paramMap.get('id'));
  readonly original = signal<TransportRoute | null>(null);
  readonly allStops = signal<Stop[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly serverError = signal('');
  readonly stopToAdd = signal('');

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[Rr]-\d{1,3}$/)]],
    name: ['', [Validators.required, Validators.maxLength(80)]],
    origin: ['', Validators.required],
    destination: ['', Validators.required],
    status: this.fb.control<EntityStatus>('ACTIVE'),
    stops: this.fb.array<StopGroup>([], [minItems(2), orderedTimes]),
    schedules: this.fb.array<ScheduleGroup>([], minItems(1)),
  });

  private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(null)), { initialValue: null });

  readonly stopsById = computed(() => new Map(this.allStops().map((s) => [s.id, s])));

  readonly title = computed(() => {
    const original = this.original();
    return this.editingId() ? `Editar ruta ${original?.code ?? ''}`.trim() : 'Nueva ruta';
  });

  readonly availableStops = computed(() => {
    this.formValue();
    const used = new Set(this.stops.getRawValue().map((s) => s.stopId));
    return this.allStops().filter((s) => s.status === 'ACTIVE' && !used.has(s.id));
  });

  readonly previewStops = computed<PreviewStop[]>(() => {
    this.formValue();
    const byId = this.stopsById();
    return this.stops.getRawValue().map((item) => {
      const stop = byId.get(item.stopId);
      return {
        name: stop?.name ?? 'Paradero eliminado',
        district: stop?.district ?? '',
        time: item.estimatedTime,
        inactive: stop?.status === 'INACTIVE',
      };
    });
  });

  readonly durationMinutes = computed(() => {
    const rows = this.previewStops();
    return rows.length > 1 ? durationBetween(rows[0].time, rows[rows.length - 1].time) : null;
  });

  readonly codePreview = computed(() => {
    this.formValue();
    return this.form.controls.code.value.trim().toUpperCase() || 'R-?';
  });
  readonly namePreview = computed(() => {
    this.formValue();
    return this.form.controls.name.value.trim() || 'Nombre de la ruta';
  });
  readonly statusPreview = computed(() => {
    this.formValue();
    return this.form.controls.status.value;
  });

  readonly pendingFields = computed(() => {
    this.formValue();
    const c = this.form.controls;
    const pending: { label: string; anchor: string }[] = [];
    if (c.code.invalid) pending.push({ label: 'Código', anchor: 'route-code' });
    if (c.name.invalid) pending.push({ label: 'Nombre', anchor: 'route-name' });
    if (c.origin.invalid) pending.push({ label: 'Origen', anchor: 'route-origin' });
    if (c.destination.invalid) pending.push({ label: 'Destino', anchor: 'route-destination' });
    if (c.stops.invalid) pending.push({ label: 'Paraderos', anchor: 'route-stops' });
    if (c.schedules.invalid) pending.push({ label: 'Horario de salida', anchor: 'route-schedules' });
    return pending;
  });

  constructor() {
    const id = this.editingId();
    forkJoin({
      stops: this.service.getStops(),
      route: id ? this.service.getRoute(id) : of(null),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ stops, route }) => {
          this.allStops.set(stops);
          if (route) this.fillForm(route);
          else this.addSchedule();
        },
        error: (error: unknown) => this.serverError.set(routeErrorMessage(error)),
      });
  }

  get stops(): FormArray<StopGroup> {
    return this.form.controls.stops;
  }

  get schedules(): FormArray<ScheduleGroup> {
    return this.form.controls.schedules;
  }


  addStop(): void {
    const stopId = this.stopToAdd() || this.availableStops()[0]?.id;
    if (!stopId) return;
    this.stops.push(this.stopGroup(stopId, this.suggestNextTime()));
    this.stopToAdd.set('');
  }

  removeStop(index: number): void {
    this.stops.removeAt(index);
  }

  moveStop(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.stops.length) return;
    const control = this.stops.at(index);
    this.stops.removeAt(index, { emitEvent: false });
    this.stops.insert(target, control);
  }

  stopInfo(stopId: string): Stop | undefined {
    return this.stopsById().get(stopId);
  }

  onStopToAdd(event: Event): void {
    this.stopToAdd.set((event.target as HTMLSelectElement).value);
  }


  addSchedule(departureTime = '', days: WeekDay[] = [0, 1, 2, 3, 4]): void {
    this.schedules.push(
      this.fb.group({
        departureTime: [departureTime, [Validators.required, Validators.pattern(TIME_PATTERN)]],
        days: this.fb.control<WeekDay[]>(days, atLeastOneDay),
      }),
    );
  }

  removeSchedule(index: number): void {
    this.schedules.removeAt(index);
  }

  toggleDay(index: number, day: WeekDay): void {
    const control = this.schedules.at(index).controls.days;
    const days = control.value;
    control.setValue(days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort() as WeekDay[]);
    control.markAsTouched();
  }

  arrivalFor(departureTime: string): string {
    const start = toMinutes(departureTime);
    const duration = this.durationMinutes();
    return start === null || duration === null ? '—' : fromMinutes(start + duration);
  }


  save(): void {
    this.submitted.set(true);
    this.serverError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      setTimeout(() => this.errorBox()?.nativeElement.focus());
      return;
    }

    const value = this.form.getRawValue();
    const request: RouteRequest = {
      code: value.code,
      name: value.name,
      origin: value.origin,
      destination: value.destination,
      status: value.status,
      stops: value.stops,
      schedules: value.schedules,
    };
    const id = this.editingId();
    const request$ = id ? this.service.updateRoute(id, request) : this.service.createRoute(request);

    this.saving.set(true);
    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (route) =>
        void this.router.navigate(['/coordinator/routes'], {
          queryParams: { saved: route.id, mode: id ? 'updated' : 'created' },
        }),
      error: (error: unknown) => {
        this.serverError.set(routeErrorMessage(error));
        setTimeout(() => this.errorBox()?.nativeElement.focus());
      },
    });
  }

  scrollTo(anchor: string): void {
    const element = document.getElementById(anchor);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (element?.matches('input, select') ? element : element?.querySelector<HTMLElement>('input, select, button'))?.focus({ preventScroll: true });
  }

  showError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }


  private fillForm(route: TransportRoute): void {
    this.original.set(route);
    this.form.patchValue({
      code: route.code,
      name: route.name,
      origin: route.origin,
      destination: route.destination,
      status: route.status,
    });
    this.stops.clear({ emitEvent: false });
    route.stops.forEach((s) => this.stops.push(this.stopGroup(s.stopId, s.estimatedTime), { emitEvent: false }));
    this.schedules.clear({ emitEvent: false });
    route.schedules.forEach((s) => this.addSchedule(s.departureTime, s.days));
    this.form.updateValueAndValidity();
  }

  private stopGroup(stopId: string, estimatedTime: string): StopGroup {
    return this.fb.group({
      stopId: [stopId, Validators.required],
      estimatedTime: [estimatedTime, [Validators.required, Validators.pattern(TIME_PATTERN)]],
    });
  }

  private suggestNextTime(): string {
    const stops = this.stops.getRawValue();
    const last = stops.length ? toMinutes(stops[stops.length - 1].estimatedTime) : null;
    if (last !== null) return fromMinutes(last + 10);
    const firstDeparture = this.schedules.length ? toMinutes(this.schedules.at(0).controls.departureTime.value) : null;
    return firstDeparture !== null ? fromMinutes(firstDeparture) : '';
  }
}

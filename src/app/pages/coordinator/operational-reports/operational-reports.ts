import { HttpResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { OperationalReport, ReportFormat, ReportIndicator } from '../../../core/models/coordinator.models';
import { CoordinatorService, coordinatorErrorMessage } from '../../../core/services/coordinator.service';

interface IndicatorOption { value: ReportIndicator; label: string; description: string; }

@Component({
  selector: 'app-operational-reports',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './operational-reports.html',
  styleUrl: './operational-reports.css',
})
export class OperationalReports {
  private readonly service = inject(CoordinatorService);
  readonly indicators: ReadonlyArray<IndicatorOption> = [
    { value: 'ALL', label: 'General', description: 'Resumen de todos los indicadores operativos' },
    { value: 'PUNCTUALITY', label: 'Puntualidad', description: 'Viajes puntuales y con retraso' },
    { value: 'OCCUPANCY', label: 'Ocupación', description: 'Capacidad ofrecida y abordajes confirmados' },
    { value: 'INCIDENTS', label: 'Incidencias', description: 'Cantidad de incidencias registradas' },
    { value: 'STOP_DEMAND', label: 'Demanda por paradero', description: 'Abordajes confirmados por punto de recojo' },
  ];
  readonly from = signal(firstDayOfMonth());
  readonly to = signal(todayInLima());
  readonly indicator = signal<ReportIndicator>('ALL');
  readonly report = signal<OperationalReport | null>(null);
  readonly loading = signal(false);
  readonly exporting = signal<ReportFormat | null>(null);
  readonly errorMessage = signal('');
  readonly exportErrorMessage = signal('');
  readonly validationMessage = signal('');
  readonly indicatorLabel = computed(() => this.indicators.find((option) => option.value === this.indicator())?.label ?? 'Reporte');
  readonly indicatorDescription = computed(() => this.indicators.find((option) => option.value === this.indicator())?.description ?? '');

  consult(): void {
    if (!this.validate()) return;
    this.loading.set(true); this.errorMessage.set(''); this.report.set(null);
    this.service.operationalReport(this.from(), this.to(), this.indicator()).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (report) => this.report.set(report),
      error: (error: unknown) => this.errorMessage.set(coordinatorErrorMessage(error)),
    });
  }

  clear(): void {
    this.from.set(firstDayOfMonth()); this.to.set(todayInLima()); this.indicator.set('ALL');
    this.report.set(null); this.errorMessage.set(''); this.exportErrorMessage.set(''); this.validationMessage.set('');
  }

  export(format: ReportFormat): void {
    if (this.exporting() || !this.validate()) return;
    this.exporting.set(format); this.exportErrorMessage.set('');
    this.service.exportOperationalReport(this.from(), this.to(), this.indicator(), format).pipe(finalize(() => this.exporting.set(null))).subscribe({
      next: (response) => this.download(response, format),
      error: (error: unknown) => this.exportErrorMessage.set(coordinatorErrorMessage(error)),
    });
  }

  updateFrom(value: string): void { this.from.set(value); this.validationMessage.set(''); }
  updateTo(value: string): void { this.to.set(value); this.validationMessage.set(''); }
  updateIndicator(value: string): void { this.indicator.set(value as ReportIndicator); this.validationMessage.set(''); }
  percent(value: number): string { return `${Number(value).toFixed(2)}%`; }

  private validate(): boolean {
    this.validationMessage.set('');
    if (!this.from() || !this.to()) { this.validationMessage.set('Selecciona las fechas inicial y final.'); return false; }
    if (this.from() > this.to()) { this.validationMessage.set('La fecha inicial no puede ser posterior a la fecha final.'); return false; }
    return true;
  }

  private download(response: HttpResponse<Blob>, format: ReportFormat): void {
    const blob = response.body;
    if (!blob || blob.size === 0) { this.exportErrorMessage.set('El reporte exportado está vacío. Inténtalo nuevamente.'); return; }
    const extension = format === 'PDF' ? 'pdf' : 'xlsx';
    const filename = contentDispositionFilename(response.headers.get('Content-Disposition'))
      ?? `wayrapass-reporte-${this.indicator().toLowerCase()}-${this.from()}-${this.to()}.${extension}`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.style.display = 'none';
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  }
}

function todayInLima(): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()); }
function firstDayOfMonth(): string { return `${todayInLima().slice(0, 7)}-01`; }
export function contentDispositionFilename(value: string | null): string | null {
  if (!value) return null;
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) { try { return decodeURIComponent(encoded); } catch { return encoded; } }
  return value.match(/filename="?([^";]+)"?/i)?.[1] ?? null;
}

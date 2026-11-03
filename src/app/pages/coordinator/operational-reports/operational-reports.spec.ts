import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { OperationalReport, ReportFormat, ReportIndicator } from '../../../core/models/coordinator.models';
import { CoordinatorService } from '../../../core/services/coordinator.service';
import { OperationalReports, contentDispositionFilename } from './operational-reports';

const report: OperationalReport = {
  period: { from: '2026-10-01', to: '2026-10-31', zoneId: 'America/Lima' }, indicator: 'ALL', generatedAt: '2026-11-03T12:00:00Z', hasData: true, message: null,
  punctuality: { evaluatedTrips: 10, onTimeTrips: 8, lateTrips: 2, onTimePercentage: 80 },
  occupancy: { evaluatedTrips: 10, confirmedBoardings: 40, offeredCapacity: 100, occupancyPercentage: 40 },
  incidents: { totalIncidents: 3 }, stopDemand: [{ stopId: 4, stopName: 'Plaza San Miguel', confirmedBoardings: 12 }],
};

class ReportsServiceStub {
  reportResult: Observable<OperationalReport> = of(report);
  exportResult: Observable<HttpResponse<Blob>> = of(new HttpResponse({ body: new Blob(['PDF'], { type: 'application/pdf' }), headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="backend-report.pdf"' }) }));
  reportCalls: Array<{ from: string; to: string; indicator: ReportIndicator }> = [];
  exportCalls: Array<{ from: string; to: string; indicator: ReportIndicator; format: ReportFormat }> = [];
  operationalReport(from: string, to: string, indicator: ReportIndicator) { this.reportCalls.push({ from, to, indicator }); return this.reportResult; }
  exportOperationalReport(from: string, to: string, indicator: ReportIndicator, format: ReportFormat) { this.exportCalls.push({ from, to, indicator, format }); return this.exportResult; }
}

describe('OperationalReports D3 / US23 + US24', () => {
  let fixture: ComponentFixture<OperationalReports>; let component: OperationalReports; let service: ReportsServiceStub;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OperationalReports], providers: [{ provide: CoordinatorService, useClass: ReportsServiceStub }] }).compileComponents();
    service = TestBed.inject(CoordinatorService) as unknown as ReportsServiceStub;
    fixture = TestBed.createComponent(OperationalReports); component = fixture.componentInstance; fixture.detectChanges();
  });
  it('does not query automatically and exposes all five real report types in Spanish', () => {
    expect(service.reportCalls).toHaveLength(0); const text = fixture.nativeElement.textContent as string;
    ['General', 'Puntualidad', 'Ocupación', 'Incidencias', 'Demanda por paradero'].forEach((label) => expect(text).toContain(label));
  });
  it('queries with required dates and selected backend indicator', () => {
    component.updateFrom('2026-10-01'); component.updateTo('2026-10-31'); component.updateIndicator('PUNCTUALITY'); component.consult(); fixture.detectChanges();
    expect(service.reportCalls).toEqual([{ from: '2026-10-01', to: '2026-10-31', indicator: 'PUNCTUALITY' }]);
  });
  it('blocks an invalid date range before calling the backend', () => {
    component.updateFrom('2026-11-02'); component.updateTo('2026-11-01'); component.consult(); fixture.detectChanges();
    expect(service.reportCalls).toHaveLength(0); expect(fixture.nativeElement.textContent).toContain('fecha inicial no puede ser posterior');
  });
  it('shows loading while consulting', () => {
    service.reportResult = new Subject<OperationalReport>(); component.consult(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Consultando indicadores');
  });
  it('renders every metric returned by the general report without adding fields', () => {
    component.updateFrom('2026-10-01'); component.updateTo('2026-10-31'); component.consult(); fixture.detectChanges(); const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('80.00%'); expect(text).toContain('40.00%'); expect(text).toContain('3'); expect(text).toContain('Plaza San Miguel'); expect(text).toContain('12');
  });
  it('shows the backend empty state and message', () => {
    service.reportResult = of({ ...report, hasData: false, message: 'No existen datos disponibles para el periodo seleccionado', punctuality: { evaluatedTrips: 0, onTimeTrips: 0, lateTrips: 0, onTimePercentage: 0 }, occupancy: null, incidents: null, stopDemand: null });
    component.consult(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Sin datos para el periodo seleccionado'); expect(fixture.nativeElement.textContent).toContain('No existen datos disponibles');
  });
  it('shows a recoverable query error', () => {
    service.reportResult = throwError(() => new HttpErrorResponse({ status: 503 })); component.consult(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });
  it('clears results and restores the general report filter', () => {
    component.updateIndicator('INCIDENTS'); component.consult(); component.clear(); fixture.detectChanges(); expect(component.indicator()).toBe('ALL'); expect(component.report()).toBeNull();
  });
  it('exports using the active filters and prevents a double submit', () => {
    const pending = new Subject<HttpResponse<Blob>>(); service.exportResult = pending; component.updateFrom('2026-10-01'); component.updateTo('2026-10-31'); component.updateIndicator('OCCUPANCY');
    component.export('PDF'); component.export('PDF'); expect(service.exportCalls).toEqual([{ from: '2026-10-01', to: '2026-10-31', indicator: 'OCCUPANCY', format: 'PDF' }]); expect(component.exporting()).toBe('PDF');
  });
  it('downloads the Blob with the filename supplied by Content-Disposition', () => {
    component.consult(); let downloaded = '';
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloaded = this.download; });
    component.export('PDF');
    expect(downloaded).toBe('backend-report.pdf'); expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob)); expect(revokeObjectUrl).toHaveBeenCalledWith('blob:report');
    click.mockRestore(); createObjectUrl.mockRestore(); revokeObjectUrl.mockRestore();
  });
  it('shows an export error and re-enables exporting', () => {
    component.consult(); service.exportResult = throwError(() => new HttpErrorResponse({ status: 500 })); component.export('XLSX'); fixture.detectChanges(); expect(component.exporting()).toBeNull(); expect(fixture.nativeElement.textContent).toContain('error 500');
  });
  it('rejects an empty exported file', () => {
    component.consult(); service.exportResult = of(new HttpResponse({ body: new Blob([], { type: 'application/pdf' }) })); component.export('PDF'); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('reporte exportado está vacío');
  });
  it('respects Content-Disposition, including UTF-8 names', () => {
    expect(contentDispositionFilename('attachment; filename="wayrapass.pdf"')).toBe('wayrapass.pdf');
    expect(contentDispositionFilename("attachment; filename*=UTF-8''reporte%20operativo.xlsx")).toBe('reporte operativo.xlsx');
  });
});

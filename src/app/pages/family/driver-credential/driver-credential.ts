import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FamilyDriverCredential } from '../../../core/models/family.models';

@Component({ selector: 'app-driver-credential', standalone: true, imports: [MatIconModule], templateUrl: './driver-credential.html', styleUrl: './driver-credential.css' })
export class DriverCredentialCard {
  readonly credential = input.required<FamilyDriverCredential>();

  authorizationLabel(): string {
    return ({ AUTHORIZED: 'Autorizado', PENDING: 'Pendiente de autorización', REJECTED: 'No autorizado' } as const)[this.credential().authorizationStatus ?? 'PENDING'];
  }

  operationalLabel(): string {
    const status = this.credential().operationalStatus;
    if (!status) return 'Sin estado operativo';
    return ({ AVAILABLE: 'Disponible', UNAVAILABLE: 'No disponible', INACTIVE: 'Inactivo' } as const)[status];
  }
}

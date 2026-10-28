import { Component, computed, input } from '@angular/core';
import { EntityStatus } from '../../../core/models/route.models';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css',
})
export class StatusBadge {
  readonly status = input.required<EntityStatus>();
  
  readonly gender = input<'f' | 'm'>('f');

  readonly label = computed(() => {
    const ending = this.gender() === 'f' ? 'a' : 'o';
    return (this.status() === 'ACTIVE' ? 'Activ' : 'Inactiv') + ending;
  });
}
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({ selector: 'app-driver-dashboard', standalone: true, imports: [RouterLink, MatIconModule], templateUrl: './dashboard.html', styleUrl: '../../student/dashboard/dashboard.css' })
export class DriverDashboard { readonly user = inject(AuthService).user; }

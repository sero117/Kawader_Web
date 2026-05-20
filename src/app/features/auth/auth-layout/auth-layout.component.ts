import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  group,
} from '@angular/animations';

const authRouteAnimation = trigger('routeAnim', [
  transition('login <=> register', [
    query(':enter, :leave', [
      style({
        position: 'fixed',
        top: '0', left: '0',
        width: '100%', height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }),
    ], { optional: true }),
    group([
      query(':leave', [
        style({ zIndex: 1 }),
        animate('220ms ease-out', style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' })),
      ], { optional: true }),
      query(':enter', [
        style({ opacity: 0, transform: 'scale(1.03) translateY(-10px)', zIndex: 2 }),
        animate('380ms 80ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' })),
      ], { optional: true }),
    ]),
  ]),
]);

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  animations: [authRouteAnimation],
  templateUrl: './auth-layout.component.html',
})
export class AuthLayoutComponent implements OnInit {
  private readonly router = inject(Router);

  routeAnim = signal('');

  ngOnInit(): void {
    this.syncAnim();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.syncAnim());
  }

  private syncAnim(): void {
    const grandchild = this.router.routerState.snapshot.root.firstChild?.firstChild;
    this.routeAnim.set((grandchild?.data?.['animation'] as string) ?? '');
  }

  readonly sparkles: { top: string; left: string; size: string; duration: string; delay: string }[] = [
    { top: '6%',  left: '90%', size: '20px', duration: '3.3s', delay: '0s'   },
    { top: '12%', left: '4%',  size: '14px', duration: '2.8s', delay: '0.7s' },
    { top: '30%', left: '2%',  size: '10px', duration: '4.0s', delay: '1.5s' },
    { top: '50%', left: '95%', size: '12px', duration: '2.5s', delay: '0.3s' },
    { top: '72%', left: '87%', size: '16px', duration: '3.8s', delay: '1.9s' },
    { top: '84%', left: '6%',  size: '11px', duration: '3.1s', delay: '0.9s' },
    { top: '42%', left: '93%', size: '8px',  duration: '2.3s', delay: '2.3s' },
    { top: '63%', left: '1%',  size: '13px', duration: '3.6s', delay: '0.5s' },
    { top: '20%', left: '50%', size: '7px',  duration: '4.2s', delay: '1.2s' },
  ];

  readonly blobs: { top: string; left: string; width: string; height: string; rot: string; delay: string; duration: string }[] = [
    { top: '-4%',  left: '38%',  width: '560px', height: '210px', rot: '42deg',  delay: '0s',   duration: '9s'  },
    { top: '28%',  left: '-10%', width: '430px', height: '165px', rot: '-18deg', delay: '1.5s', duration: '11s' },
    { top: '65%',  left: '-5%',  width: '270px', height: '270px', rot: '0deg',   delay: '0.8s', duration: '10s' },
    { top: '52%',  left: '60%',  width: '390px', height: '145px', rot: '28deg',  delay: '2.2s', duration: '8s'  },
    { top: '78%',  left: '28%',  width: '350px', height: '135px', rot: '-8deg',  delay: '1.0s', duration: '12s' },
  ];
}

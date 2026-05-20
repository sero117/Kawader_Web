import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
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
export class AuthLayoutComponent {
  mouseX = signal(50);
  mouseY = signal(50);

  onMouseMove(event: MouseEvent): void {
    this.mouseX.set((event.clientX / window.innerWidth) * 100);
    this.mouseY.set((event.clientY / window.innerHeight) * 100);
  }

  prepareRoute(outlet: RouterOutlet): string {
    return outlet?.activatedRouteData?.['animation'] ?? '';
  }

  readonly particles: { left: string; duration: string; delay: string; size: string }[] = [
    { left: '7%',  duration: '9s',  delay: '0s',    size: '3px' },
    { left: '15%', duration: '13s', delay: '1.8s',  size: '4px' },
    { left: '24%', duration: '10s', delay: '3.2s',  size: '2px' },
    { left: '32%', duration: '15s', delay: '0.6s',  size: '3px' },
    { left: '40%', duration: '11s', delay: '4.1s',  size: '4px' },
    { left: '49%', duration: '8s',  delay: '2.3s',  size: '2px' },
    { left: '57%', duration: '14s', delay: '1.1s',  size: '3px' },
    { left: '65%', duration: '12s', delay: '3.7s',  size: '4px' },
    { left: '74%', duration: '9s',  delay: '0.9s',  size: '2px' },
    { left: '82%', duration: '11s', delay: '2.6s',  size: '3px' },
    { left: '90%', duration: '16s', delay: '1.4s',  size: '4px' },
    { left: '4%',  duration: '10s', delay: '5.2s',  size: '2px' },
    { left: '44%', duration: '13s', delay: '6.0s',  size: '3px' },
    { left: '71%', duration: '9s',  delay: '4.8s',  size: '2px' },
    { left: '95%', duration: '12s', delay: '7.2s',  size: '4px' },
  ];
}

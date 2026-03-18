import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChild('hero', { static: true })
  heroRef!: ElementRef<HTMLElement>;

  @ViewChild('ctaRow', { static: true })
  ctaRowRef!: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    const hero = this.heroRef.nativeElement;
    const cta = this.ctaRowRef.nativeElement;

    gsap.from(hero.querySelectorAll('.hero-kicker, .hero-title, .hero-subtitle'), {
      y: 24,
      opacity: 0,
      duration: 0.9,
      stagger: 0.15,
      ease: 'power3.out',
    });

    gsap.from(cta.children, {
      y: 18,
      opacity: 0,
      duration: 0.8,
      stagger: 0.12,
      delay: 0.45,
      ease: 'back.out(1.4)',
    });
  }

  goToMeetSpace() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/meet']);
      return;
    }

    this.router.navigate(['/login']);
  }
}

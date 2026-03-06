import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { take } from 'rxjs';
import { HeaderComponent } from './shared/components/header/header.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  constructor(private readonly authService: AuthService) {}

  ngOnInit(): void {
    this.authService.loadCurrentUser().pipe(take(1)).subscribe();
  }
}

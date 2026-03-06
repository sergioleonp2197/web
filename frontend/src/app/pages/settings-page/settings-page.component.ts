import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { extractApiErrorMessage } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-settings-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss'
})
export class SettingsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  saving = false;
  uploadingAvatar = false;
  error = '';
  uploadError = '';

  readonly form = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    bio: [''],
    image: [''],
    password: ['']
  });

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (!user) return;

        this.form.patchValue({
          username: user.username,
          email: user.email,
          bio: user.bio ?? '',
          image: user.image ?? '',
          password: ''
        });
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: {
      username?: string;
      email?: string;
      bio?: string | null;
      image?: string | null;
      password?: string;
    } = {
      username: raw.username.trim(),
      email: raw.email.trim(),
      bio: raw.bio.trim() || null,
      image: raw.image.trim() || null
    };

    if (raw.password.trim()) {
      payload.password = raw.password.trim();
    }

    this.saving = true;
    this.error = '';

    this.authService
      .updateUser(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.saving = false;
          this.router.navigate(['/profile', user.username]);
        },
        error: (errorResponse) => {
          this.saving = false;
          this.error = extractApiErrorMessage(
            errorResponse,
            'No se pudo actualizar la configuracion.'
          );
        }
      });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.uploadingAvatar = true;
    this.uploadError = '';

    this.authService
      .uploadAvatar(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.uploadingAvatar = false;
          this.form.controls.image.setValue(user.image ?? '');
          input.value = '';
        },
        error: (errorResponse) => {
          this.uploadingAvatar = false;
          this.uploadError = extractApiErrorMessage(
            errorResponse,
            'No se pudo subir el avatar.'
          );
          input.value = '';
        }
      });
  }
}

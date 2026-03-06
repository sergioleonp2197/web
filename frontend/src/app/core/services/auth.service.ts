import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { API_URL } from '../tokens/api-url.token';
import { AuthResponse, User } from '../models/api.models';

interface AuthPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends AuthPayload {
  username: string;
}

interface UpdatePayload {
  email?: string;
  username?: string;
  bio?: string | null;
  image?: string | null;
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'medium_clone_token';
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  private readonly hasLocalStorage = typeof localStorage !== 'undefined';

  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    @Inject(API_URL) private readonly apiUrl: string
  ) {}

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasToken(): boolean {
    if (!this.hasLocalStorage) return false;
    return Boolean(localStorage.getItem(this.tokenKey));
  }

  getToken(): string | null {
    if (!this.hasLocalStorage) return null;
    return localStorage.getItem(this.tokenKey);
  }

  loadCurrentUser(): Observable<User | null> {
    const token = this.getToken();
    if (!token) {
      this.currentUserSubject.next(null);
      return of(null);
    }

    return this.http.get<AuthResponse>(`${this.apiUrl}/auth/me`).pipe(
      map((response) => response.user),
      tap((user) => this.setSession(user)),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  register(payload: RegisterPayload): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, payload).pipe(
      map((response) => response.user),
      tap((user) => this.setSession(user))
    );
  }

  login(payload: AuthPayload): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, payload).pipe(
      map((response) => response.user),
      tap((user) => this.setSession(user))
    );
  }

  updateUser(payload: UpdatePayload): Observable<User> {
    return this.http.put<AuthResponse>(`${this.apiUrl}/user`, payload).pipe(
      map((response) => response.user),
      tap((user) => this.setSession(user))
    );
  }

  uploadAvatar(file: File): Observable<User> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<AuthResponse>(`${this.apiUrl}/uploads/avatar`, formData).pipe(
      map((response) => response.user),
      tap((user) => this.setSession(user))
    );
  }

  logout(): void {
    this.clearSession();
  }

  private setSession(user: User): void {
    if (this.hasLocalStorage) {
      localStorage.setItem(this.tokenKey, user.token);
    }
    this.currentUserSubject.next(user);
  }

  private clearSession(): void {
    if (this.hasLocalStorage) {
      localStorage.removeItem(this.tokenKey);
    }
    this.currentUserSubject.next(null);
  }
}

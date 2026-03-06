import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProfileResponse } from '../models/api.models';
import { API_URL } from '../tokens/api-url.token';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_URL) private readonly apiUrl: string
  ) {}

  getProfile(username: string): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.apiUrl}/profiles/${username}`);
  }

  follow(username: string): Observable<ProfileResponse> {
    return this.http.post<ProfileResponse>(`${this.apiUrl}/profiles/${username}/follow`, {});
  }

  unfollow(username: string): Observable<ProfileResponse> {
    return this.http.delete<ProfileResponse>(`${this.apiUrl}/profiles/${username}/follow`);
  }
}

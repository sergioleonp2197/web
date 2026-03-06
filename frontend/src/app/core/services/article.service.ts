import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ArticleContentFormat,
  ArticleStatus,
  ArticleResponse,
  ArticlesResponse,
  CommentResponse,
  CommentsResponse,
  TagsResponse,
  UploadImageResponse
} from '../models/api.models';
import { API_URL } from '../tokens/api-url.token';

export interface ArticleQuery {
  tag?: string;
  author?: string;
  favorited?: string;
  search?: string;
  sort?: 'latest' | 'oldest' | 'popular';
  status?: 'published' | 'draft' | 'all';
  limit?: number;
  offset?: number;
}

export interface ArticlePayload {
  title: string;
  description: string;
  body: string;
  coverImage?: string | null;
  imageList?: string[];
  tagList: string[];
  allowComments?: boolean;
  contentFormat?: ArticleContentFormat;
  status?: ArticleStatus;
  readingTimeMinutes?: number;
}

interface CommentPayload {
  body: string;
  imageUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ArticleService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_URL) private readonly apiUrl: string
  ) {}

  getArticles(query: ArticleQuery = {}): Observable<ArticlesResponse> {
    const params = this.buildParams(query as Record<string, unknown>);
    return this.http.get<ArticlesResponse>(`${this.apiUrl}/articles`, { params });
  }

  getFeed(query: Pick<ArticleQuery, 'limit' | 'offset'> = {}): Observable<ArticlesResponse> {
    const params = this.buildParams(query as Record<string, unknown>);
    return this.http.get<ArticlesResponse>(`${this.apiUrl}/articles/feed`, { params });
  }

  getArticle(slug: string): Observable<ArticleResponse> {
    return this.http.get<ArticleResponse>(`${this.apiUrl}/articles/${slug}`);
  }

  createArticle(payload: ArticlePayload): Observable<ArticleResponse> {
    return this.http.post<ArticleResponse>(`${this.apiUrl}/articles`, payload);
  }

  updateArticle(slug: string, payload: Partial<ArticlePayload>): Observable<ArticleResponse> {
    return this.http.put<ArticleResponse>(`${this.apiUrl}/articles/${slug}`, payload);
  }

  deleteArticle(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/articles/${slug}`);
  }

  favoriteArticle(slug: string): Observable<ArticleResponse> {
    return this.http.post<ArticleResponse>(`${this.apiUrl}/articles/${slug}/favorite`, {});
  }

  unfavoriteArticle(slug: string): Observable<ArticleResponse> {
    return this.http.delete<ArticleResponse>(`${this.apiUrl}/articles/${slug}/favorite`);
  }

  getComments(slug: string): Observable<CommentsResponse> {
    return this.http.get<CommentsResponse>(`${this.apiUrl}/articles/${slug}/comments`);
  }

  addComment(slug: string, payload: CommentPayload): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(`${this.apiUrl}/articles/${slug}/comments`, payload);
  }

  updateComment(slug: string, commentId: string, payload: CommentPayload): Observable<CommentResponse> {
    return this.http.put<CommentResponse>(
      `${this.apiUrl}/articles/${slug}/comments/${commentId}`,
      payload
    );
  }

  deleteComment(slug: string, commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/articles/${slug}/comments/${commentId}`);
  }

  favoriteComment(slug: string, commentId: string): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(
      `${this.apiUrl}/articles/${slug}/comments/${commentId}/favorite`,
      {}
    );
  }

  unfavoriteComment(slug: string, commentId: string): Observable<CommentResponse> {
    return this.http.delete<CommentResponse>(
      `${this.apiUrl}/articles/${slug}/comments/${commentId}/favorite`
    );
  }

  getTags(): Observable<TagsResponse> {
    return this.http.get<TagsResponse>(`${this.apiUrl}/tags`);
  }

  uploadImage(file: File): Observable<UploadImageResponse> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<UploadImageResponse>(`${this.apiUrl}/uploads/image`, formData);
  }

  private buildParams(query: Record<string, unknown>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      if (typeof value === 'string' || typeof value === 'number') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}

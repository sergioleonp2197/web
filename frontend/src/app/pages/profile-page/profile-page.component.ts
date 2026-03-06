import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Article, Profile } from '../../core/models/api.models';
import { ArticleQuery, ArticleService } from '../../core/services/article.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { extractApiErrorMessage } from '../../core/utils/http-error.util';
import { ArticleCardComponent } from '../../shared/components/article-card/article-card.component';

@Component({
  selector: 'app-profile-page',
  imports: [CommonModule, FormsModule, ArticleCardComponent],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss'
})
export class ProfilePageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  profile: Profile | null = null;
  articles: Article[] = [];
  activeTab: 'authored' | 'favorited' = 'authored';
  sort: 'latest' | 'oldest' | 'popular' = 'latest';
  statusFilter: 'published' | 'all' = 'published';
  loadingProfile = true;
  loadingArticles = true;
  error = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly profileService: ProfileService,
    private readonly articleService: ArticleService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const username = params.get('username');
      if (!username) {
        this.router.navigateByUrl('/');
        return;
      }

      this.activeTab = 'authored';
      this.sort = 'latest';
      this.statusFilter = 'published';
      this.loadProfile(username);
      this.loadArticles(username);
    });
  }

  get currentUsername(): string | null {
    return this.authService.currentUser?.username ?? null;
  }

  get canFollow(): boolean {
    return Boolean(this.profile && this.currentUsername && this.profile.username !== this.currentUsername);
  }

  get canFavorite(): boolean {
    return this.authService.hasToken();
  }

  get isOwnProfile(): boolean {
    return Boolean(this.profile && this.currentUsername && this.profile.username === this.currentUsername);
  }

  switchTab(tab: 'authored' | 'favorited'): void {
    if (!this.profile) return;
    this.activeTab = tab;
    this.loadArticles(this.profile.username);
  }

  applyFilters(): void {
    if (!this.profile) return;
    this.loadArticles(this.profile.username);
  }

  toggleFollow(): void {
    if (!this.profile) return;
    if (!this.authService.hasToken()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const request$ = this.profile.following
      ? this.profileService.unfollow(this.profile.username)
      : this.profileService.follow(this.profile.username);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.profile = response.profile;
      }
    });
  }

  toggleFavorite(article: Article): void {
    if (!this.authService.hasToken()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const request$ = article.favorited
      ? this.articleService.unfavoriteArticle(article.slug)
      : this.articleService.favoriteArticle(article.slug);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.articles = this.articles.map((item) =>
          item.slug === article.slug ? response.article : item
        );
      }
    });
  }

  deleteArticle(article: Article): void {
    if (!this.currentUsername || article.author.username !== this.currentUsername) {
      return;
    }

    if (!confirm('Vas a eliminar este articulo. Esta accion no se puede deshacer.')) {
      return;
    }

    this.articleService
      .deleteArticle(article.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.articles = this.articles.filter((item) => item.slug !== article.slug);
        },
        error: (errorResponse) => {
          this.error = extractApiErrorMessage(errorResponse, 'No se pudo eliminar el articulo.');
        }
      });
  }

  private loadProfile(username: string): void {
    this.loadingProfile = true;
    this.error = '';

    this.profileService
      .getProfile(username)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.profile = response.profile;
          this.loadingProfile = false;
        },
        error: () => {
          this.error = 'No se pudo cargar el perfil.';
          this.loadingProfile = false;
        }
      });
  }

  private loadArticles(username: string): void {
    this.loadingArticles = true;

    const query: ArticleQuery =
      this.activeTab === 'authored'
        ? {
            author: username,
            limit: 20,
            sort: this.sort,
            status: this.statusFilter === 'all' && this.isOwnProfile ? 'all' : 'published'
          }
        : { favorited: username, limit: 20, sort: this.sort };

    this.articleService
      .getArticles(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.articles = response.articles;
          this.loadingArticles = false;
        },
        error: (errorResponse) => {
          this.error = extractApiErrorMessage(errorResponse, 'No se pudo cargar articulos.');
          this.loadingArticles = false;
        }
      });
  }
}

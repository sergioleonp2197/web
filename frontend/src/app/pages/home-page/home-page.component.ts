import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Article } from '../../core/models/api.models';
import { ArticleService } from '../../core/services/article.service';
import { AuthService } from '../../core/services/auth.service';
import { extractApiErrorMessage } from '../../core/utils/http-error.util';
import { ArticleCardComponent } from '../../shared/components/article-card/article-card.component';

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, FormsModule, ArticleCardComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  articles: Article[] = [];
  tags: string[] = [];
  articlesCount = 0;
  selectedTag: string | null = null;
  page = 1;
  readonly limit = 8;
  loading = true;
  error = '';

  search = '';
  sort: 'latest' | 'oldest' | 'popular' = 'latest';
  statusFilter: 'published' | 'all' = 'published';

  constructor(
    private readonly articleService: ArticleService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadTags();
    this.loadArticles();
  }

  get pages(): number[] {
    const totalPages = Math.max(1, Math.ceil(this.articlesCount / this.limit));
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  get canFavorite(): boolean {
    return this.authService.hasToken();
  }

  get currentUsername(): string | null {
    return this.authService.currentUser?.username ?? null;
  }

  get canUseAllStatusFilter(): boolean {
    return this.authService.hasToken();
  }

  selectTag(tag: string | null): void {
    this.selectedTag = tag;
    this.page = 1;
    this.loadArticles();
  }

  selectPage(page: number): void {
    this.page = page;
    this.loadArticles();
  }

  applyFilters(): void {
    this.page = 1;
    this.loadArticles();
  }

  clearFilters(): void {
    this.search = '';
    this.sort = 'latest';
    this.statusFilter = 'published';
    this.selectedTag = null;
    this.page = 1;
    this.loadArticles();
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
          this.articlesCount = Math.max(0, this.articlesCount - 1);
        },
        error: (errorResponse) => {
          this.error = extractApiErrorMessage(errorResponse, 'No se pudo eliminar el articulo.');
        }
      });
  }

  private loadTags(): void {
    this.articleService
      .getTags()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.tags = response.tags;
        }
      });
  }

  private loadArticles(): void {
    this.loading = true;
    this.error = '';

    this.articleService
      .getArticles({
        tag: this.selectedTag ?? undefined,
        search: this.search || undefined,
        sort: this.sort,
        status: this.statusFilter === 'all' && this.canUseAllStatusFilter ? 'all' : 'published',
        limit: this.limit,
        offset: (this.page - 1) * this.limit
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.articles = response.articles;
          this.articlesCount = response.articlesCount;
          this.loading = false;
        },
        error: (errorResponse) => {
          this.error = extractApiErrorMessage(errorResponse, 'No se pudo cargar el feed.');
          this.loading = false;
        }
      });
  }
}

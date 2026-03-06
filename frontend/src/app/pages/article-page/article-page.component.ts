import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Article, Comment } from '../../core/models/api.models';
import { ArticleService } from '../../core/services/article.service';
import { AuthService } from '../../core/services/auth.service';
import { extractApiErrorMessage } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-article-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './article-page.component.html',
  styleUrl: './article-page.component.scss'
})
export class ArticlePageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly articleService = inject(ArticleService);
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  readonly quickEmojis = [
    '\u{1F600}',
    '\u{1F602}',
    '\u{1F60D}',
    '\u{1F525}',
    '\u{1F44F}',
    '\u{1F64F}',
    '\u{1F60E}',
    '\u{1F973}',
    '\u{2764}\u{FE0F}',
    '\u{2728}'
  ];

  article: Article | null = null;
  comments: Comment[] = [];
  loading = true;
  postingComment = false;
  uploadingCommentImage = false;
  uploadingEditImage = false;
  deletingArticle = false;
  readonly commentLikePendingIds = new Set<string>();
  error = '';
  articleActionError = '';
  commentUploadError = '';
  editUploadError = '';

  commentImageUrl: string | null = null;
  editingCommentId: string | null = null;
  editingCommentImageUrl: string | null = null;

  readonly commentForm = this.formBuilder.nonNullable.group({
    body: ['', [Validators.maxLength(2000)]]
  });

  readonly editCommentForm = this.formBuilder.nonNullable.group({
    body: ['', [Validators.maxLength(2000)]]
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.router.navigateByUrl('/');
        return;
      }

      this.fetchArticle(slug);
      this.fetchComments(slug);
    });
  }

  get currentUsername(): string | null {
    return this.authService.currentUser?.username ?? null;
  }

  get commentsEnabled(): boolean {
    return Boolean(this.article?.allowComments);
  }

  get canComment(): boolean {
    return this.authService.hasToken() && this.commentsEnabled;
  }

  get canEditArticle(): boolean {
    return Boolean(this.article && this.currentUsername && this.article.author.username === this.currentUsername);
  }

  get canLikeComments(): boolean {
    return this.authService.hasToken();
  }

  isCommentOwner(comment: Comment): boolean {
    if (!this.currentUsername) return false;
    return comment.author.username === this.currentUsername;
  }

  canEditComment(comment: Comment): boolean {
    return this.isCommentOwner(comment) || this.canEditArticle;
  }

  isEditingComment(commentId: string): boolean {
    return this.editingCommentId === commentId;
  }

  appendEmojiToNewComment(emoji: string): void {
    const current = this.commentForm.controls.body.value;
    this.commentForm.controls.body.setValue(`${current}${emoji}`);
  }

  appendEmojiToEditComment(emoji: string): void {
    const current = this.editCommentForm.controls.body.value;
    this.editCommentForm.controls.body.setValue(`${current}${emoji}`);
  }

  toggleFavorite(): void {
    if (!this.article) return;
    if (!this.authService.hasToken()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const request$ = this.article.favorited
      ? this.articleService.unfavoriteArticle(this.article.slug)
      : this.articleService.favoriteArticle(this.article.slug);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.article = response.article;
      }
    });
  }

  submitComment(): void {
    if (!this.article) return;
    if (!this.commentsEnabled) return;
    if (!this.authService.hasToken()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const body = this.commentForm.getRawValue().body.trim();
    if (!body && !this.commentImageUrl) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.postingComment = true;
    this.articleActionError = '';

    this.articleService
      .addComment(this.article.slug, {
        body,
        imageUrl: this.commentImageUrl
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.comments = [response.comment, ...this.comments];
          this.commentForm.reset({ body: '' });
          this.commentImageUrl = null;
          this.commentUploadError = '';
          this.postingComment = false;
        },
        error: (errorResponse) => {
          this.articleActionError = extractApiErrorMessage(
            errorResponse,
            'No se pudo publicar el comentario.'
          );
          this.postingComment = false;
        }
      });
  }

  startEditComment(comment: Comment): void {
    if (!this.canEditComment(comment)) {
      return;
    }

    this.editingCommentId = comment.id;
    this.editingCommentImageUrl = comment.imageUrl;
    this.editCommentForm.reset({
      body: comment.body
    });
    this.editUploadError = '';
  }

  cancelEditComment(): void {
    this.editingCommentId = null;
    this.editingCommentImageUrl = null;
    this.editCommentForm.reset({ body: '' });
    this.editUploadError = '';
  }

  saveEditedComment(comment: Comment): void {
    if (!this.article || !this.canEditComment(comment)) return;

    const body = this.editCommentForm.getRawValue().body.trim();
    if (!body && !this.editingCommentImageUrl) {
      this.editCommentForm.markAllAsTouched();
      return;
    }

    this.articleService
      .updateComment(this.article.slug, comment.id, {
        body,
        imageUrl: this.editingCommentImageUrl
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.comments = this.comments.map((item) =>
            item.id === comment.id ? response.comment : item
          );
          this.cancelEditComment();
        }
      });
  }

  deleteComment(commentId: string): void {
    if (!this.article) return;

    this.articleService
      .deleteComment(this.article.slug, commentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.comments = this.comments.filter((comment) => comment.id !== commentId);
          if (this.editingCommentId === commentId) {
            this.cancelEditComment();
          }
        }
      });
  }

  toggleCommentLike(comment: Comment): void {
    if (!this.article) return;
    if (!this.authService.hasToken()) {
      this.router.navigateByUrl('/login');
      return;
    }
    if (this.commentLikePendingIds.has(comment.id)) {
      return;
    }

    this.commentLikePendingIds.add(comment.id);
    const request$ = comment.liked
      ? this.articleService.unfavoriteComment(this.article.slug, comment.id)
      : this.articleService.favoriteComment(this.article.slug, comment.id);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.comments = this.comments.map((item) =>
          item.id === comment.id ? response.comment : item
        );
        this.commentLikePendingIds.delete(comment.id);
      },
      error: (errorResponse) => {
        this.articleActionError = extractApiErrorMessage(
          errorResponse,
          'No se pudo actualizar el me gusta del comentario.'
        );
        this.commentLikePendingIds.delete(comment.id);
      }
    });
  }

  isCommentLikePending(commentId: string): boolean {
    return this.commentLikePendingIds.has(commentId);
  }

  deleteArticle(): void {
    if (!this.article) return;
    if (!confirm('Vas a eliminar este articulo. Esta accion no se puede deshacer.')) {
      return;
    }

    this.deletingArticle = true;
    this.articleActionError = '';

    this.articleService
      .deleteArticle(this.article.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigateByUrl('/');
        },
        error: (errorResponse) => {
          this.deletingArticle = false;
          this.articleActionError = extractApiErrorMessage(
            errorResponse,
            'No se pudo eliminar el articulo.'
          );
        }
      });
  }

  onCommentImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingCommentImage = true;
    this.commentUploadError = '';

    this.articleService
      .uploadImage(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.commentImageUrl = response.url;
          this.uploadingCommentImage = false;
          input.value = '';
        },
        error: () => {
          this.commentUploadError = 'No se pudo subir la imagen del comentario.';
          this.uploadingCommentImage = false;
          input.value = '';
        }
      });
  }

  onEditCommentImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingEditImage = true;
    this.editUploadError = '';

    this.articleService
      .uploadImage(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.editingCommentImageUrl = response.url;
          this.uploadingEditImage = false;
          input.value = '';
        },
        error: () => {
          this.editUploadError = 'No se pudo subir la imagen del comentario.';
          this.uploadingEditImage = false;
          input.value = '';
        }
      });
  }

  removeNewCommentImage(): void {
    this.commentImageUrl = null;
  }

  removeEditCommentImage(): void {
    this.editingCommentImageUrl = null;
  }

  private fetchArticle(slug: string): void {
    this.loading = true;
    this.error = '';

    this.articleService
      .getArticle(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.article = response.article;
          this.articleActionError = '';
          this.loading = false;
        },
        error: () => {
          this.error = 'No se pudo cargar este articulo.';
          this.loading = false;
        }
      });
  }

  private fetchComments(slug: string): void {
    this.articleService
      .getComments(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.comments = response.comments;
        },
        error: (errorResponse) => {
          this.articleActionError = extractApiErrorMessage(
            errorResponse,
            'No se pudieron cargar los comentarios.'
          );
        }
      });
  }
}

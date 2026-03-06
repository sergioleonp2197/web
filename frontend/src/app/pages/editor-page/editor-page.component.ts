import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ArticleStatus, ArticleContentFormat } from '../../core/models/api.models';
import { ArticlePayload, ArticleService } from '../../core/services/article.service';
import { extractApiErrorMessage } from '../../core/utils/http-error.util';

type BodySnippet = {
  label: string;
  value: string;
};

@Component({
  selector: 'app-editor-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './editor-page.component.html',
  styleUrl: './editor-page.component.scss'
})
export class EditorPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly articleService = inject(ArticleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly quickEmojis = [
    '\u{1F4A1}',
    '\u{1F680}',
    '\u{1F525}',
    '\u{1F44D}',
    '\u{1F64C}',
    '\u{2705}',
    '\u{1F9E0}',
    '\u{2728}'
  ];

  readonly bodySnippets: BodySnippet[] = [
    { label: 'Titulo', value: '# Titulo\n' },
    { label: 'Subtitulo', value: '## Subtitulo\n' },
    { label: 'Lista', value: '- Punto 1\n- Punto 2\n' },
    { label: 'Code', value: '```ts\nconsole.log("hola");\n```\n' },
    { label: 'Quote', value: '> Idea o frase clave\n' }
  ];

  slug: string | null = null;
  loading = false;
  submitting = false;
  deleting = false;
  uploadingImage = false;
  error = '';
  uploadError = '';

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(3)]],
    body: ['', [Validators.required, Validators.minLength(1)]],
    coverImage: [''],
    imageList: [''],
    tags: [''],
    status: ['published' as ArticleStatus],
    allowComments: [true],
    contentFormat: ['plain' as ArticleContentFormat],
    readingTimeMinutes: [0, [Validators.min(0), Validators.max(120)]]
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('slug');
      this.slug = slug;

      if (!slug) {
        this.resetFormForNewArticle();
        return;
      }

      this.loading = true;
      this.articleService
        .getArticle(slug)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            const article = response.article;
            this.form.reset({
              title: article.title,
              description: article.description,
              body: article.body,
              coverImage: article.coverImage ?? '',
              imageList: article.imageList.join('\n'),
              tags: article.tagList.join(', '),
              status: article.status,
              allowComments: article.allowComments,
              contentFormat: article.contentFormat,
              readingTimeMinutes: article.readingTimeMinutes
            });
            this.loading = false;
          },
          error: () => {
            this.error = 'No se pudo cargar el articulo.';
            this.loading = false;
          }
        });
    });
  }

  get imagePreviews(): string[] {
    return this.parseList(this.form.controls.imageList.value);
  }

  get estimatedReadingTimeMinutes(): number {
    const body = this.form.controls.body.value;
    const words = body.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 220));
  }

  submitWithStatus(status: ArticleStatus): void {
    this.form.controls.status.setValue(status);
    this.submit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const imageList = this.parseList(raw.imageList);
    const coverImage = raw.coverImage.trim() || imageList[0] || null;
    const readingTimeMinutes = Number(raw.readingTimeMinutes);

    const payload: ArticlePayload = {
      title: raw.title.trim(),
      description: raw.description.trim(),
      body: raw.body.trim(),
      coverImage,
      imageList,
      tagList: raw.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      allowComments: raw.allowComments,
      contentFormat: raw.contentFormat,
      status: raw.status,
      readingTimeMinutes: Number.isFinite(readingTimeMinutes) && readingTimeMinutes > 0 ? readingTimeMinutes : undefined
    };

    this.submitting = true;
    this.error = '';

    const request$ = this.slug
      ? this.articleService.updateArticle(this.slug, payload)
      : this.articleService.createArticle(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.submitting = false;
        this.router.navigate(['/article', response.article.slug]);
      },
      error: (errorResponse) => {
        this.submitting = false;
        this.error = extractApiErrorMessage(errorResponse, 'No se pudo guardar el articulo.');
      }
    });
  }

  deleteArticle(): void {
    if (!this.slug) return;
    if (!confirm('Vas a eliminar este articulo. Esta accion no se puede deshacer.')) {
      return;
    }

    this.deleting = true;
    this.error = '';

    this.articleService
      .deleteArticle(this.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigateByUrl('/');
        },
        error: (errorResponse) => {
          this.deleting = false;
          this.error = extractApiErrorMessage(errorResponse, 'No se pudo eliminar el articulo.');
        }
      });
  }

  useAsCover(url: string): void {
    this.form.controls.coverImage.setValue(url);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.uploadingImage = true;
    this.uploadError = '';

    this.articleService
      .uploadImage(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const urls = this.parseList(this.form.controls.imageList.value);
          urls.push(response.url);
          const normalized = [...new Set(urls)];
          this.form.controls.imageList.setValue(normalized.join('\n'));

          if (!this.form.controls.coverImage.value.trim()) {
            this.form.controls.coverImage.setValue(response.url);
          }

          this.uploadingImage = false;
          input.value = '';
        },
        error: (errorResponse) => {
          this.uploadError = extractApiErrorMessage(errorResponse, 'No se pudo subir la imagen.');
          this.uploadingImage = false;
          input.value = '';
        }
      });
  }

  insertSnippet(snippet: string): void {
    const current = this.form.controls.body.value;
    const spacer = current && !current.endsWith('\n') ? '\n' : '';
    this.form.controls.body.setValue(`${current}${spacer}${snippet}`);
  }

  appendBodyEmoji(emoji: string): void {
    const current = this.form.controls.body.value;
    this.form.controls.body.setValue(`${current}${emoji}`);
  }

  private resetFormForNewArticle(): void {
    this.form.reset({
      title: '',
      description: '',
      body: '',
      coverImage: '',
      imageList: '',
      tags: '',
      status: 'published',
      allowComments: true,
      contentFormat: 'plain',
      readingTimeMinutes: 0
    });
  }

  private parseList(value: string): string[] {
    return [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))];
  }
}

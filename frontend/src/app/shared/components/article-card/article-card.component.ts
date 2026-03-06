import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Article } from '../../../core/models/api.models';

@Component({
  selector: 'app-article-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './article-card.component.html',
  styleUrl: './article-card.component.scss'
})
export class ArticleCardComponent {
  @Input({ required: true }) article!: Article;
  @Input() canFavorite = false;
  @Input() currentUsername: string | null = null;
  @Output() favoriteToggle = new EventEmitter<Article>();
  @Output() deleteRequested = new EventEmitter<Article>();

  get isOwner(): boolean {
    return Boolean(this.currentUsername && this.currentUsername === this.article.author.username);
  }

  requestDelete(): void {
    this.deleteRequested.emit(this.article);
  }
}

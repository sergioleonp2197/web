export interface User {
  id: string;
  email: string;
  username: string;
  bio: string | null;
  image: string | null;
  token: string;
}

export interface AuthResponse {
  user: User;
}

export interface Profile {
  username: string;
  bio: string | null;
  image: string | null;
  following: boolean;
}

export interface ProfileResponse {
  profile: Profile;
}

export type ArticleStatus = 'published' | 'draft';
export type ArticleContentFormat = 'plain' | 'markdown';

export interface Article {
  id: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  coverImage: string | null;
  imageList: string[];
  tagList: string[];
  allowComments: boolean;
  contentFormat: ArticleContentFormat;
  status: ArticleStatus;
  readingTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
  favorited: boolean;
  favoritesCount: number;
  author: Profile;
}

export interface ArticleResponse {
  article: Article;
}

export interface ArticlesResponse {
  articles: Article[];
  articlesCount: number;
}

export interface Comment {
  id: string;
  body: string;
  imageUrl: string | null;
  liked: boolean;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
  author: Profile;
}

export interface CommentResponse {
  comment: Comment;
}

export interface CommentsResponse {
  comments: Comment[];
}

export interface TagsResponse {
  tags: string[];
}

export interface UploadImageResponse {
  url: string;
  fileName: string;
}

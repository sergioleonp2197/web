import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ArticlePageComponent } from './pages/article-page/article-page.component';
import { EditorPageComponent } from './pages/editor-page/editor-page.component';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { ProfilePageComponent } from './pages/profile-page/profile-page.component';
import { RegisterPageComponent } from './pages/register-page/register-page.component';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent, title: 'Medium Angular Clone' },
  { path: 'login', component: LoginPageComponent, title: 'Login' },
  { path: 'register', component: RegisterPageComponent, title: 'Register' },
  { path: 'article/:slug', component: ArticlePageComponent, title: 'Article' },
  { path: 'profile/:username', component: ProfilePageComponent, title: 'Profile' },
  { path: 'editor', component: EditorPageComponent, canActivate: [authGuard], title: 'Editor' },
  { path: 'editor/:slug', component: EditorPageComponent, canActivate: [authGuard], title: 'Edit Article' },
  { path: 'settings', component: SettingsPageComponent, canActivate: [authGuard], title: 'Settings' },
  { path: '**', redirectTo: '' }
];

import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { HomePage } from './pages/home/home';
import { LoginPage } from './pages/login/login';
import { MeetupHome } from './pages/meetup-home/meetup-home';
import { SignupPage } from './pages/signup/signup';

export const routes: Routes = [
    { path: '', component: HomePage },
    { path: 'login', component: LoginPage },
    { path: 'signup', component: SignupPage },
    { path: 'meet', component: MeetupHome, canActivate: [authGuard] },
    { path: '**', redirectTo: '' },
];

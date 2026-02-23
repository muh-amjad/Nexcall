import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Action } from '@ngrx/store';

import { routes } from './app.routes';
import { SignalrService } from './services/signalr.service';
import { UsersEffects } from './store/effects/users';
import { UsersReducer } from './store/reducers/users.reducer';
import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';
import { UserState } from './store/state/users';
import * as userActions from './store/actions/users.actions';
import { AppState } from './app-state/app-state';
import { LoggingService } from './services/logging.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideStore(),
    provideState('userState', UsersReducer),
    provideEffects([UsersEffects]),
    SignalrService,
    LoggingService
  ]
};

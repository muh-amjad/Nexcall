import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs/operators';

import * as userActions from '../actions/users.actions';
import { LoggingService } from '../../services/logging.service';

@Injectable()
export class UsersEffects {
  private actions$ = inject(Actions);
  private loggingService = inject(LoggingService);

  // 🔹 ADD USER EFFECT (Logging Only)
  addUser$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(userActions.ADD_USER),
        tap((action: userActions.AddUserAction) => {
          this.loggingService.info(
            '[UsersEffects] ADD_USER triggered'
          );

          this.loggingService.debug(
            '[UsersEffects] User Data:',
            action.user
          );
        })
      ),
    { dispatch: false } // important 🔥
  );

  // 🔹 REMOVE USER EFFECT (Logging Only)
  removeUser$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(userActions.REMOVE_USER),
        tap((action: userActions.RemoveUserAction) => {
          this.loggingService.info(
            '[UsersEffects] REMOVE_USER triggered'
          );

          this.loggingService.debug(
            '[UsersEffects] Removed User:',
            action.user
          );
        })
      ),
    { dispatch: false }
  );
}

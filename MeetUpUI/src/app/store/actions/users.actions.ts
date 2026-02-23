import { Action } from '@ngrx/store';
import { UserDto } from '../../dtos/user.dto';

export const UPDATE_USERS_LIST = '[User] Update Users List';
export const ADD_USER = '[User] ADD_USER';
export const REMOVE_USER = '[User] REMOVE_USER';

export class UpdateUsersListAction implements Action {
  readonly type = UPDATE_USERS_LIST;
  constructor(public users: UserDto[]) {}
}

export class AddUserAction implements Action {
  readonly type = ADD_USER;
  constructor(public user: UserDto) {}
}

export class RemoveUserAction implements Action {
  readonly type = REMOVE_USER;
  constructor(public user: UserDto) {}
}

export type UserActions = UpdateUsersListAction | AddUserAction | RemoveUserAction;

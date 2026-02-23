import { UserState, initialUserState } from '../state/users';
import * as userActions from '../actions/users.actions';

export function UsersReducer(
  state: UserState = initialUserState,
  action: userActions.UserActions,
): UserState {
  switch (action.type) {
    case userActions.UPDATE_USERS_LIST: {
      return {
        ...state,
        allUsers: action.users,
      };
    }
    case userActions.ADD_USER: {
      return {
        ...state,
        allUsers: [...state.allUsers, action.user],
      };
    }

    case userActions.REMOVE_USER: {
      return {
        ...state,
        allUsers: state.allUsers.filter((u) => u.id !== action.user.id),
      };
    }

    default:
      return state;
  }
}

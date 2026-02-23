import { UserDto } from '../../dtos/user.dto';

export class UserState {
  allUsers: UserDto[] = [];
}

export const initialUserState: UserState = new UserState();

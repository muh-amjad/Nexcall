import { Store } from "@ngrx/store";
import { AppState } from "../../app-state/app-state";
import { Injectable } from "@angular/core";
import { UserDto } from "../../dtos/user.dto";
import { UpdateUsersListAction } from "../actions/users.actions";

@Injectable({
  providedIn: 'root'
})
export class UsersFacade {
  constructor(private store: Store<AppState>) {}

  public updateUsersList(users: UserDto[]): void{
    this.store.dispatch(new UpdateUsersListAction(users));
  }

}
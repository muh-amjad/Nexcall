import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UserState } from '../state/users';

// 1. Create a feature selector for the 'user' slice
export const getUserState = createFeatureSelector<UserState>('user');

// 2. Create a specific selector
export const getAllUsers = createSelector(getUserState, (state: UserState) => state.allUsers);

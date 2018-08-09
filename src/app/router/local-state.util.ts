import { ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

type StateReducer<State, Actions> = (
  state: State | undefined,
  action: Actions | { type: '@@init' },
) => State;

export interface LocalStore<State, Actions> extends Observable<State> {
  getState(): State;
  dispatch(action: Actions): void;
  complete(): void;
}

export function localState<State, Actions>(
  reducer: StateReducer<State, Actions>,
  changeDetectorRef?: ChangeDetectorRef,
): LocalStore<State, Actions> {
  if (changeDetectorRef) {
    changeDetectorRef.detach();
  }

  const initialState = reducer(undefined, { type: '@@init' });
  const source$ = new BehaviorSubject(initialState);

  const getState = () => source$.value;
  const complete = () => source$.complete();
  const dispatch = (action: Actions) => {
    const nextState = reducer(getState(), action);
    source$.next(nextState);

    if (changeDetectorRef) {
      changeDetectorRef.detectChanges();
    }
  };

  return Object.assign(source$.asObservable(), { getState, dispatch, complete });
}

import {
  Component,
  Input,
  Output,
  SkipSelf,
  Optional,
  Host,
  ChangeDetectorRef,
} from '@angular/core';
import { Subscription, Observable } from 'rxjs';
import { filter, distinctUntilKeyChanged, map } from 'rxjs/operators';
import * as qs from 'query-string';
import { Invariant } from './invariant.service';
import { Params, matchPattern, makeParams } from './math-pattern';
import { Router } from './router.service';
import { RouterSwitchComponent } from './router-switch.component';
import { localState } from './local-state.util';

export interface RouterOutletState {
  selectedBySwitch: boolean;
  doesMatch: boolean;
  mustBeExact: boolean;
  isActive: boolean;
  path: string;
  browserPath: string;
  routeParams: null | Params;
  queryParams: null | Params;
  parent: RouterOutletState | null;
}

const getOutletStateKey = <T extends keyof RouterOutletState>(key: T) => key;

type RouterOutletEvents =
  | { type: 'PATH_ATTR_CHANGE'; path: string }
  | { type: 'PARENT_STATE_CHANGE'; state: RouterOutletState }
  | { type: 'BROWSER_LOCATION_CHANGE'; path: string }
  | { type: 'SWITCH_DETECTED' }
  | { type: 'SWITCH_SELECT_OUTLET'; isSelected: boolean }
  | { type: 'EXACT_ATTR_CHANGE'; isExact: boolean };

const initialState: RouterOutletState = {
  selectedBySwitch: true,
  doesMatch: false,
  mustBeExact: false,
  isActive: false,
  path: '/(.*)',
  browserPath: '',
  routeParams: null,
  queryParams: null,
  parent: null,
};

@Component({
  selector: 'router-outlet',
  template: `
    <ng-content></ng-content>
  `,
})
export class RouterOutletComponent {
  constructor(
    private invariant: Invariant,
    private router: Router,
    private cdRef: ChangeDetectorRef,
    @SkipSelf()
    @Optional()
    private parent: RouterOutletComponent,
    @Host()
    @Optional()
    private parentSwitch: RouterSwitchComponent,
  ) {}

  private _subscriptions = new Subscription();
  private _state$ = localState<RouterOutletState, RouterOutletEvents>(
    (state = initialState, event) => {
      switch (event.type) {
        case 'PATH_ATTR_CHANGE': {
          return checkIfOutletIsMatched({
            ...state,
            path: event.path,
          });
        }

        case 'BROWSER_LOCATION_CHANGE': {
          return checkIfOutletIsMatched({
            ...state,
            browserPath: event.path,
          });
        }

        case 'PARENT_STATE_CHANGE': {
          return checkIfOutletIsMatched({
            ...state,
            parent: event.state,
          });
        }

        case 'SWITCH_DETECTED': {
          return checkIfOutletIsMatched({
            ...state,
            selectedBySwitch: false,
          });
        }

        case 'SWITCH_SELECT_OUTLET': {
          return checkIfOutletIsMatched({
            ...state,
            selectedBySwitch: event.isSelected,
          });
        }

        case 'EXACT_ATTR_CHANGE': {
          return checkIfOutletIsMatched({
            ...state,
            mustBeExact: event.isExact,
          });
        }

        default: {
          return state;
        }
      }
    },
    this.cdRef,
  );

  @Input()
  set path(path: string) {
    this.invariant.assert(path[0] !== '/', 'Paths must start with a "/"', path);

    this._state$.dispatch({ type: 'PATH_ATTR_CHANGE', path });
  }

  @Input()
  set exact(attributeValue: string | null | boolean) {
    this._state$.dispatch({
      type: 'EXACT_ATTR_CHANGE',
      isExact: attributeValue === null || attributeValue === '' || Boolean(attributeValue),
    });
  }

  @Output()
  activate = this._state$.pipe(
    distinctUntilKeyChanged(getOutletStateKey('isActive')),
    filter(state => state.doesMatch),
  );

  @Output()
  deactivate = this._state$.pipe(
    distinctUntilKeyChanged(getOutletStateKey('isActive')),
    filter(state => !state.doesMatch),
  );

  @Output()
  paramsUpdate = this._state$.pipe(
    distinctUntilKeyChanged(getOutletStateKey('routeParams')),
    filter(state => state.doesMatch),
    map(state => state.routeParams),
  );

  @Output()
  queryParamsUpdate = this._state$.pipe(
    distinctUntilKeyChanged(getOutletStateKey('queryParams')),
    filter(state => state.doesMatch),
    map(state => state.queryParams),
  );

  get state() {
    return this._state$.getState();
  }

  get active() {
    return this.state.doesMatch;
  }

  get params() {
    return this.state.routeParams;
  }

  get isSelectedBySwitch() {
    return this.state.selectedBySwitch;
  }

  ngOnInit() {
    if (this.parent) {
      const parentStateSubscription = this.parent.observeState().subscribe(state =>
        this._state$.dispatch({
          type: 'PARENT_STATE_CHANGE',
          state,
        }),
      );

      this._subscriptions.add(parentStateSubscription);
    }

    if (this.parentSwitch) {
      this._state$.dispatch({ type: 'SWITCH_DETECTED' });

      const switchSubscription = this.parentSwitch
        .addOutlet(this)
        .subscribe(isSelected =>
          this._state$.dispatch({ type: 'SWITCH_SELECT_OUTLET', isSelected }),
        );

      this._subscriptions.add(switchSubscription);
    }

    const locationSubscription = this.router.subscribe(() =>
      this._state$.dispatch({
        type: 'BROWSER_LOCATION_CHANGE',
        path: this.router.path(),
      }),
    );

    this._subscriptions.add(locationSubscription);
  }

  ngOnDestroy() {
    this._subscriptions.unsubscribe();
    this._state$.complete();
  }

  observeState(): Observable<RouterOutletState> {
    return this._state$;
  }
}

function getFullPathForState(state: RouterOutletState, path = state.path): string {
  if (state.parent) {
    return getFullPathForState(state.parent, `${state.parent.path}${path}`);
  }

  return path;
}

function checkIfOutletIsMatched(state: RouterOutletState): RouterOutletState {
  const path = getFullPathForState(state);
  const match = matchPattern(path, state.browserPath);

  if (match && !state.mustBeExact) {
    return {
      ...state,
      doesMatch: true,
      isActive: state.selectedBySwitch,
      routeParams: makeParams(match.paramNames, match.paramValues),
      queryParams: qs.parse(qs.extract(state.browserPath)),
    };
  } else if (match && state.mustBeExact && match.remainingPathname.length === 0) {
    return {
      ...state,
      doesMatch: true,
      isActive: state.selectedBySwitch,
      routeParams: makeParams(match.paramNames, match.paramValues),
      queryParams: qs.parse(qs.extract(state.browserPath)),
    };
  }

  return {
    ...state,
    doesMatch: false,
    isActive: false,
    routeParams: null,
    queryParams: null,
  };
}

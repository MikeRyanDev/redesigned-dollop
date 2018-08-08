import {
  Component,
  Input,
  Output,
  SkipSelf,
  Optional,
  Host,
  ChangeDetectorRef,
} from '@angular/core';
import { BehaviorSubject, Subscription, Observable } from 'rxjs';
import { filter, distinctUntilKeyChanged, map, tap } from 'rxjs/operators';
import * as qs from 'query-string';
import { Invariant } from './invariant.service';
import { Params, matchPattern, makeParams } from './math-pattern';
import { Router } from './router.service';
import { RouterSwitchComponent } from './router-switch.component';

export interface RouterOutletState {
  selectedBySwitch: boolean;
  doesMatch: boolean;
  mustBeExact: boolean;
  isActive: boolean;
  path: null | string;
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
  path: null,
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
  private _subscriptions = new Subscription();
  private _state$ = new BehaviorSubject<RouterOutletState>(initialState);

  @Input()
  set path(path: string) {
    this.invariant.assert(typeof path !== 'string', 'A valid path must be provided', path);
    this.invariant.assert(path[0] !== '/', 'Paths must start with a "/"', path);

    this.handleEvent({ type: 'PATH_ATTR_CHANGE', path });
  }

  @Input()
  set exact(attributeValue: string | null | boolean) {
    this.handleEvent({
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
    return this._state$.value;
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
  ) {
    cdRef.detach();
  }

  ngOnInit() {
    this.invariant.assert(this._state$.value.path === null, 'A valid path must be provided');

    if (this.parent) {
      const parentStateSubscription = this.parent.observeState().subscribe(state =>
        this.handleEvent({
          type: 'PARENT_STATE_CHANGE',
          state,
        }),
      );

      this._subscriptions.add(parentStateSubscription);
    }

    if (this.parentSwitch) {
      this.handleEvent({ type: 'SWITCH_DETECTED' });
      const switchSubscription = this.parentSwitch
        .addOutlet(this)
        .subscribe(isSelected => this.handleEvent({ type: 'SWITCH_SELECT_OUTLET', isSelected }));

      this._subscriptions.add(switchSubscription);
    }

    const locationSubscription = this.router.subscribe(() =>
      this.handleEvent({
        type: 'BROWSER_LOCATION_CHANGE',
        path: this.router.path(),
      }),
    );

    this._subscriptions.add(locationSubscription);
  }

  ngOnDestroy() {
    this._subscriptions.unsubscribe();
  }

  observeState(): Observable<RouterOutletState> {
    return this._state$.asObservable();
  }

  reduceState(state: RouterOutletState, event: RouterOutletEvents): RouterOutletState {
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
  }

  handleEvent(event: RouterOutletEvents) {
    const nextState = this.reduceState(this._state$.value, event);
    this._state$.next(nextState);
    this.cdRef.detectChanges();
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

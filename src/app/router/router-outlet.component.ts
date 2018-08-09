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
import { Invariant } from './invariant.service';
import { Router } from './router.service';
import { RouterSwitchComponent } from './router-switch.component';
import { localState } from './local-state.util';
import { routerOutletReducer, RouterOutletState } from './router-outlet.state';

const getOutletStateKey = <T extends keyof RouterOutletState>(key: T) => key;

@Component({
  selector: 'router-outlet',
  template: `
    <ng-content></ng-content>
  `,
  providers: [
    /**
     * Child outlets should not participate in parent switches
     */
    {
      provide: RouterSwitchComponent,
      useValue: null,
    },
  ],
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
    @SkipSelf()
    @Optional()
    private parentSwitch: RouterSwitchComponent,
  ) {}

  private _subscriptions = new Subscription();
  private _state$ = localState(routerOutletReducer, this.cdRef);

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

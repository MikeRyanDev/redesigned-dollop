import {
  Directive,
  EmbeddedViewRef,
  TemplateRef,
  ViewContainerRef,
  OnInit,
  OnDestroy,
  Host,
} from '@angular/core';
import { RouterOutletComponent, RouterOutletState } from './router-outlet.component';
import { Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface RouterDirective<T> {
  viewContainer: ViewContainerRef;
  templateRef: TemplateRef<T>;
  viewRef: null | EmbeddedViewRef<T>;
}

@Directive({
  selector: '[routerMatch]',
})
export class RouterMatchDirective implements OnInit, OnDestroy, RouterDirective<RouterOutletState> {
  public viewRef: EmbeddedViewRef<RouterOutletState> | null = null;
  private stateSubscription: Subscription | null = null;

  constructor(
    public viewContainer: ViewContainerRef,
    public templateRef: TemplateRef<RouterOutletState>,
    private routerOutlet: RouterOutletComponent,
  ) {}

  ngOnInit() {
    this.stateSubscription = this.routerOutlet
      .observeState()
      .subscribe(state => this.updateView(state));
  }

  ngOnDestroy() {
    if (this.stateSubscription) {
      this.stateSubscription.unsubscribe();
    }
  }

  updateView(state: RouterOutletState) {
    this.viewRef = updateRouterView(state.isActive, state, this);
  }
}

@Directive({
  selector: '[routerMiss]',
})
export class RouterMissDirective implements OnInit, OnDestroy, RouterDirective<RouterOutletState> {
  public viewRef: EmbeddedViewRef<RouterOutletState> | null = null;
  private stateSubscription: Subscription | null = null;

  constructor(
    public viewContainer: ViewContainerRef,
    public templateRef: TemplateRef<RouterOutletState>,
    private routerOutlet: RouterOutletComponent,
  ) {}

  ngOnInit() {
    this.stateSubscription = this.routerOutlet
      .observeState()
      .subscribe(state => this.updateView(state));
  }

  ngOnDestroy() {
    if (this.stateSubscription) {
      this.stateSubscription.unsubscribe();
    }
  }

  updateView(state: RouterOutletState) {
    this.viewRef = updateRouterView(!state.doesMatch, state, this);
  }
}

function updateRouterView<T>(
  shouldRenderView: boolean,
  context: T,
  directive: RouterDirective<T>,
): null | EmbeddedViewRef<T> {
  if (shouldRenderView && !directive.viewRef) {
    return directive.viewContainer.createEmbeddedView(directive.templateRef, context);
  } else if (!shouldRenderView && directive.viewRef) {
    directive.viewContainer.clear();

    return null;
  }

  return directive.viewRef;
}

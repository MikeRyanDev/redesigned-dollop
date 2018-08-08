import { Component } from '@angular/core';
import { Observable, Observer, BehaviorSubject, Subscription, Subject, from } from 'rxjs';
import { RouterOutletComponent } from './router-outlet.component';
import { mergeAll, map, switchMap, share, filter } from 'rxjs/operators';

@Component({
  selector: 'router-switch',
  template: `
    <ng-content></ng-content>
  `,
})
export class RouterSwitchComponent {
  private outlets$ = new BehaviorSubject<RouterOutletComponent[]>([]);
  private selectedOutlet = this.outlets$.pipe(
    switchMap(outlets =>
      from(outlets).pipe(
        map(outlet => outlet.observeState()),
        mergeAll(),
      ),
    ),
    map(() => this.outlets$.value.find(outlet => outlet.state.doesMatch)),
    share(),
  );

  addOutlet(instance: RouterOutletComponent) {
    return new Observable((observer: Observer<boolean>) => {
      this.outlets$.next([...this.outlets$.value, instance]);

      const innerSubscription = this.selectedOutlet
        .pipe(
          map(activeOutlet => activeOutlet === instance),
          filter(isSelected => isSelected !== instance.isSelectedBySwitch),
        )
        .subscribe(isSelected => observer.next(isSelected));

      return () => {
        this.outlets$.next(this.outlets$.value.filter(outlet => outlet !== instance));
        innerSubscription.unsubscribe();
      };
    });
  }
}

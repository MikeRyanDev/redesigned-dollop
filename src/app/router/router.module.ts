import { NgModule, ModuleWithProviders, Inject, Optional, InjectionToken } from '@angular/core';
import {
  LocationStrategy,
  PlatformLocation,
  APP_BASE_HREF,
  HashLocationStrategy,
  PathLocationStrategy,
  Location,
} from '@angular/common';
import { RouterOutletComponent } from './router-outlet.component';
import { RouterMatchDirective, RouterMissDirective } from './router-outlet-match.directive';
import { RouterLinkDirective } from './router-link.directive';
import { RouterSwitchComponent } from './router-switch.component';

export interface RouterModuleConfig {
  useHash?: boolean;
}

export const ROUTER_CONFIG = new InjectionToken<RouterModuleConfig>('Router Module Config');

@NgModule({
  declarations: [
    RouterOutletComponent,
    RouterMatchDirective,
    RouterMissDirective,
    RouterLinkDirective,
    RouterSwitchComponent,
  ],
  exports: [
    RouterOutletComponent,
    RouterMatchDirective,
    RouterMissDirective,
    RouterLinkDirective,
    RouterSwitchComponent,
  ],
})
export class RouterModule {
  static forRoot(config: RouterModuleConfig = { useHash: false }): ModuleWithProviders {
    return {
      ngModule: RouterModule,
      providers: [
        Location,
        {
          provide: ROUTER_CONFIG,
          useValue: config,
        },
        {
          provide: LocationStrategy,
          useFactory: provideLocationStrategy,
          deps: [PlatformLocation, [new Inject(APP_BASE_HREF), new Optional()], ROUTER_CONFIG],
        },
      ],
    };
  }
}

export function provideLocationStrategy(
  platformLocationStrategy: PlatformLocation,
  baseHref: string,
  config: RouterModuleConfig,
) {
  return config.useHash
    ? new HashLocationStrategy(platformLocationStrategy, baseHref)
    : new PathLocationStrategy(platformLocationStrategy, baseHref);
}

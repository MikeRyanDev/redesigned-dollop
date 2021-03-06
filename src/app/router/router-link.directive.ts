import { Directive, HostBinding, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { Router } from './router.service';

/**
 * The LinkTo directive links to routes in your app
 *
 * Links are pushed to the `Router` service to trigger a route change.
 * Query params can be represented as an object or a string of names/values
 *
 * <a linkTo="/home/page" [queryParams]="{ id: 123 }">Home Page</a>
 * <a [linkTo]="'/pages' + page.id">Page 1</a>
 */
@Directive({ selector: '[routerLink]' })
export class RouterLinkDirective {
  @Input() target: string;
  @HostBinding('attr.href') linkHref;

  @Input()
  set routerLink(href: string) {
    this._href = href;
    this._updateHref();
  }

  @Input()
  set queryParams(params: string | Object) {
    this._query = params;
    this._updateHref();
  }

  @Output() hrefUpdated: EventEmitter<string> = new EventEmitter<string>();

  private _href: string;
  private _query: string | Object;

  constructor(private router: Router) {}

  /**
   * Handles click events on the associated link
   * Prevents default action for non-combination click events without a target
   */
  @HostListener('click', ['$event'])
  onClick(event) {
    if (!this._comboClick(event) && !this.target) {
      this.router.go(this._href, this._query);

      event.preventDefault();
    }
  }

  private _updateHref() {
    let path = this._cleanUpHref(this._href);

    this.linkHref = this.router.prepareExternalUrl(path, this._query);
    this.hrefUpdated.emit(this.linkHref);
  }

  /**
   * Determines whether the click event happened with a combination of other keys
   */
  private _comboClick(event) {
    let buttonEvent = event.which || event.button;

    return buttonEvent > 1 || event.ctrlKey || event.metaKey || event.shiftKey;
  }

  private _cleanUpHref(href: string = ''): string {
    // Check for trailing slashes in the path
    while (href.length > 1 && href.substr(-1) === '/') {
      // Remove trailing slashes
      href = href.substring(0, href.length - 1);
    }

    return href;
  }
}

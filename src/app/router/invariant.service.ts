import { Injectable, ErrorHandler } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Invariant {
  constructor(private errorHandler: ErrorHandler) {}

  assert(condition: any, message: string, ...args: any[]) {
    if (Boolean(condition)) {
      let argIndex = 0;
      const error = new Error(message.replace(/%s/g, () => args[argIndex++]));
      error.name = 'Invariant Violation';

      this.errorHandler.handleError(error);
    }
  }
}

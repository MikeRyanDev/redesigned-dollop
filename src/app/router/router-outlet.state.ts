import * as qs from 'query-string';
import { Params, matchPattern, makeParams } from './math-pattern';

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

export type RouterOutletActions =
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

export function routerOutletReducer(
  state = initialState,
  action: RouterOutletActions,
): RouterOutletState {
  return checkIfOutletIsMatched(routerOutletInnerReducer(state, action));
}

function routerOutletInnerReducer(
  state: RouterOutletState = initialState,
  action: RouterOutletActions,
): RouterOutletState {
  switch (action.type) {
    case 'PATH_ATTR_CHANGE': {
      return {
        ...state,
        path: action.path,
      };
    }

    case 'BROWSER_LOCATION_CHANGE': {
      return {
        ...state,
        browserPath: action.path,
      };
    }

    case 'PARENT_STATE_CHANGE': {
      return {
        ...state,
        parent: action.state,
      };
    }

    case 'SWITCH_DETECTED': {
      return {
        ...state,
        selectedBySwitch: false,
      };
    }

    case 'SWITCH_SELECT_OUTLET': {
      return {
        ...state,
        selectedBySwitch: action.isSelected,
      };
    }

    case 'EXACT_ATTR_CHANGE': {
      return {
        ...state,
        mustBeExact: action.isExact,
      };
    }

    default: {
      return state;
    }
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

import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div style="text-align:center">
      <h1>
        NgRx Router Demo
      </h1>
    </div>

    <nav>
      <a routerLink="/">Home</a>
      <a routerLink="/about">About</a>
      <a routerLink="/contributors">Contributors</a>
    </nav>
    
    <router-switch>
      <router-outlet path="/" exact>
        <ng-container *routerMatch>
          Home Page
        </ng-container>
      </router-outlet>
  
      <router-outlet path="/about">
        <ng-container *routerMatch>
          About Page
        </ng-container>
      </router-outlet>

      <router-outlet path="/contributors" exact>
        <ng-container *routerMatch>
          <ul>
            <li *ngFor="let contributor of contributors">
              <a [routerLink]="'/contributors/' + contributor.id">
                {{ contributor.name }}
              </a>
            </li>
          </ul>
        </ng-container>
  
        <router-outlet path="/:id" (activate)="getActiveContributor($event)">
          <ng-template routerMatch>
            <div *ngIf="activeContributor; else contributorNotFound">
              <h3>{{ activeContributor.name }}</h3>
              <p>{{activeContributor.description}}</p>
            </div>
      
            <ng-template #contributorNotFound>
              No contributor found
            </ng-template>
          </ng-template>
        </router-outlet>
      </router-outlet>

      <router-outlet>
        <ng-container *routerMatch>
          <h2>404 Not Found</h2>
        </ng-container>
      </router-outlet>
    </router-switch>
    
  `,
  styles: [],
})
export class AppComponent {
  activeContributor: any = null;
  contributors = [
    {
      id: 'mike-ryan',
      name: 'Mike Ryan',
      description: 'Mike is a...',
    },
    {
      id: 'brandon-roberts',
      name: 'Brandon Roberts',
      description: 'Brandon is a...',
    },
  ];

  getActiveContributor({ routeParams }) {
    this.activeContributor = this.contributors.find(
      contributor => contributor.id === routeParams.id,
    );
  }
}

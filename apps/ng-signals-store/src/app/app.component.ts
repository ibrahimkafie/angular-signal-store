import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NxWelcomeComponent } from './nx-welcome.component';
import { injectStores } from '@signals/store';
import AppStore from './store';
import AppStore2 from './store1';

@Component({
  standalone: true,
  imports: [NxWelcomeComponent, RouterModule],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  stores = injectStores({
    s1: AppStore,
    s2: AppStore2
  });
  
  store = injectStores(AppStore);
  title = 'ng-signals-store';


  changeName() {
   this.store.setLastName('change' + new Date());
   this.stores.s2.setLastName('ggggggg' + new Date());
   this.stores.s1.clearCache();
  }

  loadProducts() {
    this.stores.s1.loadProducts();
  }
}

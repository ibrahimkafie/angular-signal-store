import { inject, ProviderToken } from '@angular/core';

// Extend the service type to ensure it has a `state` property of a known type
interface StatefulService {
  state?: Record<string, any>;
}

// Define a type alias for the service combined with its state properties
type ExtendedService<T extends StatefulService> = Omit<T, 'state'> & T['state'];

function injectSingleStore<T extends StatefulService>(
  token: ProviderToken<T>
): ExtendedService<T> {

  const service = inject(token);

  const state = service.state;
  if (state) {
    Object.keys(state).forEach((key) => {
      (service as any)[key] = state[key];
    });
  }
  return service as ExtendedService<T>;
}

export function injectMultipleStores<T extends { [key: string]: new (...args: any[]) => any }>(
  storeClasses: T
): { [K in keyof T]: ExtendedService<InstanceType<T[K]>> } {
  return Object.entries(storeClasses).reduce((acc, [key, storeClass]) => {
    acc[key as keyof T] = injectSingleStore(storeClass);
    return acc;
  }, {} as { [K in keyof T]: ExtendedService<InstanceType<T[K]>> });
}

export function injectStores<T extends new (...args: any[]) => any>(
  storeClasses: T
): ExtendedService<InstanceType<T>>;

export function injectStores<T extends { [key: string]: new (...args: any[]) => any }>(
  storeClasses: T
): { [K in keyof T]: ExtendedService<InstanceType<T[K]>> };

export function injectStores<T extends new (...args: any[]) => any | { [key: string]: new (...args: any[]) => any }>(
  storeClasses: T
): any {
  if (typeof storeClasses === 'function') {
    // Handle single service
    return injectSingleStore(storeClasses);
  } else {
    // Handle object of services
    return injectMultipleStores(storeClasses)
  }
}

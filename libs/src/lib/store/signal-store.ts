import { computed, Signal, signal, WritableSignal } from '@angular/core';
import { produce } from 'immer';
import { debounce } from './utils';

type StateSignals<T> = { [K in keyof T]: Signal<T[K]> };
const STORAGE_PREFIX = 'ng_store';

export abstract class SignalStore<T> {
    private lastRetrievedState: Partial<T> | null = null;

    private _state: StateSignals<T> = {} as StateSignals<T>;
    public get state(): StateSignals<T> {
        return this._state;
    }

    private _storageKey: string | undefined;
    private get storageKeyPrefix(): string | undefined {
        return this._storageKey ? `${STORAGE_PREFIX}_${this._storageKey}` : undefined;
    }

    constructor(initialState: T, storageKey?: string) {
        this._storageKey = storageKey;

        // Load state from local storage if storage key is provided
        if (this.storageKeyPrefix) {
            const persistedState = this.loadFromLocalStorage();
            if (persistedState) {
                initialState = { ...initialState, ...persistedState };
            }
        }

        // Create a signal for each property in the initial state
        for (const key in initialState) {
            this._state[key] = signal(initialState[key]);
        }
    }

    // Method to get the current state as an object
    private getCurrentState(): T {
        // Return cached state
        if (this.lastRetrievedState) {
            return this.lastRetrievedState as T; // Return the cached state
        }

        const currentState: Partial<T> = {};
        
        for (const key in this._state) {
            currentState[key] = this._state[key](); // Access the function using the valid key
        }

        this.lastRetrievedState = currentState; // Cache the current state

        return currentState as T; // Ensure it's cast to the correct type
    }

    // Method to create a computed selector from the current state
    protected get<R>(selector: (state: StateSignals<T>) => R): Signal<R> {
        return computed(() => selector(this._state));
    }

    // Method to update the state
    protected set(updater: (draft: T) => void): void {

        // Create a draft from the current state
        const currentState = this.getCurrentState();
        const nextState = produce(currentState, updater);

        // Check if any state has changed
        if (currentState === nextState) {
            return; // No changes, skip updates
        }

        // Update each signal with the new values (only for changed properties)
        for (const key in nextState) {
            if (nextState[key] !== currentState[key]) {
                if (this.lastRetrievedState) {
                    this.lastRetrievedState[key] = nextState[key];
                }
               
                (this._state[key] as WritableSignal<T[typeof key]>).set(nextState[key]);
            }
        }

        // Persist state to local storage after update
        this.saveToLocalStorageDebounced();
    }

    // To limit how often it save, ensuring it's only called 100ms after the last change
    private saveToLocalStorageDebounced = debounce(() => {
        this.saveToLocalStorage();
    }, 100);

    // Method to load cached state from local storage
    private loadFromLocalStorage(): Partial<T> | null {
        const cachedData = this.storageKeyPrefix ? localStorage.getItem(this.storageKeyPrefix) : null;
        return cachedData ? JSON.parse(cachedData) : null;
    }

    // Method to save state to local storage
    private saveToLocalStorage(): void {
        if (this.storageKeyPrefix) {
            const currentState = this.getCurrentState();
            localStorage.setItem(this.storageKeyPrefix, JSON.stringify(currentState));
        }
    }

    // Method to clear cached state from local storage
    public clearCache(): void {
        if (this.storageKeyPrefix) {
            localStorage.removeItem(this.storageKeyPrefix);
        }
    }
}

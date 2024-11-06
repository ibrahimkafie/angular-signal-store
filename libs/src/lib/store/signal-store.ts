import { computed, Signal, signal, Type, WritableSignal } from '@angular/core';
import { produce } from 'immer';
import { debounce } from './utils';

type StateSignals<T> = { [K in keyof T]: Signal<T[K]> };
const STORAGE_PREFIX = 'ng_store';

abstract class BaseSignalStore<T> {
    private stateSource: { [K in keyof T]: T[K] };

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
        this.stateSource = initialState;

        // Load state from local storage if storage key is provided
        if (this.storageKeyPrefix) {
            const persistedState = this.loadFromLocalStorage();
            if (persistedState) {
                initialState = { ...initialState, ...persistedState };
                this.stateSource = initialState;
            }
        }

        // Create a signal for each property in the initial state
        for (const key in this.stateSource) {
            this._state[key] = signal(this.stateSource[key]);
        }
    }


    // Method to create a computed selector from the current state
    protected get<R>(selector: (state: StateSignals<T>) => R): Signal<R> {
        return computed(() => selector(this._state));
    }

    // Method to update the state
    protected set(updater: (draft: T) => void): void {
        try {
            // Create a draft from the current state
            const currentState = this.stateSource;
            const nextState = produce(currentState, updater);

            // Check if any state has changed
            if (currentState === nextState) {
                return; // No changes, skip updates
            }

            // Update each signal with the new values (only for changed properties)
            let stateChanged = false;
            for (const key in nextState) {
                if (nextState[key] !== currentState[key]) {
                    stateChanged = true;
                    (this._state[key] as WritableSignal<T[typeof key]>).set(nextState[key]);
                }
            }

            // Persist to local storage only if there was a change
            if (stateChanged) {
                // Update the stateSource to the new state
                this.stateSource = nextState;
                this.saveToLocalStorageDebounced();
            }
        } catch (error) {
            if (!produce)
                console.error('Immer is required for this function. Please install it to use this feature.');
            console.log(error);
        }
    }

    protected patch(updater: (state: T) => Partial<T>): void {
        const patch = updater(this.stateSource);
        let stateChanged = false;

        // Apply patch to the state, skipping undefined values
        for (const key in patch) {

            if (!(key in this.stateSource)) {
                throw new Error(`Invalid partial state returned from patch function: The key '[${key}]'
                     does not exist in the store state. Please ensure the key is part of the valid state.`);
            }

            const newValue = patch[key];

            // Only update if the new value is defined and different from the current state
            if (newValue !== this.stateSource[key]) {
                stateChanged = true;
                (this.stateSource as any)[key] = newValue;
                // Update the specific signal with the new value
                (this._state[key] as WritableSignal<T[typeof key] | unknown>).set(this.stateSource[key]);
            }
        }

        // Persist to local storage only if there was a change
        if (stateChanged) {
            this.saveToLocalStorageDebounced();
        }
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
            const currentState = this.stateSource;
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

export function SignalStore<T>(initialState: T, cacheKey?: string): Type<BaseSignalStore<T>> {
    return class Store extends BaseSignalStore<T> {
        constructor() {
            super(initialState, cacheKey);
        }
    };
}

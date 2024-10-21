import { Injectable } from "@angular/core";
import { SignalStore } from "@signals/store";
import { HttpClient } from "@angular/common/http";

interface User {
    firstName: string;
    lastName: string;
    products?: string[];
}

interface AppState {
    user: User;
    loading: boolean;
    error?: string;
    // You can add more state properties relevant to your app
}

const initialState: AppState = {
    user: { firstName: 'store-1', lastName: 'last-1' },
    loading: false,
};

@Injectable({
    providedIn: 'root',
})
class AppStore extends SignalStore<AppState> {

    constructor(private http: HttpClient) {
        super(initialState, 'app-store');
    }

    // Selectors
    public selectUserFullName = this.get((state) => {
        return `${state.user().firstName} ${state.user().lastName}`;
    });

    // Actions
    setLastName(lastName: string): void {
        this.set((state) => {
            state.user.lastName = lastName;
        });
    }

    setLoading(loading: boolean): void {
        this.set((state) => {
            state.loading = loading;
        });
    }

    // Async action
    loadProducts(): void {

        this.setLoading(true);

        this.http.get<string[]>('https://run.mocky.io/v3/089ca55d-0334-4cef-aabf-43ae30ed747a').subscribe((products) => {
            this.set((state) => {
                state.user.products = products;
                state.loading = false;
            });
        });
    }
}

export default AppStore;
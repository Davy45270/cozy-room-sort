import type { Level } from '@cozy-room-sort/schemas';
import type { Settings, Store } from './storage/db.ts';

export type Route = { screen: 'home' } | { screen: 'levels'; room?: string } | { screen: 'settings'; back: Route } | { screen: 'play'; level: Level; notice?: string };

export interface AppContext {
    store: Store;
    settings: Settings;
    go(route: Route): void;
    updateSettings(next: Partial<Settings>): Promise<void>;
}

export interface Screen { element: HTMLElement; dispose?: () => void; mounted?: () => void }

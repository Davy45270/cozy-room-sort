import type { Level } from '@cozy-room-sort/schemas';
import type { Settings, Store } from './storage/db.ts';
import type { Tone } from './theme/tokens.ts';

export type Route = { screen: 'home' } | { screen: 'levels' } | { screen: 'settings'; back: Route } | { screen: 'play'; level: Level };

export interface AppContext {
    store: Store;
    settings: Settings;
    tone: () => Tone;
    go(route: Route): void;
    updateSettings(next: Partial<Settings>): Promise<void>;
    /** Prévenu quand le mode clair ou sombre change. */
    onTone(listener: () => void): () => void;
}

export interface Screen { element: HTMLElement; dispose?: () => void; mounted?: () => void }

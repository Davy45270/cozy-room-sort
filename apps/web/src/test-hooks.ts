// Crochets de test (?test=1 seulement) : les tests de bout en bout touchent les objets là où la scène les dessine.
import type { GameState } from '@cozy-room-sort/engine';
import type { Controller } from './game/controller.ts';
import type { RoomScene } from './scene/room-scene.ts';

export interface CozyTestHooks {
    objectCenter(id: string): { x: number; y: number } | null;
    state(): GameState;
    solution(): readonly string[];
}
declare global { interface Window { __cozy?: CozyTestHooks } }

export const testMode = (): boolean => new URLSearchParams(location.search).has('test');

export function installTestHooks(current: () => { controller: Controller; scene: RoomScene | undefined }): () => void {
    if (!testMode()) return () => undefined;
    window.__cozy = {
        objectCenter: id => current().scene?.objectCenter(id) ?? null,
        state: () => current().controller.state,
        solution: () => current().controller.level.meta?.solution ?? []
    };
    return () => { delete window.__cozy; };
}

// Les démonstrations et les crochets d'entrée sont réservés à la requête de test.
import type { GameState } from '@cozy-room-sort/engine';
import type { Controller } from './game/controller.ts';
import type { RoomScene } from './scene/room-scene.ts';

export interface CozyTestHooks {
    objectCenter(id: string): { x: number; y: number } | null;
    state(): GameState;
    solution(): readonly string[];
    tapObject(id: string): void;
}
declare global { interface Window { __cozy?: CozyTestHooks } }

export const testMode = (): boolean => new URLSearchParams(location.search).get('test') === '1';

export function demonstration(): 'gagner' | 'bloquer' | undefined {
    if (!testMode()) return undefined;
    const demo = new URLSearchParams(location.search).get('demo');
    if (demo === 'gagner' || demo === 'bloquer') return demo;
}

export const BLOCKED_LEVEL = '004-salon';
export const BLOCKED_MOVES = ['objet-1', 'objet-2', 'objet-3', 'objet-4', 'objet-6'] as const;

export function installTestHooks(controller: Controller, scene: RoomScene): () => void {
    if (!testMode()) return () => undefined;
    const hooks: CozyTestHooks = {
        objectCenter: id => scene.objectCenter(id),
        state: () => controller.state,
        solution: () => controller.level.meta?.solution ?? [],
        tapObject: id => scene.tap(id)
    };
    window.__cozy = hooks;
    return () => { if (window.__cozy === hooks) delete window.__cozy; };
}

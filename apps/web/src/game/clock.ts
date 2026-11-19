// Horloge de partie : pour un niveau chronométré, envoie au contrôleur le temps écoulé à intervalle régulier.
// Les minuteries et l'heure sont injectées, pour tester sans attendre.
import type { Controller } from './controller.ts';

export interface ClockTimers {
    now: () => number;
    setInterval: (callback: () => void, ms: number) => number;
    clearInterval: (handle: number) => void;
}

export const CLOCK_PERIOD_MS = 1000;

/** Démarre l'horloge si le niveau a une limite de temps ; rend la fonction d'arrêt. Aucune minuterie sans limite. */
export function startClock(controller: Controller, timers: ClockTimers, periodMs = CLOCK_PERIOD_MS): () => void {
    if (controller.level.rules.timeLimitSeconds === null) return () => undefined;
    let last = timers.now();
    let handle: number | undefined;
    const stop = (): void => {
        if (handle === undefined) return;
        timers.clearInterval(handle);
        handle = undefined;
    };
    const ended = (): boolean => controller.state.status === 'won' || controller.state.status === 'lost';
    handle = timers.setInterval(() => {
        if (ended()) { stop(); return; }
        const now = timers.now();
        controller.tick(now - last);
        last = now;
        if (ended()) stop();
    }, periodMs);
    return stop;
}

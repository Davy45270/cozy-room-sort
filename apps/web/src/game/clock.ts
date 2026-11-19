// Horloge de partie : pour un niveau chronométré, envoie au contrôleur le temps écoulé à intervalle régulier.
// Les minuteries et l'heure sont injectées, pour tester sans attendre.
import type { Controller } from './controller.ts';

export interface ClockTimers {
    now: () => number;
    setInterval: (callback: () => void, ms: number) => number;
    clearInterval: (handle: number) => void;
}

export const CLOCK_PERIOD_MS = 1000;

/**
 * Démarre l'horloge si le niveau a une limite de temps ; rend la fonction d'arrêt. Aucune minuterie sans limite.
 * La minuterie se suspend à la fin de la partie et reprend quand la partie rejoue (« Recommencer »).
 * Le temps transmis est celui réellement écoulé, même quand un rappel arrive en retard.
 */
export function startClock(controller: Controller, timers: ClockTimers, periodMs = CLOCK_PERIOD_MS): () => void {
    if (controller.level.rules.timeLimitSeconds === null) return () => undefined;
    let last = timers.now();
    let handle: number | undefined;
    let stopped = false;
    const ended = (): boolean => controller.state.status === 'won' || controller.state.status === 'lost';
    /** Temps écoulé depuis le dernier relevé ; le relevé suivant part de maintenant. */
    const elapsed = (): number => {
        const now = timers.now();
        const ms = now - last;
        last = now;
        return ms;
    };
    const pause = (): void => {
        if (handle === undefined) return;
        timers.clearInterval(handle);
        handle = undefined;
    };
    const run = (): void => {
        if (stopped || handle !== undefined || ended()) return;
        last = timers.now();
        handle = timers.setInterval(() => {
            if (ended()) { pause(); return; }
            controller.tick(elapsed());
            if (ended()) pause();
        }, periodMs);
    };
    const unsubscribe = controller.subscribe(() => { if (ended()) pause(); else run(); });
    controller.bindClock(elapsed);
    run();
    return () => {
        stopped = true;
        pause();
        unsubscribe();
        controller.bindClock(undefined);
    };
}

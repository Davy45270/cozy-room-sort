import type { GameState } from './state.ts';

export type RejectReason = 'not-accessible' | 'buffer-full' | 'not-playing' | 'undo-unavailable';

export type GameEvent =
    | { type: 'OBJECT_BUFFERED'; objectId: string }
    | { type: 'OBJECT_PACKED'; objectId: string; boxId: string; fromBuffer: boolean }
    | { type: 'BOX_COMPLETED'; boxId: string }
    | { type: 'BOX_ACTIVATED'; boxId: string; slot: number }
    | { type: 'LEVEL_WON'; moveCount: number; bufferedCount: number; stars: 1 | 2 | 3 }
    | { type: 'ACTION_REJECTED'; reason: RejectReason };

export interface GameTransition { state: GameState; events: readonly GameEvent[] }

export type GameAction =
    | { type: 'SELECT_OBJECT'; objectId: string }
    | { type: 'UNDO' }
    | { type: 'RESTART' }
    | { type: 'HINT_USED' }
    | { type: 'TICK'; ms: number };

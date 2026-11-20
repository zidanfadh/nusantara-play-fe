/**
 * Seeded random numbers for the egrang engine and AI (Phase 23): the same mulberry32 generator as gasing
 * and congklak (re-exported, one implementation). Never Math.random or Date in the engine.
 */
export { createRng, gaussian, mulberry32Step, type Rng } from '../gasing/random';

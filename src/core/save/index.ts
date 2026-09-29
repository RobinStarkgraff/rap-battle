/** The versioned, zod-validated league save (D-031). */

export { canonicalLeague, parseLeague, SAVE_FORMAT, SAVE_VERSION, serializeLeague } from './save';
export type { LoadError } from './save';
export { crewIdentitySchema, leagueSchema } from './schema';

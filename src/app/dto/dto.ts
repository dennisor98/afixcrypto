/* eslint-disable prettier/prettier */

// Base DTO. Deliberately empty: user identity must never come from the
// request body. Controllers pass req.user (set by AuthGuard) explicitly.
export class DefaultDto {}
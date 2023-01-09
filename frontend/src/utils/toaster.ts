import { Position, Toaster } from '@blueprintjs/core';

/**
 * App-wide (VotePaxos) Toaster.
 */
export const VPToaster = Toaster.create({
    className: 'vp-toaster',
    position: Position.TOP_RIGHT,
});

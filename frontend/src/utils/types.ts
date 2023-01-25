export interface Policy {
    description: string;
    coordinates: number[];
}

export interface VoterData {
    voters: Voter[];
}

export interface Voter {
    id: string;
    is_simulated: boolean;
    simulation: { coordinates: number[]; tolerance: number };
}

export interface ConcludedPolicy {
    timestamp: string;
    status: string;
    description: string;
    coordinates: string;
    additionalData?: any;
}

export function toReadableStatus(status: string) {
    if (status === 'decision') return 'Passed';
    if (status === 'timeout') return 'Rejected';
    return `System (${status})`;
}

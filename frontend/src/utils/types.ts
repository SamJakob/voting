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
    id: string;
    title: string;
    description: string;
    status: boolean;
}

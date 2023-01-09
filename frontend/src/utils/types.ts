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

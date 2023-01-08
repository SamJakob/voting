export interface Policy {
    title: string,
    coordinates: number[],
    rank: number
}

export interface VoterData {
    voters: {voter: Voter}[]
}

export interface Voter {
    id: string,
    is_simulated: boolean,
    simulation: {coordinates: number[], tolerance: number}
}
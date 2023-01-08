import axios from "axios";
import {VoterData} from "./types";

export async function startSession(candidates: number) {
    await axios.post(`/api/spawn/${candidates}`);
}

export async function refreshDash() {
    return await axios.get('/api/refresh');
}

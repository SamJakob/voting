import { ConcludedPolicy, Policy, toReadableStatus } from './types';
import { Channel } from 'phoenix';

export async function propose(voterChannel: Channel, policy: Policy) {
    return await rpcCall(voterChannel, 'propose', policy);
}

export async function connectToNetwork(voterChannel: Channel) {
    return await rpcCall(voterChannel, 'join_network', null);
}

export async function leaveNetwork(voterChannel: Channel) {
    return await rpcCall(voterChannel, 'leave_network', null);
}

export async function getHistory(voterChannel: Channel) {
    const history = await rpcCall(voterChannel, 'get_history', null);
    if (Array.isArray(history)) {
        return history.map((entry) => {
            const timestamp = entry.timestamp;
            const rawStatus = entry.outcome[0];

            const status = toReadableStatus(rawStatus);

            const coordinatesRaw = entry.policy[1];
            const coordinates = `[ ${coordinatesRaw[0]}, ${coordinatesRaw[1]} ]`;
            const description = entry.policy[2];
            const additionalData = entry.policy[3];

            return {
                timestamp,
                status,
                description,
                coordinates,
                additionalData,
            };
        });
    } else {
        return null;
    }
}

///////////////////////////////////////////////////////////////////////////////

async function rpcCall(voterChannel: Channel, command: string, payload: any, timeout?: number) {
    return await new Promise((resolve, reject) => {
        let rpcCall = voterChannel.push(command, payload, timeout);

        rpcCall.receive('ok', (response: any) => {
            return resolve(response);
        });

        const errorHandler = (data: any) => {
            return reject({ response: { data } });
        };
        rpcCall.receive('error', errorHandler);
        rpcCall.receive('timeout', errorHandler);
    });
}

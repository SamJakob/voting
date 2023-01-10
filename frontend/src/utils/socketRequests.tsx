import { Policy } from './types';
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

import React, { useContext, useEffect, useState } from 'react';
import { SocketContext } from './SocketContext';
import { Channel } from 'phoenix';

const useChannel = (channelName: string) => {
    const [channel, setChannel] = useState<Channel>();
    const { socket } = useContext(SocketContext);

    // Connect to the channel on component mount.
    useEffect(() => {
        const phoenixChannel: Channel | undefined = socket?.channel(channelName);

        if (!phoenixChannel) console.warn('Could not connect to channel - missing socket?');
        phoenixChannel?.join().receive('ok', () => {
            setChannel(phoenixChannel);
            console.log('Realtime channel connected');
        });

        return () => {
            console.log('Leaving');
            phoenixChannel?.leave();
        };
    }, [channelName]);

    return [channel];
};

export { useChannel };

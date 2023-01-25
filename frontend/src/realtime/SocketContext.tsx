import React, { createContext, useEffect, useState } from 'react';
import { Channel, Socket } from 'phoenix';
import { Spinner } from '@blueprintjs/core';

const SocketContext = createContext<{
    socket?: Socket;
    socketId?: string;
    voterChannel?: Channel;
    connectedToNetwork?: boolean;
    setConnectedToNetwork?: React.Dispatch<React.SetStateAction<boolean>>;
}>({
    socket: undefined,
    socketId: undefined,
    voterChannel: undefined,
    connectedToNetwork: false,
    setConnectedToNetwork: undefined,
});

const SocketProvider = ({ id, children }: { id: string; children: any }) => {
    const [socket, setSocket] = useState<Socket>();
    const [socketId, setSocketId] = useState<string>();
    const [voterChannel, setVoterChannel] = useState<Channel>();
    const [connectedToNetwork, setConnectedToNetwork] = useState(false);

    useEffect(() => {
        const socket: Socket = new Socket('/api/realtime', { params: { id } });

        socket.onOpen(() => {
            console.log('Realtime connected.');
            setSocket(socket);
            setSocketId(id);

            const _voterChannel = socket.channel(`voter:${id}`);
            _voterChannel.join().receive('ok', () => {
                console.log('Realtime ready.');
                setVoterChannel(_voterChannel);
            });
        });

        socket.connect();
    }, []);

    if (!socket || !voterChannel)
        return (
            <div className={'bp4-dark'}>
                <div className={'center-con'}>
                    <div className={'vp-navbar-spacer'} />
                    <ul>
                        <Spinner />
                        <p style={{ marginTop: '20px' }}>Connecting, please wait...</p>
                    </ul>
                </div>
            </div>
        );
    return (
        <SocketContext.Provider value={{ socket, socketId, voterChannel, connectedToNetwork, setConnectedToNetwork }}>
            {children}
        </SocketContext.Provider>
    );
};

export { SocketContext, SocketProvider };

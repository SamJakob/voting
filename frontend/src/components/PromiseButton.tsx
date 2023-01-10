import { useEffect, useRef, useState } from 'react';
import { Button } from '@blueprintjs/core';

export function PromiseButton(props: any) {
    const { onClick, children, ...proxyProps } = props;

    const [loading, setLoading] = useState<boolean>(false);

    const mounted = useRef(false);

    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;
        };
    }, []);

    async function handleClick(event: any) {
        // Do nothing if onClick is not specified.
        if (!onClick) return;

        // Otherwise, set loading to true whilst onClick is performed.
        setLoading(true);
        await onClick(event);
        if (mounted) setLoading(false);
    }

    return (
        <Button {...proxyProps} loading={loading} onClick={handleClick}>
            {children}
        </Button>
    );
}

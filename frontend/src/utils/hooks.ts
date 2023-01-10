import React from 'react';

export function useInterval(callback: Function, delay: number) {
    const savedCallback = React.useRef<Function>();

    React.useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    React.useEffect(() => {
        function tick() {
            if (savedCallback.current) savedCallback.current();
        }

        if (delay != null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}

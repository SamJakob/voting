import { Callout } from '@blueprintjs/core';

export default function ProcessWarning({ processCount }: { processCount: number }) {
    if (processCount < 3) {
        return (
            <Callout title="Insufficient Processes" intent="danger" style={{ marginBottom: '20px' }}>
                The network does not have the number of processes required to operate correctly.
                <br />
                Some or all functionality may be disabled and data loss may have occurred: <br />
                <ul>
                    <li>At least 5 processes are recommended for the network to function as intended.</li>
                    <li>At least 3 processes are required for the network to function.</li>
                    <li>There's {processCount} process(es) on the network.</li>
                </ul>
            </Callout>
        );
    } else if (processCount < 5) {
        return (
            <Callout title="Low Process Count" intent="warning" style={{ marginBottom: '20px' }}>
                The network has a very low process count that may degrade performance or cause the network to perform
                erratically or incorrectly: <br />
                <ul>
                    <li>At least 5 processes are recommended for the network to function as intended.</li>
                    <li>There's {processCount} process(es) on the network.</li>
                </ul>
            </Callout>
        );
    } else {
        return <></>;
    }
}

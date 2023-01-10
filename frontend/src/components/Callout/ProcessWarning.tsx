import { Callout } from '@blueprintjs/core';

export default function ProcessWarning({ simulatedVoterCount }: { simulatedVoterCount: number }) {
    if (simulatedVoterCount < 3) {
        return (
            <Callout title="Insufficient Membership" intent="danger" style={{ marginBottom: '20px' }}>
                The network does not have the number of simulated voters required to operate correctly.
                <br />
                Some or all functionality may be disabled and data loss may have occurred: <br />
                <ul>
                    <li>At least 5 simulated voters are recommended for the network to function as intended.</li>
                    <li>At least 3 simulated voters are required for the network to function.</li>
                    <li>There's {simulatedVoterCount} simulated voter(s) on the network.</li>
                </ul>
            </Callout>
        );
    } else if (simulatedVoterCount < 5) {
        return (
            <Callout title="Low Membership Count" intent="warning" style={{ marginBottom: '20px' }}>
                The network has a very low process count that may degrade performance or cause the network to perform
                erratically or incorrectly: <br />
                <ul>
                    <li>At least 5 processes are recommended for the network to function as intended.</li>
                    <li>There's {simulatedVoterCount} simulated voter(s) on the network.</li>
                </ul>
            </Callout>
        );
    } else {
        return <></>;
    }
}

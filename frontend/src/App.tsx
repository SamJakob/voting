import 'normalize.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/popover2/lib/css/blueprint-popover2.css';

import logo from './assets/logo.svg';
import logoCropped from './assets/logo_cropped.svg';

import { useContext, useEffect } from 'react';
import React from 'react';
import { Alignment, Classes, HTMLTable, Icon, MenuItem, Navbar } from '@blueprintjs/core';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import NetworkSetupWizard from './components/Dialog/NetworkSetupWizard';
import { ItemPredicate, ItemRenderer, Select2 } from '@blueprintjs/select';
import { useState } from 'react';
import { Spinner, H1, H2, Button, Callout, H5 } from '@blueprintjs/core';

import { Policy, Voter } from './utils/types';
import { defaultPolicies, getDescriptionForCoordinates } from './data/policies';
import { PromiseButton } from './components/PromiseButton';
import { performThenNotify, spawnVoters, killAllVoters, killVoter, executePreflight } from './utils/networkRequests';
import ProcessWarning from './components/Callout/ProcessWarning';
import { SocketContext, SocketProvider } from './realtime/SocketContext';
import { Channel } from 'phoenix';
import { connectToNetwork, leaveNetwork, propose } from './utils/socketRequests';
import { fetchVoterData, selectSimulatedVoterCount, selectVoterCount, selectVoterData } from './store/voterData';
import { useDispatch, useSelector } from 'react-redux';

function App() {
    /**
     * During development we can still access the base path at `/`
     * And this hook will make sure that we land on the base `/app`
     * path which will mount our App as usual.
     *
     * In production, Phoenix makes sure that the `/app` route is
     * always mounted within the first request.
     *
     * If we really wanted, we could actually serve this from the
     * main endpoint, but doing this prevents the React app from
     * interfering with development resources.
     * */
    useEffect(() => {
        if (window.location.pathname === '/') {
            window.location.replace('/app');
        }
    }, []);

    // const [voterData, setVoterData] = useState<VoterData | undefined>();
    const [id, setId] = useState();
    const dispatch = useDispatch();

    // Perform a 'preflight' request with useEffect. Providing an empty list
    // of dependencies ensures this only runs when the component is first
    // mounted.
    const [preflightCompleted, setPreflightCompleted] = useState(false);
    useEffect(() => {
        (async () => {
            setId(await executePreflight());
            await refreshDash()();
            setPreflightCompleted(true);
        })();
    }, []);

    // Refresh the loaded dashboard's data.
    function refreshDash(butFirst?: Function) {
        return async () => {
            let returnValue;
            if (butFirst) returnValue = await butFirst();
            await fetchVoterData(dispatch);
            return returnValue;
        };
    }

    if (!preflightCompleted) {
        return (
            <div className={'bp4-dark'}>
                <div className={'center-con'}>
                    <div className={'vp-navbar-spacer'} />
                    <ul>
                        <Spinner />
                        <p style={{ marginTop: '20px' }}>Initializing, please wait...</p>
                    </ul>
                </div>
            </div>
        );
    }

    return (
        <SocketProvider id={id!}>
            <BrowserRouter basename="app">
                <Navbar fixedToTop className={'bp4-navbar'}>
                    <Navbar.Group align={Alignment.LEFT} className={'bp4-navbar-group'}>
                        <Navbar.Heading>
                            <img src={logoCropped} role={'presentation'} alt={'VotePaxos'} style={{ height: '30px' }} />
                        </Navbar.Heading>
                    </Navbar.Group>
                    <Navbar.Group className={'vp-navigation-buttons-wrapper'}>
                        <Navbar.Divider />
                        <NavigationButtons />
                    </Navbar.Group>
                </Navbar>
                <Routes>
                    <Route path="/" element={<HomePage refreshDash={refreshDash} />} />
                    <Route path="statistics" element={<StatisticsPage />} />
                </Routes>
            </BrowserRouter>
        </SocketProvider>
    );
}

function NavigationButtons() {
    const navigate = useNavigate();

    return (
        <>
            <Button onClick={() => navigate('/')} className={Classes.MINIMAL} icon="home" text="Home" />
            <Button
                onClick={() => navigate('/statistics')}
                className={Classes.MINIMAL}
                icon="dashboard"
                text="Statistics"
            />
        </>
    );
}

function StatisticsPage() {
    return (
        <div>
            <div className={'vp-navbar-spacer'} />
            <ul>
                <Spinner />
            </ul>
        </div>
    );
}

function HomePage({ refreshDash }: { refreshDash: Function }) {
    const [forceIsOpen, setForceIsOpen] = useState(false);
    const [connectedToNetwork, setConnectedToNetwork] = useState(false);

    const { voterChannel } = useContext(SocketContext);

    // useInterval(() => {
    //     refreshDash()();
    // }, 1000);

    const filterPolicy: ItemPredicate<Policy> = (query, policy, _index, exactMatch) => {
        const normalizedTitle = policy.description.toLowerCase();
        const normalizedQuery = query.toLowerCase();

        if (exactMatch) {
            return normalizedTitle === normalizedQuery;
        } else {
            return `${normalizedTitle}`.indexOf(normalizedQuery) >= 0;
        }
    };

    const renderPolicy: (selectedPolicy?: Policy) => ItemRenderer<Policy> =
        (selectedPolicy) =>
        (policy, { handleClick, handleFocus, modifiers }) => {
            if (!modifiers.matchesPredicate) {
                return null;
            }
            return (
                <MenuItem
                    active={selectedPolicy == policy ? modifiers.active : false}
                    disabled={modifiers.disabled}
                    key={policy.description}
                    label={policy.coordinates.toString()}
                    onClick={handleClick}
                    onFocus={handleFocus}
                    roleStructure="listoption"
                    text={`${policy.description}`}
                />
            );
        };

    const PolicySelect: React.FC<{ voterChannel?: Channel }> = ({ voterChannel }) => {
        const [selectedPolicy, setSelectedPolicy] = React.useState<Policy | undefined>();

        return (
            <>
                <div style={{ margin: 20, width: '100%' }}>
                    <Select2<Policy>
                        fill={true}
                        items={defaultPolicies}
                        itemPredicate={filterPolicy}
                        itemRenderer={renderPolicy(selectedPolicy)}
                        noResults={<MenuItem disabled={true} text="No results!" roleStructure="listoption" />}
                        onItemSelect={setSelectedPolicy}>
                        <Button
                            fill={true}
                            text={selectedPolicy ? selectedPolicy.description : '(No selection)'}
                            rightIcon="caret-down"
                            placeholder="Select a policy..."
                        />
                    </Select2>
                </div>
                <PromiseButton
                    disabled={!selectedPolicy}
                    intent={'primary'}
                    onClick={performThenNotify(
                        refreshDash(async () => {
                            let result = propose(voterChannel!, selectedPolicy!);
                            setSelectedPolicy(undefined);
                            return result;
                        }),
                        'Successfully proposed your selected policy!',
                        'There was a problem proposing your selected policy.'
                    )}>
                    Propose
                </PromiseButton>
                <div style={{ margin: 10 }}></div>
            </>
        );
    };

    function VotersListItem({ voter, currentId }: { voter: Voter; currentId: string }) {
        if (!voter.simulation) {
            return (
                <tr>
                    <td style={{ textAlign: 'left' }}>{voter.id}</td>
                    <td style={{ textAlign: 'center' }}>
                        <Icon icon={voter.id == currentId ? 'mugshot' : 'user'} />{' '}
                        {voter.id == currentId ? 'Human (You)' : 'Human'}
                    </td>
                    <td style={{ textAlign: 'center' }}>&mdash;</td>
                    <td style={{ textAlign: 'center' }}>&mdash;</td>
                    <td style={{ textAlign: 'center' }}>&mdash;</td>
                    <td style={{ textAlign: 'center' }}>&mdash;</td>
                </tr>
            );
        }

        return (
            <tr>
                <td style={{ textAlign: 'left' }}>{voter.id}</td>
                <td style={{ textAlign: 'center' }}>
                    <Icon icon={'cog'} /> Simulated
                </td>
                <td style={{ textAlign: 'center' }}>
                    {voter.simulation.coordinates[0]}, {voter.simulation.coordinates[1]}
                </td>
                <td style={{ textAlign: 'left' }}>{getDescriptionForCoordinates(voter.simulation.coordinates)}</td>
                <td style={{ textAlign: 'center' }}>{voter.simulation.tolerance}</td>
                <td style={{ textAlign: 'right' }}>
                    <PromiseButton
                        icon="cross"
                        intent={'danger'}
                        onClick={performThenNotify(
                            refreshDash(async () => await killVoter(voter.id)),
                            'Terminated voter.'
                        )}>
                        Kill
                    </PromiseButton>
                </td>
            </tr>
        );
    }

    function HomePagePartialReady() {
        const { socketId: id } = useContext(SocketContext);
        const simulatedVoterCount = useSelector(selectSimulatedVoterCount);
        const voters = useSelector(selectVoterData);

        useEffect(() => {
            (async () => {
                if (!connectedToNetwork && simulatedVoterCount > 0) {
                    console.log(await connectToNetwork(voterChannel));
                    setConnectedToNetwork(true);
                    await refreshDash()();
                }
            })();
        }, [connectToNetwork, simulatedVoterCount]);

        return (
            <>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        flexDirection: 'row',
                    }}>
                    <Callout style={{ width: 300 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                flexDirection: 'column',
                                justifyContent: 'center',
                            }}>
                            <H5 style={{ margin: 15 }}>Propose a policy to the session</H5>
                            <PolicySelect voterChannel={voterChannel} />
                        </div>
                    </Callout>
                    <div style={{ margin: 50 }}></div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexDirection: 'column',
                        }}>
                        <ProcessWarning simulatedVoterCount={simulatedVoterCount} />

                        <div className={'vp-table-scrollable-wrapper'}>
                            <HTMLTable striped condensed bordered interactive className={'vp-table-scrollable'}>
                                <thead>
                                    <tr>
                                        <th>Process (Voter) ID</th>
                                        <th>Type</th>
                                        <th>Coordinates</th>
                                        <th>Description</th>
                                        <th>Tolerance</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...voters]
                                        .sort((b, a) => {
                                            if (!a.is_simulated && !b.is_simulated) {
                                                if (a.id == id) return 1;
                                                else if (b.id == id) return -1;
                                            }

                                            if (!a.is_simulated && b.is_simulated) return 1;
                                            else if (a.is_simulated && !b.is_simulated) return -1;
                                        })
                                        .map(function (voter: Voter) {
                                            return <VotersListItem key={voter.id} voter={voter} currentId={id} />;
                                        })}
                                </tbody>
                            </HTMLTable>
                        </div>

                        <div style={{ margin: 20 }}></div>
                        <Callout>
                            <div
                                style={{
                                    display: 'flex',
                                    alignContent: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 30,
                                    marginTop: '5px',
                                }}>
                                <div
                                    className={
                                        'blob ' +
                                        (simulatedVoterCount >= 3
                                            ? simulatedVoterCount >= 5
                                                ? 'success'
                                                : 'warning'
                                            : 'danger')
                                    }
                                />
                                <H5 style={{ marginTop: 2 }}>
                                    You are connected to{' '}
                                    {simulatedVoterCount >= 3
                                        ? simulatedVoterCount >= 5
                                            ? 'an active'
                                            : 'a potentially degraded'
                                        : 'an inactive'}{' '}
                                    session with {simulatedVoterCount} simulated voter(s).
                                </H5>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignContent: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    marginTop: '20px',
                                    marginBottom: '5px',
                                }}>
                                <PromiseButton icon="refresh" onClick={refreshDash()}>
                                    Refresh
                                </PromiseButton>
                                <PromiseButton
                                    outlined
                                    icon="add"
                                    intent={'success'}
                                    onClick={performThenNotify(
                                        refreshDash(async () => await spawnVoters(1)),
                                        'Successfully spawned a new voter.'
                                    )}>
                                    Spawn Simulated Voter
                                </PromiseButton>
                                <Button icon="add" intent={'success'} onClick={() => setForceIsOpen(true)}>
                                    Spawn Multiple Simulated Voters
                                </Button>
                                <PromiseButton
                                    icon="graph-remove"
                                    intent={'danger'}
                                    onClick={async () => {
                                        await performThenNotify(async () => {
                                            return await refreshDash(async () => {
                                                await leaveNetwork(voterChannel);
                                                return await killAllVoters();
                                            })();
                                        }, 'All processes have been successfully terminated.')();

                                        setConnectedToNetwork(false);
                                    }}>
                                    Destroy Network
                                </PromiseButton>
                            </div>
                        </Callout>
                    </div>
                </div>
            </>
        );
    }

    const voterCount = useSelector(selectVoterCount);

    return (
        <div className={'bp4-dark'}>
            <div className={'center-con'} style={{ display: 'flex', alignItems: 'center' }}>
                <div className={'home-section'}>
                    {voterCount > 0 ? (
                        <HomePagePartialReady />
                    ) : (
                        <>
                            <img src={logo} alt="VotePaxos" role="presentation" />
                            <H1>Welcome to VotePaxos</H1>
                            <p>A live distributed voting system implemented in Elixir using Abortable Paxos.</p>
                            <H2 style={{ marginTop: 20, marginBottom: 30 }}>
                                Please press &lsquo;Begin Setup&rsquo; to set up your network!
                            </H2>
                            <Button
                                style={{
                                    width: '130px',
                                    height: '20px',
                                    marginBottom: '50px',
                                }}
                                onClick={() => setForceIsOpen(true)}
                                rightIcon="circle-arrow-right">
                                Begin Setup
                            </Button>
                        </>
                    )}
                </div>
            </div>
            {forceIsOpen && (
                <NetworkSetupWizard
                    dialogIsOpen={forceIsOpen}
                    setDialogIsOpen={setForceIsOpen}
                    refreshDash={refreshDash}
                    setNetworkInitialized={setConnectedToNetwork}
                    isFirstTime={!connectedToNetwork}
                    voterChannel={voterChannel}
                />
            )}
        </div>
    );
}

export default App;

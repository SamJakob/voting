import 'normalize.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/popover2/lib/css/blueprint-popover2.css';

import logo from './assets/logo.svg';
import logoCropped from './assets/logo_cropped.svg';

import { useEffect } from 'react';
import React from 'react';
import { Alignment, Classes, HTMLTable, Icon, MenuItem, Navbar } from '@blueprintjs/core';
import { BrowserRouter, Link, Routes, Route, useNavigate } from 'react-router-dom';
import NetworkSetupWizard from './components/Dialog/NetworkSetupWizard';
import { ItemPredicate, ItemRenderer, Select2 } from '@blueprintjs/select';
import { useState } from 'react';
import { Spinner, H1, H2, Button, Callout, H5 } from '@blueprintjs/core';

const style = { display: 'flex', gap: '8px', padding: '8px' };
import { Policy, VoterData, Voter } from './utils/types';
import { v4 as uuid } from 'uuid';
import { defaultPolicies, getDescriptionForCoordinates } from './data/policies';
import { PromiseButton } from './components/PromiseButton';
import {
    performThenNotify,
    refreshData,
    spawnVoters,
    killAllVoters,
    killVoter,
    propose,
} from './utils/networkRequests';
import ProcessWarning from './components/Callout/ProcessWarning';

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

    return (
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
                <Route path="/" element={<HomePage />} />
                <Route path="statistics" element={<StatisticsPage />} />
            </Routes>
        </BrowserRouter>
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

function HomePage() {
    const [voterData, setVoterData] = useState<VoterData | undefined>();
    const [forceIsOpen, setForceIsOpen] = useState(false);
    const [networkInitialized, setNetworkInitialized] = useState(false);
    const [id] = useState(uuid());

    function refreshDash(butFirst?: Function) {
        return async () => {
            let returnValue;
            if (butFirst) returnValue = await butFirst();
            setVoterData(await refreshData());
            return returnValue;
        };
    }

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

    const PolicySelect: React.FC = () => {
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
                        refreshDash(async () => await propose(selectedPolicy!)),
                        'Successfully proposed your selected policy!',
                        'There was a problem proposing your selected policy.'
                    )}>
                    Propose
                </PromiseButton>
                <div style={{ margin: 10 }}></div>
            </>
        );
    };

    function VotersListItem({ voter }: { voter: Voter }) {
        return (
            <tr>
                <td style={{ textAlign: 'left' }}>{voter.id}</td>
                <td style={{ textAlign: 'center' }}>
                    {voter.id == id ? 'Human (You)' : voter.is_simulated ? 'Simulated' : 'Human'}
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

    return (
        <div className={'bp4-dark'}>
            <div className={'center-con'} style={{ display: 'flex', alignItems: 'center' }}>
                <div className={'home-section'}>
                    {(voterData?.voters ?? []).length > 0 ? (
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
                                        <PolicySelect />
                                    </div>
                                </Callout>
                                <div style={{ margin: 50 }}></div>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexDirection: 'column',
                                    }}>
                                    <ProcessWarning processCount={voterData!.voters.length} />

                                    <div className={'vp-table-scrollable-wrapper'}>
                                        <HTMLTable
                                            striped
                                            condensed
                                            bordered
                                            interactive
                                            className={'vp-table-scrollable'}>
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
                                                {voterData!.voters.map(function (voter: Voter) {
                                                    return <VotersListItem key={voter.id} voter={voter} />;
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
                                            <Spinner
                                                intent={
                                                    voterData!.voters.length >= 3
                                                        ? voterData!.voters.length >= 5
                                                            ? 'success'
                                                            : 'warning'
                                                        : 'danger'
                                                }
                                                size={25}
                                            />
                                            <H5 style={{ marginTop: 2 }}>
                                                You are connected to{' '}
                                                {voterData!.voters.length >= 3
                                                    ? voterData!.voters.length >= 5
                                                        ? 'an active'
                                                        : 'a potentially degraded'
                                                    : 'an inactive'}{' '}
                                                session with {voterData!.voters.length} process(es).
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
                                                onClick={performThenNotify(async () => {
                                                    setNetworkInitialized(false);
                                                    await refreshDash(killAllVoters)();
                                                }, 'All processes have been successfully terminated.')}>
                                                Destroy Network
                                            </PromiseButton>
                                        </div>
                                    </Callout>
                                </div>
                            </div>
                        </>
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
                    id={id}
                    dialogIsOpen={forceIsOpen}
                    setDialogIsOpen={setForceIsOpen}
                    setVoterData={setVoterData}
                    setNetworkInitialized={setNetworkInitialized}
                    isFirstTime={!networkInitialized}
                />
            )}
        </div>
    );
}

export default App;

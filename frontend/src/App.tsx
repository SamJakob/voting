import { useEffect } from "react";
import React from "react";
import {MenuItem} from "@blueprintjs/core";
import { BrowserRouter, Link, Routes, Route } from "react-router-dom";
import SessionBuilder from "./components/Dialog/SessionBuilder";
import { ItemPredicate, ItemRenderer, Select2 } from "@blueprintjs/select";
import {Key} from "react";
import {useState} from "react";
import { Spinner, H1, H2, Button, Label, Callout, H5 } from "@blueprintjs/core";
const style = { display: "flex", gap: "8px", padding: "8px" };
import {Policy, VoterData, Voter} from "./utils/types";
import { v4 as uuid } from 'uuid';
import 'normalize.css'
import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css"
import {refreshDash} from "./utils/networkRequests";



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
        if (window.location.pathname === "/") {
            window.location.replace("/app");
        }
    }, []);

    return (
        <BrowserRouter basename="app">
            <nav style={style}>
                <Link to="/">Home</Link>
                <Link to="/settings">Settings Page</Link>
                <br />
            </nav>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="settings" element={<SettingsPage />} />
            </Routes>
        </BrowserRouter>
    );
}

function SettingsPage() {
    return (
        <div>
            <ul>
                <Spinner/>
            </ul>
        </div>
    );
}

function HomePage() {
    const [session, setSession] = useState<boolean>(false)
    const [voterData, setVoterData] = useState<VoterData>()
    const [forceIsOpen, setForceIsOpen] = useState(false);
    const unique_id = uuid();

    const Policies: Policy[] = [
        { title: "Universal healthcare", coordinates: [-9, -9] },
        { title: "Carbon tax", coordinates: [-8, -8] },
        { title: "State-funded insurance system with private hospitals", coordinates: [-6, 6] },
        { title: "Free public education", coordinates: [-9, -7] },
    ].map((f,index) => ({ ...f, rank: index + 1 }));

    const filterPolicy: ItemPredicate<Policy> = (query, policy, _index, exactMatch) => {
        const normalizedTitle =policy.title.toLowerCase();
        const normalizedQuery = query.toLowerCase();

        if (exactMatch) {
            return normalizedTitle === normalizedQuery;
        } else {
            return `${policy.rank}. ${normalizedTitle}`.indexOf(normalizedQuery) >= 0;
        }
    };

    const renderPolicy: ItemRenderer<Policy> = (policy, { handleClick, handleFocus, modifiers, query }) => {
        if (!modifiers.matchesPredicate) {
            return null;
        }
        return (
            <MenuItem
                active={modifiers.active}
                disabled={modifiers.disabled}
                key={policy.rank}
                label={policy.coordinates.toString()}
                onClick={handleClick}
                onFocus={handleFocus}
                roleStructure="listoption"
                text={`${policy.rank}. ${policy.title}`}
            />
        );
    };

    const PolicySelect: React.FC = () => {
        const [selectedPolicy, setSelectedPolicy] = React.useState<Policy | undefined>();
        return (
            <Select2<Policy>
                items={Policies}
                itemPredicate={filterPolicy}
                itemRenderer={renderPolicy}
                noResults={<MenuItem disabled={true} text="No results." roleStructure="listoption" />}
                onItemSelect={setSelectedPolicy}
            >
                <Button text={selectedPolicy?.title} rightIcon="double-caret-vertical" placeholder="Select a film" />
            </Select2>
        );
    };

    function VotersListItem(voter) {
        console.log("VOTERS List Item")
        console.log(voter)
        return (
            <tr key={voter.id}>
                <td style={{textAlign: "center"}}>{voter.voter.id}</td>
                <td style={{textAlign: "center"}}>{voter.voter.is_simulated? "Simulated": "Human"}</td>
                <td style={{textAlign: "center"}}>{voter.voter.simulation.coordinates[0]}, {voter.voter.simulation.coordinates[1]}</td>
                <td style={{textAlign: "center"}}>{voter.voter.simulation.tolerance}</td>
            </tr>
        )
    }


    return (
        <div className={"bp4-dark"}>
            <div className={"center-con"} style={{display: "flex", alignItems: "center"}}>
                <div className={"home-section"}>
                    {voterData?.voters.length > 0 ?
                        <>
                            <div style={{display: "flex", alignItem: "center", flexDirection: "row"}}>
                                <Callout style={{width: 300}}>
                                    <div style={{display: "flex", alignItem: "center", flexDirection: "column", justifyContent: "center", alignItems: "center"}}>
                                        <H5 style={{margin: 15}}>Propose a policy to the session</H5>
                                        <div style={{margin: 15}}></div>
                                        <PolicySelect/>
                                        <div style={{margin: 20}}></div>
                                        <Button intent={"primary"}>Propose</Button>
                                    </div>
                                </Callout>
                                <div style={{margin: 50}}></div>
                                <div style={{display: "flex", alignItem: "center", flexDirection: "column"}}>
                                <table className="bp4-html-table bp4-html-table-striped table">
                                    <thead>
                                    <tr>
                                        <th>Process ID</th>
                                        <th>Type</th>
                                        <th>Coordinates</th>
                                        <th>Tolerance</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <>
                                        {voterData!.voters.map(function (voter: {voter: Voter}) {
                                            return (
                                                <>
                                                    <VotersListItem voter={voter}/>
                                                </>
                                            );
                                        })}
                                    </>
                                    </tbody>
                                </table>
                                    <div style={{margin: 20}}></div>
                                        <Callout>
                                            <div style={{display: "flex", alignItem: "left", flexDirection: "row", justifyContent: "left", gap: 30}}>
                                                <Spinner intent={"success"} size={25}/>
                                                <H5 style={{marginTop: 6}}>Session is active</H5>
                                                <Button intent={"danger"}>Kill All Voters</Button>
                                            </div>
                                        </Callout>
                                </div>
                            </div>
                        </>
                    :
                        <>
                            <H1>A distributed voting system implemented in Elixir using Abortable Paxos</H1>
                            <H2 style={{marginTop: 20, marginBottom: 30}}>Please press start to begin a session</H2>
                            <Button style={{width: "100px", height: "20px", marginBottom: "50px"}} onClick={() => setForceIsOpen(true)}>Start</Button>
                        </>

                    }



                </div>
            </div>
            {forceIsOpen &&
                <SessionBuilder dialogIsOpen={forceIsOpen} setDialogIsOpen={setForceIsOpen} setSession={setSession} setVoterData={setVoterData}/>
            }
        </div>
    );
}

export default App;

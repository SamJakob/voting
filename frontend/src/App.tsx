import { useEffect } from "react";
import React from "react";
import {MenuItem} from "@blueprintjs/core";
import { BrowserRouter, Link, Routes, Route } from "react-router-dom";
import SessionBuilder from "./components/Dialog/SessionBuilder";
import { ItemPredicate, ItemRenderer, Select2 } from "@blueprintjs/select";
import {useState} from "react";
import { Spinner, H1, H2, Button } from "@blueprintjs/core";
const style = { display: "flex", gap: "8px", padding: "8px" };
import {Policy} from "./utils/types";
import { v4 as uuid } from 'uuid';
import 'normalize.css'
import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css"



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
        const [selectedFilm, setSelectedPolicy] = React.useState<Policy | undefined>();
        return (
            <Select2<Policy>
                items={Policies}
                itemPredicate={filterPolicy}
                itemRenderer={renderPolicy}
                noResults={<MenuItem disabled={true} text="No results." roleStructure="listoption" />}
                onItemSelect={setSelectedPolicy}
            >
                <Button text={selectedFilm?.title} rightIcon="double-caret-vertical" placeholder="Select a film" />
            </Select2>
        );
    };

    const [forceIsOpen, setForceIsOpen] = useState(false);
    const unique_id = uuid();
    return (
        <div className={"bp4-dark"}>
            <div className={"center-con"} style={{display: "flex", alignItems: "center"}}>
                <div className={"home-section"}>
                    <H1>A distributed voting system implemented in Elixir using Abortable Paxos</H1>
                    <H2 style={{marginTop: 20, marginBottom: 30}}>Please press start to begin a session</H2>
                    <Button style={{width: "100px", height: "20px", marginBottom: "50px"}} onClick={() => setForceIsOpen(true)}>Start</Button>
                    <PolicySelect/>
                </div>
            </div>
            {forceIsOpen &&
                <SessionBuilder dialogIsOpen={forceIsOpen} setDialogIsOpen={setForceIsOpen}/>
            }
        </div>
    );
}

export default App;

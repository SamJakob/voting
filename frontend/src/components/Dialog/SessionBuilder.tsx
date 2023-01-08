import {
    Button,
    ButtonProps,
    Callout,
    Classes as Classes2,
    DialogStep,
    Divider,
    Drawer,
    H2,
    H4,
    H5,
    Label,
    MultistepDialog, Overlay,
    PopoverInteractionKind,
    Position,
    Spinner,
    Tag,
    Toaster,
    Icon,
    NumericInput,
    IconSize, Pre, Intent
} from "@blueprintjs/core";
import {Classes as Popover2Classes, ContextMenu2, Tooltip2} from "@blueprintjs/popover2";
import { v4 as uuid } from 'uuid';
import React, {Dispatch, Key, SetStateAction, useEffect, useState} from "react";
import classNames from "classnames";
import {Classes, Popover2} from "@blueprintjs/popover2";
import {startSession} from "../../utils/networkRequests";


export interface IMultistepDialogExampleState {
    toasts: [];
    autoFocus: boolean;
    canEscapeKeyClose: boolean;
    canOutsideClickClose: boolean;
    enforceFocus: boolean;
    hasTitle: boolean;
    isCloseButtonShown: boolean;
    showCloseButtonInFooter: boolean;
    usePortal: boolean;
    value?: string;
    initialStepIndex: number;
}


// @ts-ignore
export default function SessionBuilder({dialogIsOpen, setDialogIsOpen}) {
    const [loading, setLoading] = useState<boolean>(false)
    // const [policy, setPolicy] = useState<>()
    const [candidates, setCandidates] = useState<number>(1)

    //do we need to fetch anything?
    // useEffect(() => {
    // }, []);

    let state: IMultistepDialogExampleState = {
        toasts: [],
        autoFocus: true,
        canEscapeKeyClose: true,
        canOutsideClickClose: true,
        enforceFocus: true,
        hasTitle: true,
        initialStepIndex: 0,
        isCloseButtonShown: true,
        showCloseButtonInFooter: true,
        usePortal: true,
    }

    const { hasTitle, ...flags} = state;

    let toaster: Toaster;

    const refHandlers = {
        toaster: (ref: any) => toaster = ref,
    }

    const finalButtonProps: Partial<ButtonProps> = {
        intent: "primary",
        loading: loading,
        text: "Start Session",
        onClick: handleNewSession
    }

    function handleNewSession() {
        setLoading(true)
        startSession(candidates).then(() =>
            setLoading(false)
        )

    }


    return (
        <>
            <div className={"bp4-dark"}>
            <MultistepDialog
                className="dialog"
                icon="info-sign"
                isOpen={dialogIsOpen}
                onClose={() => setDialogIsOpen(false)}
                finalButtonProps={finalButtonProps}
                title={hasTitle ? "Create new session" : undefined}
            >
                <DialogStep
                    id="select"
                    panel={<PolicyPanel setCandidates={setCandidates}/>}
                    title="Select"
                />
                <DialogStep
                    id="configure"
                    panel={<TerminalPanel candidates={candidates}/>}
                    title="Configure"
                />
            </MultistepDialog>
            </div>
        </>
    );
}

function PolicyPanel({setCandidates}: {setCandidates: Dispatch<SetStateAction<number>>}) {
    const id = uuid()

    return (
        <div className={classNames(Classes2.DIALOG_BODY, "docs-multistep-dialog-example-step")}>
            <H2>Candidates</H2>
            <Divider style={{marginBottom: 20}}/>
            <div className={"flexRow"} style={{justifyContent: "center", alignItems: "center"}}>
                <div style={{
                    height: 200,
                    width: 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column"
                }}>
                    <Label>
                        Candidates
                        <NumericInput id="iterations" style={{width: 50}} type={"number"} allowNumericCharactersOnly={true} selectAllOnFocus={false} onValueChange={(value) => setCandidates(value)} minorStepSize={null} defaultValue={1} min={1} />
                    </Label>
                </div>
                {/*<div style={{height: 200, width: 250, display: "flex", alignItems: "center", justifyContent: "center"}}>*/}

                {/*</div>*/}

                <Callout
                    style={{height: 200, width: 500, display: "flex", alignItems: "center", justifyContent: "center"}}>
                    <>
                        <div className={"flexCol"} style={{justifyContent: "center", alignItems: "center"}}>
                            <p style={{color: "#738091", fontWeight: 600, textAlign: "center"}}>Select the number of candidates you want to start in this voting session</p>
                            <Popover2
                                content={id}
                                enforceFocus={false}
                                position={Position.BOTTOM_LEFT}
                                interactionKind={PopoverInteractionKind.HOVER}
                            >
                                <Button intent={Intent.PRIMARY}>{"View your unique ID"}</Button>
                            </Popover2>
                        </div>
                    </>
                </Callout>
            </div>
        </div>
    )
}

function TerminalPanel({candidates}: {candidates: number}) {
    return (
        <div className={classNames(Classes2.DIALOG_BODY, "docs-multistep-dialog-example-step")}>
            <Divider style={{marginBottom: 20}}/>
            <Pre>
                spawning {candidates} candidates with terminal output
            </Pre>
        </div>
    )
}

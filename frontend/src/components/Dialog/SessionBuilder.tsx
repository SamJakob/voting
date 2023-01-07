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
import React, {Key, useEffect, useState} from "react";
import classNames from "classnames";
import {Classes, Popover2} from "@blueprintjs/popover2";


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
    const [policy, setPolicy] = useState<{boolean}>()
    const [candidates, setCandidates] = useState<number>(1)

    //Runs only on the first render
    useEffect(() => {
        setLoading(false)
    }, []);

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
        text: "Start Session",
    }


    return (
        <>
            <div className={"bp4-dark"}>
                {/*Added a global style to override the 500px fixed width and made is 2000px to fit the table*/}
                {loading
                    ?
                    <Spinner/>
                    :
                    <>
                        <Toaster position={Position.TOP} ref={refHandlers.toaster} />
                        <MultistepDialog
                            className="dialog"
                            icon="info-sign"
                            isOpen={dialogIsOpen}
                            onClose={() => setDialogIsOpen(false)}
                            finalButtonProps={finalButtonProps}
                            title={hasTitle ? "Create new session" : undefined}
                        >
                            {loading
                                ?
                                <Spinner/>
                                :
                                <DialogStep
                                    id="select"
                                    panel={<PolicyPanel setCandidates={setCandidates}/>}
                                    title="Select"
                                />
                            }
                            {loading
                                ?
                                <Spinner/>
                                :
                                <DialogStep
                                    id="configure"
                                    panel={<TerminalPanel candidates={candidates}/>}
                                    title="Configure"
                                />
                            }
                            {/*{loading*/}
                            {/*    ?*/}
                            {/*    <Spinner/>*/}
                            {/*    :*/}
                            {/*    <DialogStep*/}
                            {/*        id="testsuite"*/}
                            {/*        panel={<TestSuitePanel test_suite={test_suite} test_suites={test_suites!} setTestSuite={setTestSuite}/>}*/}
                            {/*        title="Test Suite"*/}
                            {/*    />*/}
                            {/*}*/}
                        </MultistepDialog>
                    </>
                }
            </div>
        </>
    );
}

function PolicyPanel({setCandidates}) {
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
                            <p style={{color: "#738091", weight: 600, textAlign: "center"}}>Select the number of candidates you want to start in this voting session</p>
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

function TerminalPanel({candidates}) {
    return (
        <div className={classNames(Classes2.DIALOG_BODY, "docs-multistep-dialog-example-step")}>
            <Divider style={{marginBottom: 20}}/>
            <Pre>
                spawning {candidates} candidates with terminal output
            </Pre>
        </div>
    )
}

import {
    Button,
    ButtonProps,
    Callout,
    Classes as Classes2,
    DialogStep,
    Divider,
    H2,
    Label,
    MultistepDialog,
    PopoverInteractionKind,
    Position,
    NumericInput,
    Pre,
    Intent,
    Icon,
} from '@blueprintjs/core';
import { Dispatch, SetStateAction, useContext, useState } from 'react';
import classNames from 'classnames';
import { Classes as Popover2Classes, Popover2 } from '@blueprintjs/popover2';
import { performThenNotify, spawnVoters } from '../../utils/networkRequests';
import { connectToNetwork } from '../../utils/socketRequests';
import { SocketContext } from '../../realtime/SocketContext';

export interface IMultistepDialogExampleState {
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
export default function NetworkSetupWizard({
    dialogIsOpen,
    setDialogIsOpen,
    setNetworkInitialized: setConnectedToNetwork,
    refreshDash,
    voterChannel,
    isFirstTime = true,
}) {
    const [loading, setLoading] = useState<boolean>(false);
    const [simulatedVoters, setSimulatedVoters] = useState<number>(5);

    const { socketId: id } = useContext(SocketContext);

    const state: IMultistepDialogExampleState = {
        autoFocus: true,
        canEscapeKeyClose: true,
        canOutsideClickClose: true,
        enforceFocus: true,
        hasTitle: true,
        initialStepIndex: 0,
        isCloseButtonShown: true,
        showCloseButtonInFooter: true,
        usePortal: true,
    };

    const { hasTitle, ...flags } = state;

    const finalButtonProps: Partial<ButtonProps> = {
        intent: 'primary',
        loading: loading,
        text: 'Finish Setup',
        rightIcon: 'circle-arrow-right',
        onClick: handleNewSession,
    };

    async function handleNewSession() {
        await performThenNotify(
            async () => {
                try {
                    setLoading(true);

                    let result = await spawnVoters(simulatedVoters);

                    if (isFirstTime) {
                        console.log(await connectToNetwork(voterChannel));
                        setConnectedToNetwork(true);
                    }

                    await refreshDash()();
                    setDialogIsOpen(false);

                    return result;
                } catch (ex) {
                    setLoading(false);
                    throw ex;
                }
            },
            'Network successfully prepared!',
            'There was a problem setting up the network.'
        )();
    }

    return (
        <>
            <div>
                <MultistepDialog
                    className="dialog bp4-dark"
                    icon="info-sign"
                    isOpen={dialogIsOpen}
                    onClose={() => setDialogIsOpen(false)}
                    finalButtonProps={finalButtonProps}
                    title={hasTitle ? 'Setup Wizard' : undefined}>
                    <DialogStep
                        id="voters"
                        panel={
                            <PolicyPanel id={id} isFirstTime={isFirstTime} setSimulatedVoters={setSimulatedVoters} />
                        }
                        title="Voters"
                    />
                    <DialogStep
                        id="apply_changes"
                        panel={<TerminalPanel id={id} isFirstTime={isFirstTime} simulatedVoters={simulatedVoters} />}
                        title="Apply Changes"
                    />
                </MultistepDialog>
            </div>
        </>
    );
}

function PolicyPanel({
    id,
    isFirstTime,
    setSimulatedVoters,
}: {
    id: any;
    isFirstTime: boolean;
    setSimulatedVoters: Dispatch<SetStateAction<number>>;
}) {
    return (
        <div className={classNames(Classes2.DIALOG_BODY, 'setup-wizard-dialog-voters')}>
            <H2>Voters</H2>
            <Divider style={{ marginBottom: 20 }} />
            <p className={'bp4-running-text bp4-text-muted'}>
                Simulated voters are randomly assigned &lsquo;political values&rsquo; and &lsquo;tolerance&rsquo; and
                automatically vote on policies in accordance with these.
            </p>
            <div className={'flexRow'} style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div
                    style={{
                        height: 200,
                        width: 500,
                        display: 'flex',
                        justifyContent: 'center',
                        flexDirection: 'column',
                    }}>
                    <Label
                        style={{
                            alignSelf: 'center',
                        }}>
                        Simulated Voters
                        <NumericInput
                            id="iterations"
                            style={{ width: 50 }}
                            allowNumericCharactersOnly={true}
                            selectAllOnFocus={false}
                            onValueChange={(value) => setSimulatedVoters(value)}
                            minorStepSize={null}
                            defaultValue={5}
                            min={0}
                        />
                    </Label>
                    <br />
                    <p
                        className={'bp4-running-text bp4-text-small bp4-text-muted'}
                        style={{ margin: '0', padding: '0 20px' }}>
                        <Icon icon="small-info-sign" /> The number of voters selected here will be automatically started
                        across the network.
                    </p>
                </div>

                <Callout
                    style={{
                        height: 200,
                        width: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                    <>
                        <div
                            className={'flexCol'}
                            style={{
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                            <p
                                className={'bp4-running-text bp4-text-muted'}
                                style={{
                                    textAlign: 'center',
                                    padding: '0 20px',
                                }}>
                                {isFirstTime
                                    ? 'You will be registered as a non-simulated (live) voter when this network goes online.'
                                    : 'You are currently registered on the network with a unique voter ID.'}
                            </p>
                            <Popover2
                                popoverClassName={Popover2Classes.POPOVER2_CONTENT_SIZING}
                                content={
                                    <p
                                        className={'bp4-monospace-text bp4-running-text'}
                                        style={{ lineHeight: '1', margin: '0' }}>
                                        {id}
                                    </p>
                                }
                                enforceFocus={false}
                                position={Position.BOTTOM_LEFT}
                                interactionKind={PopoverInteractionKind.HOVER}>
                                <Button intent={Intent.PRIMARY}>{'View your unique ID'}</Button>
                            </Popover2>
                        </div>
                    </>
                </Callout>
            </div>
        </div>
    );
}

function TerminalPanel({
    id,
    isFirstTime,
    simulatedVoters,
}: {
    id: any;
    isFirstTime: boolean;
    simulatedVoters: number;
}) {
    return (
        <div className={classNames(Classes2.DIALOG_BODY, 'setup-wizard-dialog-apply-changes')}>
            <H2>Apply Changes</H2>
            <Divider style={{ marginBottom: 20 }} />
            <p className={'bp4-running-text bp4-text-muted'}>
                Please review the following changes. They will be enacted immediately when you press &lsquo;Finish
                Setup&rsquo;.
            </p>
            <Pre>
                {simulatedVoters > 0
                    ? `- ${simulatedVoters} simulated voter(s) will be spawned...`
                    : '- No simulated voters will be spawned.'}
                {isFirstTime ? `\n- You will be connected to the network as ${id}` : ''}
            </Pre>
        </div>
    );
}

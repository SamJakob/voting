import axios from 'axios';
import { VPToaster } from './toaster';

export async function executePreflight() {
    return (await axios.post(`/api/preflight`)).data;
}

export async function spawnVoters(voters: number) {
    return (await axios.post(`/api/spawn/${voters}`)).data;
}

export async function killVoter(id: string) {
    return (await axios.post(`/api/terminate/${id}`)).data;
}

export async function killAllVoters() {
    return (await axios.post('/api/terminate')).data;
}

export async function refreshData() {
    return (await axios.get('/api/refresh')).data;
}

///////////////////////////////////////////////////////////////////////////////

class NotifyError extends Error {
    message: string;

    constructor(message: string) {
        super(message);
        this.message = message;
    }
}

/**
 * Performs the specified asynchronous action, showing messageOnSuccess as a
 * Toast notification if the action was successful, or messageOnFail if it
 * wasn't.
 *
 * Ordinarily, success is determined by a lack of an exception, but
 * errorFromReturnValue can be used if desired, which will cause messageOnFail
 * to be displayed if the return value is falsy.
 *
 * @param action The (asynchronous) function to perform.
 * @param messageOnSuccess The **default** message to display if the function
 * runs without error.
 * @param messageOnFail The message to display if a problem occurs.
 * @param successFromReturnValue If true, causes the success message to be
 * determined by the output of result. If the output is not a string, this will
 * be ignored.
 * @param errorFromReturnValue Whether to also consider a falsy return value to
 * be an error.
 */
export function performThenNotify(
    action: Function,
    messageOnSuccess: any,
    messageOnFail: any = 'Sorry! Something went wrong whilst performing your last request...',
    successFromReturnValue: boolean = true,
    errorFromReturnValue: boolean = false
) {
    return async () => {
        try {
            if (!action) throw new NotifyError('An invalid action was specified, this is likely a programming error!');
            let result = await action();

            if (!errorFromReturnValue || result) {
                VPToaster.show({
                    message: successFromReturnValue && typeof result == 'string' ? result : messageOnSuccess,
                    intent: 'success',
                    icon: 'tick-circle',
                });
            } else {
                VPToaster.show({
                    message: messageOnFail,
                    intent: 'danger',
                    icon: 'error',
                });
            }

            return result;
        } catch (ex) {
            let message;

            if (ex instanceof NotifyError) {
                message = ex.message;
            } else if (ex.response && ex.response.data) {
                message = ex.response.data;
            } else message = messageOnFail;

            VPToaster.show({
                message: message,
                intent: 'danger',
                icon: 'error',
            });
        }
    };
}

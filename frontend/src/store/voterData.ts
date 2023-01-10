import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { refreshData } from '../utils/networkRequests';

const doFetchVoterData = createAsyncThunk('voterData/fetch', async () => {
    return await refreshData();
});

export const voterData = createSlice({
    name: 'voterData',
    initialState: {
        value: {
            voters: [],
        },
    },
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(doFetchVoterData.fulfilled, (state, action) => {
            state.value = action.payload;
        });
    },
});

export const fetchVoterData = async (dispatch: any) => await dispatch(doFetchVoterData()).unwrap();

export const selectVoterData = (state) => state.voterData.value?.voters;
export const selectVoterCount = (state) => state.voterData.value.voters.length ?? 0;
export const selectSimulatedVoterCount = (state) =>
    state.voterData.value.voters.filter((v) => v.is_simulated)?.length ?? 0;

export default voterData.reducer;

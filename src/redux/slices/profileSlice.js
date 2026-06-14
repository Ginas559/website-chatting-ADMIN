import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getProfileByIdApi, updateProfileApi } from '../../util/api';

const normalizeError = (error, fallback = 'Có lỗi xảy ra, vui lòng thử lại') => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (error?.errors?.length > 0) return error.errors[0].message || error.errors[0].msg || fallback;
    if (error?.error) return error.error;
    if (error?.message) return error.message;
    if (error?.errMessage) return error.errMessage;
    return fallback;
};

export const fetchProfile = createAsyncThunk(
    'profile/fetchProfile',
    async (userId, { rejectWithValue }) => {
        try {
            const res = await getProfileByIdApi(userId);
            return res?.data || res;
        } catch (error) {
            return rejectWithValue(error?.response?.data || error?.data || error);
        }
    }
);

export const saveProfile = createAsyncThunk(
    'profile/saveProfile',
    async ({ userId, values, method = 'patch' }, { rejectWithValue }) => {
        try {
            const res = await updateProfileApi(userId, values, method);
            return res?.data || res;
        } catch (error) {
            return rejectWithValue(error?.response?.data || error?.data || error);
        }
    }
);

const profileSlice = createSlice({
    name: 'profile',
    initialState: {
        data: null,
        loading: false,
        saving: false,
        error: null,
        successMessage: '',
    },
    reducers: {
        clearProfileFeedback: (state) => {
            state.error = null;
            state.successMessage = '';
        },
        resetProfileState: (state) => {
            state.data = null;
            state.loading = false;
            state.saving = false;
            state.error = null;
            state.successMessage = '';
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProfile.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload?.data || action.payload;
            })
            .addCase(fetchProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = normalizeError(action.payload, 'Không tải được profile');
            })
            .addCase(saveProfile.pending, (state) => {
                state.saving = true;
                state.error = null;
                state.successMessage = '';
            })
            .addCase(saveProfile.fulfilled, (state, action) => {
                state.saving = false;
                state.data = action.payload?.data || action.payload;
                state.successMessage = 'Cập nhật profile thành công';
            })
            .addCase(saveProfile.rejected, (state, action) => {
                state.saving = false;
                state.error = normalizeError(action.payload, 'Cập nhật profile thất bại');
            });
    },
});

export const { clearProfileFeedback, resetProfileState } = profileSlice.actions;
export default profileSlice.reducer;
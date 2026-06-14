import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
    getAdminProfileApi,
    getModeratorProfileApi,
    loginApi,
    logoutApi,
    refreshTokenApi,
} from '../../util/api';
import forgotPasswordService from '../../services/forgotPassword.service';

const getStoredAuthUser = () => {
    try {
        const raw = localStorage.getItem('authUser');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
};

const persistAuthUser = (user) => {
    if (!user) {
        localStorage.removeItem('authUser');
        return;
    }

    localStorage.setItem('authUser', JSON.stringify(user));
};

const normalizeError = (error, fallback = 'Có lỗi xảy ra, vui lòng thử lại') => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (error?.errors?.length > 0) return error.errors[0].msg;
    if (error?.error) return error.error;
    if (error?.message) return error.message;
    if (error?.errMessage) return error.errMessage;
    return fallback;
};

export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async ({ email, password }, { rejectWithValue }) => {
        try {
            const res = await loginApi(email, password);

            if (res?.errCode === 0) {
                localStorage.setItem('accessToken', res.accessToken);
                localStorage.setItem('refreshToken', res.refreshToken);

                if (res.user?.id) {
                    localStorage.setItem('userId', String(res.user.id));
                }

                if (res.user) {
                    persistAuthUser(res.user);
                }

                return res;
            }

            return rejectWithValue(res);
        } catch (error) {
            return rejectWithValue(error?.errMessage || 'Không thể kết nối đến server');
        }
    }
);

export const refreshToken = createAsyncThunk(
    'auth/refreshToken',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('refreshToken');
            const res = await refreshTokenApi(token);

            if (res?.errCode === 0) {
                localStorage.setItem('accessToken', res.accessToken);
                localStorage.setItem('refreshToken', res.refreshToken);
                return res;
            }

            return rejectWithValue(res);
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logoutUser',
    async () => {
        const token = localStorage.getItem('refreshToken');
        await logoutApi(token).catch(() => {});
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tempToken');
        localStorage.removeItem('registerEmail');
        localStorage.removeItem('userId');
        localStorage.removeItem('authUser');
    }
);

export const sendForgotPasswordOtp = createAsyncThunk(
    'auth/sendForgotPasswordOtp',
    async (email, { rejectWithValue }) => {
        try {
            const res = await forgotPasswordService.sendOtp(email);

            if (res?.tempToken) {
                localStorage.setItem('resetPasswordTempToken', res.tempToken);
            }

            return res;
        } catch (error) {
            return rejectWithValue(error?.response?.data || error?.data || error);
        }
    }
);

export const resetPassword = createAsyncThunk(
    'auth/resetPassword',
    async ({ otp, newPassword }, { rejectWithValue }) => {
        try {
            const tempToken = localStorage.getItem('resetPasswordTempToken');
            const res = await forgotPasswordService.resetPassword({ otp, newPassword, tempToken });

            if (res?.message) {
                localStorage.removeItem('resetPasswordTempToken');
            }

            return res;
        } catch (error) {
            return rejectWithValue(error?.response?.data || error?.data || error);
        }
    }
);

export const fetchAdminProfile = createAsyncThunk(
    'auth/fetchAdminProfile',
    async (_, { rejectWithValue }) => {
        try {
            return await getAdminProfileApi();
        } catch (error) {
            return rejectWithValue(error?.response?.data || error?.data || error);
        }
    }
);

export const fetchModeratorProfile = createAsyncThunk(
    'auth/fetchModeratorProfile',
    async (_, { rejectWithValue }) => {
        try {
            return await getModeratorProfileApi();
        } catch (error) {
            return rejectWithValue(error?.response?.data || error?.data || error);
        }
    }
);

const initialUser = getStoredAuthUser();

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        isAuthenticated: !!localStorage.getItem('accessToken'),
        user: initialUser,
        loading: false,
        error: null,
        profileLoading: false,
        profileError: null,
        forgotPasswordLoading: false,
        forgotPasswordError: null,
        forgotPasswordMessage: '',
        forgotPasswordTempToken: localStorage.getItem('resetPasswordTempToken') || '',
        isForgotPasswordOtpSent: !!localStorage.getItem('resetPasswordTempToken'),
        forgotPasswordResetSuccess: false,
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearForgotPasswordFeedback: (state) => {
            state.forgotPasswordError = null;
            state.forgotPasswordMessage = '';
        },
        resetForgotPasswordState: (state) => {
            state.forgotPasswordLoading = false;
            state.forgotPasswordError = null;
            state.forgotPasswordMessage = '';
            state.forgotPasswordTempToken = '';
            state.isForgotPasswordOtpSent = false;
            state.forgotPasswordResetSuccess = false;
            localStorage.removeItem('resetPasswordTempToken');
        },
        setAuthUser: (state, action) => {
            state.user = action.payload || null;
            persistAuthUser(state.user);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user || null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = normalizeError(action.payload, 'Đăng nhập thất bại');
            })
            .addCase(logoutUser.fulfilled, (state) => {
                state.isAuthenticated = false;
                state.user = null;
                state.error = null;
                state.profileLoading = false;
                state.profileError = null;
            })
            .addCase(fetchAdminProfile.pending, (state) => {
                state.profileLoading = true;
                state.profileError = null;
            })
            .addCase(fetchAdminProfile.fulfilled, (state, action) => {
                state.profileLoading = false;
                state.user = action.payload?.user || action.payload?.data?.user || null;
                state.isAuthenticated = true;
                persistAuthUser(state.user);
            })
            .addCase(fetchAdminProfile.rejected, (state, action) => {
                state.profileLoading = false;
                state.profileError = normalizeError(action.payload, 'Không thể tải thông tin quản trị viên');
            })
            .addCase(fetchModeratorProfile.pending, (state) => {
                state.profileLoading = true;
                state.profileError = null;
            })
            .addCase(fetchModeratorProfile.fulfilled, (state, action) => {
                state.profileLoading = false;
                state.user = action.payload?.user || action.payload?.data?.user || null;
                state.isAuthenticated = true;
                persistAuthUser(state.user);
            })
            .addCase(fetchModeratorProfile.rejected, (state, action) => {
                state.profileLoading = false;
                state.profileError = normalizeError(action.payload, 'Không thể tải thông tin quản lý');
            })
            .addCase(sendForgotPasswordOtp.pending, (state) => {
                state.forgotPasswordLoading = true;
                state.forgotPasswordError = null;
                state.forgotPasswordMessage = '';
            })
            .addCase(sendForgotPasswordOtp.fulfilled, (state, action) => {
                state.forgotPasswordLoading = false;
                state.forgotPasswordMessage = action.payload?.message || 'OTP đã được gửi đến email của bạn';
                state.forgotPasswordTempToken = action.payload?.tempToken || '';
                state.isForgotPasswordOtpSent = true;
            })
            .addCase(sendForgotPasswordOtp.rejected, (state, action) => {
                state.forgotPasswordLoading = false;
                state.forgotPasswordError = normalizeError(action.payload, 'Không thể gửi OTP');
            })
            .addCase(resetPassword.pending, (state) => {
                state.forgotPasswordLoading = true;
                state.forgotPasswordError = null;
                state.forgotPasswordMessage = '';
            })
            .addCase(resetPassword.fulfilled, (state, action) => {
                state.forgotPasswordLoading = false;
                state.forgotPasswordMessage = action.payload?.message || 'Đổi mật khẩu thành công';
                state.forgotPasswordTempToken = '';
                state.isForgotPasswordOtpSent = false;
                state.forgotPasswordResetSuccess = true;
            })
            .addCase(resetPassword.rejected, (state, action) => {
                state.forgotPasswordLoading = false;
                state.forgotPasswordError = normalizeError(action.payload, 'Không thể đổi mật khẩu');
            });
    },
});

export const {
    clearError,
    clearForgotPasswordFeedback,
    resetForgotPasswordState,
    setAuthUser,
} = authSlice.actions;

export default authSlice.reducer;

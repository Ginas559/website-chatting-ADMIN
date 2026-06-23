import axios from "axios";

const instance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || "/api",
});

// Track refresh state to prevent concurrent refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

instance.interceptors.response.use(
    (response) => response?.data ? response.data : response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response) {
            const { status, data } = error.response;

            // Auto-refresh on 401 (token expired)
            if (status === 401 && !originalRequest._retry) {
                // Don't retry refresh-token or logout endpoints
                if (originalRequest.url?.includes('refresh-token') || originalRequest.url?.includes('logout')) {
                    return Promise.reject(data || error);
                }

                if (isRefreshing) {
                    // Queue the request and wait for the refresh to complete
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    })
                        .then((token) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return instance(originalRequest);
                        })
                        .catch((err) => Promise.reject(err));
                }

                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    const refreshTokenValue = localStorage.getItem('refreshToken');
                    if (!refreshTokenValue) {
                        throw new Error('No refresh token');
                    }

                    const res = await axios.post(
                        `${instance.defaults.baseURL}/refresh-token`,
                        { refreshToken: refreshTokenValue }
                    );

                    const responseData = res?.data || res;
                    if (responseData?.errCode === 0 && responseData?.accessToken) {
                        localStorage.setItem('accessToken', responseData.accessToken);
                        if (responseData.refreshToken) {
                            localStorage.setItem('refreshToken', responseData.refreshToken);
                        }

                        instance.defaults.headers.common['Authorization'] = `Bearer ${responseData.accessToken}`;
                        processQueue(null, responseData.accessToken);

                        originalRequest.headers.Authorization = `Bearer ${responseData.accessToken}`;
                        return instance(originalRequest);
                    } else {
                        throw new Error('Refresh failed');
                    }
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    // Clear auth state and redirect to login
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('authUser');
                    localStorage.removeItem('userId');
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }

            if (status === 429) {
                return Promise.reject({ 
                    status: 429, 
                    message: data.errMessage || data.error || "Quá nhiều yêu cầu, vui lòng thử lại sau"
                });
            }

            if (status === 400) {
                return Promise.reject(data);
            }

            return Promise.reject(data || error);
        }
        return Promise.reject(error);
    }
);

export default instance;

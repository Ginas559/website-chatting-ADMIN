import axios from "axios";

const instance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || "/api",
});

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
    (error) => {
        if (error.response) {
            const { status, data } = error.response;

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

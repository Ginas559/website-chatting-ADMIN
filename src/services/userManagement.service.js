import axios from '../util/axios.customize';

const userManagementService = {
    listUsers: () => axios.get('/admin/users', { baseURL: '' }),
    createUser: (data) => axios.post('/admin/users', data, { baseURL: '' }),
    updateUser: (id, data) => axios.put(`/admin/users/${id}`, data, { baseURL: '' }),
    deleteUser: (id) => axios.delete(`/admin/users/${id}`, { baseURL: '' })
};

export default userManagementService;
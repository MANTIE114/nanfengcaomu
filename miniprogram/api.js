const API_BASE = 'http://192.168.3.8:3000/api';

const request = (path, method = 'GET', data = {}) => {
    return new Promise((resolve, reject) => {
        wx.request({
            url: `${API_BASE}${path}`,
            method: method,
            data: data,
            header: {
                'content-type': 'application/json',
                'x-user-id': wx.getStorageSync('user_id') || ''
            },
            success(res) {
                if (res.statusCode === 200 && res.data.success) {
                    resolve(res.data.data !== undefined ? res.data.data : res.data);
                } else {
                    reject(res.data);
                }
            },
            fail(err) {
                reject(err);
            }
        });
    });
};

module.exports = {
    login: (code) => request('/auth/login', 'POST', { code }),
    getProfile: () => request('/users/profile'),
    getCategories: () => request('/categories'),
    getProducts: (categoryId) => request(`/products${categoryId ? '?categoryId=' + categoryId : ''}`),
    getProductDetail: (id) => request(`/products/${id}`),
    getCart: () => request('/cart'),
    addToCart: (productId, quantity) => request('/cart', 'POST', { productId, quantity }),
    createOrder: (data) => request('/orders', 'POST', data),
    getOrders: () => request('/orders')
};

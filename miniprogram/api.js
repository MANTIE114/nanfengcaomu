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
    API_BASE,
    login: (code) => request('/auth/login', 'POST', { code }),
    getProfile: () => request('/users/profile'),
    getCategories: () => request('/categories'),
    getProducts: (categoryId) => request(`/products${categoryId ? '?categoryId=' + categoryId : ''}`),
    getProductDetail: (id) => request(`/products/${id}`),
    getCart: () => request('/cart'),
    addToCart: (productId, quantity) => request('/cart', 'POST', { productId, quantity }),
    updateCartItem: (id, quantity) => request(`/cart/${id}`, 'PUT', { quantity }),
    deleteCartItem: (id) => request(`/cart/${id}`, 'DELETE'),
    createOrder: (data) => request('/orders', 'POST', data),
    getOrders: () => request('/orders'),
    getOrderDetail: (id) => request(`/orders/${id}`),
    payOrder: (id) => request(`/orders/${id}/pay`, 'POST'),
    getAddresses: () => request('/addresses'),
    createAddress: (data) => request('/addresses', 'POST', data),
    updateAddress: (id, data) => request(`/addresses/${id}`, 'PUT', data),
    deleteAddress: (id) => request(`/addresses/${id}`, 'DELETE'),
    applyRefund: (data) => request('/refunds/apply', 'POST', data),
    getRefundStatus: (orderId) => request(`/refunds/${orderId}`),
    withdrawRefund: (orderId) => request(`/refunds/${orderId}`, 'DELETE'),
    confirmReceipt: (id) => request(`/orders/${id}/confirm`, 'POST'),
    cancelOrder: (id) => request(`/orders/${id}/cancel`, 'POST'),
    deleteOrderFromUserView: (id) => request(`/orders/${id}/user-delete`, 'POST')
};

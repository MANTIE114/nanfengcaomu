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

const getBaseUrl = () => API_BASE.replace('/api', '');

const imgUrl = (path) => {
    // If no path is provided, use a high-quality Zen themed placeholder from a remote CDN
    const fallback = 'https://picsum.photos/seed/zen/800/800';
    if (!path) return fallback;
    if (path.startsWith('http')) return path;
    const base = getBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
};

module.exports = {
    API_BASE,
    imgUrl,
    getBaseUrl,
    login: (code) => request('/auth/login', 'POST', { code }),
    getFavoriteStatus: (productId) => request(`/favorites/status?productId=${productId}`),
    toggleFavorite: (productId) => request('/favorites/toggle', 'POST', { productId }),
    getProfile: () => request('/users/profile'),
    updateProfile: (data) => request('/users/profile', 'PUT', data),
    uploadFile: (filePath) => {
        return new Promise((resolve, reject) => {
            wx.uploadFile({
                url: `${API_BASE}/upload`,
                filePath: filePath,
                name: 'file',
                header: {
                    'x-user-id': wx.getStorageSync('user_id') || ''
                },
                success(res) {
                    const data = JSON.parse(res.data);
                    if (data.success) resolve(data);
                    else reject(data);
                },
                fail: reject
            });
        });
    },
    getFavoritesList: () => request('/favorites/list'),
    getCategories: () => request('/categories'),
    getProducts: (params) => {
        let query = '';
        if (params) {
            const keys = Object.keys(params).filter(k => params[k] !== null && params[k] !== undefined && params[k] !== '');
            if (keys.length > 0) {
                query = '?' + keys.map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
            }
        }
        return request(`/products${query}`);
    },
    getProductDetail: (id) => request(`/products/${id}`),
    getCart: () => request('/cart'),
    addToCart: (productId, quantity) => request('/cart', 'POST', { productId, quantity }),
    updateCartItem: (id, quantity) => request(`/cart/${id}`, 'PUT', { quantity }),
    deleteCartItem: (id) => request(`/cart/${id}`, 'DELETE'),
    createOrder: (data) => request('/orders', 'POST', data),
    getOrders: (params) => request('/orders', 'GET', params),
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

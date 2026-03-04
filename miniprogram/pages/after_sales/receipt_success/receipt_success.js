// pages/after_sales/receipt_success/receipt_success.js
const api = require('../../../api.js');

Page({
    data: {
        orderId: '',
        recommendations: []
    },

    onLoad(options) {
        const { orderId } = options;
        this.setData({ orderId });
        this.fetchRecommendations();
    },

    fetchRecommendations() {
        api.getProducts().then(products => {
            // Show some random products as recommendations
            const shuffled = products.sort(() => 0.5 - Math.random());
            this.setData({ recommendations: shuffled.slice(0, 4) });
        }).catch(console.error);
    },

    goHome() {
        wx.switchTab({ url: '/pages/index/index' });
    },

    viewOrder() {
        wx.redirectTo({
            url: '/pages/orders/orders'
        });
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/detail/detail?id=${id}`
        });
    }
})

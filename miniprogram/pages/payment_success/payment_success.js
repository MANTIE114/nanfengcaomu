// pages/payment_success/payment_success.js
Page({
    data: {
        orderId: null
    },

    onLoad(options) {
        if (options.id) {
            this.setData({ orderId: options.id });
        }
    },

    goToOrderDetail() {
        if (!this.data.orderId) {
            wx.switchTab({ url: '/pages/profile/profile' });
            return;
        }
        wx.redirectTo({
            url: '/pages/order_detail/order_detail?id=' + this.data.orderId
        });
    },

    goToHome() {
        wx.switchTab({
            url: '/pages/index/index'
        });
    }
})

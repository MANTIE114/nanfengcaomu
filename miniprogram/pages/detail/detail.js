const api = require('../../api.js');

Page({
    data: {
        product: {}
    },
    onLoad(options) {
        if (options.id) {
            this.fetchDetail(options.id);
        }
    },
    fetchDetail(id) {
        api.getProductDetail(id).then(data => {
            this.setData({
                product: data
            })
        }).catch(console.error);
    },
    addToCart(callback) {
        if (!this.data.product || !this.data.product.id) return;

        wx.showLoading({ title: '添加中...' });
        api.addToCart(this.data.product.id, 1).then(res => {
            wx.hideLoading();
            wx.showToast({
                title: '加入成功',
                icon: 'success',
                duration: 1500
            });
            if (typeof callback === 'function') {
                setTimeout(() => { callback(); }, 1000);
            }
        }).catch(err => {
            wx.hideLoading();
            wx.showToast({ title: '加入失败，请重试', icon: 'none' });
            console.error(err);
        });
    },
    buyNow() {
        this.addToCart(() => {
            wx.switchTab({
                url: '/pages/cart/cart'
            });
        });
    },
    switchTab(e) {
        wx.switchTab({
            url: e.currentTarget.dataset.url
        });
    }
})

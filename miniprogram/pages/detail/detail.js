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
        if (!this.data.product) return;
        wx.showLoading({ title: '单据生成中...' });
        const items = [{
            productId: this.data.product.id,
            quantity: 1,
            price: this.data.product.price
        }];
        api.createOrder({ items }).then(data => {
            wx.hideLoading();
            wx.navigateTo({
                url: '/pages/order_detail/order_detail?id=' + data.orderId
            });
        }).catch(err => {
            wx.hideLoading();
            console.error(err);
            wx.showToast({ title: '生成失败', icon: 'error' });
        });
    },
    switchTab(e) {
        wx.switchTab({
            url: e.currentTarget.dataset.url
        });
    }
})

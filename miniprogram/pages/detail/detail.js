const api = require('../../api.js');

Page({
    data: {
        product: {},
        isFavorited: false,
        reviews: []
    },
    onLoad(options) {
        if (options.id) {
            this.fetchDetail(options.id);
            this.fetchFavoriteStatus(options.id);
            this.fetchReviews(options.id);
        }
    },
    fetchDetail(id) {
        api.getProductDetail(id).then(data => {
            if (data) {
                data.cover_image = api.imgUrl(data.cover_image);
            }
            this.setData({
                product: data
            })
        }).catch(console.error);
    },
    fetchFavoriteStatus(id) {
        api.getFavoriteStatus(id).then(res => {
            this.setData({ isFavorited: res.isFavorited });
        });
    },
    fetchReviews(id) {
        api.getProductReviews(id).then(res => {
            if (res.success && res.data) {
                // Parse date for display
                const reviews = res.data.map(r => ({
                    ...r,
                    displayTime: (r.create_time || '').split(' ')[0]
                }));
                this.setData({ reviews });
            }
        }).catch(console.error);
    },
    toggleFavorite() {
        if (!this.data.product.id) return;
        api.toggleFavorite(this.data.product.id).then(res => {
            this.setData({ isFavorited: res.isFavorited });
            wx.showToast({
                title: res.isFavorited ? '已收藏' : '已取消收藏',
                icon: 'none'
            });
        });
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

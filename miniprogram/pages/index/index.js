const api = require('../../api.js');

Page({
    data: {
        products: []
    },
    onLoad() {
        this.fetchProducts();
    },
    onShow() {
        // Re-fetch products every time the tab becomes active to ensure data is fresh
        this.fetchProducts();
    },
    onPullDownRefresh() {
        this.fetchProducts(() => {
            wx.stopPullDownRefresh();
            wx.showToast({ title: '已更新', icon: 'success', duration: 1000 });
        });
    },
    fetchProducts(callback) {
        api.getProducts().then(data => {
            this.setData({
                products: data
            }, () => {
                if (typeof callback === 'function') callback();
            })
        }).catch(err => {
            console.error(err);
            if (typeof callback === 'function') callback();
        });
    },
    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: '/pages/detail/detail?id=' + id
        });
    }
})

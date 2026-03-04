const api = require('../../api.js');

Page({
    data: {
        products: []
    },
    onLoad() {
        this.fetchProducts();
    },
    fetchProducts() {
        api.getProducts().then(data => {
            this.setData({
                products: data
            })
        }).catch(console.error);
    },
    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: '/pages/detail/detail?id=' + id
        });
    }
})

const api = require('../../api.js');

Page({
    data: {
        products: [],
        categories: [],
        topCategories: [],
        selectedCategoryId: 0 // 0 means 'All'
    },
    onLoad() {
        this.fetchCategories();
        this.fetchProducts();
    },
    onShow() {
        // Data is initialzied in onLoad and manually updated via PullDownRefresh.
        // Avoid re-fetching in onShow to preserve scroll position when returning from Detail.
    },
    onPullDownRefresh() {
        // Tactile feedback for starting refresh
        Promise.all([this.fetchCategories(), this.fetchProducts()]).then(() => {
            wx.stopPullDownRefresh();
            wx.vibrateShort({ type: 'light' });
            wx.showToast({
                title: '禅意已更新',
                icon: 'success',
                duration: 1000
            });
        }).catch(() => {
            wx.stopPullDownRefresh();
        });
    },
    fetchCategories() {
        return api.getCategories().then(data => {
            const enriched = (data || []).map(cat => ({
                ...cat,
                displayImage: api.imgUrl(cat.image)
            }));
            this.setData({
                categories: enriched,
                topCategories: enriched.filter(c => c.is_top === 1)
            });
        }).catch(err => console.error('Fetch categories failed:', err));
    },
    fetchProducts(callback) {
        const { selectedCategoryId } = this.data;
        const cid = selectedCategoryId === 0 ? null : selectedCategoryId;

        return api.getProducts({ categoryId: cid }).then(data => {
            const enriched = (data || []).map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                subtitle: p.subtitle,
                description: p.description,
                category_id: p.category_id,
                cover_image: api.imgUrl(p.cover_image)
            }));

            this.setData({
                products: enriched
            }, () => {
                if (typeof callback === 'function') callback();
            })
        }).catch(err => {
            console.error(err);
            if (typeof callback === 'function') callback();
        });
    },
    selectCategory(e) {
        const id = e.currentTarget.dataset.id;
        this.setData({ selectedCategoryId: id }, () => {
            this.fetchProducts();
        });
    },
    goToCategoryPage(e) {
        const id = e.currentTarget.dataset.id;
        const app = getApp();
        app.globalData.jumpCategoryId = id;
        wx.switchTab({
            url: '/pages/category/category'
        });
    },
    goToSearch() {
        wx.navigateTo({
            url: '/pages/search/search'
        });
    },
    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: '/pages/detail/detail?id=' + id
        });
    }
})

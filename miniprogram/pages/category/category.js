const api = require('../../api.js');

Page({
    data: {
        categories: [],
        activeCategoryId: null,
        activeCategory: null,
        products: [],
        isLoading: true
    },

    onLoad(options) {
        const { id } = options;
        this.fetchCategories(id ? parseInt(id) : null);
    },

    onShow() {
        const app = getApp();
        if (app.globalData && app.globalData.jumpCategoryId) {
            const id = app.globalData.jumpCategoryId;
            delete app.globalData.jumpCategoryId; // Clear it
            this.handleJump(id);
        }
    },
    handleJump(id) {
        // If data is already loaded, switch
        if (this.data.categories.length > 0) {
            const activeCat = this.data.categories.find(c => c.id === id);
            this.setData({
                activeCategoryId: id,
                activeCategory: activeCat || this.data.categories[0]
            }, () => {
                this.fetchProducts(id);
            });
        } else {
            // Otherwise, fetch with this id
            this.fetchCategories(id);
        }
    },

    fetchCategories(initialId) {
        this.setData({ isLoading: true });
        api.getCategories().then(data => {
            if (data && data.length > 0) {
                // Prune category data
                const prunedCats = (data || []).map(c => ({
                    id: c.id,
                    name: c.name,
                    subtitle: c.subtitle,
                    image: api.imgUrl(c.image)
                }));

                const activeId = initialId ? parseInt(initialId) : prunedCats[0].id;
                const activeCat = prunedCats.find(c => c.id === activeId) || prunedCats[0];

                this.setData({
                    categories: prunedCats,
                    activeCategoryId: activeId,
                    activeCategory: activeCat
                }, () => {
                    this.fetchProducts(activeId);
                });
            } else {
                this.setData({ isLoading: false });
            }
        }).catch(err => {
            console.error(err);
            this.setData({ isLoading: false });
        });
    },

    fetchProducts(categoryId) {
        this.setData({ isLoading: true });
        api.getProducts({ categoryId }).then(data => {
            // Prune product data: only keep fields used in wxml
            const enriched = (data || []).map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                cover_image: api.imgUrl(p.cover_image)
            }));
            this.setData({
                products: enriched,
                isLoading: false
            });
        }).catch(err => {
            console.error(err);
            this.setData({ isLoading: false });
        });
    },

    switchCategory(e) {
        const id = e.currentTarget.dataset.id;
        if (id === this.data.activeCategoryId) return;

        const activeCat = this.data.categories.find(c => c.id === id);
        this.setData({
            activeCategoryId: id,
            activeCategory: activeCat,
            products: [] // Clear previous products to show loading state
        }, () => {
            this.fetchProducts(id);
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

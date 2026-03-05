const api = require('../../api.js');

Page({
    data: {
        products: []
    },
    onLoad() {
        this.fetchFavorites();
    },
    onShow() {
        // Refresh when returning from detail page
        this.fetchFavorites();
    },
    fetchFavorites() {
        api.getFavoritesList().then(data => {
            const enriched = (data || []).map(p => ({
                ...p,
                cover_image: api.imgUrl(p.cover_image)
            }));
            this.setData({
                products: enriched
            });
        }).catch(err => {
            console.error('Failed to load collections', err);
        });
    },
    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
    },
    toggleFavorite(e) {
        // Prevent the tap from also triggering goToDetail
        e.stopPropagation && e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        api.toggleFavorite(id).then(res => {
            if (res && res.success) {
                // Update local state
                const updated = this.data.products.map(p => {
                    // Match loosely just in case dataset parses ID as string
                    if (String(p.id) === String(id)) {
                        return null;
                    }
                    return p;
                }).filter(Boolean);
                this.setData({ products: updated });
                wx.showToast({
                    title: res.isFavorited ? '已收藏' : '已取消收藏',
                    icon: 'none'
                });
            }
        }).catch(err => {
            console.error('Toggle favorite error', err);
        });
    }
});

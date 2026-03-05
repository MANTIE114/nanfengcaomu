const api = require('../../api.js');

Page({
    data: {
        keyword: '',
        products: [],
        isLoading: false,
        searchPerformed: false
    },

    onInput(e) {
        this.setData({
            keyword: e.detail.value
        });
        // Optional: Real-time search with debounce
        if (!e.detail.value) {
            this.setData({ products: [], searchPerformed: false });
        }
    },

    onSearch() {
        const { keyword } = this.data;
        if (!keyword.trim()) return;

        this.setData({ isLoading: true, searchPerformed: true });

        api.getProducts({ keyword: keyword.trim() }).then(data => {
            const enriched = (data || []).map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                subtitle: p.subtitle,
                cover_image: api.imgUrl(p.cover_image)
            }));
            this.setData({
                products: enriched,
                isLoading: false
            });
        }).catch(err => {
            console.error(err);
            this.setData({ isLoading: false });
            wx.showToast({ title: '搜索失败', icon: 'none' });
        });
    },

    onClear() {
        this.setData({
            keyword: '',
            products: [],
            searchPerformed: false
        });
    },

    onCancel() {
        wx.navigateBack();
    },

    tapTag(e) {
        const val = e.currentTarget.dataset.val;
        this.setData({ keyword: val }, () => {
            this.onSearch();
        });
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: '/pages/detail/detail?id=' + id
        });
    }
})

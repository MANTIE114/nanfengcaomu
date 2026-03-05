// pages/orders/orders.js
const api = require('../../api.js');

const TABS = [
    { label: '全部', status: -1 },
    { label: '待付款', status: 0 },
    { label: '待发货', status: 1 },
    { label: '待收货', status: 2 },
    { label: '已完成', status: 3 },
    { label: '售后', status: 4 }
];

Page({
    data: {
        tabs: TABS,
        activeTab: -1,
        allOrders: [],
        filteredOrders: [],
        page: 1,
        pageSize: 5,
        hasMore: true,
        isLoading: true,
        showReviewModal: false,
        reviewOrderId: null,
        rating: 5,
        reviewContent: ''
    },

    onLoad(options) {
        // 支持从 profile 页按 status 跳入，如 ?status=0
        const status = options.status !== undefined ? parseInt(options.status) : -1;
        this.setData({ activeTab: status });
        this.fetchOrders(true);
    },

    onShow() {
        // Only fetch at startup if it's the first time
    },

    onPullDownRefresh() {
        this.fetchOrders(true).then(() => {
            wx.stopPullDownRefresh();
        });
    },

    onReachBottom() {
        if (this.data.hasMore && !this.data.isLoading) {
            this.fetchOrders(false);
        }
    },

    fetchOrders(isRefresh = true) {
        if (isRefresh) {
            this.setData({ page: 1, hasMore: true, allOrders: [], filteredOrders: [], isLoading: true });
        } else {
            this.setData({ isLoading: true });
        }

        const { page, pageSize } = this.data;

        return api.getOrders({ page, pageSize }).then(orders => {
            const enriched = this.enrichOrders(orders || []);

            if (isRefresh) {
                this.setData({
                    allOrders: enriched,
                    filteredOrders: this.getFilteredOrders(enriched, this.data.activeTab),
                    page: 2,
                    hasMore: enriched.length === pageSize,
                    isLoading: false
                });
            } else {
                // Append using index path to avoid huge payload on one setData
                const prevCount = this.data.allOrders.length;
                const newData = {};
                enriched.forEach((item, index) => {
                    newData[`allOrders[${prevCount + index}]`] = item;
                });

                const nextAllOrders = [...this.data.allOrders, ...enriched];
                newData.filteredOrders = this.getFilteredOrders(nextAllOrders, this.data.activeTab);
                newData.page = page + 1;
                newData.hasMore = enriched.length === pageSize;
                newData.isLoading = false;

                this.setData(newData);
            }
        }).catch(err => {
            this.setData({ isLoading: false });
            console.error(err);
        });
    },



    enrichOrders(orders) {
        return orders.map(order => {
            // 格式化时间
            let timeStr = '';
            try {
                // ISO format: yyyy-MM-ddTHH:mm:ssZ
                const isoTime = (order.create_time || '').replace(' ', 'T') + 'Z';
                const d = new Date(isoTime);
                const utc8 = new Date(d.getTime() + 8 * 60 * 60 * 1000);
                timeStr = utc8.toISOString().replace('T', ' ').substring(0, 16);
            } catch (e) { timeStr = order.create_time || ''; }

            let preview = [];
            let imgUrl = order.cover_image;

            if (imgUrl) {
                // If it's a relative path like /assets/..., prepend the server domain
                if (imgUrl.startsWith('/') && !imgUrl.startsWith('data:')) {
                    const domain = api.API_BASE.replace('/api', '');
                    imgUrl = domain + imgUrl;
                }
                preview = [{ cover_image: imgUrl }];
            }

            if (preview.length === 0) {
                preview = [{ cover_image: 'https://img.icons8.com/ios/100/b42222/image.png' }];
            }

            // PERFORMANCE OPTIMIZATION: Only return fields used in WXML
            // This prevents huge base64 strings from being sent multiple times or as unused fields
            return {
                id: order.id,
                order_no: order.order_no,
                status: order.status,
                total_amount: order.total_amount,
                create_time: timeStr,
                previewItems: preview, // The only place where imgUrl stays
                itemCount: order.total_quantity || 1,
                firstName: order.first_product_name || '手工雅香',
                firstSpec: order.first_product_spec || '古法手作',
                is_reviewed: order.is_reviewed || 0
            };
        });
    },

    getFilteredOrders(orders, tab) {
        if (tab === -1) return orders;
        if (tab === 4) {
            return orders.filter(o => o.status === 4 || o.status === 5);
        }
        return orders.filter(o => o.status === tab);
    },

    applyFilter() {
        const filtered = this.getFilteredOrders(this.data.allOrders, this.data.activeTab);
        this.setData({ filteredOrders: filtered });
    },

    switchTab(e) {
        const status = e.currentTarget.dataset.status;
        if (this.data.activeTab === status) return;

        this.setData({
            activeTab: status,
            isLoading: true, // Ensure loading starts immediately
            filteredOrders: [], // Clear view immediately to show loader
            scrollTop: 0
        });

        // Refresh data on tab switch
        this.fetchOrders(true);
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        const order = this.data.allOrders.find(o => o.id === id);

        // If it's an after-sales order, we might want to go to special pages
        if (order && order.status === 4) {
            wx.navigateTo({ url: `/pages/after_sales/progress/progress?orderId=${id}` });
        } else if (order && order.status === 5) {
            wx.navigateTo({ url: `/pages/after_sales/details/details?orderId=${id}` });
        } else {
            wx.navigateTo({ url: '/pages/order_detail/order_detail?id=' + id });
        }
    },

    goHome() {
        wx.switchTab({ url: '/pages/index/index' });
    },

    payOrder(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: '/pages/order_detail/order_detail?id=' + id });
    },

    cancelOrder(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '取消订单',
            content: '确定要取消这份香品订单吗？',
            confirmColor: '#b42222',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '取消中...' });
                    api.cancelOrder(id).then(() => {
                        wx.hideLoading();
                        wx.showToast({ title: '订单已取消', icon: 'success' });
                        this.fetchOrders();
                    }).catch(err => {
                        wx.hideLoading();
                        wx.showToast({ title: '取消失败', icon: 'none' });
                    });
                }
            }
        });
    },

    deleteOrder(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '删除订单',
            content: '订单删除后将不再在列表中显示，确定删除吗？',
            confirmColor: '#b42222',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '删除中...' });
                    api.deleteOrderFromUserView(id).then(() => {
                        wx.hideLoading();
                        wx.showToast({ title: '已删除', icon: 'success' });
                        this.fetchOrders();
                    }).catch(err => {
                        wx.hideLoading();
                        wx.showToast({ title: '删除失败', icon: 'none' });
                    });
                }
            }
        });
    },

    applyRefund(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/pages/after_sales/apply/apply?orderId=${id}` });
    },

    viewRefund(e) {
        const id = e.currentTarget.dataset.id;
        const status = e.currentTarget.dataset.status;
        if (status === 4) {
            wx.navigateTo({ url: `/pages/after_sales/progress/progress?orderId=${id}` });
        } else if (status === 5) {
            wx.navigateTo({ url: `/pages/after_sales/details/details?orderId=${id}` });
        }
    },

    confirmReceive(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认收货',
            content: '确认已收到香品？收货后将完成订单。',
            confirmColor: '#b42222',
            confirmText: '确认收货',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '处理中...' });
                    api.confirmReceipt(id).then(() => {
                        wx.hideLoading();
                        wx.navigateTo({
                            url: `/pages/after_sales/receipt_success/receipt_success?orderId=${id}`
                        });
                    }).catch(err => {
                        wx.hideLoading();
                        wx.showToast({ title: '操作失败', icon: 'none' });
                    });
                }
            }
        });
    },

    rebuy(e) {
        wx.showToast({ title: '已加入香蓝', icon: 'success' });
    },

    // --- Review Handlers ---
    openReviewModal(e) {
        this.setData({
            showReviewModal: true,
            reviewOrderId: e.currentTarget.dataset.id,
            rating: 5,
            reviewContent: ''
        });
    },

    closeReviewModal() {
        this.setData({ showReviewModal: false, reviewOrderId: null });
    },

    preventDumb() {
        // Prevent event bubbling so clicking inner content won't close modal
    },

    setRating(e) {
        this.setData({ rating: e.currentTarget.dataset.val });
    },

    onReviewInput(e) {
        this.setData({ reviewContent: e.detail.value });
    },

    submitReview() {
        const { reviewOrderId, rating, reviewContent } = this.data;
        if (!reviewContent.trim()) {
            return wx.showToast({ title: '评论内容不能为空', icon: 'none' });
        }

        wx.showLoading({ title: '提交中...' });
        api.submitReview(reviewOrderId, { rating, content: reviewContent }).then(res => {
            wx.hideLoading();
            if (res.success) {
                wx.showToast({ title: '评价成功', icon: 'success' });
                this.closeReviewModal();
                this.fetchOrders(true); // reload to hit the server and update is_reviewed
            } else {
                wx.showToast({ title: res.message || '评价失败', icon: 'none' });
            }
        }).catch(err => {
            wx.hideLoading();
            wx.showToast({ title: '评价失败', icon: 'none' });
        });
    }
});

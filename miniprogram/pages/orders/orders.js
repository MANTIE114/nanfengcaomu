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
        filteredOrders: []
    },

    onLoad(options) {
        // 支持从 profile 页按 status 跳入，如 ?status=0
        const status = options.status !== undefined ? parseInt(options.status) : -1;
        this.setData({ activeTab: status });
    },

    onShow() {
        this.fetchOrders();
    },

    fetchOrders() {
        wx.showLoading({ title: '加载中...' });
        api.getOrders().then(orders => {
            wx.hideLoading();
            const enriched = this.enrichOrders(orders || []);
            this.setData({ allOrders: enriched });
            this.applyFilter();
        }).catch(err => {
            wx.hideLoading();
            console.error(err);
        });
    },

    enrichOrders(orders) {
        return orders.map(order => {
            // 格式化时间
            let timeStr = '';
            try {
                const d = new Date(order.create_time + 'Z');
                const utc8 = new Date(d.getTime() + 8 * 60 * 60 * 1000);
                timeStr = utc8.toISOString().replace('T', ' ').substring(0, 16);
            } catch (e) { timeStr = order.create_time || ''; }

            let preview = [];
            let imgUrl = order.cover_image;

            if (imgUrl) {
                // If it's a relative path like /assets/..., prepend the server domain
                if (imgUrl.startsWith('/') && !imgUrl.startsWith('data:')) {
                    // Get API_BASE domain part (e.g., http://192.168.3.8:3000)
                    const domain = api.API_BASE.replace('/api', '');
                    imgUrl = domain + imgUrl;
                }
                preview = [{ cover_image: imgUrl }];
            }

            if (preview.length === 0) {
                // High quality placeholder icon
                preview = [{ cover_image: 'https://img.icons8.com/ios/100/b42222/image.png' }];
            }

            return {
                ...order,
                create_time: timeStr,
                previewItems: preview,
                itemCount: order.total_quantity || 1,
                firstName: order.first_product_name || '手工雅香',
                firstSpec: order.first_product_spec || '古法手作'
            };
        });
    },

    applyFilter() {
        const { allOrders, activeTab } = this.data;
        let filtered;
        if (activeTab === -1) {
            filtered = allOrders;
        } else if (activeTab === 4) {
            // Include both 4 (Refunding) and 5 (Refunded) under After-sales tab
            filtered = allOrders.filter(o => o.status === 4 || o.status === 5);
        } else {
            filtered = allOrders.filter(o => o.status === activeTab);
        }
        this.setData({ filteredOrders: filtered });
    },

    switchTab(e) {
        const status = e.currentTarget.dataset.status;
        this.setData({
            activeTab: status,
            scrollTop: 0 // Reset scroll position
        });
        // Refresh data on tab switch
        this.fetchOrders();
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
    }
});

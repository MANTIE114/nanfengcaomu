// pages/after_sales/details/details.js
const api = require('../../../api.js');

Page({
    data: {
        orderItem: null,
        refundAmount: ''
    },

    onLoad(options) {
        const { orderId } = options;
        if (orderId) {
            this.fetchOrderDetails(orderId);
            this.fetchRefundStatus(orderId);
        }
    },

    fetchOrderDetails(id) {
        api.getOrderDetail(id).then(data => {
            if (data && data.items) {
                this.setData({
                    orderItem: data.items[0]
                });
            }
        }).catch(console.error);
    },

    fetchRefundStatus(id) {
        api.getRefundStatus(id).then(data => {
            if (data) {
                // Formatting times
                const formatTime = (ts) => {
                    if (!ts) return '';
                    try {
                        const d = new Date(ts.includes('T') ? ts : ts + 'Z');
                        const offset = new Date(d.getTime() + 8 * 60 * 60 * 1000);
                        return offset.toISOString().replace('T', ' ').substring(0, 16);
                    } catch (e) { return ts; }
                };

                data.formatted_create_time = formatTime(data.create_time);
                data.formatted_process_time = formatTime(data.process_time);

                // For demonstration, use process_time + some offset for 'refund credited' if needed, 
                // but since we only have two timestamps in DB, we'll map them carefully.
                // Status 2 means completed.

                this.setData({
                    refundInfo: data,
                    refundAmount: (data.refund_amount || 0).toFixed(2)
                });
            }
        }).catch(err => {
            console.error('[DETAILS] error fetching refund status:', err);
        });
    },

    goHome() {
        wx.switchTab({
            url: '/pages/index/index'
        });
    }
})

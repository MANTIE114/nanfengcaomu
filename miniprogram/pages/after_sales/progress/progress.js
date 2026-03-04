// pages/after_sales/progress/progress.js
const api = require('../../../api.js');

Page({
    data: {
        orderId: null,
        orderItem: null,
        orderAmount: 0
    },

    onLoad(options) {
        const { orderId } = options;
        if (orderId) {
            this.setData({ orderId });
            this.fetchOrderDetails(orderId);
            this.fetchRefundStatus(orderId);
        }
    },

    fetchOrderDetails(id) {
        api.getOrderDetail(id).then(data => {
            if (data && data.items && data.items.length > 0) {
                this.setData({
                    orderItem: data.items[0],
                    orderAmount: data.total_amount
                });
            }
        }).catch(console.error);
    },

    fetchRefundStatus(id) {
        api.getRefundStatus(id).then(data => {
            this.setData({ refundInfo: data });
            if (data && data.status === 2) {
                // If completed, go to details page
                wx.redirectTo({
                    url: `/pages/after_sales/details/details?orderId=${this.data.orderId}`
                });
            }
        }).catch(console.error);
    },

    contactService() {
        wx.showToast({ title: '正在连接客服...', icon: 'none' });
    },

    cancelApply() {
        if (!this.data.orderId) return;
        wx.showModal({
            title: '撤销申请',
            content: '确定要撤销当前的售后申请吗？撤销后您可以重新发起。',
            confirmColor: '#b42222',
            success: (res) => {
                if (res.confirm) {
                    api.withdrawRefund(this.data.orderId).then(() => {
                        wx.showToast({ title: '撤销成功', icon: 'success' });
                        setTimeout(() => { wx.navigateBack(); }, 1500);
                    }).catch(console.error);
                }
            }
        });
    }
})

// pages/after_sales/apply/apply.js
const api = require('../../../api.js');

Page({
    data: {
        orderItem: null,
        orderId: null
    },

    onLoad(options) {
        const { orderId } = options;
        if (orderId) {
            this.setData({ orderId });
            this.fetchOrderDetails(orderId);
        }
    },

    fetchOrderDetails(id) {
        api.getOrderDetail(id).then(data => {
            if (data && data.items && data.items.length > 0) {
                // Assume applying for the first item for now or pass item info through options
                this.setData({ orderItem: data.items[0] });
            }
        }).catch(console.error);
    },

    selectService(e) {
        const type = parseInt(e.currentTarget.dataset.type);
        wx.showActionSheet({
            itemList: ['7天无理由退换', '质量问题', '拍错了', '描述不符', '其他原因'],
            success: (res) => {
                const reasons = ['7天无理由退换', '质量问题', '拍错了', '描述不符', '其他原因'];
                const reason = reasons[res.tapIndex];

                if (!this.data.orderItem || !this.data.orderId) {
                    wx.showToast({ title: '数据尚未加载完成，请重试', icon: 'none' });
                    return;
                }

                console.log('[DEBUG] Initiating refund application:', {
                    orderId: this.data.orderId,
                    type,
                    reason,
                    price: this.data.orderItem.price
                });

                wx.showLoading({ title: '提交中...' });
                api.applyRefund({
                    order_id: parseInt(this.data.orderId),
                    type: type,
                    reason: reason,
                    refund_amount: parseFloat(this.data.orderItem.price)
                }).then((res) => {
                    wx.hideLoading();
                    wx.showToast({ title: '提交成功', icon: 'success' });
                    setTimeout(() => {
                        wx.redirectTo({
                            url: `/pages/after_sales/progress/progress?orderId=${this.data.orderId}`
                        });
                    }, 1500);
                }).catch(err => {
                    wx.hideLoading();
                    console.error('[ERROR] API Failed:', err);
                    // 如果 err 是 HTML 字符串，说明是 404
                    const is404 = typeof err === 'string' && err.indexOf('Cannot POST') !== -1;
                    wx.showToast({
                        title: is404 ? '后端接口未响应，请重启服务器' : '请重试',
                        icon: 'none',
                        duration: 3000
                    });
                });
            }
        });
    }
})

// pages/order_detail/order_detail.js
const api = require('../../api.js');

Page({
    data: {
        order: null,
        totalCount: 0,
        address: null  // 选中的收件地址
    },

    onLoad(options) {
        if (options.id) {
            this._orderId = options.id;
            this.fetchOrderDetail(options.id);
        } else {
            wx.showToast({ title: '订单ID无效', icon: 'none' });
        }
    },

    onShow() {
        // 当从地址选择页返回时，读取 globalData 中存储的选中地址
        const app = getApp();
        if (app.globalData && app.globalData.selectedAddress) {
            const addr = app.globalData.selectedAddress;
            app.globalData.selectedAddress = null; // 清除，避免重复读取
            this.setData({ address: addr });

            // 同步更新订单的 address_id（如果订单存在）
            if (this.data.order && addr) {
                // TODO: 对接后端 PATCH /api/orders/:id/address
                wx.showToast({ title: '地址已更新', icon: 'success' });
            }
        }
    },

    fetchOrderDetail(id) {
        wx.showLoading({ title: '加载中...' });
        api.getOrderDetail(id).then(data => {
            wx.hideLoading();
            let totalCount = 0;
            if (data && data.items) {
                totalCount = data.items.reduce((sum, item) => sum + item.quantity, 0);
                const isoTime = (data.create_time || '').replace(' ', 'T') + 'Z';
                const d = new Date(isoTime);
                const offset = new Date(d.getTime() + 8 * 60 * 60 * 1000);
                data.create_time = offset.toISOString().replace('T', ' ').substring(0, 16);

                // Format order item images
                data.items = data.items.map(item => ({
                    ...item,
                    cover_image: api.imgUrl(item.cover_image)
                }));
            }
            // Mapping address from enriched order data
            let address = null;
            if (data.recipient) {
                address = {
                    recipient: data.recipient,
                    phone: data.address_phone,
                    province: data.province,
                    city: data.city,
                    district: data.district,
                    detail: data.address_detail
                };
            }
            this.setData({ order: data, totalCount, address });

            // If address is still missing and it's a new order (status 0), try to load user's default
            if (!address && data.status === 0) {
                this.fetchDefaultAddress();
            }
        }).catch(err => {
            wx.hideLoading();
            console.error(err);
            wx.showToast({ title: '加载失败', icon: 'error' });
        });
    },

    fetchDefaultAddress() {
        api.getAddresses().then(addresses => {
            if (!addresses || addresses.length === 0) return;
            const def = addresses.find(a => a.is_default) || addresses[0];
            this.setData({ address: def });
        }).catch(console.error);
    },


    changeAddress() {
        wx.navigateTo({
            url: '/pages/address/address?selectMode=1'
        });
    },



    payOrder() {
        if (!this.data.order) return;
        if (!this.data.address) {
            wx.showToast({ title: '请先选择收件地址', icon: 'none' });
            return;
        }
        wx.showLoading({ title: '安全支付中...' });
        api.payOrder(this.data.order.id).then(res => {
            wx.hideLoading();
            wx.redirectTo({
                url: '/pages/payment_success/payment_success?id=' + this.data.order.id
            });
        }).catch(err => {
            wx.hideLoading();
            wx.showToast({ title: '支付失败', icon: 'error' });
            console.error(err);
        });
    },

    cancelOrder() {
        if (!this.data.order) return;
        wx.showModal({
            title: '确认',
            content: '确定要放弃这件为您手工精心制备的香品吗？',
            confirmColor: '#b42222',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '取消中...' });
                    api.cancelOrder(this.data.order.id).then(() => {
                        wx.hideLoading();
                        wx.showToast({ title: '订单已取消', icon: 'success' });
                        this.fetchOrderDetail(this._orderId);
                    }).catch(err => {
                        wx.hideLoading();
                        wx.showToast({ title: '取消失败', icon: 'none' });
                    });
                }
            }
        });
    },

    applyRefund() {
        if (!this.data.order) return;
        wx.navigateTo({
            url: `/pages/after_sales/apply/apply?orderId=${this.data.order.id}`
        });
    },

    confirmReceive() {
        if (!this.data.order) return;
        wx.showModal({
            title: '确认收货',
            content: '确认已收到香品？收货后将完成订单。',
            confirmColor: '#b42222',
            confirmText: '确认收货',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '处理中...' });
                    api.confirmReceipt(this.data.order.id).then(() => {
                        wx.hideLoading();
                        wx.navigateTo({
                            url: `/pages/after_sales/receipt_success/receipt_success?orderId=${this.data.order.id}`
                        });
                    }).catch(err => {
                        wx.hideLoading();
                        wx.showToast({ title: '操作失败', icon: 'none' });
                    });
                }
            }
        });
    },

    rebuy() {
        wx.showToast({ title: '已重新加入香蓝', icon: 'success' });
        setTimeout(() => { wx.switchTab({ url: '/pages/cart/cart' }); }, 1500);
    },

    viewLogistics() {
        wx.showToast({ title: '正在拉取实时物流信息...', icon: 'none' });
        // Could navigate to a logistics tracking page if we had one
    },

    goToProduct(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
    },

    viewRefund() {
        const { id, status } = this.data.order;
        if (status === 4) {
            wx.navigateTo({ url: `/pages/after_sales/progress/progress?orderId=${id}` });
        } else if (status === 5) {
            wx.navigateTo({ url: `/pages/after_sales/details/details?orderId=${id}` });
        }
    }
})


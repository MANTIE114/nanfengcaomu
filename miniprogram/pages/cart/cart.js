const api = require('../../api.js');

Page({
    data: {
        cartItems: [],
        totalPrice: 0,
        totalCount: 0
    },
    onShow() {
        this.fetchCart();
    },
    fetchCart() {
        api.getCart().then(data => {
            const enriched = (data || []).map(item => ({
                ...item,
                p_image: api.imgUrl(item.p_image)
            }));
            this.setData({ cartItems: enriched }, () => {
                this.calculateTotal();
            });
        }).catch(console.error);
    },
    calculateTotal() {
        let total = 0;
        let count = 0;
        this.data.cartItems.forEach(item => {
            total += item.price * item.quantity;
            count += item.quantity;
        });
        this.setData({ totalPrice: total, totalCount: count });
    },
    removeCartItem(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认移除',
            content: '确定要从香蓝中移除该香品吗？',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '处理中...' });
                    api.deleteCartItem(id).then(() => {
                        wx.hideLoading();
                        this.fetchCart();
                    }).catch(console.error);
                }
            }
        });
    },
    updateQty(e) {
        const { id, action } = e.currentTarget.dataset;
        const item = this.data.cartItems.find(i => i.id === id);
        if (!item) return;
        let newQty = item.quantity + parseInt(action, 10);
        if (newQty <= 0) {
            this.removeCartItem({ currentTarget: { dataset: { id } } });
        } else {
            wx.showLoading({ title: '处理中...' });
            api.updateCartItem(id, newQty).then(() => {
                wx.hideLoading();
                this.fetchCart();
            }).catch(console.error);
        }
    },
    checkout() {
        // simple create order logic
        if (this.data.cartItems.length === 0) {
            wx.showToast({ title: '购物车为空', icon: 'none' });
            return;
        }
        const items = this.data.cartItems.map(item => ({
            productId: item.product_id,
            quantity: item.quantity,
            price: item.price
        }));

        api.createOrder({ addressId: 1, items }).then(data => {
            wx.showToast({ title: '订单生成成功', icon: 'success' });

            // Fire and forget batch delete cart items on backend
            this.data.cartItems.forEach(item => api.deleteCartItem(item.id));
            // Clear cart immediately on frontend
            this.setData({ cartItems: [], totalCount: 0, totalPrice: 0 });

            // Navigate to the new order detail page
            setTimeout(() => {
                wx.navigateTo({ url: '/pages/order_detail/order_detail?id=' + data.orderId });
            }, 1000);
        }).catch(console.error);
    }
})

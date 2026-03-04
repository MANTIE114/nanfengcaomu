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
            this.setData({ cartItems: data }, () => {
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
            wx.showToast({ title: '订单已生成', icon: 'success' });
            // clear cart locally (would need an API endpoint to clear cart actually, but for brevity we'll redirect)
            setTimeout(() => {
                wx.switchTab({ url: '/pages/profile/profile' });
            }, 1500);
        }).catch(console.error);
    }
})

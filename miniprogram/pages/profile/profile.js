const api = require('../../api.js');

Page({
    data: {
        userInfo: {
            nickname: '...',
            avatar: '',
            points: 0,
            balance: 0
        },
        stats: {
            collects: 12,
            footprints: 8
        }
    },

    onLoad() {
        this.fetchProfile();
    },

    onShow() {
        this.fetchProfile();
    },

    fetchProfile() {
        api.getProfile().then(data => {
            this.setData({
                userInfo: data
            });
        }).catch(err => {
            console.error("Failed to load profile", err);
        });
    },

    // Navigation functions...
    goToOrders() {
        wx.navigateTo({ url: '/pages/orders/orders' });
    }
});

// miniprogram/pages/login/login.js
const api = require('../../api.js');

Page({
    data: {
        isLoading: false,
        appName: '南风草木',
        subName: '传承中国香文化'
    },

    onLoad() {
        // Check if user is already logged in
        const userId = wx.getStorageSync('user_id');
        if (userId) {
            wx.switchTab({
                url: '/pages/index/index',
            });
        }
    },

    handleLogin() {
        if (this.data.isLoading) return;

        this.setData({ isLoading: true });
        wx.showLoading({ title: '安全登录中...' });

        wx.login({
            success: (res) => {
                if (res.code) {
                    // Send res.code to backend to get standard user-id
                    api.login(res.code).then(resData => {
                        wx.hideLoading();
                        this.setData({ isLoading: false });

                        if (resData.success && resData.userId) {
                            wx.setStorageSync('user_id', resData.userId);
                            wx.showToast({
                                title: '登录成功',
                                icon: 'success',
                                duration: 1500,
                                success: () => {
                                    setTimeout(() => {
                                        wx.switchTab({
                                            url: '/pages/index/index'
                                        });
                                    }, 1500);
                                }
                            });
                        } else {
                            wx.showToast({ title: '登录失败，请重试', icon: 'none' });
                        }
                    }).catch(err => {
                        wx.hideLoading();
                        this.setData({ isLoading: false });
                        wx.showToast({ title: '网络或服务异常', icon: 'none' });
                    });
                } else {
                    wx.hideLoading();
                    this.setData({ isLoading: false });
                    wx.showToast({ title: '获取微信Code失败', icon: 'none' });
                }
            },
            fail: () => {
                wx.hideLoading();
                this.setData({ isLoading: false });
                wx.showToast({ title: '调用登录失败', icon: 'none' });
            }
        });
    }
})

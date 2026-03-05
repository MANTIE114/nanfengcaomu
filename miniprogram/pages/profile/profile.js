const api = require('../../api.js');
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=300&h=300';
const DEFAULT_NICKNAME = '南风访客';

Page({
    data: {
        userInfo: {
            nickname: DEFAULT_NICKNAME,
            avatar: DEFAULT_AVATAR,
            points: 0,
            balance: 0
        },
        stats: {
            collects: 0,
            footprints: 0
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
            if (!data) return; // Handle user not found

            const userInfo = {
                ...data,
                avatar: data.avatar ? api.imgUrl(data.avatar) : DEFAULT_AVATAR,
                nickname: data.nickname || DEFAULT_NICKNAME
            };

            this.setData({
                userInfo: userInfo,
                'stats.collects': data.collect_count || 0
            });
        }).catch(err => {
            console.error("Failed to load profile", err);
        });
    },

    editAvatar() {
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success: (res) => {
                const tempFilePath = res.tempFiles[0].tempFilePath;
                wx.showLoading({ title: '上传中...' });
                api.uploadFile(tempFilePath).then(uploadRes => {
                    return api.updateProfile({ avatar: uploadRes.url });
                }).then(() => {
                    wx.hideLoading();
                    this.fetchProfile();
                    wx.showToast({ title: '头像已更新', icon: 'success' });
                }).catch(err => {
                    wx.hideLoading();
                    wx.showToast({ title: '更新失败', icon: 'none' });
                    console.error(err);
                });
            }
        });
    },

    editNickname() {
        wx.showModal({
            title: '修改昵称',
            editable: true,
            placeholderText: '请输入新的昵称',
            content: this.data.userInfo.nickname,
            success: (res) => {
                if (res.confirm && res.content.trim()) {
                    wx.showLoading({ title: '保存中...' });
                    api.updateProfile({ nickname: res.content.trim() }).then(() => {
                        wx.hideLoading();
                        this.fetchProfile();
                        wx.showToast({ title: '昵称已更新', icon: 'success' });
                    }).catch(err => {
                        wx.hideLoading();
                        wx.showToast({ title: '保存失败', icon: 'none' });
                    });
                }
            }
        });
    },

    // Navigation functions...
    goToOrders() {
        wx.navigateTo({ url: '/pages/orders/orders' });
    },

    goToOrdersTab(e) {
        const status = e.currentTarget.dataset.status;
        wx.navigateTo({ url: `/pages/orders/orders?status=${status}` });
    },

    goToAddress() {
        wx.navigateTo({ url: '/pages/address/address' });
    },

    goToCollections() {
        wx.navigateTo({ url: '/pages/collections/collections' });
    },

    goToAbout() {
        wx.navigateTo({ url: '/pages/about/about' });
    }
});

Page({
    /**
     * 页面的初始数据
     */
    data: {
        version: '1.0.0'
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {
        return {
            title: '南风草木 - 关于我们',
            path: '/pages/about/about'
        };
    }
});

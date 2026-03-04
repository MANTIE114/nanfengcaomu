// pages/address/address.js
const api = require('../../api.js');

const emptyForm = () => ({
    recipient: '', phone: '',
    province: '', city: '', district: '', detail: '',
    is_default: false,
    isOverseas: false    // 海外地址模式
});

Page({
    data: {
        addresses: [],
        showForm: false,
        editing: false,
        editingId: null,
        form: emptyForm(),
        regionValue: [],      // ['广东省', '深圳市', '南山区']
        selectMode: false
    },

    onLoad(options) {
        if (options.selectMode === '1') {
            this.setData({ selectMode: true });
            wx.setNavigationBarTitle({ title: '选择收件地址' });
        }
    },

    onShow() {
        this.fetchAddresses();
    },

    fetchAddresses() {
        api.getAddresses().then(data => {
            this.setData({ addresses: data || [] });
        }).catch(console.error);
    },

    // ——— 国内 / 海外切换 ———
    setDomestic() {
        this.setData({ 'form.isOverseas': false });
    },
    setOverseas() {
        this.setData({ 'form.isOverseas': true, regionValue: [] });
    },

    // 微信 region picker 回调
    onRegionChange(e) {
        const val = e.detail.value; // ['广东省', '深圳市', '南山区']
        this.setData({
            regionValue: val,
            'form.province': val[0] || '',
            'form.city': val[1] || '',
            'form.district': val[2] || ''
        });
    },

    // 地图快速定位
    chooseLocation() {
        wx.chooseLocation({
            success: (res) => {
                const addr = res.address || '';
                const match = addr.match(/^(.{2,6}省|.{2,4}自治区|.{2,4}直辖市)?(.{2,6}市|.{2,4}自治州)?(.{2,6}区|.{2,4}县|.{2,4}旗)?(.*)$/);
                const province = (match && match[1]) ? match[1] : '';
                const city = (match && match[2]) ? match[2] : '';
                const district = (match && match[3]) ? match[3] : '';
                const regionValue = [province, city, district].filter(Boolean);
                this.setData({
                    regionValue,
                    'form.province': province,
                    'form.city': city,
                    'form.district': district,
                    'form.detail': res.name || ((match && match[4]) ? match[4] : addr)
                });
                wx.showToast({ title: '定位已填入', icon: 'success' });
            },
            fail: (err) => {
                console.log('chooseLocation fail:', err);
                wx.showToast({ title: '已取消定位', icon: 'none' });
            }
        });
    },

    // ——— 选择模式 ———
    selectAddress(e) {
        if (!this.data.selectMode) return;
        const addr = e.currentTarget.dataset.addr;
        const app = getApp();
        app.globalData = app.globalData || {};
        app.globalData.selectedAddress = addr;
        wx.navigateBack({ delta: 1 });
    },

    addAddress() {
        this.setData({ showForm: true, editing: false, editingId: null, form: emptyForm(), regionValue: [] });
    },

    editAddress(e) {
        if (this.data.selectMode) {
            this.selectAddress(e);
            return;
        }
        const addr = e.currentTarget.dataset.addr;
        // 判断是否海外（province 不以"省/市"结尾）简单启发式
        const isOverseas = addr.province && !addr.province.match(/省|市|自治区|直辖市|新疆|西藏/);
        const regionValue = (!isOverseas && addr.province) ? [addr.province, addr.city || '', addr.district || ''] : [];
        this.setData({
            showForm: true,
            editing: true,
            editingId: addr.id,
            regionValue,
            form: {
                recipient: addr.recipient,
                phone: addr.phone,
                province: addr.province || '',
                city: addr.city || '',
                district: addr.district || '',
                detail: addr.detail,
                is_default: addr.is_default === 1,
                isOverseas: isOverseas || false
            }
        });
    },

    closeForm() {
        this.setData({ showForm: false });
    },

    onInput(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({ [`form.${field}`]: e.detail.value });
    },

    onSwitchDefault(e) {
        this.setData({ 'form.is_default': e.detail.value });
    },

    submitForm() {
        const { form, editing, editingId } = this.data;
        if (!form.recipient.trim()) { wx.showToast({ title: '请填写收件人', icon: 'none' }); return; }
        if (!form.phone.trim()) { wx.showToast({ title: '请填写手机号', icon: 'none' }); return; }
        if (!form.detail.trim()) { wx.showToast({ title: '请填写详细地址', icon: 'none' }); return; }

        // 移除 isOverseas 字段（后端不存此字段）
        const payload = { ...form };
        delete payload.isOverseas;

        wx.showLoading({ title: '保存中...' });
        const promise = editing ? api.updateAddress(editingId, payload) : api.createAddress(payload);
        promise.then(() => {
            wx.hideLoading();
            wx.showToast({ title: '保存成功', icon: 'success' });
            this.setData({ showForm: false });
            this.fetchAddresses();
        }).catch(err => {
            wx.hideLoading();
            console.error(err);
            wx.showToast({ title: '保存失败', icon: 'error' });
        });
    },

    setDefault(e) {
        const id = e.currentTarget.dataset.id;
        const addr = this.data.addresses.find(a => a.id === id);
        if (!addr) return;
        wx.showLoading({ title: '设置中...' });
        api.updateAddress(id, { ...addr, is_default: true }).then(() => {
            wx.hideLoading();
            this.fetchAddresses();
        }).catch(console.error);
    },

    deleteAddress(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认删除',
            content: '确定要删除这个收件地址吗？',
            success: (res) => {
                if (!res.confirm) return;
                wx.showLoading({ title: '删除中...' });
                api.deleteAddress(id).then(() => {
                    wx.hideLoading();
                    wx.showToast({ title: '已删除', icon: 'success' });
                    this.fetchAddresses();
                }).catch(console.error);
            }
        });
    }
});

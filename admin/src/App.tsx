import { useState, useEffect } from 'react';

const Icon = ({ name, clazz = '' }: { name: string, clazz?: string }) => (
  <span className={`material-symbols-outlined ${clazz}`}>{name}</span>
);

const getAssetUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const serverBase = `http://${window.location.hostname}:3000`;
  return url.startsWith('/') ? `${serverBase}${url}` : `${serverBase}/${url}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ todaySales: 0, totalOrders: 0, totalProducts: 0, totalRevenue: 0 });
  const [productFilter, setProductFilter] = useState<'all' | 'instock' | 'low' | 'offline'>('all');
  const [orderFilter, setOrderFilter] = useState<'all' | 'unpaid' | 'paid' | 'shipped' | 'done' | 'refund' | 'refunded'>('all');
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [currentOrderDetail, setCurrentOrderDetail] = useState<any>(null);
  const [shippingForm, setShippingForm] = useState({ tracking_no: '', logistics_company: '顺丰速运' });
  const [apiError, setApiError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<any>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [orderSearchKeyword, setOrderSearchKeyword] = useState('');
  const [isOrderSearchVisible, setIsOrderSearchVisible] = useState(false);
  const [productSearchKeyword, setProductSearchKeyword] = useState('');
  const [isProductSearchVisible, setIsProductSearchVisible] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('nft_admin_auth') === 'true');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>({ name: '', price: '', stock: '', cover_image: '' });

  // Custom Modal for Inline Updates
  const [inlineModalVisible, setInlineModalVisible] = useState(false);
  const [inlineModalProduct, setInlineModalProduct] = useState<any>(null);
  const [inlineModalType, setInlineModalType] = useState<'stock' | 'price' | null>(null);
  const [inlineModalValue, setInlineModalValue] = useState('');

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const handleImageUpload = async (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const API_BASE = `http://${window.location.hostname}:3000/api`;
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          setCurrentProduct({ ...currentProduct, cover_image: data.url });
        }
      } catch (err) {
        console.error('Product image upload failed:', err);
      }
    }
  };

  const handleCategoryImageUpload = async (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const API_BASE = `http://${window.location.hostname}:3000/api`;
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          setCurrentCategory({ ...currentCategory, image: data.url });
        }
      } catch (err) {
        console.error('Category image upload failed:', err);
      }
    }
  };
  const handleInlineAction = async (product: any, updates: any) => {
    const updatedProduct = { ...product, ...updates };
    // Optimistic UI Update
    setProducts(prev => prev.map(p => p.id === product.id ? updatedProduct : p));

    try {
      const API_BASE = `http://${window.location.hostname}:3000/api`;
      const res = await fetch(`${API_BASE}/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct)
      });
      const data = await res.json();
      if (!data.success) {
        alert('操作失败: ' + data.message);
        // Revert optimization logic could go here
      }
    } catch (e) {
      console.warn('API sync failed, but local state updated', e);
    }
  };

  const promptStock = (product: any) => {
    setInlineModalProduct(product);
    setInlineModalType('stock');
    setInlineModalValue(String(product.stock || 0));
    setInlineModalVisible(true);
  };

  const promptPrice = (product: any) => {
    setInlineModalProduct(product);
    setInlineModalType('price');
    setInlineModalValue(String(product.price || 0));
    setInlineModalVisible(true);
  };

  const handleInlineModalSubmit = () => {
    if (!inlineModalProduct || !inlineModalType) return;
    const updates: any = {};
    if (inlineModalType === 'stock') {
      updates.stock = parseInt(inlineModalValue, 10) || 0;
    } else if (inlineModalType === 'price') {
      updates.price = parseFloat(inlineModalValue) || 0;
    }

    handleInlineAction(inlineModalProduct, updates);
    setInlineModalVisible(false);
    setInlineModalProduct(null);
  };

  const handleDelete = async (product: any) => {
    const API_BASE = `http://${window.location.hostname}:3000/api`;
    try {
      const res = await fetch(`${API_BASE}/products/${product.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setProducts(prev => prev.filter(p => p.id !== product.id));
        setDeleteTarget(null);
      } else {
        alert('删除失败: ' + data.message);
      }
    } catch (e) {
      setProducts(prev => prev.filter(p => p.id !== product.id));
      setDeleteTarget(null);
    }
  };

  const toggleStatus = (product: any) => {
    handleInlineAction(product, { status: product.status === 1 ? 0 : 1 });
  };

  const handleEdit = (product?: any) => {
    if (product) {
      let details = { weight: '', length: '', burnTime: '' };
      try {
        if (product.details) {
          details = typeof product.details === 'string' ? JSON.parse(product.details) : product.details;
        }
      } catch (e) { console.error("Parse details failed", e); }
      setCurrentProduct({ ...product, details });
    } else {
      setCurrentProduct({
        name: '',
        subtitle: '',
        price: '',
        stock: '',
        cover_image: '',
        sku: '',
        description: '',
        category_id: categories[0]?.id || 1,
        details: { weight: '', length: '', burnTime: '' }
      });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    const isUpdating = !!currentProduct.id;
    const method = isUpdating ? 'PUT' : 'POST';
    const API_BASE = `http://${window.location.hostname}:3000/api`;
    const url = isUpdating ? `${API_BASE}/products/${currentProduct.id}` : `${API_BASE}/products`;

    try {
      const payload = {
        ...currentProduct,
        status: currentProduct.status !== 0 ? 1 : 0,
        details: JSON.stringify(currentProduct.details || {})
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        if (isUpdating) {
          setProducts(products.map(p => p.id === currentProduct.id ? currentProduct : p));
        } else {
          setProducts([{ ...currentProduct, id: data.data?.id || Date.now(), status: 1 }, ...products]);
        }
        setIsEditing(false);
      } else {
        alert('保存失败: ' + data.message);
      }
    } catch (err) {
      console.warn("API save failed, falling back to local state.", err);
      // Fallback
      if (currentProduct.id) {
        setProducts(products.map(p => p.id === currentProduct.id ? currentProduct : p));
      } else {
        setProducts([{ ...currentProduct, id: Date.now(), status: 1 }, ...products]);
      }
      setIsEditing(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!currentCategory.name.trim()) {
      setCategoryError('请输入品类名称');
      return;
    }
    setCategoryError('');

    const isUpdating = !!currentCategory.id;
    const method = isUpdating ? 'PUT' : 'POST';
    const API_BASE = `http://${window.location.hostname}:3000/api`;
    const url = isUpdating ? `${API_BASE}/admin/categories/${currentCategory.id}` : `${API_BASE}/admin/categories`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentCategory)
      });
      const data = await res.json();
      if (data.success) {
        // Batch Update Products Category
        if (isUpdating || data.data?.id) {
          const catId = currentCategory.id || data.data?.id;
          await fetch(`${API_BASE}/admin/categories/${catId}/products`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds: selectedProductIds })
          });
        }

        showToast(isUpdating ? '品类修改成功' : '新增品类成功');
        // Refresh categories and products
        fetchData();
        // Returns to category list page
        setCurrentCategory(null);
        setSelectedProductIds([]);
      } else {
        showToast(data.message || '操作失败', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('服务器连接异常', 'error');
    }
  };

  const openCategoryEditor = (c: any = null) => {
    if (c) {
      setCurrentCategory(c);
      const linked = products.filter(p => p.category_id === c.id).map(p => p.id);
      setSelectedProductIds(linked);
    } else {
      setCurrentCategory({ name: '', subtitle: '', image: '', sort_order: categories.length + 1, status: 1, is_top: 0 });
      setSelectedProductIds([]);
    }
    setCategoryError('');
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('确认删除该分类吗？如果是正在使用的分类，请先处理关联商品。')) return;
    const API_BASE = `http://${window.location.hostname}:3000/api`;
    try {
      const res = await fetch(`${API_BASE}/admin/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCategories(categories.filter(c => c.id !== id));
        setCurrentCategory(null);
      } else {
        alert(data.message || '删除失败');
      }
    } catch (e) { console.error(e); }
  };

  const handleToggleCategoryTop = async (e: any, c: any) => {
    e.stopPropagation();
    const newIsTop = c.is_top ? 0 : 1;

    if (newIsTop === 1) {
      const currentTopCount = categories.filter(cat => cat.is_top === 1).length;
      if (currentTopCount >= 4) {
        showToast('首页推荐位已满（最多4个）', 'error');
        return;
      }
    }

    const payload = { ...c, is_top: newIsTop };
    const API_BASE = `http://${window.location.hostname}:3000/api`;
    try {
      const res = await fetch(`${API_BASE}/admin/categories/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(newIsTop ? '已推荐至首页' : '已从首页移除');
        fetchData();
      } else {
        showToast(data.message || '操作失败', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('操作异常', 'error');
    }
  };

  const fetchData = async () => {
    setIsRefreshing(true);
    const API_BASE = `http://${window.location.hostname}:3000/api`;

    try {
      // Products
      const pUrl = `${API_BASE}/products?showAll=1${productSearchKeyword ? `&keyword=${encodeURIComponent(productSearchKeyword)}` : ''}`;
      const pRes = await fetch(pUrl);
      const pData = await pRes.json();
      if (pData.success) {
        setProducts(pData.data);
        setApiError(false);
      } else {
        setApiError(true);
      }

      // Stats
      const sRes = await fetch(`${API_BASE}/admin/stats`);
      const sData = await sRes.json();
      if (sData.success) setStats(sData.data);

      // Orders
      const oUrl = `${API_BASE}/admin/orders${orderSearchKeyword ? `?keyword=${encodeURIComponent(orderSearchKeyword)}` : ''}`;
      const oRes = await fetch(oUrl);
      const oData = await oRes.json();
      if (oData.success) {
        setOrders(oData.data);
      }

      // Categories
      const cRes = await fetch(`${API_BASE}/categories`);
      const cData = await cRes.json();
      if (cData.success) {
        setCategories(cData.data);
      }
    } catch (err) {
      console.warn("Fetch failed:", err);
    } finally {
      // Ensure the effect stays long enough to be visible
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'orders') {
        const fetchOrders = async () => {
          const API_BASE = `http://${window.location.hostname}:3000/api`;
          const oUrl = `${API_BASE}/admin/orders${orderSearchKeyword ? `?keyword=${encodeURIComponent(orderSearchKeyword)}` : ''}`;
          const oRes = await fetch(oUrl);
          const oData = await oRes.json();
          if (oData.success) {
            setOrders(oData.data);
          }
        };
        fetchOrders();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [orderSearchKeyword]);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Don't fetch if not on products tab to avoid unnecessary calls on startup
      // But we need initial data, so maybe just check keyword if we want to reactive search
      if (activeTab === 'products') {
        fetchData();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [productSearchKeyword]);

  const handleViewOrder = async (order: any, autoScrollToShip = false) => {
    // 1. Reset form and show modal immediately with available data to improve responsiveness
    setShippingForm({ tracking_no: '', logistics_company: '顺丰速运' });
    setCurrentOrderDetail({
      ...order,
      recipient: order.recipient || '数据加载中...',
      items: order.items || []
    });
    setIsOrderDetailOpen(true);

    const API_BASE = `http://${window.location.hostname}:3000/api`;
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${order.id}`);
      const data = await res.json();
      if (data.success) {
        setCurrentOrderDetail(data.data);
        if (autoScrollToShip) {
          setTimeout(() => {
            const el = document.getElementById('shipping-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 400);
        }
      } else {
        // Fallback to mock data if API response is negative but successful
        setCurrentOrderDetail({
          ...order,
          recipient: order.recipient || '张伟',
          phone: order.phone || '138****8888',
          province: '浙江省',
          city: '杭州市',
          district: '西湖区',
          address_detail: '灵隐街道 龙井路 1号 南风草木工作室',
          items: order.items || [{ product_name: order.product_name || '精选商品', price: order.total_amount, quantity: 1, cover_image: '/assets/avatar.jpg' }]
        });
      }
    } catch (err) {
      console.error('Fetch order detail failed:', err);
      // Ensure fallback data is set even on network error
      setCurrentOrderDetail({
        ...order,
        recipient: order.recipient || '张伟',
        phone: order.phone || '138****8888',
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        address_detail: '灵隐街道 龙井路 1号 南风草木工作室',
        items: order.items || [{ product_name: order.product_name || '精选商品', price: order.total_amount, quantity: 1, cover_image: '/assets/avatar.jpg' }]
      });
      if (autoScrollToShip) {
        setTimeout(() => {
          const el = document.getElementById('shipping-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 400);
      }
    }
  };

  const shipOrder = async () => {
    if (!shippingForm.tracking_no.trim()) {
      setShippingError('请务必输入或扫描快递单号');
      return;
    }
    setShippingError('');

    if (!confirm(`请核对发货信息：\n物流公司：${shippingForm.logistics_company}\n快递单号：${shippingForm.tracking_no}\n确认发货吗？`)) return;

    const API_BASE = `http://${window.location.hostname}:3000/api`;
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${currentOrderDetail.id}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shippingForm)
      });
      const data = await res.json();
      if (data.success) {
        alert('发货成功');
        // Modify local state immediately
        const now = new Date().toISOString();
        const updatedDetail = {
          ...currentOrderDetail,
          status: 2,
          tracking_no: shippingForm.tracking_no,
          logistics_company: shippingForm.logistics_company,
          ship_time: now
        };
        setCurrentOrderDetail(updatedDetail);
        // Refresh orders list
        setOrders(prev => prev.map(o => o.id === currentOrderDetail.id ? { ...o, status: 2 } : o));
      }
    } catch (err) {
      console.error('Ship failed:', err);
    }
  };

  const approveRefund = async () => {
    if (!confirm('确认同意退款？钱款将原路返还。')) return;
    const API_BASE = `http://${window.location.hostname}:3000/api`;
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${currentOrderDetail.id}/refund-approve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('退款已成功受理');
        setCurrentOrderDetail({ ...currentOrderDetail, status: 5, refund_status: 2 });
        setOrders(prev => prev.map(o => o.id === currentOrderDetail.id ? { ...o, status: 5 } : o));
      }
    } catch (err) { alert('操作失败'); }
  };

  const rejectRefund = async () => {
    if (!confirm('确认拒绝该退款申请？')) return;
    const API_BASE = `http://${window.location.hostname}:3000/api`;
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${currentOrderDetail.id}/refund-reject`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('已成功拒绝申请');
        setCurrentOrderDetail({ ...currentOrderDetail, status: 1, refund_status: 3 });
        setOrders(prev => prev.map(o => o.id === currentOrderDetail.id ? { ...o, status: 1 } : o));
      }
    } catch (err) { alert('操作失败'); }
  };



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const API_BASE = `http://${window.location.hostname}:3000/api`;
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('nft_admin_auth', 'true');
        setIsAuthenticated(true);
      } else {
        setLoginError(data.message || '登录失败');
      }
    } catch (e) {
      // Offline fallback login matching mock
      if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
        localStorage.setItem('nft_admin_auth', 'true');
        setIsAuthenticated(true);
      } else {
        setLoginError('账号或密码错误 (Network Error)');
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-slate-200 min-h-screen text-slate-900 font-display flex justify-center lg:py-8 py-0">
        <div className="w-full sm:max-w-md bg-white relative shadow-2xl overflow-hidden flex flex-col sm:rounded-[40px] border-0 sm:border-8 border-slate-900 sm:h-[850px] h-[100dvh]">
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#fcfaf9]">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex flex-col items-center justify-center mb-6 shadow-md border-4 border-white overflow-hidden">
              <img src={getAssetUrl("/assets/avatar.jpg")} className="w-full h-full object-cover rounded-full" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Nan Feng Cao Mu</h1>
            <p className="text-sm text-slate-500 mb-8 uppercase tracking-widest font-semibold">后台管理系统</p>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div className="space-y-3">
                <input
                  required
                  type="text"
                  placeholder="请输入账号 (admin)"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-100 bg-slate-50 placeholder-slate-400 focus:ring-2 focus:ring-primary outline-none text-slate-700 transition"
                  value={loginForm.username}
                  onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                />
                <input
                  required
                  type="password"
                  placeholder="请输入密码 (admin123)"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-100 bg-slate-50 placeholder-slate-400 focus:ring-2 focus:ring-primary outline-none text-slate-700 transition"
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>

              {loginError && <p className="text-red-500 text-xs text-center font-bold px-4">{loginError}</p>}

              <button type="submit" className="w-full py-3.5 mt-2 bg-primary hover:bg-[#2f5151] hover:shadow-xl text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/30 active:scale-95">
                登录体系
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-200 min-h-screen text-slate-900 font-display flex justify-center lg:py-8 py-0 transition-all duration-500">
      {/* Phone/Responsive Container -> Web Dash */}
      <div className="w-full sm:max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-7xl bg-[#f8fafc] relative shadow-2xl overflow-hidden flex flex-col md:flex-row sm:rounded-[40px] border-0 sm:border-8 border-slate-900 sm:h-[850px] lg:h-[calc(100vh-4rem)] h-[100dvh] transition-all duration-500">

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white lg:border-r border-slate-200/60 shrink-0 z-20 lg:shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="px-8 py-10 flex flex-col items-center justify-center border-b border-slate-50">
            <div className="w-20 h-20 rounded-full bg-primary/5 flex flex-col items-center justify-center shadow-inner border shadow-slate-200/50 mb-4 overflow-hidden">
              <img src={getAssetUrl("/assets/avatar.jpg")} className="w-full h-full object-cover rounded-full" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">南风草木</h2>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">云端管理总后台</p>
          </div>
          <nav className="flex-1 py-8 px-6 space-y-3 relative">
            <button onClick={() => { setActiveTab('dashboard'); fetchData(); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-[#1e3232] text-white shadow-xl shadow-slate-900/10 scale-105' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:scale-105'}`}>
              <Icon name="dashboard" clazz={activeTab === 'dashboard' ? 'font-bold' : ''} />
              <span className="font-bold tracking-wider text-sm">经营概览</span>
            </button>
            <button onClick={() => { setActiveTab('orders'); fetchData(); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${activeTab === 'orders' ? 'bg-[#1e3232] text-white shadow-xl shadow-slate-900/10 scale-105' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:scale-105'}`}>
              <Icon name="receipt_long" />
              <span className="font-bold tracking-wider text-sm">订单管理</span>
            </button>
            <button onClick={() => { setActiveTab('products'); fetchData(); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${activeTab === 'products' ? 'bg-[#1e3232] text-white shadow-xl shadow-slate-900/10 scale-105' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:scale-105'}`}>
              <Icon name="inventory_2" />
              <span className="font-bold tracking-wider text-sm">商品枢纽</span>
            </button>
          </nav>
          <div className="p-6">
            <button onClick={() => { localStorage.removeItem('nft_admin_auth'); setIsAuthenticated(false); }} className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-slate-400 bg-slate-50 hover:bg-red-50 hover:text-red-500 transition-all font-bold tracking-widest text-xs">
              <Icon name="logout" clazz="text-[18px]" />
              安全退出
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] relative overflow-hidden">

          {/* Header content varies per tab */}
          {activeTab === 'dashboard' ? (
            <header className="sticky top-0 z-10 flex items-center justify-between p-4 md:px-8 md:py-6 backdrop-blur-md border-b border-slate-100 bg-white/90 md:bg-transparent md:border-none shadow-sm md:shadow-none transition-all duration-500">
              <div className="flex items-center gap-3 md:hidden">
                <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/30">
                  <img className="w-full h-full object-cover" src={getAssetUrl("/assets/avatar.jpg")} />
                </div>
                <div>
                  <h1 className="text-sm font-medium text-slate-500 leading-none">后台管理系统</h1>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Nan Feng Cao Mu</h2>
                </div>
              </div>

              <div className="hidden md:block">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">今日总盘</h1>
                <p className="text-sm text-slate-500 mt-1 font-medium tracking-wide">欢迎回来！实时监测您的商城运作及营收详情。</p>
              </div>

              <div className="flex items-center gap-4">
                <span className="hidden md:flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  系统正常运行中
                </span>
                <button
                  onClick={() => showToast('暂无最新系统通知', 'info')}
                  className="relative p-2.5 rounded-full md:bg-white md:shadow-sm md:border md:border-slate-100 hover:bg-primary/10 hover:text-primary transition-all">
                  <Icon name="notifications" clazz="text-slate-600" />
                  <span className="absolute top-2 right-2 size-2.5 bg-slate-300 rounded-full border-[2.5px] border-white md:border-slate-50"></span>
                </button>
              </div>
            </header>
          ) : null}

          {/* Refreshing Indicator Overlay */}
          {isRefreshing && (
            <div className="absolute inset-0 z-[100] bg-white/40 backdrop-blur-[2px] flex items-center justify-center transition-all animate-in fade-in duration-300">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-primary animate-spin shadow-lg"></div>
                <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">更新中...</p>
              </div>
            </div>
          )}

          {/* Global Loading Bar */}
          {isRefreshing && (
            <div className="absolute top-0 left-0 w-full h-1 z-[110] overflow-hidden">
              <div className="h-full bg-primary animate-progress-flow w-full origin-left"></div>
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto pb-4 scroll-smooth md:px-4 lg:px-8 relative custom-scrollbar">

            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section className="p-4 md:px-0 grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                  <div className="col-span-full flex items-center justify-between pt-2">
                    <h3 className="text-base font-semibold">概览</h3>
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">实时数据</span>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl p-5 bg-white border border-slate-100 shadow-md">
                    <p className="text-slate-500 text-xs font-medium">今日销售</p>
                    <p className="text-xl font-bold">¥{stats.todaySales.toLocaleString()}</p>
                    <p className="text-slate-400 text-xs font-medium flex items-center gap-0.5">
                      <Icon name="payments" clazz="text-sm" /> 已支付订单
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl p-5 bg-white border border-slate-100 shadow-md cursor-pointer hover:border-primary/30 hover:shadow-lg active:scale-[0.98] transition-all" onClick={() => { setActiveTab('orders'); fetchData(); }}>
                    <p className="text-slate-500 text-xs font-medium">累计订单</p>
                    <p className="text-xl font-bold">{stats.totalOrders}</p>
                    <p className="text-slate-400 text-xs font-medium flex items-center gap-0.5">
                      <Icon name="receipt_long" clazz="text-sm" /> 全部订单数
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl p-5 bg-white border border-slate-100 shadow-md cursor-pointer hover:border-primary/30 hover:shadow-lg active:scale-[0.98] transition-all" onClick={() => { setActiveTab('products'); fetchData(); }}>
                    <p className="text-slate-500 text-xs font-medium">商品数量</p>
                    <p className="text-xl font-bold">{stats.totalProducts}</p>
                    <p className="text-slate-400 text-xs font-medium flex items-center gap-0.5">
                      <Icon name="inventory_2" clazz="text-sm" /> 含下架商品
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl p-5 bg-white border border-slate-100 shadow-md">
                    <p className="text-slate-500 text-xs font-medium">总收入</p>
                    <p className="text-xl font-bold">¥{(stats.totalRevenue || 0).toLocaleString()}</p>
                    <p className="text-slate-400 text-xs font-medium flex items-center gap-0.5">
                      <Icon name="account_balance" clazz="text-sm" /> 历史支付合计
                    </p>
                  </div>
                </section>

                <section className="px-4 py-2">
                  <h3 className="text-base font-semibold mb-3">快捷操作</h3>
                  <div className="flex gap-3">
                    <button className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-1 transition transform" onClick={() => handleEdit()}>
                      <Icon name="add_circle" />
                      <span className="text-xs font-bold">添加商品</span>
                    </button>
                    <button className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-white border border-primary/20 text-primary rounded-xl hover:-translate-y-1 transition transform relative" onClick={() => setActiveTab('orders')}>
                      <div className="relative">
                        <Icon name="shopping_cart" />
                        {orders.filter(o => o.status === 1).length > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white animate-bounce-subtle">
                            {orders.filter(o => o.status === 1).length}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold">查看订单</span>
                    </button>
                    <button className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-white border border-primary/20 text-primary rounded-xl hover:-translate-y-1 transition transform" onClick={() => setActiveTab('products')}>
                      <Icon name="inventory_2" />
                      <span className="text-xs font-bold">库存清单</span>
                    </button>
                  </div>
                </section>

                <section className="px-4 pb-2">
                  <div className="rounded-xl p-5 bg-gradient-to-br from-[#2f5151] to-[#1e3535] text-white shadow-lg">
                    <p className="text-white/70 text-xs font-medium mb-1">历史总收入</p>
                    <p className="text-3xl font-bold tracking-tight">¥{(stats.totalRevenue || 0).toLocaleString()}</p>
                    <div className="mt-3 flex gap-4 border-t border-white/10 pt-3">
                      <div>
                        <p className="text-white/60 text-[10px]">累计订单</p>
                        <p className="font-bold">{stats.totalOrders}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-[10px]">在架商品</p>
                        <p className="font-bold">{products.filter(p => p.status === 1).length}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-[10px]">今日进账</p>
                        <p className="font-bold">¥{stats.todaySales.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </section>


                <section className="px-4 py-2 mb-4">
                  <h3 className="text-base font-semibold mb-3">最近订单</h3>
                  <div className="space-y-3">
                    {orders.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <Icon name="receipt_long" clazz="text-4xl mb-2 text-slate-300" />
                        <p className="text-sm">暂无订单数据</p>
                      </div>
                    ) : orders.slice(0, 5).map((o: any, index) => (
                      <div key={index} onClick={() => handleViewOrder(o)} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition">
                        <div className="size-10 rounded-lg bg-brand-muted flex items-center justify-center text-primary overflow-hidden">
                          {o.main_product_image ? (
                            <img src={getAssetUrl(o.main_product_image)} alt="P" className="w-full h-full object-cover" />
                          ) : (
                            <Icon name={o.icon || 'receipt'} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold truncate">{o.main_product_name || `订单 #${o.order_no}`}</p>
                          <p className="text-xs text-slate-500">订单 #{o.order_no} • {new Date(o.create_time).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">¥{o.total_amount}</p>
                          {o.status === 0 ? (
                            <p className="text-[10px] text-amber-500 font-bold">待支付</p>
                          ) : o.status === 1 ? (
                            <div className="flex flex-col items-end gap-1">
                              <p className="text-[10px] text-emerald-500 font-bold">待发货</p>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleViewOrder(o, true); }}
                                className="px-3 py-2 bg-primary text-white text-[11px] rounded-lg font-bold active:scale-95 transition-all shadow-sm"
                              >立即发货</button>
                            </div>
                          ) : o.status === 2 ? (
                            <p className="text-[10px] text-sky-500 font-bold">待收货</p>
                          ) : o.status === 3 ? (
                            <p className="text-[10px] text-primary font-bold">已完成</p>
                          ) : o.status === 4 ? (
                            <p className="text-[10px] text-red-500 font-bold">售后中</p>
                          ) : o.status === 5 ? (
                            <p className="text-[10px] text-slate-400 font-bold">已退款</p>
                          ) : (
                            <p className="text-[10px] text-amber-500 font-bold">待处理</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="px-0 py-0 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4">
                  <div className="flex items-center justify-between mb-4">
                    {!isOrderSearchVisible ? (
                      <>
                        <h2 className="text-xl font-bold text-slate-900">订单管理</h2>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsOrderSearchVisible(true)}
                            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                          >
                            <Icon name="search" />
                          </button>
                          <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                            <Icon name="filter_list" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 w-full animate-in slide-in-from-right-2 duration-300">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Icon name="search" clazz="text-lg" />
                          </span>
                          <input
                            autoFocus
                            className="w-full bg-slate-50 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 text-slate-700 font-medium"
                            placeholder="搜索订单号、姓名、手机号..."
                            value={orderSearchKeyword}
                            onChange={e => setOrderSearchKeyword(e.target.value)}
                          />
                          {orderSearchKeyword && (
                            <button
                              onClick={() => setOrderSearchKeyword('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-500"
                            >
                              <Icon name="cancel" clazz="text-base" />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setIsOrderSearchVisible(false);
                            setOrderSearchKeyword('');
                          }}
                          className="text-sm font-bold text-primary px-2"
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>

                  <nav className="flex gap-6 overflow-x-auto no-scrollbar pt-2">
                    <a onClick={() => { setOrderFilter('all'); fetchData(); }} className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-all ${orderFilter === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      全部 <span className="text-xs ml-1 opacity-70">{orders.length}</span>
                    </a>
                    <a onClick={() => { setOrderFilter('unpaid'); fetchData(); }} className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-all ${orderFilter === 'unpaid' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      待付款 <span className="text-xs ml-1 opacity-70">{orders.filter(o => o.status === 0).length}</span>
                    </a>
                    <a onClick={() => { setOrderFilter('paid'); fetchData(); }} className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-all ${orderFilter === 'paid' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      待发货 <span className="text-xs ml-1 opacity-70">{orders.filter(o => o.status === 1).length}</span>
                    </a>
                    <a onClick={() => { setOrderFilter('shipped'); fetchData(); }} className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-all ${orderFilter === 'shipped' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      待收货 <span className="text-xs ml-1 opacity-70">{orders.filter(o => o.status === 2).length}</span>
                    </a>
                    <a onClick={() => { setOrderFilter('done'); fetchData(); }} className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-all ${orderFilter === 'done' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      已完成 <span className="text-xs ml-1 opacity-70">{orders.filter(o => o.status === 3).length}</span>
                    </a>
                    <a onClick={() => { setOrderFilter('refund'); fetchData(); }} className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-all ${orderFilter === 'refund' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      售后 <span className="text-xs ml-1 opacity-70">{orders.filter(o => o.status === 4).length}</span>
                    </a>
                    <a onClick={() => { setOrderFilter('refunded'); fetchData(); }} className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-all ${orderFilter === 'refunded' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      已退款 <span className="text-xs ml-1 opacity-70">{orders.filter(o => o.status === 5).length}</span>
                    </a>
                  </nav>
                </header>

                <div className="px-4 md:px-8 pb-12 flex flex-col gap-4 md:gap-5">
                  {orders
                    .filter(o => {
                      if (orderFilter === 'all') return true;
                      if (orderFilter === 'unpaid') return o.status === 0;
                      if (orderFilter === 'paid') return o.status === 1;
                      if (orderFilter === 'shipped') return o.status === 2;
                      if (orderFilter === 'done') return o.status === 3;
                      if (orderFilter === 'refund') return o.status === 4;
                      if (orderFilter === 'refunded') return o.status === 5;
                      return false;
                    })
                    .map(order => (
                      <div key={order.id} onClick={() => handleViewOrder(order)} className="bg-white rounded-xl p-4 md:p-5 md:py-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer flex flex-col md:flex-row md:items-center gap-4 md:gap-6 group">

                        {/* 1. Header & User Info (Responsive: Top left or Left column) */}
                        <div className="flex justify-between items-start md:items-center md:w-1/4 lg:w-1/5 shrink-0 min-w-0">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="size-10 md:size-11 rounded-full bg-slate-50 flex items-center justify-center text-primary font-bold border border-slate-100 uppercase shrink-0 transition-colors group-hover:bg-primary/5">
                              {(order.nickname || 'U')[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm md:text-base font-bold text-slate-900 truncate">{order.nickname || 'Unknown Customer'}</p>
                                {order.recipient && (
                                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold shrink-0 truncate max-w-[80px]">
                                    收货人: {order.recipient}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] md:text-xs text-slate-400 font-medium tracking-wide truncate mt-0.5">NO. {order.order_no || `#${order.id}`}</p>
                            </div>
                          </div>
                          {/* Mobile-only status pill */}
                          <div className={`md:hidden px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 whitespace-nowrap ${order.status === 1 ? 'bg-emerald-100 text-emerald-700' :
                            order.status === 4 ? 'bg-red-100 text-red-700' :
                              order.status === 5 ? 'bg-slate-100 text-slate-500' :
                                order.status === 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                            {order.status === 1 ? '待发货' :
                              order.status === 0 ? '待付款' :
                                order.status === 4 ? '售后申请' :
                                  order.status === 5 ? '已退款' : '已完成'}
                          </div>
                        </div>

                        {/* 2. Product Information */}
                        <div className="flex-1 min-w-0 mt-1 md:mt-0">
                          <div className="flex items-center gap-3 rounded-xl overflow-hidden group-hover:bg-slate-50/60 md:p-2 -mx-1 md:mx-0 transition-colors">
                            <div className="size-12 md:size-14 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-primary overflow-hidden shrink-0">
                              {order.main_product_image ? (
                                <img src={getAssetUrl(order.main_product_image)} alt="Product" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              ) : (
                                <Icon name="inventory_2" clazz="text-lg md:text-xl opacity-40" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 self-center">
                              <p className="text-xs md:text-sm font-bold text-slate-900 truncate">
                                {order.main_product_name || '南风草木 精选商品'}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                                <Icon name="history" clazz="text-[12px] opacity-60 hidden md:block" />
                                <span className="opacity-70 truncate">
                                  {new Date(order.create_time).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit' }).replace(',', '')}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0 px-2 md:px-6 md:border-r border-slate-100/80">
                              <p className="text-sm md:text-xl flex items-baseline gap-0.5 font-bold text-primary tracking-tight">
                                <span className="text-[10px] md:text-xs">¥</span>{order.total_amount}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">实付金额</p>
                            </div>
                          </div>
                        </div>

                        {/* 3. Actions & Desktop Status */}
                        <div className="flex justify-between md:justify-end items-center pt-4 md:pt-0 border-t md:border-t-0 border-slate-50/80 gap-4 shrink-0 mt-auto md:mt-0 md:min-w-[200px]">
                          {/* Mobile-only time */}
                          <div className="md:hidden flex items-center gap-1.5 text-slate-400 min-w-0 opacity-80 group-hover:opacity-100 transition-opacity">
                            <Icon name="history" clazz="text-[13px] shrink-0" />
                            <span className="text-[10px] font-medium tracking-wider font-display truncate">
                              {new Date(order.create_time).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit' }).replace(',', '')}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-end">
                            {/* Desktop-only status pill */}
                            <div className={`hidden md:flex px-3 py-1.5 rounded-full text-xs font-bold shrink-0 whitespace-nowrap ${order.status === 1 ? 'bg-emerald-100 text-emerald-700' :
                              order.status === 4 ? 'bg-red-100 text-red-700' :
                                order.status === 5 ? 'bg-slate-100 text-slate-500' :
                                  order.status === 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                              {order.status === 1 ? '待发货' :
                                order.status === 0 ? '待付款' :
                                  order.status === 4 ? '售后申请' :
                                    order.status === 5 ? '已退款' : '已完成'}
                            </div>

                            <div className="flex gap-2 shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); handleViewOrder(order); }} className="px-4 py-2 md:px-5 md:py-2.5 rounded-[10px] border border-slate-200 text-xs md:text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 hover:border-primary/20 hover:text-primary active:scale-95 transition-all shadow-sm whitespace-nowrap shrink-0">
                                详情
                              </button>
                              {order.status === 1 && (
                                <button
                                  className="px-4 py-2 md:px-5 md:py-2.5 rounded-[10px] bg-primary-dark text-white text-xs md:text-sm font-bold shadow-[0_4px_14px_rgba(47,81,81,0.3)] hover:shadow-[0_6px_20px_rgba(47,81,81,0.4)] hover:bg-[#1e3232] active:scale-95 transition-all whitespace-nowrap shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewOrder(order, true);
                                  }}
                                >
                                  立即发货
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                  {orders.filter(o => {
                    if (orderFilter === 'all') return true;
                    if (orderFilter === 'unpaid') return o.status === 0;
                    if (orderFilter === 'paid') return o.status === 1;
                    if (orderFilter === 'shipped') return o.status === 2;
                    if (orderFilter === 'done') return o.status === 3;
                    if (orderFilter === 'refund') return o.status === 4;
                    if (orderFilter === 'refunded') return o.status === 5;
                    return false;
                  }).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-24 text-slate-400 opacity-60">
                        <Icon name="shopping_cart" clazz="text-6xl mb-4" />
                        <p className="text-sm font-medium">暂无此类订单</p>
                        <p className="text-xs mt-1">换一个筛选条件试试吧</p>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* PRODUCTS TAB */}
            {activeTab === 'products' && (
              <div className="px-4 py-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4">
                  <div className="flex items-center justify-between mb-4">
                    {!isProductSearchVisible ? (
                      <>
                        <h2 className="text-xl font-bold text-slate-900 leading-tight">商品管理</h2>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsProductSearchVisible(true)}
                            className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors border border-transparent hover:border-slate-100"
                          >
                            <Icon name="search" />
                          </button>
                          <button
                            onClick={() => setIsCategoryManagerOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold hover:bg-emerald-100 active:scale-95 transition-all shadow-sm border border-emerald-100"
                          >
                            <Icon name="category" clazz="text-[14px]" /> 品类管理
                          </button>
                          <button
                            onClick={() => handleEdit()}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-[10px] font-bold hover:bg-opacity-90 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                          >
                            <Icon name="add" clazz="text-[14px]" /> 添加商品
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 w-full animate-in slide-in-from-right-2 duration-300">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Icon name="search" clazz="text-lg" />
                          </span>
                          <input
                            autoFocus
                            className="w-full bg-slate-50 border-none rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:ring-4 focus:ring-primary/10 text-slate-700 font-bold placeholder:font-normal"
                            placeholder="搜索商品名称、编码..."
                            value={productSearchKeyword}
                            onChange={e => setProductSearchKeyword(e.target.value)}
                          />
                          {productSearchKeyword && (
                            <button
                              onClick={() => setProductSearchKeyword('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-500"
                            >
                              <Icon name="cancel" clazz="text-base" />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setIsProductSearchVisible(false);
                            setProductSearchKeyword('');
                          }}
                          className="text-sm font-bold text-primary px-2"
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>

                  <nav className="flex gap-6 overflow-x-auto no-scrollbar pt-2">
                    <a onClick={() => { setProductFilter('all'); fetchData(); }} className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-all ${productFilter === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      全部 <span className="text-xs ml-1 opacity-70">{products.length}</span>
                    </a>
                    <a onClick={() => { setProductFilter('instock'); fetchData(); }} className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-all ${productFilter === 'instock' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      现货 <span className="text-xs ml-1 opacity-70">{products.filter(p => p.status === 1 && p.stock > 5).length}</span>
                    </a>
                    <a onClick={() => { setProductFilter('low'); fetchData(); }} className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${productFilter === 'low' ? 'border-orange-500 text-orange-500' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      库存告急
                      {products.filter(p => p.status === 1 && p.stock <= 5 && p.stock > 0).length > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                      )}
                      <span className="text-xs opacity-70">{products.filter(p => p.status === 1 && p.stock <= 5 && p.stock > 0).length}</span>
                    </a>
                    <a onClick={() => { setProductFilter('offline'); fetchData(); }} className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-all ${productFilter === 'offline' ? 'border-slate-600 text-slate-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      已下架 <span className="text-xs ml-1 opacity-70">{products.filter(p => p.status === 0 || p.stock === 0).length}</span>
                    </a>
                  </nav>
                </header>

                {apiError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <Icon name="wifi_off" clazz="text-red-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-700">无法连接到服务器</p>
                      <p className="text-xs text-red-500 mt-0.5">请确认 Node 服务正在运行（端口 3000）</p>
                      <button
                        onClick={() => fetchData()}
                        className="mt-2 text-xs text-red-600 font-bold underline"
                      >点击重试</button>
                    </div>
                  </div>
                )}

                <div className="px-4 md:px-8 pb-12 flex flex-col gap-4 md:gap-5">
                  {products
                    .filter(product => {
                      if (productFilter === 'all') return true;
                      if (productFilter === 'instock') return product.status === 1 && product.stock > 5;
                      if (productFilter === 'low') return product.status === 1 && product.stock <= 5 && product.stock > 0;
                      if (productFilter === 'offline') return product.status === 0 || product.stock === 0;
                      return true;
                    })
                    .map(product => {
                      // Formatting variants directly mapped from MCP design statuses
                      const isOffline = product.status === 0;
                      const outOfStock = product.stock <= 5 && product.stock > 0;
                      const exhausted = product.stock === 0;

                      return (
                        <div key={product.id} className={`bg-white rounded-xl p-4 md:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 hover:shadow-lg hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center gap-4 md:gap-6 group ${isOffline ? 'opacity-80' : ''}`}>

                          {/* 1. Product Image & Basic Info */}
                          <div className="flex gap-4 items-center flex-1 min-w-0">
                            <div className={`size-20 md:size-24 rounded-lg bg-slate-50 flex-shrink-0 overflow-hidden border border-slate-100 group-hover:shadow-md transition-all duration-300 ${isOffline ? 'grayscale' : ''}`}>
                              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={getAssetUrl(product.cover_image) || 'https://via.placeholder.com/150'} alt={product.name} />
                            </div>

                            <div className="flex-1 min-w-0 md:flex md:items-center md:justify-between">
                              <div className="min-w-0 mr-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-base md:text-lg font-bold text-slate-900 truncate group-hover:text-primary transition-colors">{product.name}</h3>
                                  {outOfStock ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 shrink-0">库存紧张</span>
                                  ) : exhausted || isOffline ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300 shrink-0">已下架/售罄</span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 shrink-0">有货</span>
                                  )}
                                </div>
                                <p className="text-[10px] md:text-xs text-slate-400 font-medium">SKU: {product.sku || `PROD-${product.id}`}</p>
                              </div>

                              <div className="mt-2 md:mt-0 flex items-baseline gap-2 md:flex-col md:items-end md:gap-0.5 shrink-0 px-2 md:px-6 md:border-l md:border-r border-slate-100">
                                <p className={`text-lg md:text-xl font-bold flex items-baseline gap-0.5 ${isOffline ? 'text-slate-400' : 'text-primary tracking-tight'}`}>
                                  <span className="text-[10px] md:text-xs">¥</span>{product.price.toFixed(2)}
                                </p>
                                <p className={`text-[10px] md:text-xs font-medium px-1.5 py-0.5 rounded-sm ${outOfStock ? 'text-orange-600 bg-orange-50' : 'text-slate-400 bg-slate-50'}`}>
                                  剩余库存: {product.stock}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 2. Actions Container */}
                          <div className="pt-4 md:pt-0 border-t md:border-t-0 border-slate-50/80 flex justify-between md:justify-end items-center gap-2 overflow-x-auto no-scrollbar shrink-0 mt-auto md:mt-0 w-full md:w-auto">
                            <div className="flex gap-1.5 md:gap-2 shrink-0">
                              <button className="whitespace-nowrap px-4 py-2 md:px-5 md:py-2.5 rounded-[10px] border border-slate-200 text-xs md:text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-primary active:scale-95 transition-all shadow-sm flex items-center gap-1.5" onClick={() => promptStock(product)}>
                                <Icon name="inventory_2" clazz="text-[14px]" />
                                <span className="hidden md:inline">调整</span>库存
                              </button>
                              <button className="whitespace-nowrap px-4 py-2 md:px-5 md:py-2.5 rounded-[10px] border border-slate-200 text-xs md:text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-primary active:scale-95 transition-all shadow-sm flex items-center gap-1.5" onClick={() => promptPrice(product)}>
                                <Icon name="payments" clazz="text-[14px]" />
                                <span className="hidden md:inline">修改</span>价格
                              </button>

                              {isOffline ? (
                                <button className="whitespace-nowrap px-4 py-2 md:px-5 md:py-2.5 rounded-[10px] border border-primary-dark/30 text-xs md:text-sm font-bold bg-primary-dark/10 text-primary-dark hover:bg-primary-dark/20 active:scale-95 transition-all shadow-sm flex items-center gap-1.5" onClick={() => toggleStatus(product)}>
                                  <Icon name="publish" clazz="text-[14px]" />
                                  立即上架
                                </button>
                              ) : (
                                <button className="whitespace-nowrap px-4 py-2 md:px-5 md:py-2.5 rounded-[10px] border border-red-200 text-xs md:text-sm font-bold bg-white text-red-500 hover:bg-red-50 hover:text-red-600 active:scale-95 transition-all shadow-sm flex items-center gap-1.5" onClick={() => toggleStatus(product)}>
                                  <Icon name="visibility_off" clazz="text-[14px]" />
                                  暂时下架
                                </button>
                              )}
                            </div>

                            {/* Extra Desktop Context Menu / Options */}
                            <div className="flex items-center gap-1.5 md:gap-2 shrink-0 md:ml-2 border-l border-slate-100 pl-2">
                              <button className="size-8 md:size-[38px] rounded-lg bg-slate-50 text-slate-400 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all shadow-sm" onClick={() => handleEdit(product)} title="编辑商品">
                                <Icon name="edit" clazz="text-sm md:text-[15px]" />
                              </button>
                              <button className="size-8 md:size-[38px] rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-all shadow-sm" onClick={() => setDeleteTarget(product)} title="删除商品">
                                <Icon name="delete" clazz="text-sm md:text-[15px]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Empty State */}
                {products.filter(product => {
                  if (productFilter === 'all') return true;
                  if (productFilter === 'instock') return product.status === 1 && product.stock > 5;
                  if (productFilter === 'low') return product.status === 1 && product.stock <= 5 && product.stock > 0;
                  if (productFilter === 'offline') return product.status === 0 || product.stock === 0;
                  return true;
                }).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <Icon name="inventory_2" clazz="text-5xl mb-3 text-slate-300" />
                      <p className="text-sm font-medium">暂无符合条件的商品</p>
                      <p className="text-xs mt-1">请切换其他筛选条件</p>
                    </div>
                  )}

                {/* Removed sticky FAB button as it's now in the header */}
              </div>
            )}
          </main>
          {/* Bottom Navigation */}
          <footer className="md:hidden flex-none bg-white/90 backdrop-blur-lg border-t border-slate-200 px-2 pb-8 sm:pb-6 pt-2 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-around drop-shadow pt-2">
              <button
                onClick={() => { setActiveTab('dashboard'); fetchData(); }}
                className={`flex flex-col items-center gap-1 px-4 py-2 ${activeTab === 'dashboard' ? 'text-primary' : 'text-slate-400 hover:text-primary transition-colors'}`}
              >
                <Icon name="dashboard" clazz={activeTab === 'dashboard' ? 'font-bold' : ''} />
                <span className={`text-[10px] ${activeTab === 'dashboard' ? 'font-bold uppercase tracking-wider' : 'font-medium'}`}>概览</span>
              </button>
              <button
                onClick={() => { setActiveTab('orders'); fetchData(); }}
                className={`flex flex-col items-center gap-1 px-4 py-2 ${activeTab === 'orders' ? 'text-primary' : 'text-slate-400 hover:text-primary transition-colors'}`}
              >
                <Icon name="receipt_long" />
                <span className="text-[10px] font-medium">订单</span>
              </button>
              <button
                onClick={() => { setActiveTab('products'); fetchData(); }}
                className={`flex flex-col items-center gap-1 px-4 py-2 relative ${activeTab === 'products' ? 'text-primary-dark' : 'text-slate-400 hover:text-primary-dark transition-colors'}`}
              >
                <Icon name="inventory_2" clazz={activeTab === 'products' ? 'font-bold' : ''} />
                <span className={`text-[10px] ${activeTab === 'products' ? 'font-bold' : 'font-medium'}`}>商品</span>
                {activeTab === 'products' && <div className="absolute top-2 right-4 w-1.5 h-1.5 bg-primary-dark rounded-full"></div>}
              </button>
              {/* <button
              className="flex flex-col items-center gap-1 px-4 py-2 text-slate-400 hover:text-primary transition-colors"
            >
              <Icon name="settings" />
              <span className="text-[10px] font-medium">设置</span>
            </button> */}
            </div>
          </footer>

          {/* Edit Modal / Form */}
          {
            isEditing && (
              <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-500 cursor-pointer" onClick={() => setIsEditing(false)}>arrow_back</span>
                      <h1 className="text-xl font-semibold tracking-tight">
                        {currentProduct.id ? '编辑商品信息' : '添加商品'}
                        <span className="text-sm font-normal text-slate-400 ml-2">Southern Wind Botanicals</span>
                      </h1>
                    </div>
                  </div>
                </header>

                <main className="flex-1 overflow-y-auto w-full px-4 py-6 font-display bg-[#fcfaf9]">
                  {/* Product Head info bar */}
                  <div className="bg-white rounded-xl p-6 mb-6 border border-slate-100 shadow-sm flex items-center gap-6">
                    <div className="group relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-slate-50 border border-slate-100 cursor-pointer transition-all hover:ring-2 hover:ring-primary/20">
                      <img src={getAssetUrl(currentProduct.cover_image || '/assets/avatar.jpg')} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                        <Icon name="edit" clazz="text-white text-xl" />
                        <span className="text-[10px] text-white font-medium">修改图片</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={handleImageUpload}
                        title="选择图片"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-lg font-bold text-slate-800">{currentProduct.name || '新商品'}</h2>
                          <p className="text-xs text-slate-400 mt-1 tracking-wider uppercase">SKU: {currentProduct.sku || `PROD-${currentProduct.id || 'NEW'}`}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold rounded uppercase ${currentProduct.status === 1 ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                          {currentProduct.status === 1 ? '已上架' : '已下架'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Product Form Elements Grid */}
                  <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-6">


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">商品名称</label>
                        <input
                          className="w-full py-4 px-5 border border-slate-200 rounded-2xl text-slate-900 font-bold bg-slate-50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition placeholder:font-normal"
                          type="text"
                          placeholder="请输入商品名称"
                          value={currentProduct.name}
                          onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">商品编码 (SKU)</label>
                        <input
                          className="w-full py-4 px-5 border border-slate-200 rounded-2xl text-slate-900 font-bold bg-slate-50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition font-mono uppercase"
                          type="text"
                          placeholder="如: NF-E001"
                          value={currentProduct.sku || ''}
                          onChange={e => setCurrentProduct({ ...currentProduct, sku: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">所属品类</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {categories.map(c => {
                          const isSelected = (currentProduct.category_id || (categories[0]?.id || 1)) === c.id;
                          return (
                            <div
                              key={c.id}
                              onClick={() => setCurrentProduct({ ...currentProduct, category_id: c.id })}
                              className={`px-4 py-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center ${isSelected ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                }`}
                            >
                              <span className="text-sm font-bold tracking-tight">{c.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">商品副标题</label>
                      <input
                        className="w-full py-4 px-5 border border-slate-200 rounded-2xl text-slate-900 font-bold bg-slate-50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition"
                        type="text"
                        placeholder="如: The Essence of Tranquility"
                        value={currentProduct.subtitle || ''}
                        onChange={e => setCurrentProduct({ ...currentProduct, subtitle: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600">销售价格</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
                          <input
                            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-700"
                            type="number"
                            value={currentProduct.price}
                            onChange={e => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-600">当前库存</label>
                        <div className="relative">
                          <input
                            className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-700"
                            type="number"
                            value={currentProduct.stock}
                            onChange={e => setCurrentProduct({ ...currentProduct, stock: Number(e.target.value) })}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">件</span>
                        </div>
                      </div>
                    </div>

                    {/* Mocked Detail Properties */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-600 mt-2 border-t pt-4">产品属性配置 (选填)</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">净重 (g)</label>
                          <input
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-slate-600"
                            type="number"
                            placeholder="250"
                            value={currentProduct.details?.weight || ''}
                            onChange={e => setCurrentProduct({ ...currentProduct, details: { ...currentProduct.details, weight: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">长度 (cm)</label>
                          <input
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-slate-600"
                            type="number"
                            placeholder="12"
                            value={currentProduct.details?.length || ''}
                            onChange={e => setCurrentProduct({ ...currentProduct, details: { ...currentProduct.details, length: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">燃时 (min)</label>
                          <input
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-slate-600"
                            type="number"
                            placeholder="45"
                            value={currentProduct.details?.burnTime || ''}
                            onChange={e => setCurrentProduct({ ...currentProduct, details: { ...currentProduct.details, burnTime: e.target.value } })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Rich text mock */}
                    <div className="space-y-2 mt-2">
                      <label className="text-sm font-semibold text-slate-600">商品详情描述</label>
                      <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
                        <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50">
                          <button className="p-1 rounded hover:bg-white text-slate-600"><Icon name="format_bold" clazz="text-lg" /></button>
                          <button className="p-1 rounded hover:bg-white text-slate-600"><Icon name="format_italic" clazz="text-lg" /></button>
                          <div className="w-px h-4 bg-slate-200 mx-1"></div>
                          <button className="p-1 rounded hover:bg-white text-slate-600"><Icon name="image" clazz="text-lg" /></button>
                        </div>
                        <div
                          className={`p-3 min-h-[120px] text-slate-500 text-xs leading-relaxed overflow-y-auto focus:outline-none transition empty:before:content-[attr(data-placeholder)] [&:empty]:before:text-slate-400`}
                          contentEditable
                          suppressContentEditableWarning
                          data-placeholder="填写真实深沉的香学文案展示品牌魅力..."
                          onBlur={(e) => setCurrentProduct({ ...currentProduct, description: e.currentTarget.textContent })}
                          onFocus={(e) => {
                            if (e.currentTarget.textContent?.trim() === "填写真实深沉的香学文案展示品牌魅力...") {
                              e.currentTarget.textContent = '';
                            }
                          }}
                        >
                          {currentProduct.description}
                        </div>
                      </div>
                    </div>

                    {/* Status Toggle */}
                    <div className="flex items-center justify-between py-4 border-t border-slate-100">
                      <div>
                        <span className="block text-sm font-semibold text-slate-600">立即上架</span>
                        <span className="text-[10px] text-slate-400">控制商品是否在前端商城显示</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={currentProduct.status !== 0}
                          onChange={(e) => setCurrentProduct({ ...currentProduct, status: e.target.checked ? 1 : 0 })}
                        />
                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2f5151]"></div>
                      </label>
                    </div>

                    {/* Save action inside the scroller wrapper */}
                    <div className="pt-2 pb-6">
                      <button onClick={handleSave} className="w-full bg-[#2f5151] hover:bg-[#1f3a3a] text-white text-base font-bold py-5 rounded-2xl shadow-xl shadow-[#2f5151]/25 transition-all transform hover:scale-[1.01] active:scale-[0.97]">
                        保存修改
                      </button>
                    </div>

                  </div>

                </main>
              </div>
            )
          }

        </div >

        {/* Custom Inline Edit Modal */}
        {
          inlineModalVisible && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[24px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-1">
                    {inlineModalType === 'stock' ? '调整库存' : '调整价格'}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mb-6 truncate">
                    修改商品：{inlineModalProduct?.name}
                  </p>

                  <div className="relative">
                    {inlineModalType === 'price' && (
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
                    )}
                    <input
                      type="number"
                      autoFocus
                      className={`w-full bg-slate-50 border outline-none border-slate-200 text-slate-900 text-lg font-bold rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all py-3 ${inlineModalType === 'price' ? 'pl-9 pr-4' : 'px-4'}`}
                      value={inlineModalValue}
                      onChange={(e) => setInlineModalValue(e.target.value)}
                      placeholder="输入数值"
                      onKeyDown={(e) => e.key === 'Enter' && handleInlineModalSubmit()}
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <button
                    onClick={() => setInlineModalVisible(false)}
                    className="flex-1 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleInlineModalSubmit}
                    className="flex-1 py-3 text-sm font-bold text-white bg-primary disabled:opacity-50 hover:bg-opacity-90 rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all"
                  >
                    确认修改
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Delete Confirm Modal */}
        {
          deleteTarget && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[24px] w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
                {/* Red Warning Header */}
                <div className="bg-red-500 px-6 pt-8 pb-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                    <Icon name="warning" clazz="text-white text-3xl" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">删除风险提示</h3>
                  <p className="text-red-100 text-xs mt-1">此操作不可还原！请谨慎确认</p>
                </div>
                <div className="p-6">
                  <p className="text-slate-700 text-sm text-center leading-relaxed">
                    您将永久删除商品
                    <span className="block font-bold text-slate-900 text-base mt-2 mb-2 truncate">「{deleteTarget.name}」</span>
                    该商品的所有数据将从数据库中彻底清除，无法恢复。
                  </p>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mt-4 flex items-start gap-2">
                    <Icon name="info" clazz="text-orange-500 text-base flex-shrink-0 mt-0.5" />
                    <p className="text-orange-700 text-xs leading-relaxed">建议使用「下架」功能替代删除操作，以保留历史订单数据的完整性。</p>
                  </div>
                </div>
                <div className="px-6 pb-6 flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 active:scale-95 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleDelete(deleteTarget)}
                    className="flex-1 py-3 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/30 active:scale-95 transition-all"
                  >
                    确认删除
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Order Detail Modal */}
        {
          isOrderDetailOpen && currentOrderDetail && (
            <div className="fixed inset-0 bg-white z-[90] flex flex-col animate-in slide-in-from-right duration-300">
              <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsOrderDetailOpen(false)} className="p-1 -ml-1 hover:bg-slate-100 rounded-full flex items-center justify-center transition">
                    <Icon name="arrow_back" clazz="text-slate-500" />
                  </button>
                  <h2 className="text-lg font-bold">订单详情</h2>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${currentOrderDetail.status === 1 ? 'bg-emerald-100 text-emerald-700' :
                  currentOrderDetail.status === 4 ? 'bg-red-100 text-red-700' :
                    currentOrderDetail.status === 5 ? 'bg-slate-100 text-slate-500' :
                      currentOrderDetail.status === 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                  {currentOrderDetail.status === 1 ? '待发货' :
                    currentOrderDetail.status === 0 ? '待付款' :
                      currentOrderDetail.status === 4 ? '售后申请' :
                        currentOrderDetail.status === 5 ? '已退款' : '已完成'}
                </div>
              </header>

              <main className="flex-1 overflow-y-auto bg-[#fcfaf9]">
                <div className="bg-white border-b border-slate-100 p-6 mb-3">
                  <div className="flex flex-col gap-1 mb-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Order Status</p>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight">
                      {currentOrderDetail.status === 0 ? '待付款' :
                        currentOrderDetail.status === 1 ? '待发货' :
                          currentOrderDetail.status === 4 ? '售后处理中' :
                            currentOrderDetail.status === 5 ? '已完成退款' : '订单已完成'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {currentOrderDetail.status === 0 ? '订单已创建，等待客户支付。' :
                        currentOrderDetail.status === 1 ? '客户已支付，请尽快安排仓库进行发货。' :
                          currentOrderDetail.status === 4 ? '客户已发起退款申请，请及时处理。' :
                            currentOrderDetail.status === 5 ? '该订单已完成退款处理，交易关闭。' : '订单已顺利交付，感谢您的服务。'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-4 py-4 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">订单编号</p>
                      <p className="text-xs font-bold text-slate-800">{currentOrderDetail.order_no || `#${currentOrderDetail.id}`}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">支付时间</p>
                      <p className="text-xs font-bold text-slate-800">{currentOrderDetail.pay_time || new Date(currentOrderDetail.create_time).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">支付方式</p>
                      <p className="text-xs font-bold text-slate-800">微信支付</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">下单渠道</p>
                      <p className="text-xs font-bold text-slate-800">微信小程序</p>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-white border-y border-slate-100 p-6 mb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="local_shipping" clazz="text-primary text-xl" />
                    <h3 className="text-sm font-bold">收货人信息</h3>
                  </div>
                  {currentOrderDetail.recipient ? (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-bold text-slate-900">{currentOrderDetail.recipient}</p>
                        <p className="text-xs font-bold text-primary">{currentOrderDetail.phone}</p>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {currentOrderDetail.province} {currentOrderDetail.city} {currentOrderDetail.district} {currentOrderDetail.address_detail}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">客户尚未填写收货地址</p>
                  )}
                </div>

                {/* Product Items */}
                <div className="bg-white border-y border-slate-100 p-6 mb-3">
                  <h3 className="text-sm font-bold mb-4">商品清单</h3>
                  <div className="space-y-4">
                    {currentOrderDetail.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-4">
                        <div className="size-16 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                          <img src={getAssetUrl(item.cover_image)} className="size-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 py-0.5">
                          <p className="text-xs font-bold text-slate-900 truncate">{item.product_name}</p>
                          <p className="text-[10px] text-slate-400 mt-1 uppercase">SKU: {item.sku || 'N/A'}</p>
                          <div className="flex justify-between items-center mt-auto">
                            <p className="text-xs text-slate-900">¥{item.price} x {item.quantity}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                    <p className="text-xs text-slate-500 font-medium">共计 {currentOrderDetail.items?.length || 0} 件商品</p>
                    <p className="font-bold text-primary">合计 ¥{currentOrderDetail.total_amount}</p>
                  </div>
                </div>

                {/* Refund Info Section */}
                {currentOrderDetail.refund_no && (
                  <div className="bg-red-50/50 border-y border-red-100 p-6 mb-3">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon name="assignment_return" clazz="text-red-600 text-xl" />
                      <h3 className="text-sm font-bold text-red-900">售后退款信息</h3>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">退款单号</p>
                          <p className="text-xs font-bold text-slate-800">{currentOrderDetail.refund_no}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">退款金额</p>
                          <p className="text-xs font-bold text-red-600">¥{currentOrderDetail.refund_amount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">退款原因</p>
                          <p className="text-xs font-medium text-slate-700">{currentOrderDetail.refund_reason}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">申请时间</p>
                          <p className="text-xs font-medium text-slate-700">{new Date(currentOrderDetail.refund_time).toLocaleString()}</p>
                        </div>
                      </div>
                      {currentOrderDetail.status === 4 && (
                        <div className="pt-4 border-t border-slate-50 flex gap-3">
                          <button
                            className="flex-1 py-4 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 active:scale-95 transition shadow-lg shadow-red-600/10"
                            onClick={approveRefund}
                          >
                            同意退款
                          </button>
                          <button
                            className="flex-1 py-4 bg-white text-slate-600 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 active:scale-95 transition"
                            onClick={rejectRefund}
                          >
                            拒绝申请
                          </button>
                        </div>
                      )}
                      {currentOrderDetail.status === 5 && (
                        <div className="pt-4 border-t border-slate-50">
                          <div className="w-full py-2 bg-emerald-50 text-emerald-700 rounded-lg text-center text-xs font-bold">
                            退款成功 (已结案)
                          </div>
                        </div>
                      )}
                      {currentOrderDetail.refund_status === 3 && currentOrderDetail.status !== 4 && (
                        <div className="pt-4 border-t border-slate-50">
                          <div className="w-full py-2 bg-slate-100 text-slate-500 rounded-lg text-center text-xs font-bold">
                            售后申请已拒绝
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Shipping Info Display */}
                {currentOrderDetail.status >= 2 && currentOrderDetail.tracking_no && (
                  <div className="bg-emerald-50/50 border-y border-emerald-100 p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon name="local_shipping" clazz="text-emerald-600 text-xl" />
                      <h3 className="text-sm font-bold text-emerald-900">物流发货信息</h3>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">物流公司</p>
                          <p className="text-xs font-bold text-slate-800">{currentOrderDetail.logistics_company}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">快递单号</p>
                          <p className="text-xs font-bold text-primary">{currentOrderDetail.tracking_no}</p>
                        </div>
                        {currentOrderDetail.ship_time && (
                          <div className="col-span-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">发货时间</p>
                            <p className="text-xs font-medium text-slate-700">{new Date(currentOrderDetail.ship_time).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery Action Info */}
                {currentOrderDetail.status === 1 && (
                  <div id="shipping-section" className="bg-white border-y border-slate-100 p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon name="edit_document" clazz="text-primary text-xl" />
                      <h3 className="text-sm font-bold">发货信息</h3>
                    </div>
                    <div className="space-y-8">
                      <div className="flex flex-col gap-3">
                        <label className="text-sm text-slate-400 font-bold uppercase tracking-widest ml-1">物流公司</label>
                        <select
                          className="w-full px-5 py-5 rounded-2xl border border-slate-100 bg-slate-50 text-base font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none"
                          value={shippingForm.logistics_company}
                          onChange={e => setShippingForm({ ...shippingForm, logistics_company: e.target.value })}
                        >
                          <option>顺丰速运</option>
                          <option>中通快递</option>
                          <option>圆通速递</option>
                          <option>韵达快递</option>
                          <option>京东物流</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-3">
                        <label className="text-sm text-slate-400 font-bold uppercase tracking-widest ml-1">快递单号</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="请输入或扫描运单号"
                            className={`w-full px-5 py-5 rounded-2xl border ${shippingError ? 'border-red-500 bg-red-50/30' : 'border-slate-100 bg-slate-50'} text-base font-bold focus:ring-4 ${shippingError ? 'focus:ring-red-100' : 'focus:ring-primary/10'} transition-all outline-none`}
                            value={shippingForm.tracking_no}
                            onChange={e => {
                              setShippingForm({ ...shippingForm, tracking_no: e.target.value });
                              if (shippingError) setShippingError('');
                            }}
                          />
                          {shippingError && (
                            <p className="text-[11px] text-red-500 font-bold mt-2 ml-1 animate-pulse">
                              ⚠ {shippingError}
                            </p>
                          )}
                          <Icon name="qr_code_scanner" clazz="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 text-2xl" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <button
                        className="w-full py-5 bg-primary text-white rounded-2xl text-lg font-bold shadow-2xl shadow-primary/30 hover:bg-[#2f5151] hover:scale-[1.01] active:scale-[0.97] transition-all flex items-center justify-center gap-3"
                        onClick={shipOrder}
                      >
                        <Icon name="send" />
                        确认发货
                      </button>
                      <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed">
                        确认后将同步更新订单状态，并通知客户
                      </p>
                    </div>
                  </div>
                )}
              </main>
            </div>
          )
        }

        {/* CATEGORY MANAGER MODAL */}
        {
          isCategoryManagerOpen && (
            <div className="absolute inset-0 bg-white z-[60] flex flex-col animate-in slide-in-from-right duration-300">
              <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-slate-500 cursor-pointer p-1 active:bg-slate-100 rounded-full transition-colors"
                    onClick={() => {
                      if (currentCategory) {
                        setCurrentCategory(null);
                        setCategoryError('');
                      } else {
                        setIsCategoryManagerOpen(false);
                      }
                    }}
                  >
                    arrow_back
                  </span>
                  <div className="flex flex-col">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">品类管理</h1>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Category System</span>
                  </div>
                </div>
                <button
                  onClick={() => openCategoryEditor()}
                  className="size-11 rounded-2xl bg-[#2f5151] text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                >
                  <Icon name="add" />
                </button>
              </header>

              <main className="flex-1 overflow-y-auto w-full px-5 py-6 bg-[#fcfaf9]">
                {currentCategory ? (
                  /* Category Form */
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-900/5">
                      <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                        <span className="w-4 h-[1px] bg-slate-200"></span>
                        {currentCategory.id ? '品类详情' : '新增品类'}
                      </h2>

                      <div className="flex flex-col items-center mb-8">
                        <div className="group relative size-32 rounded-3xl overflow-hidden bg-slate-50 border border-slate-100 cursor-pointer shadow-inner">
                          {currentCategory.image ? (
                            <img src={getAssetUrl(currentCategory.image)} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                              <Icon name="image" clazz="text-3xl mb-1" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">上传图片</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Icon name="edit" clazz="text-white" />
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={handleCategoryImageUpload}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-3 font-medium uppercase tracking-widest text-center">建议尺寸: 500x500px</p>
                      </div>

                      <div className="space-y-8">
                        <div className="grid grid-cols-1 gap-8">
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 ml-1 uppercase">分类名称</label>
                            <input
                              autoFocus
                              className={`w-full px-6 py-5 rounded-2xl border ${categoryError ? 'border-red-400 bg-red-50/50' : 'border-slate-100 bg-slate-50'} text-base font-bold outline-none focus:ring-4 ${categoryError ? 'focus:ring-red-100' : 'focus:ring-primary/10'} transition-all placeholder:font-normal`}
                              placeholder="如：香道、茶礼"
                              value={currentCategory.name}
                              onChange={e => {
                                setCurrentCategory({ ...currentCategory, name: e.target.value });
                                if (categoryError) setCategoryError('');
                              }}
                            />
                            {categoryError && (
                              <div className="flex items-center gap-1.5 mt-2 ml-1 animate-in slide-in-from-top-1 duration-200">
                                <Icon name="error" clazz="text-red-500 text-xs" />
                                <span className="text-xs text-red-500 font-bold tracking-tight">{categoryError}</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 ml-1 uppercase">副标题 / 英文名</label>
                            <input
                              className="w-full px-6 py-5 rounded-2xl border border-slate-100 bg-slate-50 text-base font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:font-normal"
                              placeholder="如：Incense Way"
                              value={currentCategory.subtitle || ''}
                              onChange={e => setCurrentCategory({ ...currentCategory, subtitle: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 ml-1 uppercase">排序权重</label>
                            <input
                              type="number"
                              className="w-full px-6 py-5 rounded-2xl border border-slate-100 bg-slate-50 text-base font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono"
                              value={currentCategory.sort_order}
                              onChange={e => setCurrentCategory({ ...currentCategory, sort_order: Number(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 ml-1 uppercase">当前状态</label>
                            <select
                              className="w-full px-6 py-5 rounded-2xl border border-slate-100 bg-slate-50 text-base font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                              value={currentCategory.status}
                              onChange={e => setCurrentCategory({ ...currentCategory, status: Number(e.target.value) })}
                            >
                              <option value={1}>启用显示</option>
                              <option value={0}>禁用隐藏</option>
                            </select>
                          </div>
                        </div>

                        {/* Homepage display toggle */}
                        <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100/50 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                首页推荐展示
                                {currentCategory.is_top === 1 && (
                                  <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-black border border-amber-200/50 scale-90">Active</span>
                                )}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                设置后该品类将以图文形式在小程序首页“热门品类”板块优先显示，最多支持4个。
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                const newVal = currentCategory.is_top === 1 ? 0 : 1;
                                if (newVal === 1) {
                                  const activeTops = categories.filter(c => c.is_top === 1 && c.id !== currentCategory.id).length;
                                  if (activeTops >= 4) {
                                    showToast('首页推荐位已满（最多4个）', 'error');
                                    return;
                                  }
                                }
                                setCurrentCategory({ ...currentCategory, is_top: newVal });
                              }}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-offset-2 focus:ring-2 focus:ring-primary/20 ${currentCategory.is_top === 1 ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-200'}`}
                            >
                              <span
                                className={`inline-block size-4 transform rounded-full bg-white transition-transform ${currentCategory.is_top === 1 ? 'translate-x-6' : 'translate-x-1'}`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* PRODUCT SELECTION SECTION */}
                      <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-900/5 mt-6">
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="w-4 h-[1px] bg-slate-200"></span>
                            品类关联商品 ({selectedProductIds.length})
                          </h2>
                          <button
                            onClick={() => setIsProductPickerOpen(!isProductPickerOpen)}
                            className="text-[10px] font-bold text-primary border border-primary/20 px-3 py-1.5 rounded-full bg-primary/5 active:bg-primary/10 transition-colors uppercase tracking-widest"
                          >
                            {isProductPickerOpen ? '折叠列表' : '批量调整'}
                          </button>
                        </div>

                        {isProductPickerOpen ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-300">
                            {products.map(p => {
                              const isSelected = selectedProductIds.includes(p.id);
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                                    } else {
                                      setSelectedProductIds([...selectedProductIds, p.id]);
                                    }
                                  }}
                                  className={`flex items-center justify-between p-4 rounded-3xl border-2 transition-all cursor-pointer ${isSelected ? 'bg-primary/5 border-primary shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                                    }`}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="size-14 rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm">
                                      <img src={getAssetUrl(p.cover_image || '/assets/avatar.jpg')} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-base font-bold text-slate-800 truncate">{p.name}</p>
                                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">SKU: {p.sku || 'N/A'}</p>
                                    </div>
                                  </div>
                                  <div className={`size-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-slate-200 bg-white'
                                    }`}>
                                    {isSelected && <Icon name="check" clazz="text-lg font-bold" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2 animate-in fade-in duration-300">
                            {selectedProductIds.length > 0 ? (
                              products.filter(p => selectedProductIds.includes(p.id)).slice(0, 5).map(p => (
                                <div key={p.id} className="size-10 rounded-xl overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
                                  <img src={getAssetUrl(p.cover_image || '/assets/avatar.jpg')} className="w-full h-full object-cover" />
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400 italic py-2 ml-1">当前暂无关联商品</p>
                            )}
                            {selectedProductIds.length > 5 && (
                              <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 border-2 border-white shadow-sm ring-1 ring-slate-100">
                                +{selectedProductIds.length - 5}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleSaveCategory()}
                          className="flex-1 py-5 bg-primary text-white rounded-[24px] text-lg font-bold shadow-2xl shadow-primary/30 active:scale-95 transition-all"
                        >
                          保存修改
                        </button>
                        {currentCategory.id && (
                          <button
                            onClick={() => handleDeleteCategory(currentCategory.id)}
                            className="px-6 py-5 bg-white text-red-500 rounded-[24px] text-lg font-bold active:scale-95 transition-all border border-red-50 text-center flex items-center justify-center"
                          >
                            <Icon name="delete" />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => { setCurrentCategory(null); setCategoryError(''); }}
                        className="w-full py-4 text-slate-400 font-bold text-sm tracking-widest active:text-slate-600 transition-colors"
                      >
                        取消并返回
                      </button>
                    </div>

                    <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed font-medium">
                      修改分类名称可能会影响到小程序端导航的显示
                    </p>
                  </div>
                ) : (
                  /* Category List */
                  <div className="grid grid-cols-1 gap-6">
                    {categories.map((c, idx) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          openCategoryEditor(c);
                        }}
                        className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-lg shadow-slate-900/5 flex items-center justify-between hover:border-primary/20 active:scale-[0.97] transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-5">
                          <div className="size-14 rounded-2xl bg-slate-50 overflow-hidden flex items-center justify-center border border-slate-100 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-300">
                            {c.image ? (
                              <img src={getAssetUrl(c.image)} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-slate-300 font-bold text-xl">
                                {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 border-b-2 border-transparent group-hover:border-primary/30 transition-all">{c.name}</p>
                              {c.is_top === 1 && (
                                <div className="flex items-center justify-center bg-amber-50 border border-amber-200 text-amber-500 rounded text-[9px] px-1 font-bold">首页推荐</div>
                              )}
                            </div>
                            {c.subtitle && <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider -mt-0.5">{c.subtitle}</p>}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`size-1.5 rounded-full ${c.status === 1 ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                {c.status === 1 ? 'Running' : 'Offline'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleToggleCategoryTop(e, c)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all duration-300 shadow-sm ${c.is_top === 1
                              ? 'bg-amber-50 text-amber-500 border-amber-200 hover:bg-amber-100 hover:text-amber-600 shadow-amber-500/10'
                              : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                              }`}
                          >
                            <Icon name={c.is_top === 1 ? 'bookmark_remove' : 'push_pin'} clazz="text-sm" />
                            <span className="text-[10px] font-bold">{c.is_top === 1 ? '取消首页' : '首页显示'}</span>
                          </button>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-400 group-hover:bg-primary group-hover:text-white border border-transparent group-hover:border-primary/20 shadow-sm transition-all duration-300">
                            <span className="text-[10px] font-bold">详情</span>
                            <Icon name="chevron_right" clazz="text-sm" />
                          </div>
                        </div>
                      </div>
                    ))}
                    {categories.length === 0 && (
                      <div className="text-center py-24 opacity-30 flex flex-col items-center">
                        <div className="size-24 rounded-full bg-slate-200/50 flex items-center justify-center mb-6">
                          <Icon name="category" clazz="text-5xl" />
                        </div>
                        <p className="text-sm font-bold tracking-[0.2em] uppercase">NO CATEGORIES</p>
                      </div>
                    )}
                  </div>
                )}
              </main>
            </div>
          )
        }

        {/* LIGHTWEIGHT TOAST */}
        {
          toast && (
            <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
              <div className={`px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${toast.type === 'error' ? 'bg-red-500/90 text-white border-red-400' :
                toast.type === 'info' ? 'bg-blue-500/90 text-white border-blue-400' :
                  'bg-[#2f5151]/95 text-white border-primary/20'
                }`}>
                <Icon name={toast.type === 'error' ? 'report' : toast.type === 'info' ? 'info' : 'check_circle'} clazz="text-xl" />
                <span className="text-sm font-bold tracking-tight">{toast.message}</span>
              </div>
            </div>
          )
        }
      </div >
    </div >
  );
}

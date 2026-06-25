import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CatalogProvider } from './context/CatalogContext'
import Layout from './components/Layout'
import ClientLayout from './components/ClientLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductForm from './pages/ProductForm'
import ProductDetail from './pages/ProductDetail'
import Categories from './pages/Categories'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import StockImport from './pages/StockImport'
import ClientProducts from './pages/ClientProducts'
import ClientCart from './pages/ClientCart'
import ClientOrders from './pages/ClientOrders'
import ClientOrderDetail from './pages/ClientOrderDetail'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/new" element={<ProductForm />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/products/edit/:id" element={<ProductForm />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/stock-import" element={<StockImport />} />
          </Route>
          <Route element={<CatalogProvider><ClientLayout /></CatalogProvider>}>
            <Route path="/client/products" element={<ClientProducts />} />
            <Route path="/client/cart" element={<ClientCart />} />
            <Route path="/client/orders" element={<ClientOrders />} />
            <Route path="/client/orders/:id" element={<ClientOrderDetail />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

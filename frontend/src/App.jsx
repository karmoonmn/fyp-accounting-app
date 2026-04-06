import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import CreateInvoice from './pages/CreateInvoice'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import RegisterCompany from './pages/RegisterCompany'
import RegisterUser from './pages/RegisterUser'
import './App.css'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/invoice/new" element={<CreateInvoice />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register-company" element={<RegisterCompany />} />
          <Route path="/register-user" element={<RegisterUser />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

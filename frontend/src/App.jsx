import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import BankAccountHistory from './pages/BankAccountHistory'
import BillPayment from './pages/BillPayment'
import BillsList from './pages/BillsList'
import CreateBill from './pages/CreateBill'
import CreateInvoice from './pages/CreateInvoice'
import InvoicePayment from './pages/InvoicePayment'
import FinancialForecast from './pages/FinancialForecast'
import QuickAction from './pages/QuickAction'
import Dashboard from './pages/Dashboard'
import InvoiceList from './pages/InvoiceList'
import MainDashboard from './pages/MainDashboard'
import FinancialReports from './pages/reports/FinancialReports'
import ChatsPage from './pages/ChatsPage'

import Login from './pages/Login'
import Register from './pages/Register'
import RegisterCompany from './pages/RegisterCompany'
import RegisterUser from './pages/RegisterUser'
import CustomerList from './pages/CustomerList'
import CreateCustomer from './pages/CreateCustomer'
import ChartOfAccounts from './pages/ChartOfAccounts'
import CreateEditAccount from './pages/CreateEditAccount'
import PaymentList from './pages/PaymentList'
import SupplierList from './pages/SupplierList'
import CreateSupplier from './pages/CreateSupplier'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainDashboard />} />
          <Route path="/invoices" element={<InvoiceList />} />
          <Route path="/bills" element={<BillsList />} />
          <Route path="/bill/payment" element={<BillPayment />} />
          <Route path="/bank" element={<BankAccountHistory />} />
          <Route path="/analytics" element={<FinancialForecast />} />
          <Route path="/reports" element={<FinancialReports />} />
          <Route path="/quick" element={<QuickAction />} />
          <Route path="/invoice/new" element={<CreateInvoice />} />
          <Route path="/invoice/edit/:id" element={<CreateInvoice />} />
          <Route path="/invoice/payment" element={<InvoicePayment />} />
          <Route path="/payment/edit/:id" element={<InvoicePayment />} />
          <Route path="/payments" element={<PaymentList />} />
          <Route path="/bill/payment/edit/:id" element={<BillPayment />} />
          <Route path="/bill/new" element={<CreateBill />} />
          <Route path="/bill/edit/:id" element={<CreateBill />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/customer/create" element={<CreateCustomer />} />
          <Route path="/customer/edit/:id" element={<CreateCustomer />} />
          <Route path="/suppliers" element={<SupplierList />} />
          <Route path="/supplier/create" element={<CreateSupplier />} />
          <Route path="/supplier/edit/:id" element={<CreateSupplier />} />
          <Route path="/accounts" element={<ChartOfAccounts />} />
          <Route path="/accounts/new" element={<CreateEditAccount />} />
          <Route path="/accounts/edit/:id" element={<CreateEditAccount />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register-company" element={<RegisterCompany />} />
          <Route path="/register-user" element={<RegisterUser />} />
          <Route path="/legacy-dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

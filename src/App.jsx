import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import Dashboard from "./pages/Dashboard";
import Masters from "./pages/Masters";
import UsersDept from "./pages/masters/UsersDept";
import SalesContact from "./pages/masters/SalesContact";
import Customer from "./pages/masters/Customer";
import Buyer from "./pages/masters/Buyer";
import Country from "./pages/masters/Country";
import Product from "./pages/masters/Product";
import Price from "./pages/masters/Price";
import GEReference from "./pages/masters/GEReference";
import Discount from "./pages/masters/Discount";
import SpclDiscount from "./pages/masters/SpclDiscount";
import EndIndustry from "./pages/masters/EndIndustry";
import CountryType from "./pages/masters/CountryType";
import StatusMaster from "./pages/masters/StatusMaster";
import Reason from "./pages/masters/Reason";
import TimelineTarget from "./pages/masters/TimelineTarget";
import CostPrice from "./pages/masters/CostPrice";
import Privileged from "./pages/masters/Privileged";
import { isLoggedIn } from "./utils/auth";
import AddEnquiry from "./pages/Enquiry/AddEnquiry";
import EnquiryTable from "./pages/Enquiry/EnquiryTable";
import EditEnquiry from "./pages/Enquiry/EditEnquiry";
import EnquiryHome from "./pages/Enquiry/EnquiryHome";
import ViewEnquiry from "./pages/Enquiry/ViewEnquiry";

function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}
function PublicRoute({ children }) {
  return !isLoggedIn() ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/create-account"
          element={
            <PublicRoute>
              <CreateAccount />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters"
          element={
            <ProtectedRoute>
              <Masters />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/users-dept"
          element={
            <ProtectedRoute>
              <UsersDept />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/sales-contact"
          element={
            <ProtectedRoute>
              <SalesContact />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/customer"
          element={
            <ProtectedRoute>
              <Customer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/buyer"
          element={
            <ProtectedRoute>
              <Buyer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/country"
          element={
            <ProtectedRoute>
              <Country />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/product"
          element={
            <ProtectedRoute>
              <Product />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/price"
          element={
            <ProtectedRoute>
              <Price />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/ge-reference"
          element={
            <ProtectedRoute>
              <GEReference />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/discount"
          element={
            <ProtectedRoute>
              <Discount />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/spcl-discount"
          element={
            <ProtectedRoute>
              <SpclDiscount />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/end-industry"
          element={
            <ProtectedRoute>
              <EndIndustry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/country-type"
          element={
            <ProtectedRoute>
              <CountryType />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/status-master"
          element={
            <ProtectedRoute>
              <StatusMaster />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/reason"
          element={
            <ProtectedRoute>
              <Reason />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/timeline-target"
          element={
            <ProtectedRoute>
              <TimelineTarget />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/cost-price"
          element={
            <ProtectedRoute>
              <CostPrice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masters/privileged"
          element={
            <ProtectedRoute>
              <Privileged />
            </ProtectedRoute>
          }
        />
        {/* ── Enquiry Routes ── */}
        <Route
          path="/enquiry"
          element={
            <ProtectedRoute>
              <EnquiryHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enquiry/register"
          element={
            <ProtectedRoute>
              <EnquiryTable />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enquiry/add"
          element={
            <ProtectedRoute>
              <AddEnquiry />
            </ProtectedRoute>
          }
        />
        <Route
          path="enquiry/edit/:quotenumber"
          element={
            <ProtectedRoute>
              <EditEnquiry />
            </ProtectedRoute>
          }
        />
        <Route
          path="enquiry/view/:quotenumber"
          element={
            <ProtectedRoute>
              <ViewEnquiry />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

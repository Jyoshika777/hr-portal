import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import CandidateList from './pages/candidates/CandidateList';
import AddCandidate from './pages/candidates/AddCandidate';
import EditCandidate from './pages/candidates/EditCandidate';
import ConvertCandidate from './pages/candidates/ConvertCandidate';
import CandidateDetail from './pages/candidates/CandidateDetail';
import EmployeeList from './pages/employees/EmployeeList';
import AddEmployee from './pages/employees/AddEmployee';
import EmployeeDetail from './pages/employees/EmployeeDetail';
import EditEmployee from './pages/employees/EditEmployee';
import OfferLetterList from './pages/offers/OfferLetterList';
import AddOfferLetter from './pages/offers/AddOfferLetter';
import OfferLetterDetail from './pages/offers/OfferLetterDetail';
import EditOffer from './pages/offers/EditOffer';
import PayrollList from './pages/payroll/PayrollList';
import AddPayroll from './pages/payroll/AddPayroll';
import PayrollDetail from './pages/payroll/PayrollDetail';
import EditPayroll from './pages/payroll/EditPayroll';
import PerformanceList from './pages/performance/PerformanceList';
import AddPerformanceReview from './pages/performance/AddPerformanceReview';
import PerformanceDetail from './pages/performance/PerformanceDetail';
import EditPerformanceReview from './pages/performance/EditPerformanceReview';
import EmployeePerformanceHistory from './pages/performance/EmployeePerformanceHistory';
import DocumentList from './pages/documents/DocumentList';
import UploadDocument from './pages/documents/UploadDocument';
import DocumentDetail from './pages/documents/DocumentDetail';
import EntityDocuments from './pages/documents/EntityDocuments';
import ReportsOverview from './pages/reports/ReportsOverview';
import HiringReport from './pages/reports/HiringReport';
import EmployeeReport from './pages/reports/EmployeeReport';
import PayrollReport from './pages/reports/PayrollReport';
import PerformanceReport from './pages/reports/PerformanceReport';
import OfferReport from './pages/reports/OfferReport';
import Settings from './pages/Settings';
import CertificateList from './pages/certificates/CertificateList';
import GenerateCertificate from './pages/certificates/GenerateCertificate';
import CertificateDetail from './pages/certificates/CertificateDetail';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard"           element={<Dashboard />} />
        <Route path="/pipeline"            element={<Pipeline />} />
        <Route path="/candidates"          element={<CandidateList />} />
        <Route path="/candidates/add"      element={<AddCandidate />} />
        <Route path="/candidates/:id"      element={<CandidateDetail />} />
        <Route path="/candidates/:id/edit"    element={<EditCandidate />} />
        <Route path="/candidates/:id/convert" element={<ConvertCandidate />} />
        <Route path="/employees"           element={<EmployeeList />} />
        <Route path="/employees/add"       element={<AddEmployee />} />
        <Route path="/employees/:id"       element={<EmployeeDetail />} />
        <Route path="/employees/:id/edit"  element={<EditEmployee />} />
        <Route path="/offers"              element={<OfferLetterList />} />
        <Route path="/offers/new"          element={<AddOfferLetter />} />
        <Route path="/offers/:id"          element={<OfferLetterDetail />} />
        <Route path="/offers/:id/edit"     element={<EditOffer />} />
        <Route path="/payroll"             element={<PayrollList />} />
        <Route path="/payroll/new"         element={<AddPayroll />} />
        <Route path="/payroll/:id"         element={<PayrollDetail />} />
        <Route path="/payroll/:id/edit"    element={<EditPayroll />} />
        <Route path="/performance"                            element={<PerformanceList />} />
        <Route path="/performance/new"                        element={<AddPerformanceReview />} />
        <Route path="/performance/employee/:employeeRef"      element={<EmployeePerformanceHistory />} />
        <Route path="/performance/:id"                        element={<PerformanceDetail />} />
        <Route path="/performance/:id/edit"                   element={<EditPerformanceReview />} />
        <Route path="/documents"                              element={<DocumentList />} />
        <Route path="/documents/upload"                       element={<UploadDocument />} />
        <Route path="/documents/entity/:entityType/:entityRef" element={<EntityDocuments />} />
        <Route path="/documents/:id"                          element={<DocumentDetail />} />
        <Route path="/reports"                                element={<ReportsOverview />} />
        <Route path="/reports/hiring"                         element={<HiringReport />} />
        <Route path="/reports/employees"                      element={<EmployeeReport />} />
        <Route path="/reports/payroll"                        element={<PayrollReport />} />
        <Route path="/reports/performance"                    element={<PerformanceReport />} />
        <Route path="/reports/offers"                         element={<OfferReport />} />
        <Route path="/settings"                               element={<Settings />} />
        <Route path="/certificates"                           element={<CertificateList />} />
        <Route path="/certificates/new"                       element={<GenerateCertificate />} />
        <Route path="/certificates/:id"                       element={<CertificateDetail />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

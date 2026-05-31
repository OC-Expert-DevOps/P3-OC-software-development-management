import { Routes, Route } from 'react-router-dom';

function LoginPage() {
  return <h1>Login — DataShare</h1>;
}

function RegisterPage() {
  return <h1>Register — DataShare</h1>;
}

function DashboardPage() {
  return <h1>Dashboard — My Files</h1>;
}

function UploadPage() {
  return <h1>Upload a File</h1>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/" element={<LoginPage />} />
    </Routes>
  );
}

export default App;

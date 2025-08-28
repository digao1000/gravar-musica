import { Navigate } from 'react-router';

// This component is no longer needed with local auth
// but kept for compatibility in case there are route references
export default function AuthCallback() {
  return <Navigate to="/login" replace />;
}

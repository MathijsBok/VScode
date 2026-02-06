import { useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

interface TwoFactorRequiredModalProps {
  gracePeriodEnd?: string;
}

export default function TwoFactorRequiredModal({ gracePeriodEnd }: TwoFactorRequiredModalProps) {
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const handleEnableTwoFactor = () => {
    navigate('/settings');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
            <svg
              className="h-6 w-6 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Content */}
          <div className="mt-3 text-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Two-Factor Authentication Required
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Two-factor authentication is required for your account to continue accessing the
                system. This additional security measure helps protect your account and sensitive
                data.
              </p>
              {gracePeriodEnd && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400 font-medium">
                  Your grace period expired on {new Date(gracePeriodEnd).toLocaleDateString()}.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 space-y-3">
            <button
              onClick={handleEnableTwoFactor}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            >
              Enable 2FA Now
            </button>
            <button
              onClick={handleSignOut}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            >
              Sign Out
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Need help? Contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import Layout from '../components/Layout';
import SecuritySettings from '../components/SecuritySettings';
import { UserProfile } from '@clerk/clerk-react';

type TabType = 'security' | 'profile';

export default function UserSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('security');

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Account Settings
        </h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('security')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === 'security'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              Security
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              Profile
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'security' && <SecuritySettings />}

        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <UserProfile
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'dark:bg-gray-800 dark:text-white shadow-none border-0',
                  navbar: 'dark:bg-gray-700',
                  navbarButton: 'dark:text-gray-300 dark:hover:bg-gray-600',
                  pageScrollBox: 'dark:bg-gray-800',
                  profileSection: 'dark:bg-gray-800',
                  profileSectionTitle: 'dark:text-white',
                  profileSectionContent: 'dark:text-gray-300',
                  formFieldInput: 'dark:bg-gray-700 dark:text-white dark:border-gray-600',
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
                  badge: 'dark:bg-gray-700 dark:text-gray-300'
                }
              }}
              routing="hash"
            />
          </div>
        )}
      </div>
    </Layout>
  );
}

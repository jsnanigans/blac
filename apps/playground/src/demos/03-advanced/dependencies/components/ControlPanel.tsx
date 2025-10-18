import React from 'react';
import { useBloc } from '@blac/react';
import { ProfileCubit } from '../ProfileCubit';

export function ControlPanel() {
  const [, cubit] = useBloc(ProfileCubit);

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
      <h3 className="text-lg font-bold mb-4 text-gray-800">
        🎮 Control Panel
      </h3>

      {/* User Properties */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          👤 User Properties
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              cubit.updateFirstName(
                cubit.state.user.firstName === 'John' ? 'Jane' : 'John'
              )
            }
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: Automatic + Getter components"
          >
            Toggle First Name
          </button>
          <button
            onClick={() =>
              cubit.updateLastName(
                cubit.state.user.lastName === 'Doe' ? 'Smith' : 'Doe'
              )
            }
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: Getter component only"
          >
            Toggle Last Name
          </button>
          <button
            onClick={() =>
              cubit.updateEmail(
                cubit.state.user.email === 'john@example.com'
                  ? 'jane@example.com'
                  : 'john@example.com'
              )
            }
            className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: Manual Dependencies component"
          >
            Toggle Email
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          ⚙️ Settings
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={cubit.toggleTheme}
            className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: Manual Dependencies component"
          >
            Toggle Theme
          </button>
          <button
            onClick={cubit.toggleNotifications}
            className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: No components (not tracked)"
          >
            Toggle Notifications
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 Stats</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={cubit.incrementPosts}
            className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: Broad Tracking component"
          >
            + Posts
          </button>
          <button
            onClick={cubit.incrementFollowers}
            className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: Broad Tracking + Getter components"
          >
            + Followers
          </button>
          <button
            onClick={cubit.incrementFollowing}
            className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors"
            title="Updates: Broad Tracking + Getter components"
          >
            + Following
          </button>
        </div>
      </div>

      {/* Special Actions */}
      <div className="mt-6 pt-4 border-t border-blue-300">
        <button
          onClick={cubit.updateEverything}
          className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg text-sm font-bold transition-all transform hover:scale-105"
          title="Updates ALL components"
        >
          💥 Update Everything
        </button>
      </div>
    </div>
  );
}

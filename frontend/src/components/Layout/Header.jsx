import { useAuth } from '../../contexts/AuthContext';
import { BellIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const Header = ({ title }) => {
  const { logout } = useAuth();

  return (
    <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
      <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
      
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-lg hover:bg-gray-100 relative">
          <BellIcon className="h-6 w-6 text-gray-600" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>
        
        <button 
          onClick={logout}
          className="flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;

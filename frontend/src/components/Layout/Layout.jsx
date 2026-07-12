import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children, title }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title={title} />
        <main className="p-6 overflow-y-auto" style={{ height: 'calc(100vh - 72px)' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

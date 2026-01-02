import DailyOverview from './pages/DailyOverview';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import KeyAllocation from './pages/KeyAllocation';
import ManageCrews from './pages/ManageCrews';
import ManageKeys from './pages/ManageKeys';
import ManagePermissions from './pages/ManagePermissions';
import ManagePositions from './pages/ManagePositions';
import ManageSquads from './pages/ManageSquads';
import ManageUsers from './pages/ManageUsers';
import ManageZones from './pages/ManageZones';
import MyProfile from './pages/MyProfile';
import MySchedule from './pages/MySchedule';
import Onboarding from './pages/Onboarding';
import __Layout from './Layout.jsx';


export const PAGES = {
    "DailyOverview": DailyOverview,
    "Dashboard": Dashboard,
    "Home": Home,
    "KeyAllocation": KeyAllocation,
    "ManageCrews": ManageCrews,
    "ManageKeys": ManageKeys,
    "ManagePermissions": ManagePermissions,
    "ManagePositions": ManagePositions,
    "ManageSquads": ManageSquads,
    "ManageUsers": ManageUsers,
    "ManageZones": ManageZones,
    "MyProfile": MyProfile,
    "MySchedule": MySchedule,
    "Onboarding": Onboarding,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
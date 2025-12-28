import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import KeyAllocation from './pages/KeyAllocation';
import ManageCrews from './pages/ManageCrews';
import ManageKeys from './pages/ManageKeys';
import ManagePositions from './pages/ManagePositions';
import ManageSquads from './pages/ManageSquads';
import ManageUsers from './pages/ManageUsers';
import MyProfile from './pages/MyProfile';
import MySchedule from './pages/MySchedule';
import Onboarding from './pages/Onboarding';
import ManageZones from './pages/ManageZones';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Home": Home,
    "KeyAllocation": KeyAllocation,
    "ManageCrews": ManageCrews,
    "ManageKeys": ManageKeys,
    "ManagePositions": ManagePositions,
    "ManageSquads": ManageSquads,
    "ManageUsers": ManageUsers,
    "MyProfile": MyProfile,
    "MySchedule": MySchedule,
    "Onboarding": Onboarding,
    "ManageZones": ManageZones,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
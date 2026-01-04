import DailyOverview from './pages/DailyOverview';
import Dashboard from './pages/Dashboard';
import HackalonManageProblems from './pages/HackalonManageProblems';
import HackalonOverview from './pages/HackalonOverview';
import HackalonSchedule from './pages/HackalonSchedule';
import HackalonStatus from './pages/HackalonStatus';
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
import HackalonAssignment from './pages/HackalonAssignment';
import HackalonTeamArea from './pages/HackalonTeamArea';
import __Layout from './Layout.jsx';


export const PAGES = {
    "DailyOverview": DailyOverview,
    "Dashboard": Dashboard,
    "HackalonManageProblems": HackalonManageProblems,
    "HackalonOverview": HackalonOverview,
    "HackalonSchedule": HackalonSchedule,
    "HackalonStatus": HackalonStatus,
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
    "HackalonAssignment": HackalonAssignment,
    "HackalonTeamArea": HackalonTeamArea,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
import Dashboard from './pages/Dashboard';
import ManageKeys from './pages/ManageKeys';
import ManageCrews from './pages/ManageCrews';
import MySchedule from './pages/MySchedule';
import KeyAllocation from './pages/KeyAllocation';
import ManageSquads from './pages/ManageSquads';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "ManageKeys": ManageKeys,
    "ManageCrews": ManageCrews,
    "MySchedule": MySchedule,
    "KeyAllocation": KeyAllocation,
    "ManageSquads": ManageSquads,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
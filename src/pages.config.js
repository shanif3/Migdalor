import Dashboard from './pages/Dashboard';
import ManageKeys from './pages/ManageKeys';
import ManageCrews from './pages/ManageCrews';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "ManageKeys": ManageKeys,
    "ManageCrews": ManageCrews,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
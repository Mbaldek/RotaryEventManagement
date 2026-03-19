/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminControl from './pages/AdminControl';
import Archives from './pages/Archives';
import Dashboard from './pages/Dashboard';
import EventPlanning from './pages/EventPlanning';
import Features from './pages/Features';
import FloorPlan from './pages/FloorPlan';
import Index from './pages/Index';
import ReservationRequest from './pages/ReservationRequest';
import Reservations from './pages/Reservations';
import TableView from './pages/TableView';
import UserManagement from './pages/UserManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminControl": AdminControl,
    "Archives": Archives,
    "Dashboard": Dashboard,
    "EventPlanning": EventPlanning,
    "Features": Features,
    "FloorPlan": FloorPlan,
    "Index": Index,
    "ReservationRequest": ReservationRequest,
    "Reservations": Reservations,
    "TableView": TableView,
    "UserManagement": UserManagement,
}

export const pagesConfig = {
    mainPage: "Index",
    Pages: PAGES,
    Layout: __Layout,
};
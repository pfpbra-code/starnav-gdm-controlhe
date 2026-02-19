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
import Dashboard from './pages/Dashboard';
import GDMList from './pages/GDMList';
import CreateGDM from './pages/CreateGDM';
import GDMDetail from './pages/GDMDetail';
import Vessels from './pages/Vessels';
import Equipment from './pages/Equipment';
import Suppliers from './pages/Suppliers';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import ServicesTreatments from './pages/ServicesTreatments';
import MaintenanceAnalysis from './pages/MaintenanceAnalysis';
import SupplierDashboard from './pages/SupplierDashboard';
import SupplierMaterials from './pages/SupplierMaterials';
import VesselDashboard from './pages/VesselDashboard';
import VesselGDMs from './pages/VesselGDMs';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "GDMList": GDMList,
    "CreateGDM": CreateGDM,
    "GDMDetail": GDMDetail,
    "Vessels": Vessels,
    "Equipment": Equipment,
    "Suppliers": Suppliers,
    "Users": Users,
    "AuditLogs": AuditLogs,
    "Settings": Settings,
    "ServicesTreatments": ServicesTreatments,
    "MaintenanceAnalysis": MaintenanceAnalysis,
    "SupplierDashboard": SupplierDashboard,
    "SupplierMaterials": SupplierMaterials,
    "VesselDashboard": VesselDashboard,
    "VesselGDMs": VesselGDMs,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
// File: src/components/layout/navConfig.js
import {
  FaHouse, FaDroplet, FaBell, FaChartColumn, FaUser, FaGear,
} from 'react-icons/fa6';

/**
 * Single source of truth for the dashboard navigation.
 * Used by both the desktop Sidebar and the mobile drawer.
 */
export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', Icon: FaHouse },
      { to: '/devices',   label: 'Devices',   Icon: FaDroplet },
      { to: '/alerts',    label: 'Alerts',    Icon: FaBell },
      { to: '/history',   label: 'History',   Icon: FaChartColumn },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile',  label: 'Profile',  Icon: FaUser },
      { to: '/settings', label: 'Settings', Icon: FaGear },
    ],
  },
];
-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 23, 2026 at 02:16 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `petit_cafe_francais`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `user_id`, `action`, `description`, `created_at`) VALUES
(1, 1, 'Login', 'Admin fallback login', '2026-05-21 11:57:09'),
(2, 1, 'Login', 'Admin fallback login', '2026-05-21 12:09:51'),
(3, 1, 'Login', 'Admin fallback login', '2026-05-21 12:15:07'),
(4, 1, 'Login', 'Admin fallback login', '2026-05-21 13:23:41'),
(5, 1, 'Login', 'Admin fallback login', '2026-05-22 13:53:43'),
(6, 2, 'Login', 'User logged in', '2026-05-22 14:03:07'),
(7, 3, 'Login', 'User logged in', '2026-05-22 14:07:07'),
(8, 2, 'Login', 'User logged in', '2026-05-22 14:31:30'),
(9, 1, 'Login', 'Admin fallback login', '2026-05-22 14:46:01'),
(10, 1, 'Login', 'Admin fallback login', '2026-05-22 14:46:30'),
(11, 1, 'Login', 'Admin fallback login', '2026-05-22 14:58:23'),
(12, 14, 'Login', 'User logged in', '2026-05-22 14:59:44'),
(13, 1, 'Login', 'Admin fallback login', '2026-05-22 15:07:25'),
(14, 16, 'Login', 'User logged in', '2026-05-22 15:09:32'),
(15, 1, 'Login', 'Admin fallback login', '2026-05-22 15:16:13'),
(16, 1, 'Login', 'Admin fallback login', '2026-05-22 15:30:00'),
(17, NULL, 'Login', 'User logged in', '2026-05-22 15:35:08'),
(18, 1, 'Login', 'Admin fallback login', '2026-05-22 15:37:22'),
(19, 1, 'Login', 'Admin fallback login', '2026-05-22 15:40:12'),
(20, 19, 'Login', 'User logged in', '2026-05-22 15:40:46'),
(21, 14, 'Login', 'User logged in', '2026-05-22 15:46:41'),
(22, 14, 'Login', 'User logged in', '2026-05-23 10:28:34'),
(23, 14, 'Login', 'User logged in', '2026-05-23 10:29:14'),
(24, 1, 'Login', 'Admin fallback login', '2026-05-23 10:29:47'),
(25, 16, 'Login', 'User logged in', '2026-05-23 10:30:42'),
(26, 14, 'Login', 'User logged in', '2026-05-23 10:45:48'),
(27, 1, 'Login', 'Admin fallback login', '2026-05-23 10:51:18'),
(28, 1, 'Login', 'Admin fallback login', '2026-05-23 10:54:16'),
(29, 4, 'Login', 'User logged in', '2026-05-23 10:59:06'),
(30, 16, 'Login', 'User logged in', '2026-05-23 11:04:43'),
(31, 1, 'Login', 'Admin fallback login', '2026-05-23 11:12:25'),
(32, 16, 'Login', 'User logged in', '2026-05-23 11:14:19'),
(33, 16, 'Login', 'User logged in', '2026-05-23 11:14:25'),
(34, 14, 'Login', 'User logged in', '2026-05-23 11:14:37'),
(35, 4, 'Login', 'User logged in', '2026-05-23 11:34:09');

-- --------------------------------------------------------

--
-- Table structure for table `cafe_tables`
--

CREATE TABLE `cafe_tables` (
  `id` int(11) NOT NULL,
  `table_number` varchar(50) NOT NULL,
  `capacity` int(11) NOT NULL DEFAULT 1,
  `status` enum('Available','Occupied','Reserved','Cleaning','Inactive') NOT NULL DEFAULT 'Available',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cafe_tables`
--

INSERT INTO `cafe_tables` (`id`, `table_number`, `capacity`, `status`, `created_at`, `updated_at`) VALUES
(1, 'T01', 2, 'Available', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(2, 'T02', 2, 'Available', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(3, 'T03', 4, 'Reserved', '2026-05-21 09:40:39', '2026-05-23 10:32:31'),
(4, 'T04', 4, 'Available', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(5, 'T05', 6, 'Available', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(6, 'T06', 6, 'Available', '2026-05-21 09:40:39', '2026-05-21 09:40:39');

-- --------------------------------------------------------

--
-- Table structure for table `cash_flow`
--

CREATE TABLE `cash_flow` (
  `id` int(11) NOT NULL,
  `transaction_type` enum('Cash In','Cash Out') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('Cash','Bank','Momo') NOT NULL DEFAULT 'Cash',
  `description` varchar(255) DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `recorded_by` int(11) NOT NULL,
  `transaction_date` date NOT NULL DEFAULT curdate(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cash_flow`
--

INSERT INTO `cash_flow` (`id`, `transaction_type`, `amount`, `payment_method`, `description`, `reference_number`, `recorded_by`, `transaction_date`, `created_at`, `updated_at`) VALUES
(1, 'Cash In', 125000.00, 'Cash', 'Daily sales revenue', 'FEB001', 1, '2026-02-01', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(2, 'Cash In', 95000.00, 'Cash', 'Daily sales revenue', 'FEB002', 1, '2026-02-01', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(3, 'Cash Out', 15000.00, 'Bank', 'Supplier payment - Coffee beans', 'SUP-FEB001', 1, '2026-02-01', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(4, 'Cash Out', 8000.00, 'Cash', 'Utilities - Water bill', 'UTIL-FEB001', 1, '2026-02-01', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(5, 'Cash In', 150000.00, 'Bank', 'Hotel bulk order payment', 'HOTEL001', 1, '2026-02-02', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(6, 'Cash In', 75000.00, 'Cash', 'Daily sales revenue', 'FEB003', 1, '2026-02-02', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(7, 'Cash In', 45000.00, 'Momo', 'Mobile money transfer', 'MM001', 1, '2026-02-02', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(8, 'Cash Out', 20000.00, 'Bank', 'Staff salaries - Advance', 'SAL-FEB001', 1, '2026-02-02', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(9, 'Cash In', 110000.00, 'Cash', 'Daily sales revenue', 'FEB004', 1, '2026-02-03', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(10, 'Cash In', 65000.00, 'Momo', 'Online orders delivery', 'ONLINE001', 1, '2026-02-03', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(11, 'Cash Out', 12000.00, 'Cash', 'Marketing materials', 'MARK-FEB001', 1, '2026-02-03', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(12, 'Cash In', 130000.00, 'Cash', 'Daily sales revenue', 'FEB005', 1, '2026-02-04', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(13, 'Cash In', 85000.00, 'Bank', 'Restaurant order', 'REST001', 1, '2026-02-04', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(14, 'Cash Out', 25000.00, 'Bank', 'Equipment maintenance', 'EQUIP-FEB001', 1, '2026-02-04', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(15, 'Cash In', 145000.00, 'Cash', 'Daily sales revenue', 'FEB006', 1, '2026-02-05', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(16, 'Cash In', 72000.00, 'Momo', 'Catering event payment', 'CATER001', 1, '2026-02-05', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(17, 'Cash Out', 18000.00, 'Bank', 'Rent payment', 'RENT-FEB001', 1, '2026-02-05', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(18, 'Cash In', 120000.00, 'Cash', 'Daily sales revenue', 'FEB007', 1, '2026-02-10', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(19, 'Cash In', 105000.00, 'Cash', 'Daily sales revenue', 'FEB008', 1, '2026-02-11', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(20, 'Cash Out', 30000.00, 'Bank', 'Stock purchase', 'STOCK-FEB001', 1, '2026-02-11', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(21, 'Cash In', 125000.00, 'Cash', 'Daily sales revenue', 'FEB012', 1, '2026-02-15', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(22, 'Cash In', 95000.00, 'Cash', 'Daily sales revenue', 'FEB013', 1, '2026-02-15', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(23, 'Cash Out', 20000.00, 'Cash', 'Petty cash replenishment', 'PETTY-FEB001', 1, '2026-02-15', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(24, 'Cash In', 140000.00, 'Cash', 'Daily sales revenue', 'FEB014', 1, '2026-02-20', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(25, 'Cash In', 110000.00, 'Momo', 'Bulk catering order', 'BULK001', 1, '2026-02-20', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(26, 'Cash Out', 25000.00, 'Bank', 'Internet & Utilities', 'UTIL-FEB002', 1, '2026-02-20', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(27, 'Cash In', 135000.00, 'Cash', 'Daily sales revenue', 'FEB015', 1, '2026-02-25', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(28, 'Cash In', 80000.00, 'Bank', 'Corporate event', 'CORP001', 1, '2026-02-25', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(29, 'Cash Out', 15000.00, 'Bank', 'Cleaning supplies', 'CLEAN-FEB001', 1, '2026-02-25', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(30, 'Cash In', 150000.00, 'Cash', 'Daily sales revenue', 'MAR001', 1, '2026-03-01', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(31, 'Cash In', 95000.00, 'Cash', 'Daily sales revenue', 'MAR002', 1, '2026-03-01', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(32, 'Cash Out', 20000.00, 'Bank', 'Supplier payment', 'SUP-MAR001', 1, '2026-03-01', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(33, 'Cash In', 125000.00, 'Cash', 'Daily sales revenue', 'MAR003', 1, '2026-03-05', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(34, 'Cash In', 75000.00, 'Momo', 'Wedding catering event', 'WEDDING001', 1, '2026-03-05', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(35, 'Cash Out', 30000.00, 'Bank', 'Stock replenishment', 'STOCK-MAR001', 1, '2026-03-05', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(36, 'Cash In', 145000.00, 'Cash', 'Daily sales revenue', 'MAR004', 1, '2026-03-10', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(37, 'Cash In', 100000.00, 'Bank', 'Corporate lunch order', 'CORP002', 1, '2026-03-10', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(38, 'Cash Out', 18000.00, 'Bank', 'Rent payment', 'RENT-MAR001', 1, '2026-03-10', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(39, 'Cash In', 160000.00, 'Cash', 'Daily sales revenue', 'MAR011', 1, '2026-03-15', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(40, 'Cash In', 85000.00, 'Cash', 'Daily sales revenue', 'MAR012', 1, '2026-03-15', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(41, 'Cash Out', 25000.00, 'Cash', 'Staff advance payment', 'ADV-MAR001', 1, '2026-03-15', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(42, 'Cash In', 140000.00, 'Cash', 'Daily sales revenue', 'MAR016', 1, '2026-03-20', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(43, 'Cash In', 95000.00, 'Momo', 'Catering service', 'CATER002', 1, '2026-03-20', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(44, 'Cash Out', 22000.00, 'Bank', 'Equipment repair', 'REPAIR-MAR001', 1, '2026-03-20', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(45, 'Cash In', 135000.00, 'Cash', 'Daily sales revenue', 'MAR025', 1, '2026-03-28', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(46, 'Cash In', 110000.00, 'Bank', 'Event catering', 'EVENT002', 1, '2026-03-28', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(47, 'Cash Out', 15000.00, 'Bank', 'Marketing campaign', 'MARK-MAR001', 1, '2026-03-28', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(48, 'Cash In', 155000.00, 'Cash', 'Daily sales revenue', 'APR001', 1, '2026-04-01', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(49, 'Cash In', 100000.00, 'Cash', 'Daily sales revenue', 'APR002', 1, '2026-04-01', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(50, 'Cash Out', 18000.00, 'Bank', 'Utilities payment', 'UTIL-APR001', 1, '2026-04-01', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(51, 'Cash In', 140000.00, 'Cash', 'Daily sales revenue', 'APR005', 1, '2026-04-05', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(52, 'Cash In', 85000.00, 'Momo', 'Conference catering', 'CONF001', 1, '2026-04-05', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(53, 'Cash Out', 35000.00, 'Bank', 'Major stock purchase', 'STOCK-APR001', 1, '2026-04-05', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(54, 'Cash In', 150000.00, 'Cash', 'Daily sales revenue', 'APR010', 1, '2026-04-10', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(55, 'Cash In', 95000.00, 'Bank', 'Hotel partnership revenue', 'HOTEL002', 1, '2026-04-10', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(56, 'Cash Out', 20000.00, 'Bank', 'Rent payment', 'RENT-APR001', 1, '2026-04-10', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(57, 'Cash In', 165000.00, 'Cash', 'Daily sales revenue', 'APR015', 1, '2026-04-15', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(58, 'Cash In', 110000.00, 'Cash', 'Daily sales revenue', 'APR016', 1, '2026-04-15', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(59, 'Cash Out', 25000.00, 'Cash', 'Staff bonuses', 'BONUS-APR001', 1, '2026-04-15', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(60, 'Cash In', 145000.00, 'Cash', 'Daily sales revenue', 'APR020', 1, '2026-04-20', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(61, 'Cash In', 100000.00, 'Momo', 'Wedding catering', 'WEDDING002', 1, '2026-04-20', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(62, 'Cash Out', 30000.00, 'Bank', 'Equipment upgrade', 'EQUIP-APR001', 1, '2026-04-20', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(63, 'Cash In', 140000.00, 'Cash', 'Daily sales revenue', 'APR025', 1, '2026-04-25', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(64, 'Cash In', 90000.00, 'Bank', 'Corporate events', 'CORP003', 1, '2026-04-25', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(65, 'Cash Out', 16000.00, 'Bank', 'Cleaning & maintenance', 'MAINT-APR001', 1, '2026-04-25', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(66, 'Cash In', 160000.00, 'Cash', 'Daily sales revenue', 'MAY001', 1, '2026-05-01', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(67, 'Cash In', 105000.00, 'Cash', 'Daily sales revenue', 'MAY002', 1, '2026-05-01', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(68, 'Cash Out', 20000.00, 'Bank', 'Supplier payment', 'SUP-MAY001', 1, '2026-05-01', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(69, 'Cash In', 150000.00, 'Cash', 'Daily sales revenue', 'MAY005', 1, '2026-05-05', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(70, 'Cash In', 95000.00, 'Momo', 'Conference catering', 'CONF002', 1, '2026-05-05', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(71, 'Cash Out', 25000.00, 'Bank', 'Stock replenishment', 'STOCK-MAY001', 1, '2026-05-05', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(72, 'Cash In', 155000.00, 'Cash', 'Daily sales revenue', 'MAY010', 1, '2026-05-10', '2026-05-23 11:02:19', '2026-05-23 11:02:19'),
(73, 'Cash In', 110000.00, 'Bank', 'Corporate lunch', 'CORP004', 1, '2026-05-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(74, 'Cash Out', 18000.00, 'Bank', 'Rent payment', 'RENT-MAY001', 1, '2026-05-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(75, 'Cash In', 145000.00, 'Cash', 'Daily sales revenue', 'MAY015', 1, '2026-05-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(76, 'Cash In', 100000.00, 'Cash', 'Daily sales revenue', 'MAY016', 1, '2026-05-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(77, 'Cash Out', 30000.00, 'Bank', 'Equipment maintenance', 'MAINT-MAY001', 1, '2026-05-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(78, 'Cash In', 165000.00, 'Cash', 'Daily sales revenue', 'MAY020', 1, '2026-05-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(79, 'Cash In', 115000.00, 'Momo', 'Wedding catering service', 'WEDDING003', 1, '2026-05-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(80, 'Cash Out', 22000.00, 'Bank', 'Utilities payment', 'UTIL-MAY002', 1, '2026-05-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(81, 'Cash In', 150000.00, 'Cash', 'Daily sales revenue', 'MAY23', 1, '2026-05-23', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(82, 'Cash In', 12667.00, 'Momo', '', '', 16, '2026-05-23', '2026-05-23 11:06:00', '2026-05-23 11:06:00');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `category_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `category_name`, `description`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Hot Drinks', 'Coffee, tea and other hot beverages', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(2, 'Cold Drinks', 'Juices, water and cold beverages', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(3, 'Bakery', 'Croissants, bread and baked products', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(4, 'Snacks', 'Light meals and snacks', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(5, 'Desserts', 'Cakes, sweets and desserts', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(6, 'Breakfast', 'Morning meals and breakfast items', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39');

-- --------------------------------------------------------

--
-- Table structure for table `daily_closing_checklist`
--

CREATE TABLE `daily_closing_checklist` (
  `id` int(11) NOT NULL,
  `checklist_date` date NOT NULL,
  `staff_id` int(11) NOT NULL,
  `till_counted` tinyint(1) DEFAULT 0,
  `cash_secured` tinyint(1) DEFAULT 0,
  `tables_clean` tinyint(1) DEFAULT 0,
  `floors_clean` tinyint(1) DEFAULT 0,
  `equipment_cleaned` tinyint(1) DEFAULT 0,
  `doors_locked` tinyint(1) DEFAULT 0,
  `lights_off` tinyint(1) DEFAULT 0,
  `alarm_enabled` tinyint(1) DEFAULT 0,
  `daily_sales` decimal(12,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `status` enum('Completed','Incomplete','Pending') NOT NULL DEFAULT 'Pending',
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daily_opening_checklist`
--

CREATE TABLE `daily_opening_checklist` (
  `id` int(11) NOT NULL,
  `checklist_date` date NOT NULL,
  `staff_id` int(11) NOT NULL,
  `lights_checked` tinyint(1) DEFAULT 0,
  `doors_checked` tinyint(1) DEFAULT 0,
  `alarm_disabled` tinyint(1) DEFAULT 0,
  `pos_system_ready` tinyint(1) DEFAULT 0,
  `tables_clean` tinyint(1) DEFAULT 0,
  `bathrooms_checked` tinyint(1) DEFAULT 0,
  `inventory_inspected` tinyint(1) DEFAULT 0,
  `equipment_working` tinyint(1) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `status` enum('Completed','Incomplete','Pending') NOT NULL DEFAULT 'Pending',
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daily_operations`
--

CREATE TABLE `daily_operations` (
  `id` int(11) NOT NULL,
  `operation_date` date NOT NULL,
  `manager_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `weather` varchar(100) DEFAULT NULL,
  `special_events` text DEFAULT NULL,
  `issues` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `expense_name` varchar(150) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `description` text DEFAULT NULL,
  `expense_date` date NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`id`, `expense_name`, `amount`, `description`, `expense_date`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'Electricity Bill', 45000.00, 'Monthly electricity payment', '2026-05-21', 1, '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(2, 'Water Bill', 18000.00, 'Monthly water payment', '2026-05-21', 1, '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(3, 'Cleaning Materials', 25000.00, 'Cleaning supplies for cafe', '2026-05-21', 1, '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(4, 'Internet Bill', 30000.00, 'Monthly internet subscription', '2026-05-21', 1, '2026-05-21 09:40:39', '2026-05-21 09:40:39');

-- --------------------------------------------------------

--
-- Table structure for table `expense_categories`
--

CREATE TABLE `expense_categories` (
  `id` int(11) NOT NULL,
  `category_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expense_categories`
--

INSERT INTO `expense_categories` (`id`, `category_name`, `description`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Utilities', 'Electricity, water, gas bills', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(2, 'Supplies', 'Kitchen and office supplies', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(3, 'Salaries', 'Staff salaries and wages', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(4, 'Rent', 'Property lease or rent', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(5, 'Maintenance', 'Equipment and facility maintenance', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(6, 'Marketing', 'Advertising and promotions', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(7, 'Insurance', 'Business and liability insurance', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(8, 'Miscellaneous', 'Other expenses', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13');

-- --------------------------------------------------------

--
-- Table structure for table `financial_records`
--

CREATE TABLE `financial_records` (
  `id` int(11) NOT NULL,
  `record_date` date NOT NULL,
  `record_type` enum('Daily','Weekly','Monthly') NOT NULL,
  `total_revenue` decimal(12,2) DEFAULT 0.00,
  `total_expenses` decimal(12,2) DEFAULT 0.00,
  `gross_profit` decimal(12,2) DEFAULT 0.00,
  `inventory_cost` decimal(12,2) DEFAULT 0.00,
  `operational_efficiency` decimal(5,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `id` int(11) NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 0.00,
  `unit` varchar(50) NOT NULL,
  `low_stock_limit` decimal(10,2) NOT NULL DEFAULT 0.00,
  `supplier_name` varchar(150) DEFAULT NULL,
  `status` enum('Available','Low Stock','Out of Stock','Inactive') NOT NULL DEFAULT 'Available',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory`
--

INSERT INTO `inventory` (`id`, `item_name`, `quantity`, `unit`, `low_stock_limit`, `supplier_name`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Coffee Beans', 20.00, 'kg', 5.00, 'Local Coffee Supplier', 'Available', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(2, 'Milk', 30.00, 'litres', 10.00, 'Dairy Supplier', 'Available', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(3, 'Sugar', 25.00, 'kg', 5.00, 'General Supplier', 'Available', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(4, 'Tea Leaves', 10.00, 'kg', 7.00, 'Tea Supplier', 'Available', '2026-05-21 09:40:39', '2026-05-21 11:57:40'),
(5, 'Flour', 50.00, 'kg', 10.00, 'Bakery Supplier', 'Available', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(6, 'Butter', 15.00, 'kg', 5.00, 'Dairy Supplier', 'Available', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(7, 'Eggs', 120.00, 'pieces', 30.00, 'Farm Supplier', 'Available', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(8, 'Juice Bottles', 80.00, 'bottles', 20.00, 'Beverage Supplier', 'Available', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(9, 'Mineral Water', 100.00, 'bottles', 25.00, 'Water Supplier', 'Available', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(10, 'Meat', 20.00, 'kg', 0.00, 'buchery', 'Available', '2026-05-22 15:34:17', '2026-05-22 15:34:40');

-- --------------------------------------------------------

--
-- Table structure for table `menu_items`
--

CREATE TABLE `menu_items` (
  `id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `image` varchar(255) DEFAULT NULL,
  `availability` enum('Available','Unavailable') NOT NULL DEFAULT 'Available',
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `menu_items`
--

INSERT INTO `menu_items` (`id`, `category_id`, `item_name`, `description`, `price`, `image`, `availability`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'Cafe Latte', 'Hot coffee with steamed milk', 2500.00, NULL, 'Available', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(2, 1, 'Black Coffee', 'Classic hot black coffee', 1800.00, NULL, 'Available', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(3, 1, 'Tea', 'Hot tea served fresh', 1500.00, NULL, 'Available', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(4, 2, 'Fresh Juice', 'Fresh natural fruit juice', 3000.00, NULL, 'Available', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(5, 2, 'Mineral Water', 'Bottled drinking water', 1000.00, NULL, 'Available', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(6, 3, 'Croissant', 'French butter croissant', 2000.00, NULL, 'Available', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(7, 4, 'Chicken Sandwich', 'Fresh chicken sandwich', 3500.00, NULL, 'Available', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(8, 5, 'Chocolate Cake', 'Slice of chocolate cake', 3000.00, NULL, 'Available', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39');

-- --------------------------------------------------------

--
-- Table structure for table `performance_records`
--

CREATE TABLE `performance_records` (
  `id` int(11) NOT NULL,
  `record_date` date NOT NULL,
  `period_type` enum('Daily','Weekly','Monthly','Quarterly') NOT NULL,
  `total_expenses` decimal(12,2) DEFAULT 0.00,
  `inventory_value` decimal(12,2) DEFAULT 0.00,
  `low_stock_count` int(11) DEFAULT 0,
  `menu_available_count` int(11) DEFAULT 0,
  `menu_unavailable_count` int(11) DEFAULT 0,
  `table_usage_percentage` decimal(5,2) DEFAULT 0.00,
  `staff_count` int(11) DEFAULT 0,
  `operational_notes_count` int(11) DEFAULT 0,
  `supplier_costs` decimal(12,2) DEFAULT 0.00,
  `salary_costs` decimal(12,2) DEFAULT 0.00,
  `utility_costs` decimal(12,2) DEFAULT 0.00,
  `health_status` enum('Excellent','Good','Average','Warning','Critical') DEFAULT 'Average',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `salary_records`
--

CREATE TABLE `salary_records` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `salary_month` date NOT NULL,
  `base_salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `bonus` decimal(12,2) DEFAULT 0.00,
  `deductions` decimal(12,2) DEFAULT 0.00,
  `net_salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_date` date DEFAULT NULL,
  `status` enum('Pending','Paid','Cancelled') NOT NULL DEFAULT 'Pending',
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

CREATE TABLE `sales` (
  `id` int(11) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `payment_method` enum('Cash','Bank','Momo') NOT NULL DEFAULT 'Cash',
  `customer_name` varchar(150) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `recorded_by` int(11) NOT NULL,
  `sale_date` date NOT NULL DEFAULT curdate(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sales`
--

INSERT INTO `sales` (`id`, `item_name`, `quantity`, `price`, `total`, `payment_method`, `customer_name`, `notes`, `recorded_by`, `sale_date`, `created_at`, `updated_at`) VALUES
(1, 'Coffee Latte', 15, 5000.00, 75000.00, 'Cash', 'Walk-in Customer', 'Morning rush', 1, '2026-02-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(2, 'Croissant', 8, 3000.00, 24000.00, 'Cash', 'Regular Customer', 'Breakfast special', 1, '2026-02-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(3, 'Espresso', 12, 4000.00, 48000.00, 'Cash', 'Office workers', 'Morning meeting', 1, '2026-02-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(4, 'Tea Assortment', 5, 2000.00, 10000.00, 'Momo', 'Tourist group', 'Afternoon tea', 1, '2026-02-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(5, 'Pastry Bundle', 10, 3500.00, 35000.00, 'Cash', 'Hotel order', 'Breakfast delivery', 1, '2026-02-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(6, 'Coffee Cappuccino', 18, 5500.00, 99000.00, 'Cash', 'Office employees', 'Lunch break', 1, '2026-02-02', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(7, 'Sandwich', 12, 6000.00, 72000.00, 'Cash', 'Lunch crowd', 'Lunch special', 1, '2026-02-02', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(8, 'Coffee Americano', 10, 4500.00, 45000.00, 'Momo', 'Corporate office', 'Afternoon delivery', 1, '2026-02-02', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(9, 'Pastry Assortment', 15, 3000.00, 45000.00, 'Cash', 'School order', 'Breakfast package', 1, '2026-02-02', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(10, 'Coffee Latte', 20, 5000.00, 100000.00, 'Cash', 'Cafe rush', 'Evening service', 1, '2026-02-03', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(11, 'Chocolate Cake', 6, 7000.00, 42000.00, 'Cash', 'Birthday party', 'Party order', 1, '2026-02-03', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(12, 'Espresso', 14, 4000.00, 56000.00, 'Bank', 'Restaurant order', 'Bulk coffee', 1, '2026-02-03', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(13, 'Croissant', 10, 3000.00, 30000.00, 'Cash', 'Walk-in', 'Morning pastries', 1, '2026-02-03', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(14, 'Coffee Mocha', 16, 5500.00, 88000.00, 'Cash', 'Office group', 'Meeting break', 1, '2026-02-04', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(15, 'Sandwich Combo', 8, 8000.00, 64000.00, 'Cash', 'Lunch orders', 'Premium combo', 1, '2026-02-04', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(16, 'Tea Set', 4, 2500.00, 10000.00, 'Momo', 'Afternoon visitors', 'Tea service', 1, '2026-02-04', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(17, 'Coffee Latte', 22, 5000.00, 110000.00, 'Cash', 'Peak hours', 'Lunch rush', 1, '2026-02-04', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(18, 'Pastry Sampler', 12, 4000.00, 48000.00, 'Cash', 'Hotel breakfast', 'Morning delivery', 1, '2026-02-05', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(19, 'Coffee Americano', 18, 4500.00, 81000.00, 'Bank', 'Office catering', 'Bulk order', 1, '2026-02-05', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(20, 'Espresso', 15, 4000.00, 60000.00, 'Cash', 'Walk-in customers', 'Quick service', 1, '2026-02-05', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(21, 'Cake Slices', 8, 5000.00, 40000.00, 'Cash', 'Dessert lovers', 'Afternoon snacks', 1, '2026-02-05', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(22, 'Coffee Latte', 20, 5000.00, 100000.00, 'Cash', 'Morning rush', 'Peak hours', 1, '2026-02-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(23, 'Sandwich', 10, 6000.00, 60000.00, 'Cash', 'Lunch crowd', 'Lunch service', 1, '2026-02-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(24, 'Pastry Bundle', 12, 3500.00, 42000.00, 'Cash', 'Hotel order', 'Breakfast delivery', 1, '2026-02-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(25, 'Espresso', 8, 4000.00, 32000.00, 'Momo', 'Corporate', 'Office delivery', 1, '2026-02-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(26, 'Coffee Cappuccino', 15, 5500.00, 82500.00, 'Cash', 'Afternoon', 'Afternoon service', 1, '2026-02-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(27, 'Croissant', 14, 3000.00, 42000.00, 'Cash', 'Pastry lovers', 'Morning special', 1, '2026-02-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(28, 'Tea Assortment', 6, 2000.00, 12000.00, 'Bank', 'Hotel guests', 'Room service', 1, '2026-02-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(29, 'Sandwich Combo', 9, 8000.00, 72000.00, 'Cash', 'Lunch orders', 'Premium lunch', 1, '2026-02-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(30, 'Coffee Latte', 25, 5000.00, 125000.00, 'Cash', 'Weekend rush', 'Saturday service', 1, '2026-02-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(31, 'Chocolate Mousse', 7, 6000.00, 42000.00, 'Cash', 'Dessert', 'Special order', 1, '2026-02-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(32, 'Pastry Box', 18, 3500.00, 63000.00, 'Bank', 'Restaurant supply', 'Bulk delivery', 1, '2026-02-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(33, 'Espresso', 12, 4000.00, 48000.00, 'Cash', 'Quick service', 'Morning orders', 1, '2026-02-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(34, 'Coffee Americano', 16, 4500.00, 72000.00, 'Cash', 'Office workers', 'Afternoon break', 1, '2026-02-25', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(35, 'Sandwich', 11, 6000.00, 66000.00, 'Momo', 'Lunch delivery', 'Lunch package', 1, '2026-02-25', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(36, 'Coffee Latte', 19, 5000.00, 95000.00, 'Cash', 'Peak hours', 'Evening service', 1, '2026-02-25', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(37, 'Pastry Assortment', 14, 3000.00, 42000.00, 'Cash', 'Walk-in', 'Breakfast box', 1, '2026-02-25', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(38, 'Coffee Latte', 22, 5000.00, 110000.00, 'Cash', 'Morning rush', 'Peak hours', 1, '2026-03-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(39, 'Espresso', 16, 4000.00, 64000.00, 'Cash', 'Office orders', 'Morning delivery', 1, '2026-03-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(40, 'Sandwich', 10, 6000.00, 60000.00, 'Bank', 'Restaurant', 'Lunch package', 1, '2026-03-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(41, 'Pastry Bundle', 13, 3500.00, 45500.00, 'Cash', 'Hotel', 'Breakfast delivery', 1, '2026-03-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(42, 'Coffee Cappuccino', 18, 5500.00, 99000.00, 'Cash', 'Afternoon', 'Afternoon service', 1, '2026-03-05', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(43, 'Wedding Cake', 1, 50000.00, 50000.00, 'Bank', 'Wedding event', 'Special order', 1, '2026-03-05', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(44, 'Croissant', 20, 3000.00, 60000.00, 'Cash', 'Morning rush', 'Pastry special', 1, '2026-03-05', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(45, 'Tea Set', 8, 2500.00, 20000.00, 'Momo', 'Guests', 'Tea service', 1, '2026-03-05', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(46, 'Coffee Latte', 24, 5000.00, 120000.00, 'Cash', 'Weekend rush', 'Saturday service', 1, '2026-03-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(47, 'Espresso', 14, 4000.00, 56000.00, 'Cash', 'Quick orders', 'Morning service', 1, '2026-03-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(48, 'Sandwich Combo', 8, 8000.00, 64000.00, 'Bank', 'Corporate lunch', 'Bulk order', 1, '2026-03-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(49, 'Chocolate Cake', 4, 7000.00, 28000.00, 'Cash', 'Special orders', 'Cake slices', 1, '2026-03-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(50, 'Coffee Americano', 16, 4500.00, 72000.00, 'Cash', 'Office workers', 'Afternoon break', 1, '2026-03-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(51, 'Pastry Assortment', 12, 3000.00, 36000.00, 'Cash', 'Hotel guests', 'Breakfast package', 1, '2026-03-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(52, 'Coffee Latte', 20, 5000.00, 100000.00, 'Momo', 'Online order', 'Delivery service', 1, '2026-03-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(53, 'Sandwich', 9, 6000.00, 54000.00, 'Cash', 'Lunch crowd', 'Lunch service', 1, '2026-03-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(54, 'Coffee Mocha', 17, 5500.00, 93500.00, 'Cash', 'Peak hours', 'Evening service', 1, '2026-03-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(55, 'Espresso', 13, 4000.00, 52000.00, 'Bank', 'Office order', 'Bulk delivery', 1, '2026-03-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(56, 'Croissant', 15, 3000.00, 45000.00, 'Cash', 'Pastry lovers', 'Morning special', 1, '2026-03-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(57, 'Tea Assortment', 7, 2000.00, 14000.00, 'Cash', 'Afternoon guests', 'Tea service', 1, '2026-03-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(58, 'Coffee Latte', 21, 5000.00, 105000.00, 'Cash', 'Weekend', 'Saturday rush', 1, '2026-03-25', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(59, 'Sandwich Deluxe', 10, 7000.00, 70000.00, 'Cash', 'Premium lunch', 'Special order', 1, '2026-03-25', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(60, 'Pastry Box', 14, 3500.00, 49000.00, 'Bank', 'Restaurant supply', 'Bulk package', 1, '2026-03-25', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(61, 'Coffee Latte', 23, 5000.00, 115000.00, 'Cash', 'Morning service', 'Peak hours', 1, '2026-04-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(62, 'Espresso', 15, 4000.00, 60000.00, 'Cash', 'Quick orders', 'Fast service', 1, '2026-04-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(63, 'Sandwich', 11, 6000.00, 66000.00, 'Bank', 'Lunch delivery', 'Office order', 1, '2026-04-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(64, 'Pastry Bundle', 12, 3500.00, 42000.00, 'Cash', 'Hotel delivery', 'Breakfast package', 1, '2026-04-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(65, 'Coffee Cappuccino', 19, 5500.00, 104500.00, 'Cash', 'Afternoon service', 'Peak hours', 1, '2026-04-05', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(66, 'Conference Catering', 50, 6000.00, 300000.00, 'Bank', 'Conference event', 'Large order', 1, '2026-04-05', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(67, 'Croissant', 18, 3000.00, 54000.00, 'Cash', 'Morning rush', 'Pastry special', 1, '2026-04-05', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(68, 'Coffee Latte', 25, 5000.00, 125000.00, 'Cash', 'Weekend rush', 'Saturday service', 1, '2026-04-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(69, 'Espresso', 16, 4000.00, 64000.00, 'Momo', 'Office order', 'Afternoon delivery', 1, '2026-04-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(70, 'Sandwich Combo', 9, 8000.00, 72000.00, 'Cash', 'Premium lunch', 'Lunch service', 1, '2026-04-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(71, 'Coffee Americano', 17, 4500.00, 76500.00, 'Cash', 'Office workers', 'Morning break', 1, '2026-04-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(72, 'Pastry Assortment', 13, 3000.00, 39000.00, 'Bank', 'Hotel supply', 'Breakfast delivery', 1, '2026-04-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(73, 'Coffee Mocha', 14, 5500.00, 77000.00, 'Cash', 'Afternoon', 'Peak service', 1, '2026-04-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(74, 'Wedding Catering', 100, 8000.00, 800000.00, 'Bank', 'Wedding event', 'Major event', 1, '2026-04-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(75, 'Coffee Latte', 20, 5000.00, 100000.00, 'Cash', 'Morning service', 'Regular day', 1, '2026-04-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(76, 'Sandwich', 12, 6000.00, 72000.00, 'Momo', 'Lunch orders', 'Lunch delivery', 1, '2026-04-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(77, 'Coffee Espresso', 14, 4000.00, 56000.00, 'Cash', 'Quick service', 'Fast orders', 1, '2026-04-25', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(78, 'Croissant', 16, 3000.00, 48000.00, 'Cash', 'Pastry sales', 'Morning special', 1, '2026-04-25', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(79, 'Chocolate Cake', 5, 7000.00, 35000.00, 'Bank', 'Special order', 'Dessert delivery', 1, '2026-04-25', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(80, 'Coffee Latte', 24, 5000.00, 120000.00, 'Cash', 'Morning rush', 'Peak hours', 1, '2026-05-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(81, 'Espresso', 16, 4000.00, 64000.00, 'Cash', 'Office orders', 'Quick service', 1, '2026-05-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(82, 'Sandwich', 10, 6000.00, 60000.00, 'Bank', 'Lunch delivery', 'Office order', 1, '2026-05-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(83, 'Pastry Bundle', 12, 3500.00, 42000.00, 'Cash', 'Hotel', 'Breakfast delivery', 1, '2026-05-01', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(84, 'Coffee Cappuccino', 18, 5500.00, 99000.00, 'Cash', 'Afternoon', 'Peak service', 1, '2026-05-05', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(85, 'Conference Catering', 45, 6000.00, 270000.00, 'Bank', 'Conference', 'Large order', 1, '2026-05-05', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(86, 'Croissant', 19, 3000.00, 57000.00, 'Cash', 'Morning rush', 'Pastry special', 1, '2026-05-05', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(87, 'Coffee Latte', 22, 5000.00, 110000.00, 'Cash', 'Weekend', 'Saturday service', 1, '2026-05-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(88, 'Espresso', 15, 4000.00, 60000.00, 'Momo', 'Office order', 'Afternoon delivery', 1, '2026-05-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(89, 'Sandwich Combo', 10, 8000.00, 80000.00, 'Cash', 'Premium lunch', 'Lunch service', 1, '2026-05-10', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(90, 'Coffee Americano', 16, 4500.00, 72000.00, 'Cash', 'Office workers', 'Morning break', 1, '2026-05-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(91, 'Pastry Assortment', 14, 3000.00, 42000.00, 'Bank', 'Hotel supply', 'Breakfast delivery', 1, '2026-05-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(92, 'Coffee Mocha', 13, 5500.00, 71500.00, 'Cash', 'Afternoon', 'Peak service', 1, '2026-05-15', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(93, 'Wedding Catering', 80, 8000.00, 640000.00, 'Bank', 'Wedding event', 'Event service', 1, '2026-05-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(94, 'Coffee Latte', 20, 5000.00, 100000.00, 'Cash', 'Morning', 'Regular service', 1, '2026-05-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(95, 'Sandwich', 11, 6000.00, 66000.00, 'Momo', 'Lunch orders', 'Lunch delivery', 1, '2026-05-20', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(96, 'Coffee Espresso', 13, 4000.00, 52000.00, 'Cash', 'Quick service', 'Fast orders', 1, '2026-05-23', '2026-05-23 11:02:20', '2026-05-23 11:02:20'),
(97, 'Croissant', 17, 3000.00, 51000.00, 'Cash', 'Pastry sales', 'Morning special', 1, '2026-05-23', '2026-05-23 11:02:20', '2026-05-23 11:02:20');

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `cafe_name` varchar(150) NOT NULL DEFAULT 'PETIT CAFE FRANCAIS',
  `logo` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `theme_color` varchar(50) DEFAULT '#8B4513',
  `currency` varchar(20) DEFAULT 'RWF',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `cafe_name`, `logo`, `address`, `phone`, `email`, `theme_color`, `currency`, `created_at`, `updated_at`) VALUES
(1, 'PETIT CAFE FRANCAIS', 'logo.png', 'Kigali, Rwanda', '0780000000', 'info@petitcafefrancais.local', '#8B4513', 'RWF', '2026-05-21 09:40:39', '2026-05-21 09:40:39');

-- --------------------------------------------------------

--
-- Table structure for table `staff_duties`
--

CREATE TABLE `staff_duties` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `duty_date` date NOT NULL,
  `shift` varchar(50) NOT NULL,
  `duty_description` text NOT NULL,
  `assigned_by` int(11) DEFAULT NULL,
  `status` enum('Assigned','In Progress','Completed','Cancelled') NOT NULL DEFAULT 'Assigned',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL,
  `supplier_name` varchar(150) NOT NULL,
  `contact_person` varchar(150) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `payment_terms` varchar(255) DEFAULT NULL,
  `status` enum('Active','Inactive','Pending') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `supplier_name`, `contact_person`, `email`, `phone`, `address`, `city`, `payment_terms`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Coffee Roasters Ltd', 'Jean Kamanzi', 'info@coffeeroasters.local', '0788123456', 'P.O. Box 1234', 'Kigali', '30 days', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(2, 'Fresh Dairy Supplies', 'Marie Uwizeye', 'dairy@freshsupplies.local', '0788234567', 'Nyabugogo Rd', 'Kigali', '15 days', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(3, 'Bakery Flour Mills', 'Joseph Habimana', 'sales@bakeryflour.local', '0788345678', 'Industrial Area', 'Kigali', 'COD', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(4, 'Beverage Distributers', 'Paul Nsengiyumva', 'dist@beverages.local', '0788456789', 'City Centre', 'Kigali', '7 days', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(5, 'Farm Fresh Produce', 'Therese Nyirahabimana', 'farm@freshproduce.local', '0788567890', 'Musanze District', 'Musanze', '30 days', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(6, 'Kitchen Equipment Co', 'Charles Mugisha', 'sales@kitchenequip.local', '0788678901', 'Technology Hub', 'Kigali', 'COD', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(7, 'Cleaning Supplies Plus', 'Agnes Mutesi', 'supplies@cleaning.local', '0788789012', 'Industrial Zone', 'Kigali', '30 days', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(8, 'Sugar & Spice Ltd', 'Emmanuel Gatete', 'sales@sugarspice.local', '0788890123', 'Kimironko', 'Kigali', '15 days', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(9, 'Water Distribution', 'Vivian Murekatete', 'water@distribution.local', '0788901234', 'Water Works', 'Kigali', 'Monthly', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(10, 'Electricity Provider', 'Provider Services', 'billing@electricity.local', '0789012345', 'Service Center', 'Kigali', 'Monthly', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(11, 'Insurance Services', 'Robert Mwangi', 'coverage@insurance.local', '0789123456', 'Finance District', 'Kigali', 'Annual', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(12, 'Maintenance Services', 'Patrick Kagabo', 'repairs@maintenance.local', '0789234567', 'Service Area', 'Kigali', 'Per Job', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(13, 'Office Supplies', 'Sandra Kayitesi', 'office@supplies.local', '0789345678', 'Downtown', 'Kigali', 'Monthly', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(14, 'Advertising Agency', 'David Bizimungu', 'marketing@agency.local', '0789456789', 'Media Center', 'Kigali', 'Project', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(15, 'General Merchandise', 'Francine Mukubwa', 'general@merchandise.local', '0789567890', 'Warehouse', 'Kigali', '30 days', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13');

-- --------------------------------------------------------

--
-- Table structure for table `supplier_bills`
--

CREATE TABLE `supplier_bills` (
  `id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `bill_number` varchar(100) DEFAULT NULL,
  `bill_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `description` text DEFAULT NULL,
  `status` enum('Pending','Paid','Overdue','Cancelled') NOT NULL DEFAULT 'Pending',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Admin','Manager','Staff','Accountant') NOT NULL DEFAULT 'Staff',
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `photo_url`, `username`, `password`, `role`, `status`, `created_at`, `updated_at`) VALUES
(1, 'System Administrator', 'admin@petitcafe.local', '0780000000', NULL, 'admin', '$2y$10$mFhl88cA1u4aBIQw5d5T7.NpZ5vMXwfMuPlpsI8Whf2bmPhgV1xU6', 'Admin', 'Active', '2026-05-21 09:40:39', '2026-05-21 09:40:39'),
(2, 'Demo Manager', 'manager@petitcafe.local', '0780000001', NULL, 'manager', '$2y$10$hrp6MwLtoaMoZOhbaGaMq.b09YAKizKuJTWU2BtKrdVhmB4ZHvvK2', 'Manager', 'Active', '2026-05-22 13:57:40', '2026-05-22 13:57:40'),
(3, 'Demo Staff', 'staff@petitcafe.local', '0780000002', NULL, 'staff', '$2y$10$JC/VCkGR1LOrjB5OkrO8VeCkHe5gDGQxD7HDTfp8AuoNXV0ILtj2G', 'Staff', 'Active', '2026-05-22 13:57:40', '2026-05-22 13:57:40'),
(4, 'Demo Manager One', 'manager1@petitcafe.local', '0780000001', NULL, 'manager1', '$2y$10$HThNnlxkdYikXgoRPqDD1uJ172WsjZgMoqmwf9q6C29mEAD/VG4O2', 'Manager', 'Active', '2026-05-22 14:24:13', '2026-05-23 10:55:55'),
(5, 'Demo Manager Two', 'manager2@petitcafe.local', '0780000002', NULL, 'manager2', '$2y$12$iFuNnUF2VttLpysokq6ZBenGYpv.QX/WOuLWt/inW/lheNFFOvkxq', 'Manager', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(6, 'Demo Manager Three', 'manager3@petitcafe.local', '0780000003', NULL, 'manager3', '$2y$12$iFuNnUF2VttLpysokq6ZBenGYpv.QX/WOuLWt/inW/lheNFFOvkxq', 'Manager', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(7, 'Demo Accountant One', 'accountant1@petitcafe.local', '0780000004', NULL, 'accountant1', '$2y$12$iFuNnUF2VttLpysokq6ZBenGYpv.QX/WOuLWt/inW/lheNFFOvkxq', 'Accountant', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(8, 'Demo Accountant Two', 'accountant2@petitcafe.local', '0780000005', NULL, 'accountant2', '$2y$12$iFuNnUF2VttLpysokq6ZBenGYpv.QX/WOuLWt/inW/lheNFFOvkxq', 'Accountant', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(9, 'Demo Accountant Three', 'accountant3@petitcafe.local', '0780000006', NULL, 'accountant3', '$2y$12$iFuNnUF2VttLpysokq6ZBenGYpv.QX/WOuLWt/inW/lheNFFOvkxq', 'Accountant', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(11, 'Demo Staff One', 'staff1@petitcafe.local', '0780000008', NULL, 'staff1', '$2y$12$iFuNnUF2VttLpysokq6ZBenGYpv.QX/WOuLWt/inW/lheNFFOvkxq', 'Staff', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(12, 'Demo Staff Two', 'staff2@petitcafe.local', '0780000009', NULL, 'staff2', '$2y$12$iFuNnUF2VttLpysokq6ZBenGYpv.QX/WOuLWt/inW/lheNFFOvkxq', 'Staff', 'Active', '2026-05-22 14:24:13', '2026-05-22 14:24:13'),
(13, 'Rwamasirabo Salomon', 'yasriyag9@gmail.com', '782580868', NULL, 'salom', '$2y$10$LPadxOEjGPtnxJTMhLbda.wd3blJi/P720pYCgtf08/H4nau.XceC', 'Staff', 'Active', '2026-05-22 14:57:28', '2026-05-22 14:57:28'),
(14, 'Rukundo Yassili', 'rukundoyasri@gmail.com', '0782580868', NULL, 'yassili', '$2y$10$mQ0aPgzxpKCBPS9TMtuLIOmUP8rbkTIormnWSUrGrZrZJnrLWt.RC', 'Accountant', 'Active', '2026-05-22 14:59:21', '2026-05-22 14:59:21'),
(16, 'Shema YVES', 'djimpactvybz@gmail.com', '0785513741', NULL, 'shema', '$2y$10$Mjx75bR0Cu7TJ6L8vYOxbu6JifuL1QWebtXEq8wJ8OY6joOUnol9O', 'Manager', 'Active', '2026-05-22 15:09:15', '2026-05-22 15:09:15'),
(19, 'Merci INGABIRE', 'inariegabiremariemerci5@gmail.com', '0785008364', NULL, 'Merci', '$2y$10$hLUrUX/Y9dmBfzcnmCJd3e5JYRg4LxfnC3x0mjdXlQ4wLDwgrjTK2', 'Manager', 'Active', '2026-05-22 15:39:34', '2026-05-22 15:40:29');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_logs_user` (`user_id`);

--
-- Indexes for table `cafe_tables`
--
ALTER TABLE `cafe_tables`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `table_number` (`table_number`),
  ADD KEY `idx_tables_status` (`status`);

--
-- Indexes for table `cash_flow`
--
ALTER TABLE `cash_flow`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recorded_by` (`recorded_by`),
  ADD KEY `idx_transaction_type` (`transaction_type`),
  ADD KEY `idx_payment_method` (`payment_method`),
  ADD KEY `idx_transaction_date` (`transaction_date`),
  ADD KEY `idx_amount` (`amount`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `category_name` (`category_name`),
  ADD KEY `idx_categories_status` (`status`);

--
-- Indexes for table `daily_closing_checklist`
--
ALTER TABLE `daily_closing_checklist`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_close_date_staff` (`checklist_date`,`staff_id`),
  ADD KEY `fk_close_staff` (`staff_id`),
  ADD KEY `fk_close_user` (`created_by`),
  ADD KEY `idx_close_date` (`checklist_date`);

--
-- Indexes for table `daily_opening_checklist`
--
ALTER TABLE `daily_opening_checklist`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_open_date_staff` (`checklist_date`,`staff_id`),
  ADD KEY `fk_open_staff` (`staff_id`),
  ADD KEY `fk_open_user` (`created_by`),
  ADD KEY `idx_open_date` (`checklist_date`);

--
-- Indexes for table `daily_operations`
--
ALTER TABLE `daily_operations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `operation_date` (`operation_date`),
  ADD KEY `fk_ops_manager` (`manager_id`),
  ADD KEY `fk_ops_user` (`created_by`),
  ADD KEY `idx_ops_date` (`operation_date`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_expense_user` (`created_by`),
  ADD KEY `idx_expense_date` (`expense_date`);

--
-- Indexes for table `expense_categories`
--
ALTER TABLE `expense_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `category_name` (`category_name`),
  ADD KEY `idx_expense_cat_status` (`status`);

--
-- Indexes for table `financial_records`
--
ALTER TABLE `financial_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_fin_date_type` (`record_date`,`record_type`),
  ADD KEY `fk_fin_user` (`created_by`),
  ADD KEY `idx_fin_date` (`record_date`),
  ADD KEY `idx_fin_type` (`record_type`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_inventory_status` (`status`);

--
-- Indexes for table `menu_items`
--
ALTER TABLE `menu_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_menu_category` (`category_id`),
  ADD KEY `idx_menu_availability` (`availability`);

--
-- Indexes for table `performance_records`
--
ALTER TABLE `performance_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_perf_user` (`created_by`),
  ADD KEY `idx_perf_date` (`record_date`),
  ADD KEY `idx_perf_period` (`period_type`);

--
-- Indexes for table `salary_records`
--
ALTER TABLE `salary_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_salary_user_month` (`user_id`,`salary_month`),
  ADD KEY `fk_salary_creator` (`created_by`),
  ADD KEY `idx_salary_month` (`salary_month`),
  ADD KEY `idx_salary_status` (`status`);

--
-- Indexes for table `sales`
--
ALTER TABLE `sales`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recorded_by` (`recorded_by`),
  ADD KEY `idx_payment_method` (`payment_method`),
  ADD KEY `idx_sale_date` (`sale_date`),
  ADD KEY `idx_quantity` (`quantity`),
  ADD KEY `idx_total` (`total`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `staff_duties`
--
ALTER TABLE `staff_duties`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_duty_user` (`user_id`),
  ADD KEY `fk_duty_assigner` (`assigned_by`),
  ADD KEY `idx_duty_date` (`duty_date`),
  ADD KEY `idx_duty_status` (`status`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_supplier_status` (`status`),
  ADD KEY `idx_supplier_name` (`supplier_name`);

--
-- Indexes for table `supplier_bills`
--
ALTER TABLE `supplier_bills`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bill_supplier` (`supplier_id`),
  ADD KEY `fk_bill_user` (`created_by`),
  ADD KEY `idx_bill_date` (`bill_date`),
  ADD KEY `idx_bill_status` (`status`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_username` (`username`),
  ADD KEY `idx_users_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `cafe_tables`
--
ALTER TABLE `cafe_tables`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `cash_flow`
--
ALTER TABLE `cash_flow`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=83;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `daily_closing_checklist`
--
ALTER TABLE `daily_closing_checklist`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `daily_opening_checklist`
--
ALTER TABLE `daily_opening_checklist`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `daily_operations`
--
ALTER TABLE `daily_operations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `expense_categories`
--
ALTER TABLE `expense_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `financial_records`
--
ALTER TABLE `financial_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `menu_items`
--
ALTER TABLE `menu_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `performance_records`
--
ALTER TABLE `performance_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `salary_records`
--
ALTER TABLE `salary_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales`
--
ALTER TABLE `sales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=98;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `staff_duties`
--
ALTER TABLE `staff_duties`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `supplier_bills`
--
ALTER TABLE `supplier_bills`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `fk_log_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `cash_flow`
--
ALTER TABLE `cash_flow`
  ADD CONSTRAINT `cash_flow_ibfk_1` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `daily_closing_checklist`
--
ALTER TABLE `daily_closing_checklist`
  ADD CONSTRAINT `fk_close_staff` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_close_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `daily_opening_checklist`
--
ALTER TABLE `daily_opening_checklist`
  ADD CONSTRAINT `fk_open_staff` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_open_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `daily_operations`
--
ALTER TABLE `daily_operations`
  ADD CONSTRAINT `fk_ops_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ops_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `fk_expense_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `financial_records`
--
ALTER TABLE `financial_records`
  ADD CONSTRAINT `fk_fin_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `menu_items`
--
ALTER TABLE `menu_items`
  ADD CONSTRAINT `fk_menu_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `performance_records`
--
ALTER TABLE `performance_records`
  ADD CONSTRAINT `fk_perf_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `salary_records`
--
ALTER TABLE `salary_records`
  ADD CONSTRAINT `fk_salary_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_salary_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `sales`
--
ALTER TABLE `sales`
  ADD CONSTRAINT `sales_ibfk_1` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `staff_duties`
--
ALTER TABLE `staff_duties`
  ADD CONSTRAINT `fk_duty_assigner` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_duty_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `supplier_bills`
--
ALTER TABLE `supplier_bills`
  ADD CONSTRAINT `fk_bill_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bill_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

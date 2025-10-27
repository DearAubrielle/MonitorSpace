-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: hopper.proxy.rlwy.net:28173
-- Generation Time: Oct 27, 2025 at 06:07 AM
-- Server version: 9.4.0
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `spacemonitor`
--

-- --------------------------------------------------------

--
-- Table structure for table `devices`
--

CREATE TABLE `devices` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `device_type_id` int NOT NULL,
  `floorplan_id` int NOT NULL,
  `path_topic` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `x_percent` decimal(30,25) DEFAULT '0.5000000000000000000000000',
  `y_percent` decimal(30,25) DEFAULT '0.5000000000000000000000000',
  `latest_value` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_updated` datetime DEFAULT NULL,
  `min_alert` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `max_alert` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `alert_status` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `devices`
--

INSERT INTO `devices` (`id`, `name`, `device_type_id`, `floorplan_id`, `path_topic`, `x_percent`, `y_percent`, `latest_value`, `last_updated`, `min_alert`, `max_alert`, `alert_status`) VALUES
(1, 'Temp Sensor A1', 1, 1, NULL, 0.2532188889472246000000000, 0.1971738258008861000000000, '27.5', '2025-10-01 15:00:15', '10', '40', 0),
(2, 'Camera B1', 4, 1, 'http://192.168.100.101/videostream.cgi?user=admin&pwd=888888', 0.5005661756947427000000000, 0.5610549380262175000000000, '', '2025-10-01 15:00:15', '', '', 0),
(3, 'Temp C1', 1, 1, '', 0.6132927007711694000000000, 0.4093058587613476000000000, '', '2025-10-01 15:00:15', '', '', 0),
(4, 'Temp Sensor A2', 1, 2, '', 0.4590765763884456000000000, 0.2036421459771021500000000, '28.9', '2025-10-01 15:00:15', '', '', 0),
(5, 'Gas A1', 2, 2, 'GasSensor/2', 0.2723643523624578000000000, 0.1605711054216232800000000, '999', NULL, '15', '30', 0),
(41, 'Gas C7', 2, 1, 'Gas/41', 0.5243212681354554000000000, 0.2544291681169509300000000, NULL, NULL, '50', '200', 0),
(42, 'Temperature SMART1', 1, 2, 'Temperature/42', 0.5853467790028001000000000, 0.1902467854502402400000000, 'ได้ละ', NULL, '-1', '70', 0);

-- --------------------------------------------------------

--
-- Table structure for table `device_type`
--

CREATE TABLE `device_type` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `icon_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `has_value` tinyint(1) NOT NULL DEFAULT '1',
  `unit` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `device_type`
--

INSERT INTO `device_type` (`id`, `name`, `icon_url`, `has_value`, `unit`) VALUES
(1, 'Temperature', '/private_uploads/images/icons/Temperature.png', 1, '°C'),
(2, 'Gas', '/private_uploads/images/icons/Gas.png', 0, 'ppm'),
(3, 'Humidity', '/private_uploads/images/icons/Humidity.png', 1, '%'),
(4, 'Camera', '/private_uploads/images/icons/Camera.png', 1, '');

-- --------------------------------------------------------

--
-- Table structure for table `floorplan`
--

CREATE TABLE `floorplan` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `floorplan`
--

INSERT INTO `floorplan` (`id`, `name`, `image_url`, `description`) VALUES
(1, 'Ground Floor', '/private_uploads/images/floorplans/house_ground_floor.jpg', 'Main entrance, living room, kitchen, and dining area'),
(2, 'Second Floor', '/private_uploads/images/floorplans/house_second_floor.jpg', 'Bedrooms and bathrooms'),
(3, 'Garden Isle', '/private_uploads/images/floorplans/floorplan-1761079565187-10797819.png', 'Note : Create new floorplan Image to replace this one'),
(4, 'Bubble Isle', '/private_uploads/images/floorplans/floorplan-1761114750756-498620771.png', 'dasadad'),
(5, 'Third Floor', '/private_uploads/images/floorplans/floorplan-1761075610742-666659342.png', 'No CCTV on this floor only  2 gas sensor');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `display_name`, `description`, `permissions`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'user', 'User', 'Basic user with limited access', '[\"view_dashboard\", \"view_devices\"]', 1, '2025-10-21 22:44:35', '2025-10-21 22:44:35'),
(2, 'manager', 'Manager', 'Manager with extended permissions', '[\"view_dashboard\", \"view_devices\", \"manage_devices\", \"view_members\"]', 1, '2025-10-21 22:44:35', '2025-10-21 22:44:35'),
(3, 'admin', 'Administrator', 'Full system administrator', '[\"view_dashboard\", \"view_devices\", \"manage_devices\", \"view_members\", \"manage_members\", \"manage_roles\", \"system_settings\"]', 1, '2025-10-21 22:44:35', '2025-10-21 22:44:35');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `role_id` int DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `created_at`, `updated_at`, `role_id`) VALUES
(1, 'IamUser', 'theusername@gmail.com', '$2b$10$g8r/.2SmYJQyzhcqLGOCAuFC4pXa46IPKYZBw5eFjmAJ65t9y4Xru', '2025-08-08 05:37:16', '2025-10-22 06:35:00', 1),
(2, 'IamAdmin', 'theadmin@gmail.com', '$2b$10$krFw695ySlQW9gB0BPYdO.Vmr6qJVEyjq6Im9H2enpogieC.RVlDy', '2025-10-10 08:05:00', '2025-10-22 00:07:53', 3),
(3, 'testuser_1761087507246', 'testuser_1761087507246@test.com', '$2b$10$AVrE46YHfodtZKLrfitoaeLynSY.P6hc/V4GWQRFnx0LG1CuSKaSi', '2025-10-21 22:58:27', '2025-10-27 02:39:14', 1),
(4, 'testuser_1761087615957', 'testuser_1761087615957@test.com', '$2b$10$Vp/PXD6RlPce5RfbphItVuAYcKCVMNC6B0SHN5g9AgyEMdkTgDJpq', '2025-10-21 23:00:16', '2025-10-27 02:39:09', 3);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `devices`
--
ALTER TABLE `devices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `device_type_id` (`device_type_id`),
  ADD KEY `floorplan_id` (`floorplan_id`);

--
-- Indexes for table `device_type`
--
ALTER TABLE `device_type`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `floorplan`
--
ALTER TABLE `floorplan`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `idx_roles_name` (`name`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_role_id` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `devices`
--
ALTER TABLE `devices`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `device_type`
--
ALTER TABLE `device_type`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `floorplan`
--
ALTER TABLE `floorplan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `devices`
--
ALTER TABLE `devices`
  ADD CONSTRAINT `devices_ibfk_1` FOREIGN KEY (`device_type_id`) REFERENCES `device_type` (`id`),
  ADD CONSTRAINT `devices_ibfk_2` FOREIGN KEY (`floorplan_id`) REFERENCES `floorplan` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- 南风草木 数据库结构 (MySQL)

CREATE DATABASE IF NOT EXISTS `nanfeng` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `nanfeng`;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `openid` VARCHAR(64) UNIQUE,
  `nickname` VARCHAR(100) DEFAULT '南风访客',
  `avatar` VARCHAR(255),
  `phone` VARCHAR(20),
  `points` INT DEFAULT 0,
  `balance` DECIMAL(10,2) DEFAULT 0.00,
  `create_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `icon` VARCHAR(255),
  `sort_order` INT DEFAULT 0,
  `status` TINYINT DEFAULT 1,
  `create_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `price` DECIMAL(10,2) NOT NULL,
  `stock` INT DEFAULT 0,
  `cover_image` VARCHAR(255),
  `images` JSON,
  `details` TEXT,
  `status` TINYINT DEFAULT 1 COMMENT '1:上架, 0:下架',
  `create_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `order_no` VARCHAR(64) UNIQUE NOT NULL,
  `status` TINYINT DEFAULT 0 COMMENT '0:待付款, 1:待发货, 2:已发货/待收货, 3:已完成, 4:退款售后, 5:已取消',
  `total_amount` DECIMAL(10,2) NOT NULL,
  `address_id` INT,
  `tracking_no` VARCHAR(100) COMMENT '物流单号',
  `logistics_company` VARCHAR(50) COMMENT '物流公司',
  `create_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `pay_time` TIMESTAMP NULL,
  `ship_time` TIMESTAMP NULL
);

CREATE TABLE `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `product_name` VARCHAR(100),
  `product_image` VARCHAR(255),
  `quantity` INT DEFAULT 1,
  `price` DECIMAL(10,2) NOT NULL
);

CREATE TABLE `addresses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `recipient` VARCHAR(50) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `province` VARCHAR(50),
  `city` VARCHAR(50),
  `district` VARCHAR(50),
  `detail` VARCHAR(255) NOT NULL,
  `is_default` TINYINT DEFAULT 0
);

CREATE TABLE `cart` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT DEFAULT 1,
  `create_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初始数据
INSERT INTO `categories` (`name`, `sort_order`) VALUES 
('香道', 1), ('茶礼', 2), ('禅意服饰', 3), ('器皿', 4);

INSERT INTO `products` (`category_id`, `name`, `description`, `price`, `stock`, `cover_image`) VALUES 
(1, '南风草木·香蓝', '静心采撷，古法手作线香', 168.00, 100, 'https://example.com/item1.png'),
(1, '南风草木·檀香', '老山檀香提神醒脑', 299.00, 50, 'https://example.com/item2.png');

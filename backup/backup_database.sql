-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: deepseek_db
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `Admin_ID` int NOT NULL AUTO_INCREMENT,
  `Admin_FullName` varchar(100) NOT NULL,
  `Admin_DOB` date NOT NULL,
  `Admin_ContactNumber` varchar(15) NOT NULL,
  `Admin_Email` varchar(100) NOT NULL,
  `Admin_Password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Admin_ID`),
  UNIQUE KEY `Admin_Email` (`Admin_Email`)
) ENGINE=InnoDB AUTO_INCREMENT=1004 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (1001,'Admin Maya','1997-03-23','01728546328','admin@userve.com','Admin@123','2026-05-07 19:42:17'),(1002,'Admin Hans','1995-02-05','0147455709','hans@userve.com','Hans@123','2026-07-25 04:51:58'),(1003,'Admin Melur','1978-06-13','0142358570','melur@userve.com','melur@123','2026-07-27 15:00:54');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `certificates`
--

DROP TABLE IF EXISTS `certificates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certificates` (
  `Certificate_ID` int NOT NULL AUTO_INCREMENT,
  `Volunteer_ID` int NOT NULL,
  `Event_ID` int NOT NULL,
  `Student_FullName` varchar(100) NOT NULL,
  `Student_ID` varchar(20) NOT NULL,
  `Event_Name` varchar(200) NOT NULL,
  `Event_Date` date NOT NULL,
  `Event_Location` varchar(200) NOT NULL,
  `Organizer_Name` varchar(100) NOT NULL,
  `certificate_code` varchar(100) NOT NULL,
  `issue_date` date DEFAULT (curdate()),
  PRIMARY KEY (`Certificate_ID`),
  UNIQUE KEY `certificate_code` (`certificate_code`),
  KEY `Volunteer_ID` (`Volunteer_ID`),
  KEY `Event_ID` (`Event_ID`),
  CONSTRAINT `certificates_ibfk_1` FOREIGN KEY (`Volunteer_ID`) REFERENCES `volunteer_registrations` (`Volunteer_ID`),
  CONSTRAINT `certificates_ibfk_2` FOREIGN KEY (`Event_ID`) REFERENCES `events` (`Event_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `certificates`
--

LOCK TABLES `certificates` WRITE;
/*!40000 ALTER TABLE `certificates` DISABLE KEYS */;
INSERT INTO `certificates` VALUES (1,13,1032,'Marissa binti Khalid','2025617154',' cleaner','2026-04-28','art museum','Community Service Club','USV-1781331228196-13','2026-06-13'),(2,11,1017,'Ahmad Faiz Bin Abdullah','2023123456','siapakah pemenang???','2026-06-26','mari saksikan','Community Service Club','USV-1781572894622-11','2026-06-16'),(3,7,1007,'Ahmad Faiz Bin Abdullah','2023123456','Harpswell ASEAN Women’s Leadership Summit 2025','2026-06-22','Port Dickson','Community Service Club','USV-1782085024926-7','2026-06-22'),(4,14,1007,'Marissa binti Khalid','2025617154','Harpswell ASEAN Women’s Leadership Summit 2025','2026-06-22','Port Dickson','Community Service Club','USV-1782085024946-14','2026-06-22'),(5,8,1013,'Ahmad Faiz Bin Abdullah','2023123456','Marine Conservation in Malaysia (Turtles, Dive and Teaching)','2026-06-22','ONLINE','Community Service Club','USV-1783015082081-8','2026-07-03'),(6,8,1013,'Ahmad Faiz Bin Abdullah','2023123456','Marine Conservation in Malaysia (Turtles, Dive and Teaching)','2026-06-22','ONLINE','Community Service Club','USV-1783015082087-8','2026-07-03'),(7,16,1042,'Ahmad Faiz Bin Abdullah','2023123456','chatgpt suruh try','2026-07-07','setia alam','Community Service Club','USV-1042-2023123456','2026-07-07'),(8,6,1001,'Ahmad Faiz Bin Abdullah','2023123456','Test Event 01','2026-05-11','Shah Alam','Community Service Club','USV-1783613542796-6','2026-07-10'),(9,18,1001,'Marissa binti Khalid','2025617154','Test Event 01','2026-05-11','Shah Alam','Community Service Club','USV-1783613542824-18','2026-07-10'),(10,19,1013,'Marissa binti Khalid','2025617154','Marine Conservation in Malaysia (Turtles, Dive and Teaching)','2026-06-22','ONLINE','Community Service Club','USV-1783787459465-19','2026-07-12'),(11,21,1017,'Marissa binti Khalid','2025617154','Teach for Malaysia','2026-06-22','mari saksikan','Community Service Club','USV-1783788495292-21','2026-07-12'),(12,25,1017,'Bedah binti Ramli','47284967','Teach for Malaysia','2026-06-22','mari saksikan','Community Service Club','USV-1783788495300-25','2026-07-12'),(13,24,1042,'Marissa binti Khalid','2025617154','chatgpt suruh try','2026-07-07','setia alam','Community Service Club','USV-1785163023512-24','2026-07-27'),(14,9,1016,'Ahmad Faiz Bin Abdullah','2023123456','Volunteer Research Project with Sea Turtles in Malaysia','2026-06-22','aminah atau bedah?','Community Service Club','USV-1785187390950-9','2026-07-28'),(15,20,1016,'Marissa binti Khalid','2025617154','Volunteer Research Project with Sea Turtles in Malaysia','2026-06-22','aminah atau bedah?','Community Service Club','USV-1785187390984-20','2026-07-28'),(16,27,1046,'Ahmad Faiz Bin Abdullah','2023123456','Masa','2026-07-28','Kolej Melati','Community Service Club','USV-1785241241551-27','2026-07-28'),(17,28,1044,'Ahmad Faiz Bin Abdullah','2023123456','Gratuity Approval','2026-07-28','Shah Alam','Community Service Club','USV-1785241246460-28','2026-07-28');
/*!40000 ALTER TABLE `certificates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chats`
--

DROP TABLE IF EXISTS `chats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chats` (
  `Chat_ID` int NOT NULL AUTO_INCREMENT,
  `Sender_ID` varchar(50) NOT NULL,
  `Sender_Role` enum('student','organizer','admin') NOT NULL,
  `Receiver_ID` varchar(50) NOT NULL,
  `Receiver_Role` enum('student','organizer','admin') NOT NULL,
  `Message` text NOT NULL,
  `Timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Chat_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chats`
--

LOCK TABLES `chats` WRITE;
/*!40000 ALTER TABLE `chats` DISABLE KEYS */;
INSERT INTO `chats` VALUES (1,'2023123456','student','1','student','tes','2026-07-28 02:54:27'),(2,'2023123456','student','ADM001','student','admin test?','2026-07-28 02:54:40'),(3,'2023123456','student','ADM001','student','UServe System Support Admin','2026-07-28 02:54:47'),(4,'2023123456','student','ADM001','student','testing','2026-07-28 02:54:59'),(5,'1','organizer','ADM001','student','hi','2026-07-28 02:56:57'),(6,'1','organizer','ADM001','student','test 123','2026-07-28 03:26:26'),(7,'1','organizer','2023123456','student','test 123','2026-07-28 03:26:31'),(8,'1','organizer','2023123456','student','from organizer','2026-07-28 03:26:39'),(9,'1','organizer','2023123456','student','with id 1','2026-07-28 03:26:53'),(10,'1','organizer','ADM001','student','from organizer','2026-07-28 03:26:58'),(11,'1','organizer','ADM001','student','with id 1','2026-07-28 03:27:00'),(12,'2023123456','student','1','student','test 456','2026-07-28 03:27:54'),(13,'2023123456','student','1','student','from student','2026-07-28 03:27:58'),(14,'2023123456','student','1','student','original student','2026-07-28 03:28:04'),(15,'2023123456','student','ADM001','student','test 456','2026-07-28 03:28:13'),(16,'2023123456','student','ADM001','student','from student','2026-07-28 03:28:21'),(17,'2023123456','student','ADM001','student','original student','2026-07-28 03:28:24'),(18,'2023123456','student','1','student','selamat petang','2026-07-28 03:52:29'),(19,'1','organizer','2023123456','student','selamat malam','2026-07-28 03:52:55'),(20,'2023123456','student','1','student','4:25 am','2026-07-28 04:25:44'),(21,'2023123456','student','1001','student','4:25 am','2026-07-28 04:26:03'),(22,'1','organizer','2023123456','student','4:26 am','2026-07-28 04:26:29'),(23,'1','organizer','1001','student','salam, 4:26 am','2026-07-28 04:26:36'),(24,'1001','admin','2023123456','student','selamat pagi','2026-07-28 04:27:12'),(25,'1001','admin','1','student','wasalam, selamat pagi','2026-07-28 04:27:20'),(26,'2023123456','student','1001','student','admin maya?','2026-07-28 04:30:26'),(27,'1001','admin','2023123456','student','yes, admin maya','2026-07-28 04:32:51'),(28,'1001','admin','1','student','admin maya, yes','2026-07-28 04:32:58'),(29,'1','organizer','2023123456','student','6:42 am','2026-07-28 06:42:57'),(30,'2023123456','student','1001','student','testing ahmad faiz with admin maya','2026-07-28 13:44:27'),(31,'2023123456','student','1001','student','testing','2026-07-28 15:05:25'),(32,'2023123456','student','1','student','tt','2026-07-28 15:05:33'),(33,'2023123456','student','1','student','testing ahmad faiz with community service club','2026-07-28 15:05:53'),(34,'2023123456','student','1','student','try','2026-07-28 15:05:56'),(35,'2023123456','student','1','student','test','2026-07-28 15:08:49'),(36,'2023123456','student','1','student','testing 123','2026-07-28 17:23:53'),(37,'2023123456','student','1001','student','testing 123','2026-07-28 17:24:04'),(38,'2023123456','student','1001','student','pdf issue viewer','2026-07-28 17:26:15'),(39,'1','organizer','2023123456','student','testing Organizer asal to ahmad faiz','2026-07-28 17:31:40'),(40,'1','organizer','1001','student','organizer asal yes','2026-07-28 17:32:02'),(41,'1','organizer','1001','student','edit event testing okay','2026-07-28 17:33:59'),(42,'1001','admin','1','student','hai okay','2026-07-28 17:36:44'),(43,'1001','admin','2023123456','student','hai okay','2026-07-28 17:36:54'),(44,'1001','admin','2023123456','student','done','2026-07-28 17:36:57'),(45,'1001','admin','1','student','done','2026-07-28 17:37:03'),(46,'2023123456','student','3001','student','Hi, is this event for free or there is any fee that needed to be paid?','2026-07-29 14:26:39'),(47,'2023123456','student','3001','student','I am so happy if you could reply me, thank you.','2026-07-29 15:45:49');
/*!40000 ALTER TABLE `chats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_waitlist`
--

DROP TABLE IF EXISTS `event_waitlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_waitlist` (
  `Waitlist_ID` int NOT NULL AUTO_INCREMENT,
  `Student_ID` int NOT NULL,
  `Student_FullName` varchar(255) NOT NULL,
  `Event_ID` int NOT NULL,
  `Created_At` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Waitlist_ID`),
  UNIQUE KEY `unique_waitlist` (`Student_ID`,`Event_ID`),
  KEY `Event_ID` (`Event_ID`),
  CONSTRAINT `event_waitlist_ibfk_1` FOREIGN KEY (`Event_ID`) REFERENCES `events` (`Event_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_waitlist`
--

LOCK TABLES `event_waitlist` WRITE;
/*!40000 ALTER TABLE `event_waitlist` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_waitlist` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `Event_ID` int NOT NULL AUTO_INCREMENT,
  `Organizer_ID` int NOT NULL,
  `Organizer_Name` varchar(100) NOT NULL,
  `Event_Name` varchar(200) NOT NULL,
  `Event_Desc` text,
  `Event_Date` date DEFAULT (curdate()),
  `Event_Time` time NOT NULL,
  `Event_Location` varchar(200) NOT NULL,
  `Event_Slots` int DEFAULT '50',
  `Event_Registered` int DEFAULT '0',
  `is_closed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Event_ID`),
  KEY `Organizer_ID` (`Organizer_ID`),
  CONSTRAINT `events_ibfk_1` FOREIGN KEY (`Organizer_ID`) REFERENCES `organizers` (`Organizer_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=1052 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
INSERT INTO `events` VALUES (1001,1,'Test','Test Event 01','Test Event Desc','2026-05-11','01:15:00','Shah Alam',2,2,0,'2026-05-03 17:11:00'),(1007,1,'Community Service Club','Harpswell ASEAN Women’s Leadership Summit 2025','Class Trip 2026','2026-06-22','02:33:00','Port Dickson',24,2,0,'2026-05-08 17:33:26'),(1013,1,'Community Service Club','Marine Conservation in Malaysia (Turtles, Dive and Teaching)','ICT652','2026-06-22','00:37:00','ONLINE',100,2,0,'2026-05-10 16:37:52'),(1016,1,'Community Service Club','Volunteer Research Project with Sea Turtles in Malaysia','siapakah imposternya','2026-06-22','02:33:00','aminah atau bedah?',2,2,0,'2026-05-10 17:34:45'),(1017,1,'Community Service Club','Teach for Malaysia','aminah or bedah?','2026-06-22','02:36:00','mari saksikan',3,3,0,'2026-05-10 17:36:14'),(1032,1,'Community Service Club',' SOLS: Scholar Development Professional Internship','lulu suicide - roma','2026-06-22','22:56:00','art museum',2,2,0,'2026-05-13 14:56:48'),(1033,1,'Community Service Club','Kennedy-Lugar Youth Exchange Program in Malaysia','amir','2026-06-22','23:51:00','amir',50,2,0,'2026-05-13 15:51:27'),(1041,1,'Community Service Club','Malaysia Wildlife','zoo negara, malaysia','2026-06-22','12:20:00','Malaysia',10,3,0,'2026-06-08 04:20:37'),(1042,1,'Community Service Club','Mineral Water Waste','yes just try','2026-07-28','19:02:00','Bangi',10,2,0,'2026-07-07 11:02:24'),(1044,1,'Community Service Club','Gratuity Approval','i am tired','2026-07-28','09:59:00','Shah Alam',5,1,0,'2026-07-27 22:56:51'),(1046,1,'Community Service Club','Masa','demi masa.','2026-07-28','10:23:00','Kolej Melati',5,1,0,'2026-07-28 02:19:24'),(1048,1,'Community Service Club','Create Event Baru','Betul ii after tukar Organizer_ID to Organizer_Name dekat database','2026-07-28','09:59:00','Kolej Melati',2,1,0,'2026-07-28 19:33:37'),(1049,1,'Community Service Club','Testing overlay resolution','check','2026-07-28','19:02:00','Kolej Mawar',10,0,0,'2026-07-29 06:20:37'),(1050,3001,'UNICEF Malaysia','The #Kurangmanis Marathon','https://www.unicef.org/malaysia/stories/kurangmanis-unicef-borneo-marathon-2019','2026-07-28','19:02:00','Borneo',40,0,0,'2026-07-29 06:25:04'),(1051,1,'Community Service Club','testing overlap 1','-','2026-07-30','16:00:00','Shah Alam',2,0,0,'2026-07-29 07:55:53');
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gratuity`
--

DROP TABLE IF EXISTS `gratuity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gratuity` (
  `Gratuity_ID` int NOT NULL AUTO_INCREMENT,
  `Event_ID` int NOT NULL,
  `Volunteer_ID` int NOT NULL,
  `Student_ID` varchar(20) NOT NULL,
  `Gratuity_Date` date DEFAULT (curdate()),
  `Gratuity_Method` varchar(50) DEFAULT 'cash',
  `Gratuity_Amount` decimal(10,2) NOT NULL,
  `Gratuity_Status` enum('pending','completed','failed') DEFAULT 'pending',
  PRIMARY KEY (`Gratuity_ID`),
  KEY `Event_ID` (`Event_ID`),
  KEY `Volunteer_ID` (`Volunteer_ID`),
  KEY `Student_ID` (`Student_ID`),
  CONSTRAINT `gratuity_ibfk_1` FOREIGN KEY (`Event_ID`) REFERENCES `events` (`Event_ID`),
  CONSTRAINT `gratuity_ibfk_2` FOREIGN KEY (`Volunteer_ID`) REFERENCES `volunteer_registrations` (`Volunteer_ID`),
  CONSTRAINT `gratuity_ibfk_3` FOREIGN KEY (`Student_ID`) REFERENCES `students` (`Student_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gratuity`
--

LOCK TABLES `gratuity` WRITE;
/*!40000 ALTER TABLE `gratuity` DISABLE KEYS */;
INSERT INTO `gratuity` VALUES (6,1042,16,'2023123456','2026-07-07','e_wallet',0.00,'completed'),(7,1007,14,'2025617154','2026-07-09','online_banking',0.00,'completed'),(8,1013,8,'2023123456','2026-07-09','cash',0.00,'completed'),(9,1017,11,'2023123456','2026-07-09','online_banking',0.00,'completed'),(10,1033,10,'2023123456','2026-07-09','online_banking',0.00,'completed'),(11,1041,17,'2023123456','2026-07-09','card',0.00,'completed'),(12,1001,6,'2023123456','2026-07-09','fpx',0.00,'completed'),(13,1032,13,'2025617154','2026-07-09','cash',0.00,'completed'),(14,1016,9,'2023123456','2026-07-09','card',0.00,'completed'),(15,1032,12,'2023123456','2026-07-09','E-Wallet',0.00,'completed'),(16,1007,7,'2023123456','2026-07-09','fpx',0.00,'completed'),(17,1042,24,'2025617154','2026-07-10','card',0.00,'completed'),(18,1013,19,'2025617154','2026-07-10','cash',0.00,'completed'),(19,1016,20,'2025617154','2026-07-10','cash',0.00,'completed'),(20,1017,21,'2025617154','2026-07-10','fpx',0.00,'completed'),(21,1033,22,'2025617154','2026-07-10','cash',0.00,'completed'),(22,1041,23,'2025617154','2026-07-10','cash',0.00,'pending'),(23,1001,18,'2025617154','2026-07-10','cash',0.00,'pending'),(24,1017,25,'47284967','2026-07-12','cash',0.00,'pending'),(25,1041,26,'2026782474','2026-07-12','cash',0.00,'pending'),(26,1046,27,'2023123456','2026-07-28','cash',0.00,'pending'),(27,1044,28,'2023123456','2026-07-28','cash',0.00,'pending');
/*!40000 ALTER TABLE `gratuity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `issue_reports`
--

DROP TABLE IF EXISTS `issue_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `issue_reports` (
  `IssueReport_ID` int NOT NULL AUTO_INCREMENT,
  `Organizer_ID` int DEFAULT NULL,
  `Report_Details` text NOT NULL,
  `Report_Date` date DEFAULT (curdate()),
  `Report_Time` time NOT NULL,
  `Admin_ID` int DEFAULT NULL,
  `status` enum('pending','reviewed','resolved') DEFAULT 'pending',
  `response` text,
  `Student_ID` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`IssueReport_ID`),
  KEY `Organizer_ID` (`Organizer_ID`),
  KEY `Admin_ID` (`Admin_ID`),
  KEY `fk_issue_student` (`Student_ID`),
  CONSTRAINT `fk_issue_student` FOREIGN KEY (`Student_ID`) REFERENCES `students` (`Student_ID`),
  CONSTRAINT `issue_reports_ibfk_1` FOREIGN KEY (`Organizer_ID`) REFERENCES `organizers` (`Organizer_ID`),
  CONSTRAINT `issue_reports_ibfk_2` FOREIGN KEY (`Admin_ID`) REFERENCES `admins` (`Admin_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `issue_reports`
--

LOCK TABLES `issue_reports` WRITE;
/*!40000 ALTER TABLE `issue_reports` DISABLE KEYS */;
INSERT INTO `issue_reports` VALUES (1,1,'testing 1 2 3','2026-07-09','01:18:43',1001,'resolved','Resolved by Admin',NULL),(2,NULL,'testing 1 2 3 student','2026-07-09','01:29:42',1001,'resolved','Resolved by Admin','2023123456'),(3,NULL,'good night\n\n--','2026-07-09','01:35:36',1001,'resolved','Resolved by Admin','2023123456'),(4,1,'pagi test','2026-07-10','08:46:10',1001,'resolved','Resolved by Admin',NULL),(5,NULL,'try testing malam','2026-07-11','00:30:31',1001,'resolved','Resolved by Admin','2023123456'),(6,1,'rebooting issue','2026-07-11','00:31:24',1001,'resolved','Resolved by Admin',NULL),(7,NULL,'Fix the issue please, thank you.\n-Bedah-','2026-07-11','00:47:34',1001,'resolved','Resolved by Admin','47284967'),(8,1,'Bedah done.\n-Organizer-','2026-07-11','00:48:34',1001,'resolved','Resolved by Admin',NULL),(9,NULL,'this is me, mikayl. there has been some issue regarding the download button. could you please check it and fix it for me, please? thank you.','2026-07-11','07:58:38',1001,'resolved','Resolved by Admin','2026782474'),(10,1,'testing','2026-07-25','22:48:09',1001,'resolved','Resolved by Admin',NULL),(11,1,'Rebooting issue and debugging.','2026-07-27','06:58:05',1001,'resolved','Resolved by Admin',NULL),(12,1,'Rebooting issue and debugging.','2026-07-27','06:59:25',1001,'resolved','Resolved by Admin',NULL),(13,1,'Date formatting issue.','2026-07-27','07:02:39',1001,'resolved','Resolved by Admin',NULL),(14,NULL,'testing enter button','2026-07-28','15:13:10',1001,'resolved','Resolved by Admin','2023123456'),(15,NULL,'testing enter button','2026-07-28','15:13:28',NULL,'pending',NULL,'2023123456'),(16,NULL,'test','2026-07-28','15:13:48',NULL,'pending',NULL,'2023123456'),(17,NULL,'pdf issue viewer','2026-07-28','17:25:57',1001,'resolved','Resolved by Admin','2023123456'),(18,1,'testing event edit event for organizer, okay','2026-07-28','17:33:48',1001,'resolved','Resolved by Admin',NULL),(19,1,'Testing after FCFS adjustment.','2026-07-29','15:47:46',1001,'resolved','Resolved by Admin',NULL),(20,1,'Testing bug issue report.','2026-07-29','15:47:58',NULL,'pending',NULL,NULL);
/*!40000 ALTER TABLE `issue_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organizers`
--

DROP TABLE IF EXISTS `organizers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizers` (
  `Organizer_ID` int NOT NULL AUTO_INCREMENT,
  `Organizer_Name` varchar(100) NOT NULL,
  `Organizer_DOE` date NOT NULL,
  `Organizer_City` varchar(100) NOT NULL,
  `Organizer_ContactNumber` varchar(15) NOT NULL,
  `is_approved` tinyint(1) DEFAULT '0',
  `Organizer_Email` varchar(100) NOT NULL,
  `Organizer_Password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `Status` enum('pending','approved','rejected') DEFAULT 'pending',
  PRIMARY KEY (`Organizer_ID`),
  UNIQUE KEY `Organizer_Email` (`Organizer_Email`)
) ENGINE=InnoDB AUTO_INCREMENT=3010 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organizers`
--

LOCK TABLES `organizers` WRITE;
/*!40000 ALTER TABLE `organizers` DISABLE KEYS */;
INSERT INTO `organizers` VALUES (1,'Community Service Club','2015-06-15','Shah Alam','0198765432',1,'organizer@userve.com','Org@2024','2026-05-03 19:37:54','pending'),(3001,'UNICEF Malaysia','1954-11-11','Kuala Lumpur','0386877900',1,'kualalumpur@unicef.org','Unicef@123','2026-07-24 06:19:30','pending'),(3002,'WWF Malaysia','1972-01-13','Petaling Jaya','037450 3773',1,'my.esd@wwf.org.my','WWFMalaysia@123','2026-07-25 04:28:56','pending'),(3003,'Volunteerism','2026-07-28','Kuantan','0302024949',1,'volunteerism@userve.com','Volunteerism@123','2026-07-28 03:36:37','pending'),(3004,'SOLS Foundation','2008-03-01','Kuala Lumpur','0182121247',1,'comms@sols.foundation','SOLSOrg@123','2026-07-28 12:03:52','pending'),(3005,'EcoKnights','2005-05-29','Kuala Lumpur','0377318361',1,'info@ecoknights.org.my','EcoK@123','2026-07-28 20:23:29','pending'),(3006,'Mercy Malaysia','1999-09-16','Kuala Lumpur','0322762116',1,'info@mercy.org.my','Mercy@123','2026-07-28 20:25:01','pending'),(3007,'Global Youth Club','2006-04-17','Kuala Lumpur','0333873227',1,'infoglobal@youthclub.org.my','Youth@123','2026-07-28 20:33:42','pending'),(3009,'North Vale Volunteerism','2026-07-29','Shah Alam','032835764',1,'north@org.com','North@123','2026-07-29 01:14:08','pending');
/*!40000 ALTER TABLE `organizers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `Student_ID` varchar(20) NOT NULL,
  `Student_FullName` varchar(100) NOT NULL,
  `Student_DOB` date NOT NULL,
  `Student_ContactNumber` varchar(15) NOT NULL,
  `Student_Email` varchar(100) NOT NULL,
  `Student_Password` varchar(255) NOT NULL,
  `is_approved` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Student_ID`),
  UNIQUE KEY `Student_Email` (`Student_Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES ('2022526287','AININ SOFIA BINTI ROSMI','2003-02-14','01124350233','2022526287@student.uitm.edu.my','Ainin@123',1,'2026-07-28 20:19:35'),('2023123456','Ahmad bin Abu','2000-05-15','01123456789','2023123456@student.uitm.edu.my','Student@123',1,'2026-05-08 19:42:17'),('2023415198','NUR AIDA ADILA BINTI ROSMI','2004-11-02','01173066210','2023415198@student.uitm.edu.my','Adila@123',1,'2026-07-28 20:11:53'),('2023856189','Hazel binti Mahmud','2026-07-03','011-12101499','2023856189@student.uitm.edu.my','Hazel@123',1,'2026-07-09 18:00:44'),('20243163287','Faizal','2026-07-29','01243788940','20243163287@student.uitm.edu.my','MInah@2023',0,'2026-07-29 01:12:56'),('2024526267','Aminah','2026-07-29','0124148940','2024526267@student.uitm.edu.my','MInah@2023',0,'2026-07-29 01:11:31'),('2025123440','Nuha Elnur binti Mahmud','2005-02-22','011-23456789','2025123440@student.uitm.edu.my','Nuha@2025!',1,'2026-06-21 23:42:38'),('2025205724','MUHAMMAD FAIZ MUZAFFAR BIN ROSMI','2007-10-30','01172470159','2025205724@student.uitm.edu.my','Faiz@123',1,'2026-07-28 20:18:15'),('20253163287','Halimah','2026-07-29','01243788940','20253163287@student.uitm.edu.my','MInah@2023',0,'2026-07-29 01:12:23'),('2025546287','Salimah','2026-07-29','01243788940','2025546287@student.uitm.edu.my','MInah@2023',0,'2026-07-29 01:12:03'),('2025617154','Marissa binti Khalid','2004-05-11','01251644318','2025617154@student.uitm.edu.my','Marissa@123',1,'2026-06-08 02:51:18'),('2026782474','Noah Mikayl bin Khamshah','2026-07-12','015-4829649','2026782474@student.uitm.edu.my','Mikayl@123',1,'2026-07-11 23:56:13'),('2026819476','Amni Sofea binti Mahmud','2007-10-16','013-83748219','2026819476@student.uitm.edu.my','Amni@123',1,'2026-07-08 23:30:11'),('47284967','Bedah binti Ramli','2026-07-12','013-92055789','bedah@userve.com','Bedah@123',1,'2026-07-11 16:45:49');
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `volunteer_registrations`
--

DROP TABLE IF EXISTS `volunteer_registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `volunteer_registrations` (
  `Volunteer_ID` int NOT NULL AUTO_INCREMENT,
  `Student_ID` varchar(20) NOT NULL,
  `Student_FullName` varchar(100) NOT NULL,
  `Event_ID` int NOT NULL,
  `Event_Name` varchar(200) NOT NULL,
  `Organizer_ID` int DEFAULT NULL,
  `Event_Date` date NOT NULL,
  `Attendance_Status` enum('pending','present','absent') DEFAULT 'pending',
  `Gratuity_Status` enum('pending','paid','not_eligible') DEFAULT 'pending',
  `registered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Volunteer_ID`),
  KEY `Student_ID` (`Student_ID`),
  KEY `Event_ID` (`Event_ID`),
  KEY `Organizer_ID` (`Organizer_ID`),
  CONSTRAINT `volunteer_registrations_ibfk_1` FOREIGN KEY (`Student_ID`) REFERENCES `students` (`Student_ID`),
  CONSTRAINT `volunteer_registrations_ibfk_2` FOREIGN KEY (`Event_ID`) REFERENCES `events` (`Event_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `volunteer_registrations`
--

LOCK TABLES `volunteer_registrations` WRITE;
/*!40000 ALTER TABLE `volunteer_registrations` DISABLE KEYS */;
INSERT INTO `volunteer_registrations` VALUES (6,'2023123456','Ahmad Faiz Bin Abdullah',1001,'Test Event 01',1,'2026-05-09','present','pending','2026-05-10 15:18:37'),(7,'2023123456','Ahmad Faiz Bin Abdullah',1007,'Staycation',1,'2026-05-11','present','pending','2026-05-10 18:53:12'),(8,'2023123456','Ahmad Faiz Bin Abdullah',1013,'Program Sulam',1,'2026-05-11','present','pending','2026-05-10 18:53:14'),(9,'2023123456','Ahmad Faiz Bin Abdullah',1016,'mencari imposter',1,'2026-05-11','present','pending','2026-05-10 18:53:19'),(10,'2023123456','Ahmad Faiz Bin Abdullah',1033,'amir',1,'2026-05-13','present','pending','2026-05-18 01:31:55'),(11,'2023123456','Ahmad Faiz Bin Abdullah',1017,'siapakah pemenang???',1,'2026-05-11','present','pending','2026-05-18 03:48:16'),(12,'2023123456','Ahmad Faiz Bin Abdullah',1032,' cleaner',1,'2026-04-28','present','pending','2026-05-18 07:01:10'),(13,'2025617154','Marissa binti Khalid',1032,' cleaner',1,'2026-04-28','present','pending','2026-06-08 04:10:43'),(14,'2025617154','Marissa binti Khalid',1007,'Staycation',1,'2026-05-11','present','pending','2026-06-08 04:10:50'),(16,'2023123456','Ahmad Faiz Bin Abdullah',1042,'chatgpt suruh try',1,'2026-07-07','present','pending','2026-07-07 11:03:07'),(17,'2023123456','Ahmad Faiz Bin Abdullah',1041,'Malaysia Wildlife',1,'2026-06-22','present','pending','2026-07-08 23:26:05'),(18,'2025617154','Marissa binti Khalid',1001,'Test Event 01',1,'2026-05-11','present','pending','2026-07-09 16:11:01'),(19,'2025617154','Marissa binti Khalid',1013,'Marine Conservation in Malaysia (Turtles, Dive and Teaching)',1,'2026-06-22','present','pending','2026-07-09 16:11:07'),(20,'2025617154','Marissa binti Khalid',1016,'Volunteer Research Project with Sea Turtles in Malaysia',1,'2026-06-22','present','pending','2026-07-09 16:11:09'),(21,'2025617154','Marissa binti Khalid',1017,'Teach for Malaysia',1,'2026-06-22','present','pending','2026-07-09 16:11:11'),(22,'2025617154','Marissa binti Khalid',1033,'Kennedy-Lugar Youth Exchange Program in Malaysia',1,'2026-06-22','present','pending','2026-07-09 16:11:13'),(23,'2025617154','Marissa binti Khalid',1041,'Malaysia Wildlife',1,'2026-06-22','present','pending','2026-07-09 16:11:15'),(24,'2025617154','Marissa binti Khalid',1042,'chatgpt suruh try',1,'2026-07-07','present','pending','2026-07-09 16:11:18'),(25,'47284967','Bedah binti Ramli',1017,'Teach for Malaysia',1,'2026-06-22','present','pending','2026-07-11 16:46:42'),(26,'2026782474','Noah Mikayl bin Khamshah',1041,'Malaysia Wildlife',1,'2026-06-22','present','pending','2026-07-11 23:57:00'),(27,'2023123456','Ahmad Faiz Bin Abdullah',1046,'masa',1,'2026-07-28','present','pending','2026-07-28 09:24:14'),(28,'2023123456','Ahmad Faiz Bin Abdullah',1044,'Gratuity Approval',1,'2026-07-28','present','pending','2026-07-28 09:24:15'),(29,'2023123456','Ahmad bin Abu',1048,'Create Event Baru',1,'2026-07-29','absent','pending','2026-07-29 06:18:52');
/*!40000 ALTER TABLE `volunteer_registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'deepseek_db'
--

--
-- Dumping routines for database 'deepseek_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-29 16:35:51
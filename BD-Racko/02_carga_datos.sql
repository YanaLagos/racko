CREATE DATABASE  IF NOT EXISTS `racko_bd` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `racko_bd`;
-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: racko_bd
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `auditoria_evento`
--

LOCK TABLES `auditoria_evento` WRITE;
/*!40000 ALTER TABLE `auditoria_evento` DISABLE KEYS */;
INSERT INTO `auditoria_evento` VALUES (1,'CREACION','2026-01-07 22:47:50',1,NULL,NULL,NULL,NULL,2,'audits.assets.locationCreated|nombre=Bodega instrumentos'),(2,'ACTUALIZACION','2026-01-07 22:57:23',1,NULL,NULL,NULL,NULL,2,'audits.assets.locationsUpdate|fields=nombre,descripcion'),(3,'CREACION','2026-01-13 23:08:04',1,'18527720-8',NULL,NULL,NULL,NULL,'audits.externalUsers.created|nombre=Yaney|apellido=Lagos'),(4,'CREACION','2026-01-13 23:14:17',1,'18527720-8',2,1,NULL,NULL,'audits.assets.loanCreated|id_prestamo=1'),(5,'ACTUALIZACION','2026-01-13 23:18:12',1,'18527720-8',2,1,NULL,NULL,'audits.assets.loanReturned|id_prestamo=1'),(6,'CREACION','2026-01-13 23:20:21',1,'18527720-8',2,2,NULL,NULL,'audits.assets.loanCreated|id_prestamo=2'),(7,'ACTUALIZACION','2026-01-13 23:20:44',1,'18527720-8',2,2,NULL,NULL,'audits.assets.observationUpdated|id_prestamo=2'),(8,'ACTUALIZACION','2026-01-13 23:20:44',1,'18527720-8',2,2,NULL,NULL,'audits.assets.loanReturned|id_prestamo=2'),(9,'CREACION','2026-01-13 23:43:18',1,'18527720-8',2,3,NULL,NULL,'audits.assets.loanCreated|id_prestamo=3'),(10,'CREACION','2026-01-15 15:09:07',1,'10184084-0',NULL,NULL,NULL,NULL,'audits.externalUsers.created|nombre=Arlini|apellido=Valenzuela'),(11,'CREACION','2026-01-15 21:03:01',1,NULL,NULL,NULL,NULL,NULL,'success.ok.internalUserCreated|id_usuario_creado=2|email=mari@correo.com|username=mariafuenzalida|rol=Colaborador'),(12,'CREACION','2026-01-16 01:37:08',1,NULL,NULL,NULL,3,NULL,'audits.assets.categoryCreated|nombre=Bajos'),(13,'CREACION','2026-01-19 14:17:46',1,NULL,NULL,NULL,NULL,NULL,'audits.internalUsers.created|id_usuario_creado=3|email=yanalagos@gmail.com|username=yanalagos|rol=Colaborador'),(14,'CREACION','2026-01-19 16:41:07',1,NULL,NULL,NULL,4,NULL,'audits.assets.categoryCreated|nombre=Flautas'),(15,'CREACION','2026-01-19 17:54:06',1,NULL,3,NULL,NULL,NULL,'audits.assets.resourceCreated|nombre=Violín'),(16,'CREACION','2026-01-19 18:49:09',1,NULL,4,NULL,NULL,NULL,'audits.assets.resourceCreated|nombre=Flauta01'),(17,'CREACION','2026-01-19 18:49:09',1,NULL,5,NULL,NULL,NULL,'audits.assets.resourceCreated|nombre=Flauta02'),(18,'CREACION','2026-01-19 18:49:09',1,NULL,6,NULL,NULL,NULL,'audits.assets.resourceCreated|nombre=Flauta03'),(19,'CREACION','2026-01-19 18:49:09',1,NULL,7,NULL,NULL,NULL,'audits.assets.resourceCreated|nombre=Flauta04'),(20,'CREACION','2026-01-19 18:49:09',1,NULL,8,NULL,NULL,NULL,'audits.assets.resourceCreated|nombre=Flauta05'),(21,'CREACION','2026-01-19 19:07:20',1,'18532861-9',NULL,NULL,NULL,NULL,'audits.externalUsers.created|nombre=Axl|apellido=Provoste'),(22,'CREACION','2026-01-19 19:13:35',1,'18532861-9',4,4,NULL,NULL,'audits.assets.loanCreated|id_prestamo=4');
/*!40000 ALTER TABLE `auditoria_evento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `categoria`
--

LOCK TABLES `categoria` WRITE;
/*!40000 ALTER TABLE `categoria` DISABLE KEYS */;
INSERT INTO `categoria` VALUES (1,'Guitarras','Guitarras acústicas y eléctricas',1,1,NULL),(2,'Violines','Violines para estudiantes',1,1,NULL),(3,'Bajos','Bajos eléctricos de 4 y 5 cuerdas',1,1,NULL),(4,'Flautas','Flautas para prestar a estudiantes',1,1,NULL);
/*!40000 ALTER TABLE `categoria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `recurso_fisico`
--

LOCK TABLES `recurso_fisico` WRITE;
/*!40000 ALTER TABLE `recurso_fisico` DISABLE KEYS */;
INSERT INTO `recurso_fisico` VALUES (2,'Violín_01',2,'Violín para estudiantes',0,1,1,3,NULL),(3,'Violín',2,'Violín Cremona para uso de estudiantes',1,1,3,0,NULL),(4,'Flauta01',4,'Flautas dulces tipo soprano',0,1,2,1,NULL),(5,'Flauta02',4,'Flautas dulces tipo soprano',1,1,2,0,NULL),(6,'Flauta03',4,'Flautas dulces tipo soprano',1,1,2,0,NULL),(7,'Flauta04',4,'Flautas dulces tipo soprano',1,1,2,0,NULL),(8,'Flauta05',4,'Flautas dulces tipo soprano',1,1,2,0,NULL);
/*!40000 ALTER TABLE `recurso_fisico` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `registro_prestamo`
--

LOCK TABLES `registro_prestamo` WRITE;
/*!40000 ALTER TABLE `registro_prestamo` DISABLE KEYS */;
INSERT INTO `registro_prestamo` VALUES (1,'18527720-8',2,1,'2026-01-13 23:14:17','2026-01-13 23:18:12',NULL,'Préstamo de prueba'),(2,'18527720-8',2,1,'2026-01-13 23:20:21','2026-01-13 23:20:44',NULL,'Préstamo de prueba 2. Devolución de prueba.'),(3,'18527720-8',2,1,'2026-01-13 23:43:18',NULL,'2026-01-17 00:00:00',NULL),(4,'18532861-9',4,1,'2026-01-19 19:13:35',NULL,'2026-01-20 00:00:00','Préstamo de prueba');
/*!40000 ALTER TABLE `registro_prestamo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `rol`
--

LOCK TABLES `rol` WRITE;
/*!40000 ALTER TABLE `rol` DISABLE KEYS */;
INSERT INTO `rol` VALUES (1,'Administrador',NULL),(2,'Colaborador',NULL);
/*!40000 ALTER TABLE `rol` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `ubicacion`
--

LOCK TABLES `ubicacion` WRITE;
/*!40000 ALTER TABLE `ubicacion` DISABLE KEYS */;
INSERT INTO `ubicacion` VALUES (1,'Sala multiuso','Sala destinada a actividades múltiples, ensayos y talleres',1,NULL),(2,'Salas de ensayo','Salas disponibles para ensayos',1,NULL),(3,'Bodega instrumentos','Bodega para almacenamiento de instrumentos',1,NULL),(4,'Sala primer piso','Sala ubicada en el primer piso',1,NULL);
/*!40000 ALTER TABLE `ubicacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `usuario_externo`
--

LOCK TABLES `usuario_externo` WRITE;
/*!40000 ALTER TABLE `usuario_externo` DISABLE KEYS */;
INSERT INTO `usuario_externo` VALUES ('10184084-0','Arlini','Valenzuela','978965655','arliniv@gmail.com','Calle principal, 1569, Comuna',1,10.0,1,NULL),('18527720-8','Yaney','Lagos','979232086','yanalagos@gmail.com',NULL,1,10.0,1,NULL),('18532861-9','Axl','Provoste','+5698996352','axlp@correo.com',NULL,1,10.0,1,NULL);
/*!40000 ALTER TABLE `usuario_externo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `usuario_interno`
--

LOCK TABLES `usuario_interno` WRITE;
/*!40000 ALTER TABLE `usuario_interno` DISABLE KEYS */;
INSERT INTO `usuario_interno` VALUES (1,'Admin','Sistema','admin','gestionracko@gmail.com','$2b$10$do0tTqZUKdvX1YsVZsCJSOY1foVmkXs47AwzoNuu1vz27.bF668p.',1,1,NULL,NULL,'es',NULL),(2,'María','Fuenzalida','mariafuenzalida','mari@correo.com','$2b$10$Xs1gtnUfbxx8Dqr2muhBI.Xybkysp2hh4K6bBEr0enO.jrnAZmW.K',2,1,'1734ca5dbcc7549b429d72738c4075c524dbd8f97f68fede5003a6f07bc73f56','2026-01-15 22:03:01','es',NULL),(3,'Yana','Lagos','yanalagos','yanalagos@gmail.com','$2b$10$zI5yWT0IuOexQBOqjO1s0.jcNVpP3564PaVMKYuaPw3Phai1Aryly',2,1,NULL,NULL,'es',NULL);
/*!40000 ALTER TABLE `usuario_interno` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-19 23:32:12

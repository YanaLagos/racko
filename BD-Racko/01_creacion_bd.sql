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
-- Table structure for table `rol`
--

DROP TABLE IF EXISTS `rol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rol` (
  `id_rol` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuario_interno`
--

DROP TABLE IF EXISTS `usuario_interno`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario_interno` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `id_rol` int NOT NULL,
  `estado` tinyint(1) NOT NULL DEFAULT '1',
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_expiracion` datetime DEFAULT NULL,
  `idioma` varchar(2) DEFAULT 'es',
  `fecha_desactivacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_usuario_interno_rol` (`id_rol`),
  CONSTRAINT `fk_usuario_interno_rol` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

--
-- Table structure for table `usuario_externo`
--

DROP TABLE IF EXISTS `usuario_externo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario_externo` (
  `rut` varchar(12) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `telefono` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  `registrado_por` int NOT NULL,
  `reputacion` decimal(3,1) DEFAULT '10.0',
  `estado` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_desactivacion` datetime DEFAULT NULL,
  PRIMARY KEY (`rut`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_externo_registrado_por` (`registrado_por`),
  CONSTRAINT `fk_externo_registrado_por` FOREIGN KEY (`registrado_por`) REFERENCES `usuario_interno` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categoria`
--

DROP TABLE IF EXISTS `categoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categoria` (
  `id_categoria` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  `estado` tinyint(1) NOT NULL DEFAULT '1',
  `creado_por` int NOT NULL,
  `fecha_desactivacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_categoria`),
  KEY `fk_categoria_usuario_interno` (`creado_por`),
  CONSTRAINT `fk_categoria_usuario_interno` FOREIGN KEY (`creado_por`) REFERENCES `usuario_interno` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ubicacion`
--

DROP TABLE IF EXISTS `ubicacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ubicacion` (
  `id_ubicacion` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(100) DEFAULT NULL,
  `estado` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_desactivacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_ubicacion`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recurso_fisico`
--

DROP TABLE IF EXISTS `recurso_fisico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recurso_fisico` (
  `id_recurso` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `id_categoria` int NOT NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  `disponible` tinyint(1) NOT NULL DEFAULT '1',
  `estado` tinyint(1) NOT NULL DEFAULT '1',
  `id_ubicacion` int NOT NULL,
  `uso_acumulado` int NOT NULL DEFAULT '0',
  `fecha_desactivacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_recurso`),
  KEY `fk_recurso_fisico_categoria` (`id_categoria`),
  KEY `fk_recurso_fisico_ubicacion` (`id_ubicacion`),
  CONSTRAINT `fk_recurso_fisico_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categoria` (`id_categoria`),
  CONSTRAINT `fk_recurso_fisico_ubicacion` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion` (`id_ubicacion`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `registro_prestamo`
--

DROP TABLE IF EXISTS `registro_prestamo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registro_prestamo` (
  `id_prestamo` int NOT NULL AUTO_INCREMENT,
  `rut_usuario` varchar(12) NOT NULL,
  `id_recurso` int NOT NULL,
  `id_usuario_interno` int NOT NULL,
  `fecha_prestamo` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_devolucion` datetime DEFAULT NULL,
  `fecha_vencimiento` datetime DEFAULT NULL,
  `observaciones` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id_prestamo`),
  KEY `fk_prestamo_recurso_fisico` (`id_recurso`),
  KEY `fk_prestamo_usuario_interno` (`id_usuario_interno`),
  KEY `idx_prestamo_rut_fecha` (`rut_usuario`,`fecha_prestamo`),
  CONSTRAINT `fk_prestamo_recurso_fisico` FOREIGN KEY (`id_recurso`) REFERENCES `recurso_fisico` (`id_recurso`),
  CONSTRAINT `fk_prestamo_usuario_externo` FOREIGN KEY (`rut_usuario`) REFERENCES `usuario_externo` (`rut`),
  CONSTRAINT `fk_prestamo_usuario_interno` FOREIGN KEY (`id_usuario_interno`) REFERENCES `usuario_interno` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auditoria_evento`
--
DROP TABLE IF EXISTS `auditoria_evento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditoria_evento` (
  `id_evento` int NOT NULL AUTO_INCREMENT,
  `tipo_evento` enum('CREACION','ACTUALIZACION','DESACTIVACION') NOT NULL,
  `fecha_hora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id_usuario_interno` int DEFAULT NULL,
  `rut_usuario_externo` varchar(12) DEFAULT NULL,
  `id_recurso` int DEFAULT NULL,
  `id_registro_prestamo` int DEFAULT NULL,
  `id_categoria` int DEFAULT NULL,
  `id_ubicacion` int DEFAULT NULL,
  `detalle` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_evento`),
  KEY `fk_auditoria_usuario_interno` (`id_usuario_interno`),
  KEY `fk_auditoria_usuario_externo` (`rut_usuario_externo`),
  KEY `fk_auditoria_recurso` (`id_recurso`),
  KEY `fk_auditoria_registro_prestamo` (`id_registro_prestamo`),
  KEY `fk_auditoria_categoria` (`id_categoria`),
  KEY `fk_auditoria_ubicacion` (`id_ubicacion`),
  CONSTRAINT `fk_auditoria_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categoria` (`id_categoria`),
  CONSTRAINT `fk_auditoria_recurso` FOREIGN KEY (`id_recurso`) REFERENCES `recurso_fisico` (`id_recurso`),
  CONSTRAINT `fk_auditoria_registro_prestamo` FOREIGN KEY (`id_registro_prestamo`) REFERENCES `registro_prestamo` (`id_prestamo`),
  CONSTRAINT `fk_auditoria_ubicacion` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion` (`id_ubicacion`),
  CONSTRAINT `fk_auditoria_usuario_externo` FOREIGN KEY (`rut_usuario_externo`) REFERENCES `usuario_externo` (`rut`),
  CONSTRAINT `fk_auditoria_usuario_interno` FOREIGN KEY (`id_usuario_interno`) REFERENCES `usuario_interno` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;










/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-19 23:31:27

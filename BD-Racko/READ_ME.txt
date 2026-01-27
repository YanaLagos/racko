BASE DE DATOS - RACKO

La base de datos racko_bd corresponde a un sistema relacional para la gestión de recursos físicos y control de préstamos. 
Sus tablas principales son:
• rol 
• usuario_interno (usuarios del sistema), 
• usuario_externo (solicitantes), 
• categoria, 
• ubicación, 
• recurso_fisico (inventario), 
• registro_prestamo (gestión de préstamos), 
• auditoria_evento (trazabilidad de acciones). 

Las relaciones se implementan mediante claves foráneas, destacando la asociación de préstamos con usuario externo, recurso y usuario interno, y la auditoría vinculada al usuario interno y, según el caso, a la entidad afectada. 

--------------------------------
Para ejecutar, correr primero:
1) --> 01_creacion_bd.sql 
y luego 
2) --> 02_carga_datos.sql 

Deben correrse en MySQL Workbench u otro cliente compatible, utilizando el schema racko_bd.
--------------------------------
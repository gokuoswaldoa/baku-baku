# Cierre de encuesta — pendiente de autorización remota

La encuesta finalizó con 16 respuestas. Se preservan sin normalizar, regenerar ni reemplazar teléfonos, códigos, beneficios, respuestas y estados. El beneficio publicado es $40 MXN de descuento en la primera compra mayor a $180 MXN. La integración de cupones al carrito corresponde a otra fase.

## Respaldo privado

scripts/backup-survey.ps1 exporta esquema y datos de public, solo si la única tabla pública es leads y hay 16 registros. Captura un resumen de integridad antes y después y aborta si cambian los datos. El respaldo contiene esquema, políticas, índices, restricciones, privilegios y todos los registros. La exportación incluye teléfonos y códigos únicamente dentro de archivos privados, nunca en salidas de terminal.

La carpeta está fuera del repositorio y de OneDrive, bajo LOCALAPPDATA/BAKU-BAKU/private-backups. Su ACL permite acceso al usuario de Windows y SYSTEM. El ZIP con SQL y metadatos se cifra mediante DPAPI CurrentUser. Se verifica descifrado y hash SHA-256 antes de eliminar los intermediarios SQL sin cifrar. El manifest privado identifica el número de registros, hashes y resultado de restauración. Los intentos incompletos se distinguen por restore_verified=false.

El script comprueba la restauración en PostgreSQL 17 dentro de un contenedor desechable sin red, puertos publicados ni volumen persistente. Compara todos los campos de los 16 registros mediante un hash y también los metadatos del esquema, restricciones, índices, permisos y políticas. Después destruye únicamente ese contenedor.

DPAPI requiere el perfil original de Windows y sus claves para recuperar el archivo. Antes de cambios remotos conviene conservar una segunda copia del archivo cifrado y su manifest en almacenamiento privado y garantizar recuperación del perfil. Para recuperar en otro equipo, el propietario deberá descifrar y volver a cifrar bajo un mecanismo portable acordado fuera del chat.

Para revisión/repetición local:
~~~powershell
./scripts/backup-survey.ps1
./scripts/test-survey-closure.ps1 -BackupFolder 'RUTA_PRIVADA_VERIFICADA'
~~~

El ZIP descifrado contiene schema.sql, data.sql y metadata.json. Una recuperación real exige el perfil original, descifrar con ProtectedData.Unprotect en el entorno privado y aplicar esos archivos únicamente a una base de recuperación vacía. La prueba local demuestra ese procedimiento sin sobrescribir la base original. Restaurar políticas antiguas recuperaría también el acceso público inseguro; cualquier reversión de permisos requiere revisión independiente.

## Migración preparada

202611060005_close_survey.sql depende de las cuatro migraciones anteriores. Su precondición exige exactamente 16 registros y las tres políticas inseguras conocidas. Ante otra estructura de políticas, aborta para revisión en vez de eliminar políticas desconocidas.

Dentro de una transacción bloquea escrituras concurrentes, elimina solo las tres políticas públicas identificadas y revoca privilegios de tabla y columna a PUBLIC, anon y authenticated, incluido TRUNCATE. RLS permanece habilitado. Después concede lectura y actualización exclusivamente de status al rol authenticated, sujetas a private.is_admin(), que exige administrador activo y MFA aal2. El propietario de la base y el rol de servidor conservan su acceso de confianza. No se ofrece inscripción pública ni política de recepción de encuesta.

La migración calcula y compara el hash de los registros antes y después, abortando si cambia cualquier dato. No contiene UPDATE, INSERT ni DELETE sobre leads. No crea códigos ni cambia estados de canje.

## Pruebas preparadas

supabase/tests/survey_closed.sql comprueba 16 filas intactas, RLS activo, ausencia de políticas públicas y denegación anónima de SELECT, INSERT, UPDATE y DELETE. Comprueba que un usuario sin autorización y un administrador sin MFA no ven registros; un administrador con MFA puede leerlos y gestionar el estado, pero carece de privilegios de cliente para modificar teléfonos o códigos.

scripts/test-survey-closure.ps1 restaura el respaldo cifrado en otro contenedor local aislado, crea stand-ins mínimos de Auth, aplica allí las cinco migraciones y ejecuta las pruebas de pedidos y cierre. Compara de nuevo los 16 registros completos y guarda resultados solo en la carpeta privada. Los stand-ins no sustituyen las pruebas futuras con JWT reales de Supabase.

## Antes de autorizar cambios remotos

Revisar el manifest y el resultado privado de las pruebas. Verificar las dos copias del respaldo y la recuperación de claves DPAPI. Volver a confirmar que el conjunto de datos y políticas remotos coincide con el respaldado. Revisar las cinco migraciones y autorizar explícitamente su aplicación. Preparar después la cuenta administrativa con MFA mediante el entorno de confianza.

Mientras no se aplique la migración de cierre, las políticas públicas antiguas siguen activas. No se ejecutaron migraciones remotas ni se publicó ninguna función en esta fase.

## Resultado de la verificación local

Se confirmó un respaldo de 16 registros, cifrado y restaurado en PostgreSQL 17. Coincidieron el hash de todos los campos y la huella del esquema, restricciones, índices, privilegios y políticas. Las cinco migraciones y las pruebas SQL de pedidos y de cierre pasaron en otra restauración local desechable. El hash de los 16 registros se mantuvo intacto. El manifest y closure-test-result.json de la carpeta privada contienen las comprobaciones y hashes concretos; no se copian al repositorio.

La comparación inicial de metadatos se corrigió para usar serialización canónica de PostgreSQL, evitando diferencias de orden de claves JSON. La espera de arranque del contenedor también distingue el servidor temporal de inicialización del servidor final. Los intentos anteriores que no completaron la verificación conservan restore_verified=false y no deben seleccionarse como respaldo revisado.

## Segunda copia portable

scripts/portable-survey-backup.mjs prepara y verifica una copia AES-256-GCM del mismo ZIP, con nonce aleatorio, etiqueta de autenticación y clave aleatoria de 256 bits. El archivo cifrado y el manifest se guardan en la carpeta privada portable; el archivo binario de recuperación se guarda separado, bajo LOCALAPPDATA/BAKU-BAKU/recovery-keys, con ACL privada. No utiliza contraseñas en argumentos ni imprime claves.

La recuperación necesita el archivo cifrado, su manifest y el archivo de recuperación. No requiere DPAPI ni el perfil de Windows original. El helper usa solo módulos nativos de Node y permite verificar o extraer un ZIP a una ubicación privada fuera de un repositorio. Nunca sobrescribe archivos de destino existentes. Conservar una copia offline del material de recuperación separado del archivo cifrado; ambos están actualmente en directorios distintos de este mismo equipo.

El modo portable de la prueba local descifra con Node y el archivo de recuperación, omitiendo DPAPI:
~~~powershell
./scripts/test-survey-closure.ps1 -BackupFolder 'RUTA_PRIVADA_VERIFICADA' -Portable -RecoveryKeyFile 'RUTA_PRIVADA_DEL_ARCHIVO_DE_RECUPERACION'
~~~

El resultado queda en portable-closure-test-result.json dentro de la carpeta privada. Las pruebas incluyen denegación de lectura, inserción, actualización y eliminación a usuarios authenticated sin autorización, además de anon. Los permisos de lectura y actualización de status para authenticated requieren administrador activo y MFA; no se concede acceso general a usuarios registrados.

Comandos portables para una recuperación privada con Node, incluso sin DPAPI:
~~~text
node scripts/portable-survey-backup.mjs verify ARCHIVO_CIFRADO ARCHIVO_RECUPERACION MANIFEST_PORTABLE
node scripts/portable-survey-backup.mjs decrypt ARCHIVO_CIFRADO DESTINO_ZIP_PRIVADO ARCHIVO_RECUPERACION MANIFEST_PORTABLE
~~~
No pasar la clave como texto; los argumentos señalan archivos privados. El destino debe ser nuevo y estar fuera de Git. El ZIP contiene datos personales y debe mantenerse bajo protección y eliminarse de forma controlada cuando termine una recuperación autorizada.

La copia portable se restauró en PostgreSQL local sin usar DPAPI. Coincidieron los hashes del ZIP y de los 16 registros completos; las cinco migraciones y las pruebas ampliadas de anon/authenticated pasaron. La consulta remota posterior también coincidió con la huella del respaldo revisado. No se aplicaron cambios en Supabase.

Antes de ejecutar remotamente, volver a comparar la huella completa de leads con el manifest revisado. La migración verifica que la transacción no cambie los datos, pero no lleva una huella privada del respaldo incrustada en el repositorio. Si hay diferencias o un nuevo registro, detenerse y actualizar la revisión y el respaldo sin excluir registros automáticamente.

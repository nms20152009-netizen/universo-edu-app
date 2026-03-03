#!/bin/bash

################################################################################
# Script de Respaldo de Base de Datos - UNIVERSO EDU
# Crea respaldos diarios de la base de datos SQLite
# Uso: ./backup-database.sh
################################################################################

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
BACKUP_DIR="/backups/universo-edu"
DB_FILE="/home/ubuntu/db/custom.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/custom_$DATE.db"
RETENTION_DAYS=30
LOG_FILE="/var/log/universo-edu-backup.log"

# Crear directorio de respaldos si no existe
mkdir -p "$BACKUP_DIR"

# Función de logging
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Función de error
error_exit() {
    echo -e "${RED}❌ Error: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Función de éxito
success_message() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

# Función de advertencia
warning_message() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

################################################################################
# Validaciones
################################################################################

log_message "Iniciando respaldo de base de datos..."

# Verificar que la BD existe
if [ ! -f "$DB_FILE" ]; then
    error_exit "Archivo de base de datos no encontrado: $DB_FILE"
fi

# Verificar permisos de lectura
if [ ! -r "$DB_FILE" ]; then
    error_exit "No hay permisos de lectura para: $DB_FILE"
fi

# Verificar permisos de escritura en directorio de respaldos
if [ ! -w "$BACKUP_DIR" ]; then
    error_exit "No hay permisos de escritura en: $BACKUP_DIR"
fi

################################################################################
# Crear Respaldo
################################################################################

log_message "Creando respaldo de base de datos..."

# Copiar archivo de BD
if cp "$DB_FILE" "$BACKUP_FILE"; then
    success_message "Archivo copiado: $BACKUP_FILE"
else
    error_exit "Fallo al copiar archivo de base de datos"
fi

# Obtener tamaño del respaldo
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_message "Tamaño del respaldo: $BACKUP_SIZE"

################################################################################
# Comprimir Respaldo
################################################################################

log_message "Comprimiendo respaldo..."

if gzip "$BACKUP_FILE"; then
    success_message "Respaldo comprimido: ${BACKUP_FILE}.gz"
else
    error_exit "Fallo al comprimir respaldo"
fi

# Obtener tamaño comprimido
COMPRESSED_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
log_message "Tamaño comprimido: $COMPRESSED_SIZE"

################################################################################
# Limpiar Respaldos Antiguos
################################################################################

log_message "Limpiando respaldos antiguos (más de $RETENTION_DAYS días)..."

OLD_BACKUPS=$(find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS)

if [ -z "$OLD_BACKUPS" ]; then
    log_message "No hay respaldos antiguos para eliminar"
else
    COUNT=$(echo "$OLD_BACKUPS" | wc -l)
    log_message "Encontrados $COUNT respaldos antiguos"
    
    echo "$OLD_BACKUPS" | while read -r file; do
        if rm "$file"; then
            log_message "Eliminado: $file"
        else
            warning_message "No se pudo eliminar: $file"
        fi
    done
fi

################################################################################
# Estadísticas
################################################################################

log_message "Estadísticas de respaldos:"

TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "*.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log_message "  - Total de respaldos: $TOTAL_BACKUPS"
log_message "  - Tamaño total: $TOTAL_SIZE"
log_message "  - Directorio: $BACKUP_DIR"

################################################################################
# Verificación de Integridad
################################################################################

log_message "Verificando integridad del respaldo..."

if gzip -t "${BACKUP_FILE}.gz" 2>/dev/null; then
    success_message "Integridad del respaldo verificada"
else
    error_exit "Fallo en la verificación de integridad del respaldo"
fi

################################################################################
# Resumen Final
################################################################################

success_message "Respaldo completado exitosamente"
log_message "Archivo: ${BACKUP_FILE}.gz"
log_message "Tamaño: $COMPRESSED_SIZE"
log_message "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
log_message "---"

exit 0

#!/bin/bash
# Timezone Helper - Conversão UTC ↔ BRT
# Created: 2026-02-12
# Usage: source /scripts/slack/timezone-helper.sh

TIMEZONE="America/Sao_Paulo"

# Função: Converter UTC para BRT
# Usage: utc_to_brt "2026-02-12 00:30:00"
utc_to_brt() {
    local utc_time="$1"
    TZ=$TIMEZONE date -d "$utc_time UTC" +'%Y-%m-%d %H:%M:%S BRT'
}

# Função: Converter BRT para UTC
# Usage: brt_to_utc "2026-02-11 21:30:00"
brt_to_utc() {
    local brt_time="$1"
    TZ=UTC date -d "TZ=\"$TIMEZONE\" $brt_time" +'%Y-%m-%d %H:%M:%S UTC'
}

# Função: Horário atual BRT
now_brt() {
    TZ=$TIMEZONE date +'%Y-%m-%d %H:%M:%S BRT'
}

# Função: Horário atual UTC
now_utc() {
    date -u +'%Y-%m-%d %H:%M:%S UTC'
}

# Função: Data atual BRT (formatada)
today_brt() {
    TZ=$TIMEZONE date +'%d/%m/%Y'
}

# Exemplos de uso
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    echo "🕐 Timezone Helper - Exemplos:"
    echo ""
    echo "Agora (BRT): $(now_brt)"
    echo "Agora (UTC): $(now_utc)"
    echo "Hoje: $(today_brt)"
    echo ""
    echo "Conversões:"
    echo "  UTC 00:30 → BRT: $(utc_to_brt '2026-02-12 00:30:00')"
    echo "  BRT 21:30 → UTC: $(brt_to_utc '2026-02-11 21:30:00')"
fi

# Exportar funções
export -f utc_to_brt
export -f brt_to_utc
export -f now_brt
export -f now_utc
export -f today_brt

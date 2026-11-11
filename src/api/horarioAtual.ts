export function obterHorarioAtual() {
    const agora = new Date();

    const horas = agora.getHours().toString().padStart(2, "0");
    const minutos = agora.getMinutes().toString().padStart(2, "0");

    const horarioFormatado = `${horas}:${minutos}`;
    const isoString = agora.toISOString();

    return {
        horarioFormatado,
        isoString,
        timestamp: agora.getTime(),
    };
}

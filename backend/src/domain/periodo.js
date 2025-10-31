export function validarPeriodo(checkin, checkout) {
    const start = new Date(checkin);
    const end = new Date(checkout);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Intervalo de datas inválido");
    }
    if (start >= end) {
        throw new Error("Intervalo de datas inválido");
    }

    // Normaliza para meia-noite para cálculo de noites
    const startMid = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate(),
        0, 0, 0, 0
    );
    const endMid = new Date(
        end.getFullYear(),
        end.getMonth(),
        end.getDate(),
        0, 0, 0, 0
    );

    return { start, end, startMid, endMid };
}


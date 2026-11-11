export function obterLocalizacaoUsuario(): Promise<{
    latitude: number;
    longitude: number;
}> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(
                new Error("Geolocalização não é suportada pelo seu navegador."),
            );
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                resolve({ latitude, longitude });
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        reject(
                            new Error(
                                "Usuário negou a solicitação de Geolocalização.",
                            ),
                        );
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(
                            new Error(
                                "Informações de localização indisponíveis.",
                            ),
                        );
                        break;
                    case error.TIMEOUT:
                        reject(
                            new Error(
                                "A requisição expirou ao tentar obter a localização.",
                            ),
                        );
                        break;
                    default:
                        reject(
                            new Error(
                                "Ocorreu um erro desconhecido ao obter a localização.",
                            ),
                        );
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            },
        );
    });
}

type Sound = 'selection' | 'rangement' | 'carton-ferme' | 'victoire';

const sounds = new Map<Sound, Promise<HTMLAudioElement>>();

async function loadSound(name: Sound): Promise<HTMLAudioElement> {
    const audio = new Audio();
    const extension = audio.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'mp3';
    const url = new URL(`${import.meta.env.BASE_URL}sons/${name}.${extension}`, document.baseURI);
    // Le fichier entier peut être mis en cache, même si le lecteur demande des plages d’octets.
    const response = await fetch(url);
    if (!response.ok) throw new Error('Son indisponible');
    audio.src = URL.createObjectURL(await response.blob());
    return audio;
}

export async function playSound(name: Sound, enabled: () => boolean): Promise<void> {
    if (!enabled()) return;
    let pending = sounds.get(name);
    if (!pending) {
        pending = loadSound(name).catch((error: unknown) => {
            sounds.delete(name);
            throw error;
        });
        sounds.set(name, pending);
    }
    try {
        const audio = await pending;
        if (!enabled()) return;
        audio.currentTime = 0;
        await audio.play();
    } catch {
        // Un fichier indisponible ou une lecture refusée laisse la partie continuer.
    }
}

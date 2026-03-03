import React, { useState } from 'react';

export function useAudioPlayer() {
  const [playingAudio, setPlayingAudio] = useState<HTMLAudioElement | null>(null);
  const [playingVerse, setPlayingVerse] = useState<string | null>(null);

  const handlePreviewClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Check for .quran-verse or its children
    const quranBlock = target.closest('.quran-verse') as HTMLElement;
    
    if (quranBlock) {
      // Prevent clicking the link from triggering audio if user wants to go to Quran.com
      if (target.tagName === 'A') return;

      const surah = quranBlock.dataset.surah;
      const ayah = quranBlock.dataset.ayah;
      
      if (!surah || !ayah) return;

      const verseKey = `${surah}:${ayah}`;

      if (playingVerse === verseKey && playingAudio) {
        playingAudio.pause();
        setPlayingAudio(null);
        setPlayingVerse(null);
        return;
      }

      if (playingAudio) {
        playingAudio.pause();
      }

      try {
        // Fetch audio URL from Quran.com API (Mishary Rashid Alafasy)
        const res = await fetch(`https://api.quran.com/api/v4/recitations/7/by_ayah/${verseKey}`);
        const data = await res.json();
        const audioUrl = data.audio_files[0]?.url;

        if (audioUrl) {
          const audio = new Audio(audioUrl.startsWith('http') ? audioUrl : `https://verses.quran.com/${audioUrl}`);
          audio.play();
          setPlayingAudio(audio);
          setPlayingVerse(verseKey);
          audio.onended = () => {
            setPlayingAudio(null);
            setPlayingVerse(null);
          };
        }
      } catch (err) {
        console.error('Failed to play audio', err);
        alert('تعذر تشغيل الصوت من المصدر');
      }
    }
  };

  return { handlePreviewClick, playingVerse };
}

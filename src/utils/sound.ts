// Sound utility for interactive UI feedback

class SoundManager {
  private audioContext: AudioContext | null = null;
  private lastPlayTime = 0;
  private isInitialized = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
    } catch {
      // AudioContext creation might fail in restricted environments
    }
    return this.audioContext;
  }

  // Synthesize a crisp, subtle modern UI tap via Web Audio API
  private playSynthesizedClick() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      const now = ctx.currentTime;
      osc.type = 'sine';
      
      // Pitch drop: 850Hz down to 220Hz over 45ms for a satisfying tactile feel
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.045);

      // Amplitude envelope
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.22, now + 0.003); // rapid attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.045); // decay

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  public play() {
    const now = Date.now();
    // Prevent overlapping spam if clicked multiple times in under 35ms
    if (now - this.lastPlayTime < 35) return;
    this.lastPlayTime = now;

    // Schedule synthesis asynchronously so click handler and visual paint (INP) are never delayed
    window.setTimeout(() => {
      this.playSynthesizedClick();
    }, 0);
  }

  public setupGlobalListener() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Listen to pointerdown with passive flag to unlock AudioContext without blocking scroll/touch
    const unlockAudio = () => {
      window.setTimeout(() => {
        this.getAudioContext();
      }, 0);
    };
    window.addEventListener('pointerdown', unlockAudio, { capture: true, once: true, passive: true });
    window.addEventListener('touchstart', unlockAudio, { capture: true, once: true, passive: true });

    // Capture phase listener with passive flag to trigger sound without blocking interaction paint
    document.addEventListener(
      'click',
      (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        // Check if the clicked element or any of its ancestors is a button or clickable interactive element
        const clickable = target.closest<HTMLElement>(
          'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]'
        );

        if (!clickable) return;

        // Skip if explicitly marked with data-no-sound or disabled
        if (
          clickable.hasAttribute('disabled') ||
          clickable.getAttribute('aria-disabled') === 'true' ||
          clickable.classList.contains('pointer-events-none') ||
          clickable.getAttribute('data-no-sound') === 'true'
        ) {
          return;
        }

        this.play();
      },
      { capture: true, passive: true }
    );
  }
}

export const soundManager = new SoundManager();

export const playClickSound = () => {
  soundManager.play();
};

export const initButtonSoundEffect = () => {
  soundManager.setupGlobalListener();
};

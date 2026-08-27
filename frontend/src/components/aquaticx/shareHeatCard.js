// Capture a DOM element as a PNG and share it via the best available channel.
// - Mobile (Web Share API with file support): opens the native share sheet so the
//   user can pick WhatsApp (or any other app) and send the image directly.
// - Desktop / unsupported: downloads the PNG and opens WhatsApp Web with a
//   prefilled text message so the user can attach the saved image manually.

import { toPng } from 'html-to-image';

/**
 * Wait until all <img> descendants of `el` have finished loading (or errored).
 * Prevents html-to-image from capturing before the bg image is painted.
 */
const waitForImages = (el) => {
    if (!el) return Promise.resolve();
    const imgs = Array.from(el.querySelectorAll('img'));
    const promises = imgs.map((img) =>
        img.complete && img.naturalWidth > 0
            ? Promise.resolve()
            : new Promise((res) => {
                img.addEventListener('load', res, { once: true });
                img.addEventListener('error', res, { once: true });
            })
    );
    // Also wait a tick for fonts, if supported.
    if (document.fonts && document.fonts.ready) promises.push(document.fonts.ready);
    return Promise.all(promises);
};

const dataUrlToBlob = async (dataUrl) => {
    const res = await fetch(dataUrl);
    return res.blob();
};

const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Capture `element` as PNG and share it.
 * @param {HTMLElement} element - DOM node to screenshot (the heat card root).
 * @param {object} opts
 * @param {string} opts.filename      - PNG file name (without path).
 * @param {string} opts.text          - Text to share alongside the image.
 * @param {string} [opts.title]       - Title for the native share sheet.
 * @param {string} [opts.fallbackUrl] - URL to open on desktop after download (defaults to WhatsApp Web).
 * @param {string} [opts.overlayUrl] - If provided, injects a visible URL bar at the bottom of the card image before capture.
 */
export const shareHeatCardAsImage = async (element, { filename, text, title, fallbackUrl, overlayUrl }) => {
    if (!element) throw new Error('Heat card element not found');

    await waitForImages(element);

    // Temporarily inject a URL footer so the link is visible in the shared image
    let overlayEl = null;
    if (overlayUrl) {
        overlayEl = document.createElement('div');
        Object.assign(overlayEl.style, {
            background: 'rgba(0,10,30,0.92)',
            padding: '7px 16px',
            textAlign: 'center',
            fontSize: '10px',
            color: '#7dd3fc',
            fontFamily: "'Courier New', monospace, sans-serif",
            letterSpacing: '0.3px',
            wordBreak: 'break-all',
            lineHeight: '1.5',
            borderTop: '1px solid rgba(125,211,252,0.18)',
        });
        overlayEl.textContent = `\uD83D\uDD17 ${overlayUrl}`;
        element.appendChild(overlayEl);
    }

    let dataUrl;
    try {
        dataUrl = await toPng(element, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: '#0d1b2a',
            style: { padding: '0' },
        });
    } finally {
        if (overlayEl && element.contains(overlayEl)) element.removeChild(overlayEl);
    }

    const blob = await dataUrlToBlob(dataUrl);
    const file = new File([blob], filename, { type: 'image/png' });

    // Mobile / PWA path: native share sheet with the actual image file.
    const canShareFiles =
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });

    if (canShareFiles) {
        try {
            await navigator.share({ files: [file], text, title: title || 'Share Heat' });
            return { method: 'native-share' };
        } catch (err) {
            // User cancelled — don't fall through to download.
            if (err && err.name === 'AbortError') return { method: 'cancelled' };
            // Any other failure → fall through to download fallback.
        }
    }

    // Desktop fallback: download the PNG and open the fallback URL.
    triggerDownload(blob, filename);
    const openUrl = fallbackUrl || `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(openUrl, '_blank', 'noopener,noreferrer');
    return { method: 'download+fallback' };
};

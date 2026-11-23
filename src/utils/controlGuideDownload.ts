export const CONTROL_WORK_GUIDE_URL = '/docs/control-work-guide.pdf';
export const CONTROL_WORK_GUIDE_FILENAME = 'دليل أعمال الكنترول.pdf';

export async function downloadControlWorkGuide(): Promise<void> {
  try {
    const response = await fetch(CONTROL_WORK_GUIDE_URL, { cache: 'force-cache' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = CONTROL_WORK_GUIDE_FILENAME;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 10000);
  } catch {
    const fallbackLink = document.createElement('a');
    fallbackLink.href = CONTROL_WORK_GUIDE_URL;
    fallbackLink.download = CONTROL_WORK_GUIDE_FILENAME;
    fallbackLink.rel = 'noopener';
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    document.body.removeChild(fallbackLink);
  }
}

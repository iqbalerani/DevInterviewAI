function getResultsUrl(sessionId: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/interview/results/${sessionId}`;
}

export async function copyReportLink(sessionId: string): Promise<boolean> {
  const url = getResultsUrl(sessionId);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Fallback for older browsers / insecure contexts
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}

export function shareToLinkedIn(sessionId: string, score: number): void {
  const url = getResultsUrl(sessionId);
  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  window.open(shareUrl, '_blank', 'width=600,height=500,noopener,noreferrer');
}

export function shareToTwitter(sessionId: string, score: number): void {
  const url = getResultsUrl(sessionId);
  const text = `I scored ${score}/100 on my AI-powered technical interview with DevProof! 🚀`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  window.open(shareUrl, '_blank', 'width=600,height=400,noopener,noreferrer');
}

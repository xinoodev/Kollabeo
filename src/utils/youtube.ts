export interface YouTubeVideoInfo {
    videoId: string;
    url: string;
    embedUrl: string;
    thumbnailUrl: string;
}

export function extractYouTubeVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return null;
}

export function extractYouTubeLinks(html: string): YouTubeVideoInfo[] {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const videos: YouTubeVideoInfo[] = [];
    const links = tempDiv.querySelectorAll('a');
    const textNodes: string[] = [];

    const walker = document.createTreeWalker(
        tempDiv,
        NodeFilter.SHOW_TEXT,
        null
    );

    let node;
    while (node = walker.nextNode()) {
        if (node.textContent) {
            textNodes.push(node.textContent);
        }
    }

    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
            const videoId = extractYouTubeVideoId(href);
            if (videoId) {
                videos.push({
                    videoId,
                    url: href,
                    embedUrl: `https://www.youtube.com/embed/${videoId}`,
                    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                });
            }
        }
    });

    textNodes.forEach(text => {
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        const matches = text.match(urlPattern);
        if (matches) {
            matches.forEach(url => {
                const videoId = extractYouTubeVideoId(url)
                if (videoId && !videos.some(v => v.videoId === videoId)) {
                    videos.push({
                        videoId,
                        url,
                        embedUrl: `https://www.youtube.com/embed/${videoId}`,
                        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                    });
                }
            });
        }
    });

    return videos;
}
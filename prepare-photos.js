(() => {
    'use strict';
    const MAX_BYTES = 2_000_000;
    const MAX_EDGE = 2400;
    const input = document.getElementById('photo-files');
    const results = document.getElementById('photo-results');
    const status = document.getElementById('photo-status');
    const urls = [];
    const size = bytes => bytes < 1_000_000 ? `${Math.ceil(bytes / 1000)} KB` : `${(bytes / 1_000_000).toFixed(2)} MB`;
    const urlFor = blob => { const url = URL.createObjectURL(blob); urls.push(url); return url; };
    const encode = (canvas, type, quality) => new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('This browser could not prepare the photo. Try a JPEG copy.')), type, quality);
    });
    async function prepare(file) {
        const type = file.type || ({ jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif' })[file.name.split('.').pop().toLowerCase()];
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type)) {
            throw new Error('Export this photo as JPEG or PNG, then choose it again.');
        }
        if (type === 'image/gif' && file.size > MAX_BYTES) {
            throw new Error('This GIF is too large. Use a smaller GIF under 2 MB, or export a still photo as JPEG.');
        }
        const originalUrl = urlFor(file);
        const image = new Image();
        image.src = originalUrl;
        try { await image.decode(); } catch { throw new Error('This photo could not be opened. Export a JPEG or PNG copy and try again.'); }
        if (file.size <= MAX_BYTES) return { blob:file, name:file.name, width:image.naturalWidth, height:image.naturalHeight, unchanged:true };
        const outputType = type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
        const canvas = document.createElement('canvas');
        let scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
        for (let attempt = 0; attempt < 10; attempt++) {
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Photo preparation is unavailable in this browser. Try another browser.');
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            for (const quality of [.88, .78, .68]) {
                const blob = await encode(canvas, outputType, quality);
                if (blob.size <= MAX_BYTES) {
                    const stem = file.name.replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'photo';
                    const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
                    return { blob, name:`${stem}-cms.${extension}`, width:canvas.width, height:canvas.height, unchanged:false };
                }
            }
            scale *= .75;
        }
        throw new Error('This photo could not be made small enough. Try exporting a smaller JPEG.');
    }
    input.addEventListener('change', async () => {
        const files = Array.from(input.files);
        if (!files.length) return;
        input.disabled = true;
        urls.splice(0).forEach(url => URL.revokeObjectURL(url));
        results.replaceChildren();
        let ready = 0;
        for (let index = 0; index < files.length; index++) {
            const file = files[index];
            status.textContent = `Preparing photo ${index + 1} of ${files.length}…`;
            const card = document.createElement('article');
            card.className = 'photo-result';
            const heading = document.createElement('h2');
            heading.textContent = file.name;
            card.append(heading);
            results.append(card);
            try {
                const output = await prepare(file);
                const url = urlFor(output.blob);
                const preview = document.createElement('img');
                preview.src = url;
                preview.alt = `Prepared preview of ${file.name}`;
                const details = document.createElement('p');
                details.textContent = output.unchanged ? `Already ready: ${size(file.size)}. Original quality preserved.` : `${size(file.size)} → ${size(output.blob.size)} · ${output.width} × ${output.height} pixels`;
                const download = document.createElement('a');
                download.className = 'photo-download';
                download.href = url;
                download.download = output.name;
                download.textContent = 'Download prepared photo';
                card.prepend(preview);
                card.append(details, download);
                ready++;
            } catch (error) {
                const message = document.createElement('p');
                message.className = 'photo-error';
                message.textContent = error.message;
                card.append(message);
            }
        }
        status.textContent = `${ready} of ${files.length} photos ready. Download the prepared copies, then upload them in Pages CMS.`;
        input.disabled = false;
        input.value = '';
    });
})();

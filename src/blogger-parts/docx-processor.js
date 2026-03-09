const processDocxFile = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const arrayBuffer = e.target.result;
            try {
                // 1. Convert main content with Mammoth
                const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
                
                if (result.messages && result.messages.length > 0) {
                    console.warn("ملاحظات قراءة الملف:", result.messages);
                }
                
                let finalHtml = result.value || '';

                // 2. Extract footers with JSZip
                try {
                    const zip = await JSZip.loadAsync(arrayBuffer);
                    
                    // Find footer files
                    const footerFiles = Object.keys(zip.files).filter(filename => 
                        filename.match(/^word\/footer\d+\.xml$/i)
                    );

                    // Sort by number
                    footerFiles.sort((a, b) => {
                        const aMatch = a.match(/\d+/);
                        const bMatch = b.match(/\d+/);
                        const aNum = aMatch ? parseInt(aMatch[0]) : 0;
                        const bNum = bMatch ? parseInt(bMatch[0]) : 0;
                        return aNum - bNum;
                    });

                    let allFooterText = '';
                    const seenParagraphs = new Set();

                    for (const filename of footerFiles) {
                        const xml = await zip.file(filename).async('string');
                        if (!xml) continue;
                        
                        try {
                            const parser = new DOMParser();
                            const xmlDoc = parser.parseFromString(xml, "text/xml");
                            const paragraphs = xmlDoc.getElementsByTagName("w:p"); // Try standard w:p
                            
                            // Fallback if getElementsByTagName with namespace fails (browser dependent)
                            const ps = paragraphs.length > 0 ? paragraphs : xmlDoc.getElementsByTagName("p");

                            for (let i = 0; i < ps.length; i++) {
                                const p = ps[i];
                                const texts = p.getElementsByTagName("w:t");
                                const ts = texts.length > 0 ? texts : p.getElementsByTagName("t");
                                
                                let pText = '';
                                for (let j = 0; j < ts.length; j++) {
                                    pText += ts[j].textContent;
                                }
                                
                                const cleanText = pText.trim();
                                if (cleanText && !seenParagraphs.has(cleanText)) {
                                    seenParagraphs.add(cleanText);
                                    allFooterText += `<p>${pText}</p>`;
                                }
                            }
                        } catch (parseErr) {
                            console.error("Error parsing footer XML:", parseErr);
                            // Fallback to regex if DOMParser fails
                            const pMatches = xml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
                            for (const pXml of pMatches) {
                                const tMatches = pXml.match(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g) || [];
                                let pText = '';
                                for (const tXml of tMatches) {
                                    pText += tXml.replace(/<[^>]+>/g, '');
                                }
                                const cleanText = pText.trim();
                                if (cleanText && !seenParagraphs.has(cleanText)) {
                                    seenParagraphs.add(cleanText);
                                    allFooterText += `<p>${pText}</p>`;
                                }
                            }
                        }
                    }

                    if (allFooterText) {
                        finalHtml += `<div class="footer-extraction" style="margin-top: 2em; border-top: 1px solid #eee; padding-top: 1em;">${allFooterText}</div>`;
                    }
                } catch (zipErr) {
                    console.error("Footer extraction failed:", zipErr);
                    // Continue without footer if extraction fails
                }
                
                resolve({ html: finalHtml });
            } catch (err) {
                reject(err);
            }
        };
        
        reader.onerror = () => {
            reject(new Error('حدث خطأ أثناء قراءة الملف من جهازك.'));
        };
        
        reader.readAsArrayBuffer(file);
    });
};

function extractBaiduDomains() {
    const domains = new Set();
    
    // 提取搜索结果中的域名
    document.querySelectorAll('#content_left .result').forEach(result => {
      // 从显示的URL中提取
      const urlElement = result.querySelector('.c-showurl');
      if (urlElement) {
        const urlText = urlElement.textContent.trim();
        const domain = urlText.split('/')[0];
        if (domain && domain.includes('.')) {
          domains.add(domain);
        }
      }
      
      // 从链接中提取
      const links = result.querySelectorAll('a[href]');
      links.forEach(link => {
        try {
          const url = new URL(link.href);
          if (url.hostname && 
              !url.hostname.includes('baidu.com') && 
              url.hostname.includes('.')) {
            domains.add(url.hostname);
          }
        } catch (e) {}
      });
    });
    
    return Array.from(domains).sort();
  }
  
  // 监听来自popup的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getDomains") {
      sendResponse({ domains: extractBaiduDomains() });
    }
    return true;
  });
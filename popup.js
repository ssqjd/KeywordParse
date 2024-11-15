let allDomains = new Map();

// 加载保存的数据
async function loadSavedData() {
  try {
    const data = await chrome.storage.local.get(['searchResults', 'lastSearchTime']);
    if (data.searchResults) {
      const parsedData = JSON.parse(data.searchResults);
      allDomains = new Map(
        parsedData.map(([domain, data]) => [
          domain,
          {
            keywords: new Set(data.keywords),
            order: data.order,
            href: data.href
          }
        ])
      );
      
      displayAllDomains();
      
      if (data.lastSearchTime) {
        const lastTime = new Date(data.lastSearchTime);
        document.getElementById('lastSearchTime').textContent = 
          `上次搜索时间: ${lastTime.toLocaleString()}`;
      }
    }
  } catch (error) {
    console.error('加载保存的数据失败:', error);
  }
}

// 保存数据
async function saveData() {
  try {
    const serializedData = Array.from(allDomains.entries()).map(([domain, data]) => [
      domain,
      {
        keywords: Array.from(data.keywords),
        order: data.order,
        href: data.href
      }
    ]);

    await chrome.storage.local.set({
      searchResults: JSON.stringify(serializedData),
      lastSearchTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('保存数据失败:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 搜索按钮事件监听
  document.getElementById('searchButton').addEventListener('click', async () => {
    const keywordsText = document.getElementById('keywords').value.trim();
    if (!keywordsText) {
      alert('请输入搜索关键词');
      return;
    }

    const keywords = keywordsText.split('\n').filter(k => k.trim());
    if (keywords.length === 0) {
      alert('请输入有效的搜索关键词');
      return;
    }

    document.getElementById('domainList').innerHTML = '<div class="loading">搜索中...</div>';
    document.getElementById('copyAll').style.display = 'none';

    for (const keyword of keywords) {
      if (keyword.trim()) {
        await searchKeyword(keyword.trim());
      }
    }

    await saveData();
    displayAllDomains();
  });

  // 清除按钮事件监听
  document.getElementById('clearButton').addEventListener('click', async () => {
    if (confirm('确定要清除所有搜索结果吗？')) {
      allDomains.clear();
      await chrome.storage.local.clear();
      document.getElementById('domainList').innerHTML = '';
      document.getElementById('copyAll').style.display = 'none';
      document.getElementById('lastSearchTime').textContent = '';
      document.getElementById('keywords').value = '';
    }
  });

  // 生成器按钮事件监听
  document.getElementById('openGenerator').addEventListener('click', () => {
    chrome.windows.create({
      url: chrome.runtime.getURL('generate.html'),
      type: 'popup',
      width: 640,
      height: 700,
      focused: true
    });
  });

  // 复制按钮事件监听
  document.getElementById('copyAll').addEventListener('click', async () => {
    const container = document.getElementById('domainList');
    const domains = JSON.parse(container.dataset.domains || '[]');
    
    if (domains.length > 0) {
      try {
        await navigator.clipboard.writeText(domains.join('\n'));
        
        const tooltip = document.getElementById('copyTooltip');
        tooltip.style.display = 'block';
        setTimeout(() => {
          tooltip.style.display = 'none';
        }, 2000);
      } catch (err) {
        console.error('复制失败:', err);
      }
    }
  });

  // 加载保存的数据
  loadSavedData();
});

async function searchKeyword(keyword) {
  console.log(`开始搜索关键词: "${keyword}"`);
  
  try {
    const url = `https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`;
    console.log(`请求URL: ${url}`);
    
    const response = await fetch(url);
    console.log(`HTTP状态码: ${response.status}`);
    
    const html = await response.text();
    console.log(`获取到HTML内容长度: ${html.length}`);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 解析 eqid 值
    const eqidScript = doc.querySelector('script#head_script');
    let eqid = '';
    if (eqidScript) {
      const eqidMatch = eqidScript.textContent.match(/bds\.comm\.eqid\s*=\s*"([^"]+)"/);
      if (eqidMatch) {
        eqid = eqidMatch[1];
        console.log(`找到eqid: ${eqid}`);
      } else {
        console.log('未找到eqid匹配');
      }
    } else {
      console.log('未找到head_script标签');
    }

    // 记录搜索结果数量
    const results = doc.querySelectorAll('div.result, div.c-container, div.result-op');
    console.log(`找到搜索结果数量: ${results.length}`);

    let processedCount = 0;
    let validDomainCount = 0;

    results.forEach((result, index) => {
      console.log(`\n处理第 ${index + 1} 个搜索结果:`);
      
      // 尝试多种方式获取URL
      const mu = result.getAttribute('mu') || result.getAttribute('data-mu');
      console.log(`mu属性: ${mu || '无'}`);
      
      const hrefElement = result.querySelector('a[href]:not([href^="javascript:"]):not([href^="#"])');
      const href = hrefElement ? hrefElement.href : '';
      console.log(`href属性: ${href || '无'}`);

      let domain = null;
      
      // 尝试从mu属性获取域名
      if (mu) {
        try {
          const url = new URL(mu);
          domain = url.hostname;
          console.log(`从mu获取到域名: ${domain}`);
        } catch (e) {
          console.log(`解析mu URL失败: ${e.message}`);
        }
      }
      
      // 如果mu属性没有有效域名，尝试从href获取
      if (!domain && href) {
        try {
          const url = new URL(href);
          domain = url.hostname;
          console.log(`从href获取到域名: ${domain}`);
        } catch (e) {
          console.log(`解析href URL失败: ${e.message}`);
        }
      }
      
      if (domain && !domain.includes('baidu.com')) {
        if (allDomains.has(domain)) {
          allDomains.get(domain).keywords.add(keyword);
        } else {
          allDomains.set(domain, {
            keywords: new Set([keyword]),
            order: allDomains.size,
            href: `${href}&wd=&eqid=${eqid}`
          });
        }
        validDomainCount++;
      }
    });
  } catch (error) {
    console.error(`搜索关键词 "${keyword}" 时出错:`, error);
  }
}

function displayAllDomains() {
  const container = document.getElementById('domainList');
  container.innerHTML = '';

  if (allDomains.size === 0) {
    container.innerHTML = '<div class="domain-item">未找到域名</div>';
    return;
  }

  const domainsArray = Array.from(allDomains.entries())
    .sort((a, b) => a[1].order - b[1].order);

  domainsArray.forEach(([domain, data], index) => {
    const div = document.createElement('div');
    div.className = 'domain-item';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'domain-name';
    
    const domainText = document.createElement('span');
    domainText.textContent = `${index + 1}. ${domain}`;
    nameSpan.appendChild(domainText);
    
    if (data.keywords && data.keywords.size > 0) {
      const keywordsSpan = document.createElement('span');
      keywordsSpan.style.display = 'block';
      keywordsSpan.style.fontSize = '12px';
      Array.from(data.keywords).forEach(keyword => {
        const tag = document.createElement('span');
        tag.className = 'keyword-tag';
        tag.textContent = keyword;
        keywordsSpan.appendChild(tag);
      });
      nameSpan.appendChild(keywordsSpan);
    }

    const hrefLink = document.createElement('a');
    hrefLink.className = 'check-seo';
    hrefLink.textContent = '访问链接';
    hrefLink.href = data.href;
    hrefLink.title = data.href;
    hrefLink.target = '_blank';
    hrefLink.style.display = 'block';
    
    div.appendChild(nameSpan);
    div.appendChild(hrefLink);
    container.appendChild(div);
  });

  document.getElementById('copyAll').style.display = 'block';
  container.dataset.domains = JSON.stringify(domainsArray.map(([domain]) => domain));
}
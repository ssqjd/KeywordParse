let allDomains = new Map();

// 添加要过滤的主流网站域名列表
const FILTERED_DOMAINS = [
  '163.com',
  'douyin.com',
  'sohu.com',
  'sina.com',
  'weibo.com',
  'qq.com',
  'baidu.com',
  'zhihu.com',
  'bilibili.com',
  'youku.com',
  'iqiyi.com',
  'toutiao.com',
  'jd.com',
  'taobao.com',
  'tmall.com',
  'aliyun.com',
  'csdn.net',
  'cnblogs.com',
  'jianshu.com',
  '360.com',
  'china.com',
  'ifeng.com',
  'huanqiu.com',
  'tianya.cn',
  'people.com.cn',
  'xinhuanet.com',
  'cctv.com',
  'meituan.com',
  'kuaishou.com'
];

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
        const lastTimeDiv = document.getElementById('lastSearchTime');
        lastTimeDiv.style.display = 'flex';
        lastTimeDiv.style.justifyContent = 'space-between';
        lastTimeDiv.innerHTML = `
          <span>上次搜索时间: ${lastTime.toLocaleString()}</span>
          <span>总条数: ${allDomains.size}</span>
        `;
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

    // 更新显示
    const lastTimeDiv = document.getElementById('lastSearchTime');
    lastTimeDiv.style.display = 'flex';
    lastTimeDiv.style.justifyContent = 'space-between';
    lastTimeDiv.innerHTML = `
      <span>上次搜索时间: ${new Date().toLocaleString()}</span>
      <span>总条数: ${allDomains.size}</span>
    `;
  } catch (error) {
    console.error('保存数据失败:', error);
  }
}

// 添加延时函数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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

    // 显示搜索中的提示
    const domainList = document.getElementById('domainList');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = '搜索中...';
    domainList.appendChild(loadingDiv);

    document.getElementById('copyAll').style.display = 'none';

    try {
      for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i].trim();
        if (keyword) {
          // 更新加载提示，显示进度
          loadingDiv.textContent = `搜索中... (${i + 1}/${keywords.length})`;
          
          await searchKeyword(keyword);
          
          // 每次搜索后添加随机延时（3-5秒）
          if (i < keywords.length - 1) {
            const randomDelay = Math.floor(Math.random() * 2000) + 3000; // 3000-5000ms
            await delay(randomDelay);
          }
        }
      }

      // 移除搜索中的提示
      loadingDiv.remove();

      await saveData();
      displayAllDomains();
    } catch (error) {
      console.error('搜索过程中出错:', error);
      loadingDiv.textContent = '搜索出错，请重试';
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

  // 清除按钮事件监听
  document.getElementById('clearButton').addEventListener('click', async () => {
    allDomains.clear();
    document.getElementById('domainList').innerHTML = '';
    const lastTimeDiv = document.getElementById('lastSearchTime');
    lastTimeDiv.style.display = 'flex';
    lastTimeDiv.style.justifyContent = 'space-between';
    lastTimeDiv.innerHTML = `
      <span>上次搜索时间: </span>
      <span>总条数: 0</span>
    `;
    document.getElementById('copyAll').style.display = 'none';
    await chrome.storage.local.clear();
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
      
      if (domain) {
        // 检查域名是否包含任何过滤域名
        const shouldFilter = FILTERED_DOMAINS.some(filteredDomain => 
          domain.includes(filteredDomain)
        );

        if (!shouldFilter) {
          if (allDomains.has(domain)) {
            // 如果域名已存在，只添加新的关键词
            allDomains.get(domain).keywords.add(keyword);
            console.log(`更新已存在域名 ${domain} 的关键词: ${keyword}`);
          } else {
            // 如果是新域名，创建新记录
            allDomains.set(domain, {
              keywords: new Set([keyword]),
              order: allDomains.size,
              href: `${href}&wd=&eqid=${eqid}`
            });
            console.log(`添加新域名 ${domain} 及其关键词: ${keyword}`);
          }
          validDomainCount++;
        } else {
          console.log(`过滤掉主流网站域名: ${domain}`);
        }
      }
    });

    console.log(`处理完成，有效域名数: ${validDomainCount}`);
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

  // 修改排序逻辑：先按关键词数量降序，如果数量相同则按原有顺序
  const domainsArray = Array.from(allDomains.entries())
    .sort((a, b) => {
      // 首先按关键词数量降序
      const keywordsDiff = b[1].keywords.size - a[1].keywords.size;
      // 如果关键词数量相同，则按原有顺序
      return keywordsDiff !== 0 ? keywordsDiff : a[1].order - b[1].order;
    });

  domainsArray.forEach(([domain, data], index) => {
    const div = document.createElement('div');
    div.className = 'domain-item';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'domain-name';
    
    const domainText = document.createElement('span');
    domainText.textContent = `${index + 1}. ${domain} (${data.keywords.size}个关键词)`;  // 显示关键词数量
    nameSpan.appendChild(domainText);
    
    if (data.keywords && data.keywords.size > 0) {
      const keywordsContainer = document.createElement('div');
      keywordsContainer.className = 'keywords-container';
      
      Array.from(data.keywords).forEach(keyword => {
        const tag = document.createElement('span');
        tag.className = 'keyword-tag';
        tag.textContent = keyword;
        keywordsContainer.appendChild(tag);
      });
      
      nameSpan.appendChild(keywordsContainer);
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
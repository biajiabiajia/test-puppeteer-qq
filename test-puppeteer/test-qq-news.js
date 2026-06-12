// 测试脚本：验证Puppeteer能否在GitHub Actions上打开腾讯新闻
const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  console.log('Opening Tencent News author page...');
  await page.goto('https://news.qq.com/omn/author/8QMf335U6oYdvT%2Fe', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  // 等JS渲染
  await page.waitForTimeout(5000);
  
  // 截图看效果
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  console.log('Screenshot saved to screenshot.png');
  
  // 提取文章链接
  const articles = await page.evaluate(() => {
    const links = [];
    const seen = new Set();
    document.querySelectorAll('a[href*="/rain/a/"]').forEach(a => {
      if (!seen.has(a.href)) {
        seen.add(a.href);
        links.push({ url: a.href, title: a.textContent?.trim() || '' });
      }
    });
    return links;
  });
  
  console.log(`\nFound ${articles.length} articles:`);
  articles.slice(0, 10).forEach((a, i) => {
    console.log(`${i + 1}. ${a.title.substring(0, 40)} | ${a.url}`);
  });
  
  // 如果找到文章，尝试检查第一篇是否含投票数据
  if (articles.length > 0) {
    console.log(`\nChecking first article for vote data...`);
    await page.goto(articles[0].url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const html = await page.content();
    const hasVote = html.includes('7天新增感染') && (html.includes('初值') || html.includes('终值'));
    console.log(`Has vote data: ${hasVote}`);
    
    if (hasVote) {
      const votes = [];
      const regex = /截止(\d{1,2}月\d{1,2}日)[，,]?\s*7天新增感染比例[，,]?\s*(?:初值|终值)为?\s*(\d+\.?\d*)%/g;
      let m;
      while ((m = regex.exec(html)) !== null) {
        votes.push({ date: m[1], value: m[2] });
      }
      console.log(`Found ${votes.length} vote entries:`);
      votes.forEach(v => console.log(`  ${v.date}: ${v.value}%`));
    }
  }
  
  await browser.close();
  console.log('\nDone!');
})();
